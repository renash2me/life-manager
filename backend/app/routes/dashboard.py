from datetime import datetime, timedelta, timezone, date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import text
from ..extensions import db
from ..models.health import HealthMetric, Workout
from ..models.user import User
from ..services.scoring import calculate_daily_score
from ..services.metrics import (
    METRIC_CONFIG, METRIC_NAME_TO_KEY, METRIC_COLORS,
    get_all_metric_configs,
)
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
    """AVG/MIN/MAX per day for heart rate metrics."""
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


def _aggregate_latest(metric_name, since, user_id):
    """Latest value per day."""
    rows = db.session.execute(text("""
        SELECT DISTINCT ON (date::date) date::date AS day, data->>'qty' AS qty
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = :name AND date >= :since
        ORDER BY date::date, date DESC
    """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchall()
    return rows


def _aggregate_sleep(metric_name, since, user_id):
    """Raw sleep entries."""
    metrics = HealthMetric.query.filter(
        HealthMetric.user_id == user_id,
        HealthMetric.metric_name == metric_name,
        HealthMetric.date >= since,
    ).order_by(HealthMetric.date.asc()).all()
    return metrics


def _get_metric_data_points(metric_name, agg, since, user_id):
    """Get data points for any metric based on aggregation type."""
    if agg == 'sum':
        rows = _aggregate_sum(metric_name, since, user_id)
        return [{'date': str(r.day), 'value': round(r.total, 2)} for r in rows if r.total]
    elif agg == 'hr':
        rows = _aggregate_hr(metric_name, since, user_id)
        return [{'date': str(r.day), 'value': round(r.avg_val or 0, 1),
                 'min': round(r.min_val or 0, 1), 'max': round(r.max_val or 0, 1)} for r in rows]
    elif agg == 'latest':
        rows = _aggregate_latest(metric_name, since, user_id)
        return [{'date': str(r.day), 'value': round(float(r.qty), 2) if r.qty else 0} for r in rows]
    elif agg == 'sleep':
        metrics = _aggregate_sleep(metric_name, since, user_id)
        data_points = []
        for m in metrics:
            val = m.data.get('asleep') or m.data.get('totalSleep') or m.data.get('qty', 0)
            val = float(val) if val else 0
            if val > 24:
                val = val / 3600
            data_points.append({'date': m.date.isoformat()[:10], 'value': round(val, 2)})
        return data_points
    return []


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
    """Aggregate health data for dashboard display - dynamically includes ALL metrics."""
    user_id = get_current_user_id()
    days = request.args.get('days', 7, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    all_configs = get_all_metric_configs(user_id)
    result = {}

    for key, cfg in all_configs.items():
        metric_name = cfg['name']
        agg = cfg.get('agg', 'sum')

        if agg == 'sum':
            rows = _aggregate_sum(metric_name, since, user_id)
            # Keep backward-compatible field names for known metrics
            if key == 'steps':
                result[key] = [{'date': str(r.day), 'qty': round(r.total)} for r in rows if r.total]
            elif key == 'activeEnergy':
                result[key] = [{'date': str(r.day), 'kcal': round(r.total)} for r in rows if r.total]
            elif key == 'distance':
                result[key] = [{'date': str(r.day), 'km': round(r.total, 2)} for r in rows if r.total]
            elif key == 'mindfulness':
                result[key] = [{'date': str(r.day), 'minutes': round(r.total, 1)} for r in rows if r.total]
            else:
                result[key] = [{'date': str(r.day), 'value': round(r.total, 2)} for r in rows if r.total]
        elif agg == 'hr':
            rows = _aggregate_hr(metric_name, since, user_id)
            if key == 'restingHeartRate':
                result[key] = [{'date': str(r.day), 'avg': round(r.avg_val or 0, 1)} for r in rows]
            elif key == 'heartRate':
                result[key] = [{'date': str(r.day), 'Avg': round(r.avg_val or 0, 1),
                                'Min': round(r.min_val or 0, 1), 'Max': round(r.max_val or 0, 1)} for r in rows]
            else:
                result[key] = [{'date': str(r.day), 'value': round(r.avg_val or 0, 1),
                                'min': round(r.min_val or 0, 1), 'max': round(r.max_val or 0, 1)} for r in rows]
        elif agg == 'latest':
            rows = _aggregate_latest(metric_name, since, user_id)
            if key == 'weight':
                result[key] = [{'date': str(r.day), 'qty': float(r.qty) if r.qty else 0} for r in rows]
            elif key == 'vo2max':
                result[key] = [{'date': str(r.day), 'qty': round(float(r.qty), 1) if r.qty else 0} for r in rows]
            else:
                result[key] = [{'date': str(r.day), 'value': round(float(r.qty), 2) if r.qty else 0} for r in rows]
        elif agg == 'sleep':
            metrics = _aggregate_sleep(metric_name, since, user_id)
            result[key] = [{'date': m.date.isoformat(), **m.data} for m in metrics]

    # Workouts (special case, not a metric)
    workouts = Workout.query.filter(
        Workout.user_id == user_id,
        Workout.start_time >= since,
    ).order_by(Workout.start_time.desc()).limit(10).all()
    result['workouts'] = [w.to_dict() for w in workouts]

    # Include metadata for all metrics (used by frontend to render dynamic charts)
    result['_metricsMeta'] = {}
    for key, cfg in all_configs.items():
        result['_metricsMeta'][key] = {
            'label': cfg['label'],
            'unit': cfg.get('unit', ''),
            'agg': cfg.get('agg', 'sum'),
            'color': cfg.get('color') or METRIC_COLORS.get(key, '#7c3aed'),
            'discovered': cfg.get('discovered', False),
        }

    return jsonify(result)


@dashboard_bp.route('/metrics-config', methods=['GET'])
@jwt_required()
def metrics_config():
    """Return config for all available metrics (for frontend pickers/charts)."""
    user_id = get_current_user_id()
    all_configs = get_all_metric_configs(user_id)
    result = []
    for key, cfg in all_configs.items():
        agg = cfg.get('agg', 'sum')
        result.append({
            'key': key,
            'label': cfg['label'],
            'unit': cfg.get('unit', ''),
            'agg': agg,
            'chartType': 'line' if agg in ('hr', 'latest') else 'bar',
            'color': cfg.get('color') or METRIC_COLORS.get(key, '#7c3aed'),
            'discovered': cfg.get('discovered', False),
        })
    return jsonify(result)


@dashboard_bp.route('/metric/<metric_key>', methods=['GET'])
@jwt_required()
def metric_detail(metric_key):
    """Return detailed daily data for a specific metric (known or discovered)."""
    user_id = get_current_user_id()

    # Try known config first, then dynamic discovery
    all_configs = get_all_metric_configs(user_id)
    cfg = all_configs.get(metric_key)
    if not cfg:
        return jsonify({'error': 'Unknown metric'}), 404

    days = request.args.get('days', 365, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)
    agg = cfg.get('agg', 'sum')

    data_points = _get_metric_data_points(cfg['name'], agg, since, user_id)

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
        'unit': cfg.get('unit', ''),
        'chartType': 'line' if agg in ('hr', 'latest') else 'bar',
        'color': cfg.get('color') or METRIC_COLORS.get(metric_key, '#7c3aed'),
        'data': data_points,
        'stats': stats,
    })


@dashboard_bp.route('/evolution', methods=['GET'])
@jwt_required()
def evolution_data():
    """Return daily data for ALL metrics, for cross-referencing on the Evolution page."""
    user_id = get_current_user_id()
    days = request.args.get('days', 365, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    all_configs = get_all_metric_configs(user_id)
    result_metrics = {}
    available = []

    for key, cfg in all_configs.items():
        data_points = _get_metric_data_points(cfg['name'], cfg.get('agg', 'sum'), since, user_id)

        if data_points:
            result_metrics[key] = data_points
            available.append({
                'key': key,
                'label': cfg['label'],
                'unit': cfg.get('unit', ''),
                'color': cfg.get('color') or METRIC_COLORS.get(key, '#7c3aed'),
            })

    return jsonify({'metrics': result_metrics, 'available': available})


@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def daily_summary():
    """Summary for a given date: aggregated health metrics + gamification score."""
    user_id = get_current_user_id()
    target_date_str = request.args.get('date')
    target_date = date.fromisoformat(target_date_str) if target_date_str else date.today()

    steps_total = _sum_today('step_count', target_date, user_id)
    energy_total = _sum_today('active_energy', target_date, user_id)

    yesterday = target_date - timedelta(days=1)
    latest_sleep = HealthMetric.query.filter(
        HealthMetric.user_id == user_id,
        HealthMetric.metric_name == 'sleep_analysis',
        HealthMetric.date >= datetime.combine(yesterday, datetime.min.time()),
    ).order_by(HealthMetric.date.desc()).first()

    latest_weight = HealthMetric.query.filter(
        HealthMetric.user_id == user_id,
        HealthMetric.metric_name == 'weight_body_mass',
    ).order_by(HealthMetric.date.desc()).first()

    rhr_row = db.session.execute(text("""
        SELECT AVG(CAST(COALESCE(data->>'Avg', data->>'qty') AS FLOAT)) AS avg_val
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = 'resting_heart_rate' AND date::date = :today
    """), {'uid': user_id, 'today': target_date}).fetchone()

    mindful_total = _sum_today('mindful_minutes', target_date, user_id)

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

    # Also include all discovered metrics for the day
    all_configs = get_all_metric_configs(user_id)
    extra_metrics = {}
    known_keys = {'steps', 'activeEnergy', 'weight', 'sleep', 'restingHeartRate', 'mindfulness', 'vo2max'}
    for key, cfg in all_configs.items():
        if key in known_keys:
            continue
        metric_name = cfg['name']
        agg = cfg.get('agg', 'sum')
        if agg == 'sum':
            val = _sum_today(metric_name, target_date, user_id)
            if val:
                extra_metrics[key] = {'value': round(val, 2), 'label': cfg['label'], 'unit': cfg.get('unit', '')}
        elif agg == 'latest':
            row = db.session.execute(text("""
                SELECT data->>'qty' AS qty FROM health_metrics
                WHERE user_id = :uid AND metric_name = :name
                ORDER BY date DESC LIMIT 1
            """), {'uid': user_id, 'name': metric_name}).fetchone()
            if row and row.qty:
                extra_metrics[key] = {'value': round(float(row.qty), 2), 'label': cfg['label'], 'unit': cfg.get('unit', '')}
        elif agg == 'hr':
            row = db.session.execute(text("""
                SELECT AVG(CAST(COALESCE(data->>'Avg', data->>'qty') AS FLOAT)) AS avg_val
                FROM health_metrics
                WHERE user_id = :uid AND metric_name = :name AND date::date = :today
            """), {'uid': user_id, 'name': metric_name, 'today': target_date}).fetchone()
            if row and row.avg_val:
                extra_metrics[key] = {'value': round(row.avg_val, 1), 'label': cfg['label'], 'unit': cfg.get('unit', '')}

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
        'extraMetrics': extra_metrics,
        'score': score,
        'user': user.to_dict() if user else None,
    })
