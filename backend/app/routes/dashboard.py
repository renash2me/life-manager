from datetime import datetime, timedelta, timezone, date
from flask import Blueprint, jsonify, request
from sqlalchemy import text
from ..extensions import db
from ..models.health import HealthMetric, Workout
from ..models.user import User
from ..services.scoring import calculate_daily_score

dashboard_bp = Blueprint('dashboard', __name__)


def _aggregate_sum(metric_name, since, user_id=1):
    """SUM qty per day for a given metric."""
    rows = db.session.execute(text("""
        SELECT date::date AS day, SUM(CAST(data->>'qty' AS FLOAT)) AS total
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = :name AND date >= :since
        GROUP BY day ORDER BY day
    """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchall()
    return rows


def _aggregate_hr(metric_name, since, user_id=1):
    """AVG/MIN/MAX qty per day for heart rate metrics."""
    rows = db.session.execute(text("""
        SELECT date::date AS day,
               AVG(CAST(data->>'qty' AS FLOAT)) AS avg_val,
               MIN(CAST(data->>'qty' AS FLOAT)) AS min_val,
               MAX(CAST(data->>'qty' AS FLOAT)) AS max_val
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = :name AND date >= :since
        GROUP BY day ORDER BY day
    """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchall()
    return rows


def _sum_today(metric_name, today, user_id=1):
    """SUM qty for a specific day."""
    row = db.session.execute(text("""
        SELECT SUM(CAST(data->>'qty' AS FLOAT)) AS total
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = :name AND date::date = :today
    """), {'uid': user_id, 'name': metric_name, 'today': today}).fetchone()
    return row.total if row and row.total else None


@dashboard_bp.route('/health', methods=['GET'])
def health_overview():
    """Aggregate health data for dashboard display, grouped by day."""
    days = request.args.get('days', 7, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Steps: SUM per day
    steps_rows = _aggregate_sum('step_count', since)

    # Heart rate: AVG/MIN/MAX per day
    hr_rows = _aggregate_hr('heart_rate', since)

    # Resting heart rate: AVG per day
    rhr_rows = db.session.execute(text("""
        SELECT date::date AS day, AVG(CAST(data->>'qty' AS FLOAT)) AS avg_val
        FROM health_metrics
        WHERE user_id = 1 AND metric_name = 'resting_heart_rate' AND date >= :since
        GROUP BY day ORDER BY day
    """), {'since': since}).fetchall()

    # Sleep: raw entries (usually 1 per night)
    sleep = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'sleep_analysis',
        HealthMetric.date >= since,
    ).order_by(HealthMetric.date.asc()).all()

    # Weight: latest per day
    weight_rows = db.session.execute(text("""
        SELECT DISTINCT ON (date::date) date::date AS day, data->>'qty' AS qty
        FROM health_metrics
        WHERE user_id = 1 AND metric_name = 'weight_body_mass'
        ORDER BY date::date, date DESC
    """)).fetchall()

    # Active energy: SUM per day
    energy_rows = _aggregate_sum('active_energy', since)

    # Walking/running distance: SUM per day
    distance_rows = _aggregate_sum('walking_running_distance', since)

    # Workouts
    workouts = Workout.query.filter(
        Workout.user_id == 1,
        Workout.start_time >= since,
    ).order_by(Workout.start_time.desc()).limit(10).all()

    return jsonify({
        'steps': [{'date': str(r.day), 'qty': round(r.total)} for r in steps_rows if r.total],
        'heartRate': [{'date': str(r.day), 'Avg': round(r.avg_val or 0, 1), 'Min': round(r.min_val or 0, 1), 'Max': round(r.max_val or 0, 1)} for r in hr_rows],
        'restingHeartRate': [{'date': str(r.day), 'avg': round(r.avg_val or 0, 1)} for r in rhr_rows],
        'sleep': [{'date': m.date.isoformat(), **m.data} for m in sleep],
        'weight': [{'date': str(r.day), 'qty': float(r.qty) if r.qty else 0} for r in weight_rows],
        'activeEnergy': [{'date': str(r.day), 'kcal': round(r.total)} for r in energy_rows if r.total],
        'distance': [{'date': str(r.day), 'km': round(r.total, 2)} for r in distance_rows if r.total],
        'workouts': [w.to_dict() for w in workouts],
    })


@dashboard_bp.route('/summary', methods=['GET'])
def daily_summary():
    """Today's summary: aggregated health metrics + gamification score."""
    today = date.today()

    # Steps: SUM for today
    steps_total = _sum_today('step_count', today)

    # Active energy: SUM for today
    energy_total = _sum_today('active_energy', today)

    # Sleep: latest entry (usually from last night)
    yesterday = today - timedelta(days=1)
    latest_sleep = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'sleep_analysis',
        HealthMetric.date >= datetime.combine(yesterday, datetime.min.time()),
    ).order_by(HealthMetric.date.desc()).first()

    # Weight: latest entry
    latest_weight = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.metric_name == 'weight_body_mass',
    ).order_by(HealthMetric.date.desc()).first()

    # Resting heart rate: latest today
    rhr_row = db.session.execute(text("""
        SELECT AVG(CAST(data->>'qty' AS FLOAT)) AS avg_val
        FROM health_metrics
        WHERE user_id = 1 AND metric_name = 'resting_heart_rate' AND date::date = :today
    """), {'today': today}).fetchone()

    score = calculate_daily_score(1, today)
    user = User.query.get(1)

    return jsonify({
        'steps': {'qty': round(steps_total)} if steps_total else None,
        'activeEnergy': {'kcal': round(energy_total)} if energy_total else None,
        'sleep': latest_sleep.data if latest_sleep else None,
        'weight': latest_weight.data if latest_weight else None,
        'restingHeartRate': {'avg': round(rhr_row.avg_val, 1)} if rhr_row and rhr_row.avg_val else None,
        'score': score,
        'user': user.to_dict() if user else None,
    })
