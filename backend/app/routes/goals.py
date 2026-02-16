from datetime import date, datetime, timedelta, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import text
from ..extensions import db
from ..models.goals import Goal, Phase
from ..models.health import HealthMetric
from .auth_helpers import get_current_user_id

goals_bp = Blueprint('goals', __name__)


def _get_current_value(user_id, metric_key, period_type):
    """Calculate current value for a goal based on metric data."""
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
    """Calculate progress percentage. For weight, lower is better."""
    if current is None or target is None or target == 0:
        return 0
    if metric_key == 'weight':
        # Inverse: starting from higher, going to lower target
        # Progress = how much we've lost towards the goal
        # Assume starting point is roughly 15% above target as a baseline
        start = target * 1.15
        if current <= target:
            return 100
        if current >= start:
            return 0
        return round((start - current) / (start - target) * 100)
    return min(100, round(current / target * 100))


@goals_bp.route('', methods=['GET'])
@jwt_required()
def list_goals():
    user_id = get_current_user_id()
    today = date.today()
    goals = Goal.query.filter_by(user_id=user_id, active=True).order_by(Goal.id).all()

    result = []
    for g in goals:
        # Only include goals whose date range covers today (or has no dates)
        if g.start_date and g.end_date:
            if today < g.start_date or today > g.end_date:
                continue

        current = _get_current_value(user_id, g.metric_key, g.period_type)
        progress = _calc_progress(current, g.target_value, g.metric_key)
        d = g.to_dict()
        d['currentValue'] = current
        d['progress'] = progress
        result.append(d)

    return jsonify(result)


@goals_bp.route('/all', methods=['GET'])
@jwt_required()
def list_all_goals():
    """List ALL goals including future/past ones, for management."""
    user_id = get_current_user_id()
    goals = Goal.query.filter_by(user_id=user_id).order_by(Goal.start_date, Goal.id).all()
    return jsonify([g.to_dict() for g in goals])


@goals_bp.route('', methods=['POST'])
@jwt_required()
def create_goal():
    user_id = get_current_user_id()
    data = request.get_json()
    goal = Goal(
        user_id=user_id,
        metric_key=data['metricKey'],
        target_value=data['targetValue'],
        period_type=data['periodType'],
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
    if 'metricKey' in data:
        goal.metric_key = data['metricKey']
    if 'targetValue' in data:
        goal.target_value = data['targetValue']
    if 'periodType' in data:
        goal.period_type = data['periodType']
    if 'startDate' in data:
        goal.start_date = date.fromisoformat(data['startDate']) if data['startDate'] else None
    if 'endDate' in data:
        goal.end_date = date.fromisoformat(data['endDate']) if data['endDate'] else None
    if 'description' in data:
        goal.description = data['description']
    if 'active' in data:
        goal.active = data['active']
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
    if 'name' in data:
        phase.name = data['name']
    if 'description' in data:
        phase.description = data['description']
    if 'startDate' in data:
        phase.start_date = date.fromisoformat(data['startDate'])
    if 'endDate' in data:
        phase.end_date = date.fromisoformat(data['endDate'])
    if 'targets' in data:
        phase.targets = data['targets']
    if 'order' in data:
        phase.order = data['order']
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
