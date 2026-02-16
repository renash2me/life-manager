from datetime import datetime, timedelta, timezone, date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import text
from ..extensions import db
from ..models.health import HealthMetric, Workout
from ..models.user import User
from ..services.scoring import calculate_daily_score
from .auth_helpers import get_current_user_id

dashboard_bp = Blueprint('dashboard', __name__)


def _aggregate_sum(metric_name, since, user_id):
    """SUM qty per day for a given metric."""
    rows = db.session.execute(text("""
        SELECT date::date AS day, SUM(CAST(data->>'qty' AS FLOAT)) AS total
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = :name AND date >= :since
        GROUP BY day ORDER BY day
    """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchall()
    return rows


def _aggregate_hr(metric_name, since, user_id):
    """AVG/MIN/MAX per day for heart rate metrics (data has Avg/Min/Max keys)."""
    rows = db.session.execute(text("""
        SELECT date::date AS day,
               AVG(CAST(COALESCE(data->>'Avg', data->>'qty') AS FLOAT)) AS avg_val,
               MIN(CAST(COALESCE(data->>'Min', data->>'qty') AS FLOAT)) AS min_val,
               MAX(CAST(COALESCE(data->>'Max', data->>'qty') AS FLOAT)) AS max_val
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = :name AND date >= :since
        GROUP BY day ORDER BY day
    """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchall()
    return rows


def _sum_today(metric_name, target_date, user_id):
    """SUM qty for a specific day."""
    row = db.session.execute(text("""
        SELECT SUM(CAST(data->>'qty' AS FLOAT)) AS total
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = :name AND date::date = :today
    """), {'uid': user_id, 'name': metric_name, 'today': target_date}).fetchone()
    return row.total if row and row.total else None


@dashboard_bp.route('/health', methods=['GET'])
@jwt_required()
def health_overview():
    """Aggregate health data for dashboard display, grouped by day."""
    user_id = get_current_user_id()
    days = request.args.get('days', 7, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Steps: SUM per day
    steps_rows = _aggregate_sum('step_count', since, user_id)

    # Heart rate: AVG/MIN/MAX per day
    hr_rows = _aggregate_hr('heart_rate', since, user_id)

    # Resting heart rate: AVG per day
    rhr_rows = db.session.execute(text("""
        SELECT date::date AS day, AVG(CAST(COALESCE(data->>'Avg', data->>'qty') AS FLOAT)) AS avg_val
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = 'resting_heart_rate' AND date >= :since
        GROUP BY day ORDER BY day
    """), {'uid': user_id, 'since': since}).fetchall()

    # Sleep: raw entries (usually 1 per night)
    sleep = HealthMetric.query.filter(
        HealthMetric.user_id == user_id,
        HealthMetric.metric_name == 'sleep_analysis',
        HealthMetric.date >= since,
    ).order_by(HealthMetric.date.asc()).all()

    # Weight: latest per day
    weight_rows = db.session.execute(text("""
        SELECT DISTINCT ON (date::date) date::date AS day, data->>'qty' AS qty
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = 'weight_body_mass'
        ORDER BY date::date, date DESC
    """), {'uid': user_id}).fetchall()

    # Active energy: SUM per day
    energy_rows = _aggregate_sum('active_energy', since, user_id)

    # Walking/running distance: SUM per day
    distance_rows = _aggregate_sum('walking_running_distance', since, user_id)

    # Workouts
    workouts = Workout.query.filter(
        Workout.user_id == user_id,
        Workout.start_time >= since,
    ).order_by(Workout.start_time.desc()).limit(10).all()

    # Mindfulness: SUM per day
    mindful_rows = _aggregate_sum('mindful_minutes', since, user_id)

    # VO2 Max: latest per day
    vo2_rows = db.session.execute(text("""
        SELECT DISTINCT ON (date::date) date::date AS day, data->>'qty' AS qty
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = 'vo2_max' AND date >= :since
        ORDER BY date::date, date DESC
    """), {'uid': user_id, 'since': since}).fetchall()

    return jsonify({
        'steps': [{'date': str(r.day), 'qty': round(r.total)} for r in steps_rows if r.total],
        'heartRate': [{'date': str(r.day), 'Avg': round(r.avg_val or 0, 1), 'Min': round(r.min_val or 0, 1), 'Max': round(r.max_val or 0, 1)} for r in hr_rows],
        'restingHeartRate': [{'date': str(r.day), 'avg': round(r.avg_val or 0, 1)} for r in rhr_rows],
        'sleep': [{'date': m.date.isoformat(), **m.data} for m in sleep],
        'weight': [{'date': str(r.day), 'qty': float(r.qty) if r.qty else 0} for r in weight_rows],
        'activeEnergy': [{'date': str(r.day), 'kcal': round(r.total)} for r in energy_rows if r.total],
        'distance': [{'date': str(r.day), 'km': round(r.total, 2)} for r in distance_rows if r.total],
        'workouts': [w.to_dict() for w in workouts],
        'mindfulness': [{'date': str(r.day), 'minutes': round(r.total, 1)} for r in mindful_rows if r.total],
        'vo2max': [{'date': str(r.day), 'qty': round(float(r.qty), 1) if r.qty else 0} for r in vo2_rows],
    })


METRIC_KEY_MAP = {
    'steps': {'name': 'step_count', 'type': 'sum', 'field': 'qty', 'unit': 'passos', 'label': 'Passos'},
    'activeEnergy': {'name': 'active_energy', 'type': 'sum', 'field': 'qty', 'unit': 'kcal', 'label': 'Calorias Ativas'},
    'distance': {'name': 'walking_running_distance', 'type': 'sum', 'field': 'qty', 'unit': 'km', 'label': 'Distancia'},
    'weight': {'name': 'weight_body_mass', 'type': 'latest', 'field': 'qty', 'unit': 'kg', 'label': 'Peso'},
    'sleep': {'name': 'sleep_analysis', 'type': 'raw', 'field': 'asleep', 'unit': 'h', 'label': 'Sono'},
    'restingHeartRate': {'name': 'resting_heart_rate', 'type': 'hr', 'field': 'avg', 'unit': 'bpm', 'label': 'FC Repouso'},
    'mindfulness': {'name': 'mindful_minutes', 'type': 'sum', 'field': 'qty', 'unit': 'min', 'label': 'Meditacao'},
    'heartRate': {'name': 'heart_rate', 'type': 'hr', 'field': 'avg', 'unit': 'bpm', 'label': 'Freq. Cardiaca'},
    'vo2max': {'name': 'vo2_max', 'type': 'latest', 'field': 'qty', 'unit': 'mL/min.kg', 'label': 'VO2 Max'},
}


@dashboard_bp.route('/metric/<metric_key>', methods=['GET'])
@jwt_required()
def metric_detail(metric_key):
    """Return detailed daily data for a specific metric."""
    user_id = get_current_user_id()
    cfg = METRIC_KEY_MAP.get(metric_key)
    if not cfg:
        return jsonify({'error': 'Unknown metric'}), 404

    days = request.args.get('days', 365, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)
    metric_name = cfg['name']
    data_points = []

    if cfg['type'] == 'sum':
        rows = _aggregate_sum(metric_name, since, user_id)
        data_points = [{'date': str(r.day), 'value': round(r.total, 2)} for r in rows if r.total]
    elif cfg['type'] == 'hr':
        rows = _aggregate_hr(metric_name, since, user_id)
        data_points = [{'date': str(r.day), 'value': round(r.avg_val or 0, 1),
                        'min': round(r.min_val or 0, 1), 'max': round(r.max_val or 0, 1)} for r in rows]
    elif cfg['type'] == 'latest':
        rows = db.session.execute(text("""
            SELECT DISTINCT ON (date::date) date::date AS day, data->>'qty' AS qty
            FROM health_metrics
            WHERE user_id = :uid AND metric_name = :name AND date >= :since
            ORDER BY date::date, date DESC
        """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchall()
        data_points = [{'date': str(r.day), 'value': round(float(r.qty), 2) if r.qty else 0} for r in rows]
    elif cfg['type'] == 'raw':
        metrics = HealthMetric.query.filter(
            HealthMetric.user_id == user_id,
            HealthMetric.metric_name == metric_name,
            HealthMetric.date >= since,
        ).order_by(HealthMetric.date.asc()).all()
        for m in metrics:
            val = m.data.get('asleep') or m.data.get('totalSleep') or m.data.get('qty', 0)
            val = float(val) if val else 0
            # Convert seconds to hours if value looks like seconds
            if val > 24:
                val = val / 3600
            data_points.append({'date': m.date.isoformat()[:10], 'value': round(val, 2)})

    # Calculate stats
    values = [p['value'] for p in data_points if p.get('value')]
    stats = {}
    if values:
        stats = {
            'avg': round(sum(values) / len(values), 1),
            'min': round(min(values), 1),
            'max': round(max(values), 1),
            'total': round(sum(values), 1),
            'count': len(values),
        }

    return jsonify({
        'key': metric_key,
        'label': cfg['label'],
        'unit': cfg['unit'],
        'chartType': 'line' if cfg['type'] in ('hr', 'latest') else 'bar',
        'data': data_points,
        'stats': stats,
    })


EVOLUTION_COLORS = {
    'steps': '#16a34a',
    'activeEnergy': '#f59e42',
    'distance': '#0ea5e9',
    'weight': '#a21caf',
    'sleep': '#7c3aed',
    'restingHeartRate': '#f43f5e',
    'heartRate': '#ef4444',
    'mindfulness': '#a855f7',
    'vo2max': '#0ea5e9',
}


@dashboard_bp.route('/evolution', methods=['GET'])
@jwt_required()
def evolution_data():
    """Return daily data for ALL metrics, for cross-referencing on the Evolution page."""
    user_id = get_current_user_id()
    days = request.args.get('days', 365, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    result_metrics = {}
    available = []

    for key, cfg in METRIC_KEY_MAP.items():
        metric_name = cfg['name']
        data_points = []

        if cfg['type'] == 'sum':
            rows = _aggregate_sum(metric_name, since, user_id)
            data_points = [{'date': str(r.day), 'value': round(r.total, 2)} for r in rows if r.total]
        elif cfg['type'] == 'hr':
            rows = _aggregate_hr(metric_name, since, user_id)
            data_points = [{'date': str(r.day), 'value': round(r.avg_val or 0, 1)} for r in rows]
        elif cfg['type'] == 'latest':
            rows = db.session.execute(text("""
                SELECT DISTINCT ON (date::date) date::date AS day, data->>'qty' AS qty
                FROM health_metrics
                WHERE user_id = :uid AND metric_name = :name AND date >= :since
                ORDER BY date::date, date DESC
            """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchall()
            data_points = [{'date': str(r.day), 'value': round(float(r.qty), 2) if r.qty else 0} for r in rows]
        elif cfg['type'] == 'raw':
            metrics = HealthMetric.query.filter(
                HealthMetric.user_id == user_id,
                HealthMetric.metric_name == metric_name,
                HealthMetric.date >= since,
            ).order_by(HealthMetric.date.asc()).all()
            for m in metrics:
                val = m.data.get('asleep') or m.data.get('totalSleep') or m.data.get('qty', 0)
                val = float(val) if val else 0
                if val > 24:
                    val = val / 3600
                data_points.append({'date': m.date.isoformat()[:10], 'value': round(val, 2)})

        if data_points:
            result_metrics[key] = data_points
            available.append({
                'key': key,
                'label': cfg['label'],
                'unit': cfg['unit'],
                'color': EVOLUTION_COLORS.get(key, '#7c3aed'),
            })

    return jsonify({'metrics': result_metrics, 'available': available})


@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def daily_summary():
    """Summary for a given date: aggregated health metrics + gamification score."""
    user_id = get_current_user_id()
    target_date_str = request.args.get('date')
    target_date = date.fromisoformat(target_date_str) if target_date_str else date.today()

    # Steps: SUM for target date
    steps_total = _sum_today('step_count', target_date, user_id)

    # Active energy: SUM for target date
    energy_total = _sum_today('active_energy', target_date, user_id)

    # Sleep: latest entry (usually from last night)
    yesterday = target_date - timedelta(days=1)
    latest_sleep = HealthMetric.query.filter(
        HealthMetric.user_id == user_id,
        HealthMetric.metric_name == 'sleep_analysis',
        HealthMetric.date >= datetime.combine(yesterday, datetime.min.time()),
    ).order_by(HealthMetric.date.desc()).first()

    # Weight: latest entry
    latest_weight = HealthMetric.query.filter(
        HealthMetric.user_id == user_id,
        HealthMetric.metric_name == 'weight_body_mass',
    ).order_by(HealthMetric.date.desc()).first()

    # Resting heart rate: latest for target date
    rhr_row = db.session.execute(text("""
        SELECT AVG(CAST(COALESCE(data->>'Avg', data->>'qty') AS FLOAT)) AS avg_val
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = 'resting_heart_rate' AND date::date = :today
    """), {'uid': user_id, 'today': target_date}).fetchone()

    # Mindfulness: SUM for target date
    mindful_total = _sum_today('mindful_minutes', target_date, user_id)

    # VO2 Max: latest entry ever
    latest_vo2 = HealthMetric.query.filter(
        HealthMetric.user_id == user_id,
        HealthMetric.metric_name == 'vo2_max',
    ).order_by(HealthMetric.date.desc()).first()

    score = calculate_daily_score(user_id, target_date)
    user = User.query.get(user_id)

    # IMC calculation
    imc_data = None
    if user and user.altura and latest_weight:
        weight_val = float(latest_weight.data.get('qty', 0))
        if weight_val > 0 and user.altura > 0:
            imc_val = round(weight_val / (user.altura ** 2), 1)
            if imc_val < 18.5:
                imc_cat, imc_color = 'Abaixo do peso', '#60a5fa'
            elif imc_val < 25:
                imc_cat, imc_color = 'Normal', '#34d399'
            elif imc_val < 30:
                imc_cat, imc_color = 'Sobrepeso', '#fbbf24'
            elif imc_val < 35:
                imc_cat, imc_color = 'Obesidade I', '#f87171'
            elif imc_val < 40:
                imc_cat, imc_color = 'Obesidade II', '#ef4444'
            else:
                imc_cat, imc_color = 'Obesidade III', '#dc2626'
            imc_data = {'value': imc_val, 'category': imc_cat, 'color': imc_color}

    return jsonify({
        'date': target_date.isoformat(),
        'steps': {'qty': round(steps_total)} if steps_total else None,
        'activeEnergy': {'kcal': round(energy_total)} if energy_total else None,
        'sleep': latest_sleep.data if latest_sleep else None,
        'weight': latest_weight.data if latest_weight else None,
        'restingHeartRate': {'avg': round(rhr_row.avg_val, 1)} if rhr_row and rhr_row.avg_val else None,
        'mindfulness': {'minutes': round(mindful_total, 1)} if mindful_total else None,
        'vo2max': {'qty': round(float(latest_vo2.data.get('qty', 0)), 1)} if latest_vo2 else None,
        'imc': imc_data,
        'score': score,
        'user': user.to_dict() if user else None,
    })
