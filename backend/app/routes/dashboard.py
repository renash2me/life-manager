from datetime import datetime, timedelta, timezone, date
from flask import Blueprint, jsonify, request
from sqlalchemy import cast, Float, func
from ..extensions import db
from ..models.health import HealthMetric, Workout
from ..models.user import User
from ..services.scoring import calculate_daily_score

dashboard_bp = Blueprint('dashboard', __name__)


def _qty_field():
    """Extract qty from JSONB data as float for aggregation."""
    return cast(HealthMetric.data['qty'].astext, Float)


@dashboard_bp.route('/health', methods=['GET'])
def health_overview():
    """Aggregate health data for dashboard display, grouped by day."""
    days = request.args.get('days', 7, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)
    day_col = func.date(HealthMetric.date).label('day')

    # Steps: SUM per day
    steps_rows = db.session.query(
        day_col,
        func.sum(_qty_field()).label('total'),
    ).filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'step_count',
        HealthMetric.date >= since,
    ).group_by('day').order_by('day').all()

    # Heart rate: AVG/MIN/MAX per day
    hr_rows = db.session.query(
        day_col,
        func.avg(_qty_field()).label('avg'),
        func.min(_qty_field()).label('min'),
        func.max(_qty_field()).label('max'),
    ).filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'heart_rate',
        HealthMetric.date >= since,
    ).group_by('day').order_by('day').all()

    # Resting heart rate: AVG per day
    rhr_rows = db.session.query(
        day_col,
        func.avg(_qty_field()).label('avg'),
    ).filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'resting_heart_rate',
        HealthMetric.date >= since,
    ).group_by('day').order_by('day').all()

    # Sleep: raw entries (usually 1 per night)
    sleep = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'sleep_analysis',
        HealthMetric.date >= since,
    ).order_by(HealthMetric.date.asc()).all()

    # Weight: latest per day
    weight_sub = db.session.query(
        func.date(HealthMetric.date).label('day'),
        func.max(HealthMetric.id).label('max_id'),
    ).filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'weight_body_mass',
    ).group_by('day').subquery()

    weight = HealthMetric.query.join(
        weight_sub, HealthMetric.id == weight_sub.c.max_id
    ).order_by(HealthMetric.date.asc()).limit(90).all()

    # Active energy: SUM per day
    energy_rows = db.session.query(
        day_col,
        func.sum(_qty_field()).label('total'),
    ).filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'active_energy',
        HealthMetric.date >= since,
    ).group_by('day').order_by('day').all()

    # Walking/running distance: SUM per day
    distance_rows = db.session.query(
        day_col,
        func.sum(_qty_field()).label('total'),
    ).filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'walking_running_distance',
        HealthMetric.date >= since,
    ).group_by('day').order_by('day').all()

    # Workouts
    workouts = Workout.query.filter(
        Workout.user_id == 1,
        Workout.start_time >= since,
    ).order_by(Workout.start_time.desc()).limit(10).all()

    return jsonify({
        'steps': [{'date': str(r.day), 'qty': round(r.total)} for r in steps_rows],
        'heartRate': [{'date': str(r.day), 'Avg': round(r.avg, 1), 'Min': round(r.min, 1), 'Max': round(r.max, 1)} for r in hr_rows],
        'restingHeartRate': [{'date': str(r.day), 'avg': round(r.avg, 1)} for r in rhr_rows],
        'sleep': [{'date': m.date.isoformat(), **m.data} for m in sleep],
        'weight': [{'date': m.date.isoformat(), 'qty': m.data.get('qty')} for m in weight],
        'activeEnergy': [{'date': str(r.day), 'kcal': round(r.total)} for r in energy_rows],
        'distance': [{'date': str(r.day), 'km': round(r.total, 2)} for r in distance_rows],
        'workouts': [w.to_dict() for w in workouts],
    })


@dashboard_bp.route('/summary', methods=['GET'])
def daily_summary():
    """Today's summary: aggregated health metrics + gamification score."""
    today = date.today()

    # Steps: SUM for today
    steps_total = db.session.query(
        func.sum(_qty_field())
    ).filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'step_count',
        func.date(HealthMetric.date) == today,
    ).scalar()

    # Active energy: SUM for today
    energy_total = db.session.query(
        func.sum(_qty_field())
    ).filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'active_energy',
        func.date(HealthMetric.date) == today,
    ).scalar()

    # Sleep: latest entry (usually from last night)
    yesterday = today - timedelta(days=1)
    latest_sleep = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'sleep_analysis',
        func.date(HealthMetric.date) >= yesterday,
    ).order_by(HealthMetric.date.desc()).first()

    # Weight: latest entry
    latest_weight = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'weight_body_mass',
    ).order_by(HealthMetric.date.desc()).first()

    # Resting heart rate: latest today
    latest_rhr = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'resting_heart_rate',
        func.date(HealthMetric.date) == today,
    ).order_by(HealthMetric.date.desc()).first()

    score = calculate_daily_score(1, today)
    user = User.query.get(1)

    return jsonify({
        'steps': {'qty': round(steps_total)} if steps_total else None,
        'activeEnergy': {'kcal': round(energy_total)} if energy_total else None,
        'sleep': latest_sleep.data if latest_sleep else None,
        'weight': latest_weight.data if latest_weight else None,
        'restingHeartRate': {'avg': round(float(latest_rhr.data.get('qty', 0)), 1)} if latest_rhr else None,
        'score': score,
        'user': user.to_dict() if user else None,
    })
