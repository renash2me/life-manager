from datetime import datetime, timedelta, timezone, date
from flask import Blueprint, jsonify, request
from ..extensions import db
from ..models.health import HealthMetric, Workout
from ..models.user import User
from ..services.scoring import calculate_daily_score

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/health', methods=['GET'])
def health_overview():
    """Aggregate health data for dashboard display."""
    days = request.args.get('days', 7, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    steps = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'step_count',
        HealthMetric.date >= since,
    ).order_by(HealthMetric.date.asc()).all()

    heart_rate = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'heart_rate',
        HealthMetric.date >= since,
    ).order_by(HealthMetric.date.asc()).all()

    sleep = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'sleep_analysis',
        HealthMetric.date >= since,
    ).order_by(HealthMetric.date.asc()).all()

    weight = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'weight_body_mass',
    ).order_by(HealthMetric.date.asc()).limit(90).all()

    workouts = Workout.query.filter(
        Workout.user_id == 1,
        Workout.start_time >= since,
    ).order_by(Workout.start_time.desc()).limit(10).all()

    return jsonify({
        'steps': [{'date': m.date.isoformat(), **m.data} for m in steps],
        'heartRate': [{'date': m.date.isoformat(), **m.data} for m in heart_rate],
        'sleep': [{'date': m.date.isoformat(), **m.data} for m in sleep],
        'weight': [{'date': m.date.isoformat(), **m.data} for m in weight],
        'workouts': [w.to_dict() for w in workouts],
    })


@dashboard_bp.route('/summary', methods=['GET'])
def daily_summary():
    """Today's summary: latest health metrics + gamification score."""
    today = date.today()

    latest_steps = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'step_count',
        db.func.date(HealthMetric.date) == today,
    ).order_by(HealthMetric.date.desc()).first()

    yesterday = today - timedelta(days=1)
    latest_sleep = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'sleep_analysis',
        db.func.date(HealthMetric.date) >= yesterday,
    ).order_by(HealthMetric.date.desc()).first()

    latest_weight = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'weight_body_mass',
    ).order_by(HealthMetric.date.desc()).first()

    score = calculate_daily_score(1, today)
    user = User.query.get(1)

    return jsonify({
        'steps': latest_steps.data if latest_steps else None,
        'sleep': latest_sleep.data if latest_sleep else None,
        'weight': latest_weight.data if latest_weight else None,
        'score': score,
        'user': user.to_dict() if user else None,
    })
