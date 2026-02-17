from datetime import date, datetime, timedelta, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.goals import Goal, GoalCheck
from ..models.gamification import Action, Event
from ..models.user import User
from ..services.metrics import (
    METRIC_CONFIG, get_user_today, get_metric_value, calc_progress,
)
from .auth_helpers import get_current_user_id

goals_bp = Blueprint('goals', __name__)


def _enrich_goal(goal, user_id, today):
    """Add currentValue, progress, checkedToday, and children to a goal dict."""
    d = goal.to_dict(include_children=False)
    try:
        if goal.goal_type == 'metric' and goal.metric_key and goal.target_value:
            current = get_metric_value(user_id, goal.metric_key, goal.period_type, today)
            d['currentValue'] = current
            d['progress'] = calc_progress(current, goal.target_value, goal.metric_key)
        elif goal.goal_type == 'check':
            check = GoalCheck.query.filter_by(goal_id=goal.id, date=today).first()
            d['checkedToday'] = check is not None
            d['currentValue'] = None
            d['progress'] = None
        # group goals already have status/progress from to_dict
    except Exception:
        import traceback
        traceback.print_exc()
        d['currentValue'] = None
        d['progress'] = 0
        d['checkedToday'] = False

    # Recurse into children
    d['children'] = []
    for child in goal.children:
        if child.active:
            d['children'].append(_enrich_goal(child, user_id, today))

    return d


@goals_bp.route('', methods=['GET'])
@jwt_required()
def list_goals():
    """Return recursive tree of goals (root goals with nested children)."""
    try:
        user_id = get_current_user_id()
        today = get_user_today()

        # Fetch only root goals (no parent)
        roots = Goal.query.filter_by(
            user_id=user_id, parent_id=None, active=True,
        ).order_by(Goal.order, Goal.id).all()

        tree = [_enrich_goal(g, user_id, today) for g in roots]
        return jsonify(tree)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@goals_bp.route('/daily', methods=['GET'])
@jwt_required()
def daily_goals():
    """Return daily checkable goals that are currently active (by date range)."""
    user_id = get_current_user_id()
    today = get_user_today()

    daily = Goal.query.filter(
        Goal.user_id == user_id,
        Goal.period_type == 'daily',
        Goal.active == True,
        Goal.goal_type.in_(['check', 'metric']),
        (Goal.start_date <= today) | (Goal.start_date == None),
        (Goal.end_date >= today) | (Goal.end_date == None),
    ).order_by(Goal.order, Goal.id).all()

    return jsonify([_enrich_goal(g, user_id, today) for g in daily])


@goals_bp.route('/metrics', methods=['GET'])
@jwt_required()
def available_metrics():
    """Return all available metrics (known + discovered) for the metric picker."""
    from ..services.metrics import get_all_metric_configs, METRIC_COLORS
    user_id = get_current_user_id()
    all_configs = get_all_metric_configs(user_id)
    result = []
    for key, cfg in all_configs.items():
        result.append({
            'key': key,
            'label': cfg['label'],
            'unit': cfg.get('unit', ''),
            'color': cfg.get('color') or METRIC_COLORS.get(key, '#7c3aed'),
        })
    return jsonify(result)


@goals_bp.route('/<int:goal_id>/check', methods=['POST'])
@jwt_required()
def check_goal(goal_id):
    """Check a goal for today, creating a gamification event for XP."""
    user_id = get_current_user_id()
    today = get_user_today()

    goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first_or_404()

    if goal.goal_type != 'check':
        return jsonify({'error': 'Somente metas do tipo check podem ser marcadas'}), 400

    existing = GoalCheck.query.filter_by(goal_id=goal_id, date=today).first()
    if existing:
        return jsonify({'error': 'Meta ja marcada hoje'}), 409

    # Find or create "Meta Cumprida" action
    action = Action.query.filter_by(nome='Meta Cumprida').first()
    if not action:
        action = Action(nome='Meta Cumprida', areas={'Saude': 5, 'Mente': 3}, sinergia=True)
        db.session.add(action)
        db.session.flush()

    # Create gamification event
    desc = goal.description or goal.name or 'Meta diaria cumprida'
    event = Event(
        user_id=user_id,
        action_id=action.id,
        descricao=desc,
        data=today,
    )
    db.session.add(event)
    db.session.flush()

    # Calculate and add XP
    xp = sum(action.areas.values())
    if action.sinergia and len(action.areas) > 1:
        xp = int(xp * 1.2)

    user = User.query.get(user_id)
    user.experience += xp

    while user.experience >= user.next_level_exp:
        user.level += 1
        user.next_level_exp = int(user.next_level_exp * 1.2)

    check = GoalCheck(
        goal_id=goal_id,
        user_id=user_id,
        date=today,
        event_id=event.id,
    )
    db.session.add(check)
    db.session.commit()

    return jsonify({
        'check': check.to_dict(),
        'xpGained': xp,
        'user': user.to_dict(),
    }), 201


@goals_bp.route('/<int:goal_id>/check', methods=['DELETE'])
@jwt_required()
def uncheck_goal(goal_id):
    """Uncheck a goal for today, reversing the XP event."""
    user_id = get_current_user_id()
    today = get_user_today()

    check = GoalCheck.query.filter_by(goal_id=goal_id, date=today, user_id=user_id).first()
    if not check:
        return jsonify({'error': 'Meta nao marcada hoje'}), 404

    xp_removed = 0

    if check.event_id:
        event = Event.query.get(check.event_id)
        if event and event.action:
            action = event.action
            xp_removed = sum(action.areas.values())
            if action.sinergia and len(action.areas) > 1:
                xp_removed = int(xp_removed * 1.2)

            user = User.query.get(user_id)
            user.experience = max(0, user.experience - xp_removed)

            db.session.delete(event)

    db.session.delete(check)
    db.session.commit()

    return jsonify({'xpRemoved': xp_removed})


# --- CRUD ---

@goals_bp.route('', methods=['POST'])
@jwt_required()
def create_goal():
    user_id = get_current_user_id()
    data = request.get_json()

    parent_id = data.get('parentId')
    if parent_id:
        parent = Goal.query.filter_by(id=parent_id, user_id=user_id).first()
        if not parent:
            return jsonify({'error': 'Parent goal not found'}), 404

    goal = Goal(
        user_id=user_id,
        parent_id=parent_id,
        name=data['name'],
        metric_key=data.get('metricKey'),
        target_value=data.get('targetValue'),
        period_type=data['periodType'],
        goal_type=data.get('goalType', 'metric'),
        start_date=date.fromisoformat(data['startDate']) if data.get('startDate') else None,
        end_date=date.fromisoformat(data['endDate']) if data.get('endDate') else None,
        description=data.get('description'),
        active=data.get('active', True),
        order=data.get('order', 0),
    )
    db.session.add(goal)
    db.session.commit()
    return jsonify(goal.to_dict()), 201


@goals_bp.route('/<int:goal_id>', methods=['PUT'])
@jwt_required()
def update_goal(goal_id):
    user_id = get_current_user_id()
    goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first_or_404()
    data = request.get_json()

    # Handle parentId with circular reference protection
    if 'parentId' in data:
        new_parent_id = data['parentId']
        if new_parent_id:
            # Check parent exists and belongs to user
            parent = Goal.query.filter_by(id=new_parent_id, user_id=user_id).first()
            if not parent:
                return jsonify({'error': 'Parent goal not found'}), 404
            # Walk up ancestors to prevent circular reference
            ancestor = parent
            while ancestor:
                if ancestor.id == goal_id:
                    return jsonify({'error': 'Circular reference detected'}), 400
                ancestor = ancestor.parent
        goal.parent_id = new_parent_id

    if 'name' in data:
        goal.name = data['name']
    if 'metricKey' in data:
        goal.metric_key = data['metricKey']
    if 'targetValue' in data:
        goal.target_value = data['targetValue']
    if 'periodType' in data:
        goal.period_type = data['periodType']
    if 'goalType' in data:
        goal.goal_type = data['goalType']
    if 'description' in data:
        goal.description = data['description']
    if 'active' in data:
        goal.active = data['active']
    if 'order' in data:
        goal.order = data['order']
    if 'startDate' in data:
        goal.start_date = date.fromisoformat(data['startDate']) if data['startDate'] else None
    if 'endDate' in data:
        goal.end_date = date.fromisoformat(data['endDate']) if data['endDate'] else None

    db.session.commit()
    return jsonify(goal.to_dict())


@goals_bp.route('/<int:goal_id>', methods=['DELETE'])
@jwt_required()
def delete_goal(goal_id):
    user_id = get_current_user_id()
    goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first_or_404()
    db.session.delete(goal)
    db.session.commit()
    return '', 204
