from datetime import date, datetime, timedelta, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import text
from ..extensions import db
from ..models.goals import Goal, Phase, GoalCheck
from ..models.gamification import Action, Event
from ..models.health import HealthMetric
from ..models.user import User
from .auth_helpers import get_current_user_id

goals_bp = Blueprint('goals', __name__)


def _get_current_value(user_id, metric_key, period_type):
    """Calculate current value for a metric-based goal."""
    today = date.today()

    if period_type == 'daily':
        since = today
    elif period_type == 'weekly':
        since = today - timedelta(days=today.weekday())
    elif period_type == 'monthly':
        since = today.replace(day=1)
    else:  # annual
        since = today.replace(month=1, day=1)

    METRIC_MAP = {
        'steps': ('step_count', 'sum'),
        'activeEnergy': ('active_energy', 'sum'),
        'distance': ('walking_running_distance', 'sum'),
        'weight': ('weight_body_mass', 'latest'),
        'sleep': ('sleep_analysis', 'raw_sleep'),
        'restingHeartRate': ('resting_heart_rate', 'hr_avg'),
        'mindfulness': ('mindful_minutes', 'sum'),
        'vo2max': ('vo2_max', 'latest'),
    }

    cfg = METRIC_MAP.get(metric_key)
    if not cfg:
        return None

    metric_name, agg_type = cfg

    if agg_type == 'sum':
        if period_type == 'daily':
            row = db.session.execute(text("""
                SELECT SUM(CAST(data->>'qty' AS FLOAT)) AS total
                FROM health_metrics
                WHERE user_id = :uid AND metric_name = :name AND date::date = :d
            """), {'uid': user_id, 'name': metric_name, 'd': since}).fetchone()
            return round(row.total, 1) if row and row.total else 0
        else:
            row = db.session.execute(text("""
                SELECT AVG(daily_total) AS avg_val FROM (
                    SELECT SUM(CAST(data->>'qty' AS FLOAT)) AS daily_total
                    FROM health_metrics
                    WHERE user_id = :uid AND metric_name = :name AND date::date >= :since
                    GROUP BY date::date
                ) sub
            """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchone()
            return round(row.avg_val, 1) if row and row.avg_val else 0

    elif agg_type == 'latest':
        row = db.session.execute(text("""
            SELECT data->>'qty' AS qty FROM health_metrics
            WHERE user_id = :uid AND metric_name = :name
            ORDER BY date DESC LIMIT 1
        """), {'uid': user_id, 'name': metric_name}).fetchone()
        return round(float(row.qty), 1) if row and row.qty else None

    elif agg_type == 'hr_avg':
        row = db.session.execute(text("""
            SELECT AVG(CAST(COALESCE(data->>'Avg', data->>'qty') AS FLOAT)) AS avg_val
            FROM health_metrics
            WHERE user_id = :uid AND metric_name = :name AND date::date >= :since
        """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchone()
        return round(row.avg_val, 1) if row and row.avg_val else None

    elif agg_type == 'raw_sleep':
        row = db.session.execute(text("""
            SELECT AVG(CAST(COALESCE(data->>'asleep', data->>'totalSleep', data->>'qty') AS FLOAT)) AS avg_val
            FROM health_metrics
            WHERE user_id = :uid AND metric_name = :name AND date::date >= :since
        """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchone()
        val = row.avg_val if row and row.avg_val else None
        if val and val > 24:
            val = val / 3600
        return round(val, 1) if val else None

    return None


def _calc_progress(current, target, metric_key):
    """Calculate progress percentage."""
    if current is None or target is None or target == 0:
        return 0
    if metric_key == 'weight':
        start = target * 1.15
        if current <= target:
            return 100
        if current >= start:
            return 0
        return round((start - current) / (start - target) * 100)
    return min(100, round(current / target * 100))


def _enrich_goal(goal, user_id, today):
    """Add currentValue, progress, and checkedToday to a goal dict."""
    d = goal.to_dict()
    try:
        if goal.goal_type == 'metric' and goal.metric_key and goal.target_value:
            current = _get_current_value(user_id, goal.metric_key, goal.period_type)
            d['currentValue'] = current
            d['progress'] = _calc_progress(current, goal.target_value, goal.metric_key)
        elif goal.goal_type == 'check':
            check = GoalCheck.query.filter_by(goal_id=goal.id, date=today).first()
            d['checkedToday'] = check is not None
            d['currentValue'] = None
            d['progress'] = None
    except Exception as e:
        import traceback
        traceback.print_exc()
        d['currentValue'] = None
        d['progress'] = 0
        d['checkedToday'] = False
    return d


@goals_bp.route('', methods=['GET'])
@jwt_required()
def list_goals():
    """Return hierarchical goals: mainGoals + phases with their goals."""
    try:
        user_id = get_current_user_id()
        today = date.today()

        all_goals = Goal.query.filter_by(user_id=user_id, active=True).order_by(Goal.id).all()
        phases = Phase.query.filter_by(user_id=user_id).order_by(Phase.order, Phase.start_date).all()

        # Separate main goals (no phase) from phase goals
        main_goals = []
        phase_goals_map = {}  # phase_id -> [goals]

        for g in all_goals:
            # Skip goals that have already ended (unless they're annual/main)
            if g.end_date and today > g.end_date and g.phase_id is not None:
                continue

            enriched = _enrich_goal(g, user_id, today)

            if g.phase_id is None:
                main_goals.append(enriched)
            else:
                if g.phase_id not in phase_goals_map:
                    phase_goals_map[g.phase_id] = []
                phase_goals_map[g.phase_id].append(enriched)

        # Build phases with their goals
        phases_result = []
        for p in phases:
            pd = p.to_dict()
            pd['goals'] = phase_goals_map.get(p.id, [])
            phases_result.append(pd)

        return jsonify({
            'mainGoals': main_goals,
            'phases': phases_result,
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@goals_bp.route('/daily', methods=['GET'])
@jwt_required()
def daily_goals():
    """Return only daily checkable goals for the active phase."""
    user_id = get_current_user_id()
    today = date.today()

    # Find active phase
    active_phase = Phase.query.filter(
        Phase.user_id == user_id,
        Phase.start_date <= today,
        Phase.end_date >= today,
    ).first()

    if not active_phase:
        return jsonify([])

    daily = Goal.query.filter(
        Goal.user_id == user_id,
        Goal.phase_id == active_phase.id,
        Goal.period_type == 'daily',
        Goal.active == True,
    ).order_by(Goal.id).all()

    return jsonify([_enrich_goal(g, user_id, today) for g in daily])


@goals_bp.route('/<int:goal_id>/check', methods=['POST'])
@jwt_required()
def check_goal(goal_id):
    """Check a goal for today, creating a gamification event for XP."""
    user_id = get_current_user_id()
    today = date.today()

    goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first_or_404()

    if goal.goal_type != 'check':
        return jsonify({'error': 'Somente metas do tipo check podem ser marcadas'}), 400

    # Check for existing check today
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
    desc = goal.description or 'Meta diaria cumprida'
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

    # Level up check
    while user.experience >= user.next_level_exp:
        user.level += 1
        user.next_level_exp = int(user.next_level_exp * 1.2)

    # Create GoalCheck
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
    today = date.today()

    check = GoalCheck.query.filter_by(goal_id=goal_id, date=today, user_id=user_id).first()
    if not check:
        return jsonify({'error': 'Meta nao marcada hoje'}), 404

    xp_removed = 0

    # Reverse XP if event exists
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

@goals_bp.route('/all', methods=['GET'])
@jwt_required()
def list_all_goals():
    """List ALL goals for management."""
    user_id = get_current_user_id()
    goals = Goal.query.filter_by(user_id=user_id).order_by(Goal.phase_id, Goal.id).all()
    return jsonify([g.to_dict() for g in goals])


@goals_bp.route('', methods=['POST'])
@jwt_required()
def create_goal():
    user_id = get_current_user_id()
    data = request.get_json()
    goal = Goal(
        user_id=user_id,
        phase_id=data.get('phaseId'),
        metric_key=data.get('metricKey'),
        target_value=data.get('targetValue'),
        period_type=data['periodType'],
        goal_type=data.get('goalType', 'metric'),
        start_date=date.fromisoformat(data['startDate']) if data.get('startDate') else None,
        end_date=date.fromisoformat(data['endDate']) if data.get('endDate') else None,
        description=data.get('description'),
        active=data.get('active', True),
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
    for field in ['metricKey', 'targetValue', 'periodType', 'goalType', 'description', 'active']:
        camel = field
        snake = ''.join(['_' + c.lower() if c.isupper() else c for c in field]).lstrip('_')
        if camel in data:
            setattr(goal, snake, data[camel])
    if 'phaseId' in data:
        goal.phase_id = data['phaseId']
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


# --- Phases ---

@goals_bp.route('/phases', methods=['GET'])
@jwt_required()
def list_phases():
    user_id = get_current_user_id()
    phases = Phase.query.filter_by(user_id=user_id).order_by(Phase.order, Phase.start_date).all()
    return jsonify([p.to_dict() for p in phases])


@goals_bp.route('/phases', methods=['POST'])
@jwt_required()
def create_phase():
    user_id = get_current_user_id()
    data = request.get_json()
    phase = Phase(
        user_id=user_id,
        name=data['name'],
        description=data.get('description'),
        start_date=date.fromisoformat(data['startDate']),
        end_date=date.fromisoformat(data['endDate']),
        targets=data.get('targets', []),
        order=data.get('order', 0),
    )
    db.session.add(phase)
    db.session.commit()
    return jsonify(phase.to_dict()), 201


@goals_bp.route('/phases/<int:phase_id>', methods=['PUT'])
@jwt_required()
def update_phase(phase_id):
    user_id = get_current_user_id()
    phase = Phase.query.filter_by(id=phase_id, user_id=user_id).first_or_404()
    data = request.get_json()
    for key in ['name', 'description', 'targets', 'order']:
        if key in data:
            setattr(phase, key, data[key])
    if 'startDate' in data:
        phase.start_date = date.fromisoformat(data['startDate'])
    if 'endDate' in data:
        phase.end_date = date.fromisoformat(data['endDate'])
    db.session.commit()
    return jsonify(phase.to_dict())


@goals_bp.route('/phases/<int:phase_id>', methods=['DELETE'])
@jwt_required()
def delete_phase(phase_id):
    user_id = get_current_user_id()
    phase = Phase.query.filter_by(id=phase_id, user_id=user_id).first_or_404()
    db.session.delete(phase)
    db.session.commit()
    return '', 204
