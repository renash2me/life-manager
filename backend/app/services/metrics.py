"""Shared metrics service - centralizes metric calculation for goals and dashboard.

Fixes timezone bug: uses UTC-3 (Brazil) instead of date.today() which uses Docker UTC.
Fixes query bug: uses UTC range instead of date::date = :d which misses records.
"""
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import text
from ..extensions import db

BRT = timezone(timedelta(hours=-3))

METRIC_CONFIG = {
    'steps':            {'name': 'step_count',              'agg': 'sum',    'unit': 'passos',    'label': 'Passos'},
    'activeEnergy':     {'name': 'active_energy',           'agg': 'sum',    'unit': 'kcal',      'label': 'Calorias Ativas'},
    'distance':         {'name': 'walking_running_distance','agg': 'sum',    'unit': 'km',        'label': 'Distancia'},
    'weight':           {'name': 'weight_body_mass',        'agg': 'latest', 'unit': 'kg',        'label': 'Peso'},
    'sleep':            {'name': 'sleep_analysis',          'agg': 'sleep',  'unit': 'h',         'label': 'Sono'},
    'restingHeartRate': {'name': 'resting_heart_rate',      'agg': 'hr',     'unit': 'bpm',       'label': 'FC Repouso'},
    'mindfulness':      {'name': 'mindful_minutes',         'agg': 'sum',    'unit': 'min',       'label': 'Meditacao'},
    'heartRate':        {'name': 'heart_rate',              'agg': 'hr',     'unit': 'bpm',       'label': 'Freq. Cardiaca'},
    'vo2max':           {'name': 'vo2_max',                 'agg': 'latest', 'unit': 'mL/min.kg', 'label': 'VO2 Max'},
}


def get_user_today():
    """Return today's date in Brazil timezone (UTC-3)."""
    return datetime.now(BRT).date()


def _day_utc_range(d):
    """Return (start, end) UTC timestamps for a given local date in BRT."""
    start_local = datetime(d.year, d.month, d.day, tzinfo=BRT)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)


def get_metric_value(user_id, metric_key, period_type, ref_date=None):
    """Calculate current value for a metric-based goal.

    Uses UTC range queries to fix the timezone bug where date::date = :d
    missed records stored in UTC that fall on the previous/next day in BRT.
    """
    today = ref_date or get_user_today()

    cfg = METRIC_CONFIG.get(metric_key)
    if not cfg:
        return None

    metric_name = cfg['name']
    agg = cfg['agg']

    # Determine the period start date
    if period_type == 'daily':
        since = today
    elif period_type == 'weekly':
        since = today - timedelta(days=today.weekday())
    elif period_type == 'monthly':
        since = today.replace(day=1)
    else:  # annual
        since = today.replace(month=1, day=1)

    if agg == 'sum':
        if period_type == 'daily':
            # Single day: use UTC range for accuracy
            utc_start, utc_end = _day_utc_range(today)
            row = db.session.execute(text("""
                SELECT SUM(CAST(data->>'qty' AS FLOAT)) AS total
                FROM health_metrics
                WHERE user_id = :uid AND metric_name = :name
                  AND date >= :start AND date < :end
            """), {'uid': user_id, 'name': metric_name,
                   'start': utc_start, 'end': utc_end}).fetchone()
            return round(row.total, 1) if row and row.total else 0
        else:
            # Multi-day average: use date range
            row = db.session.execute(text("""
                SELECT AVG(daily_total) AS avg_val FROM (
                    SELECT date::date AS day, SUM(CAST(data->>'qty' AS FLOAT)) AS daily_total
                    FROM health_metrics
                    WHERE user_id = :uid AND metric_name = :name AND date::date >= :since
                    GROUP BY day
                ) sub
            """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchone()
            return round(row.avg_val, 1) if row and row.avg_val else 0

    elif agg == 'latest':
        row = db.session.execute(text("""
            SELECT data->>'qty' AS qty FROM health_metrics
            WHERE user_id = :uid AND metric_name = :name
            ORDER BY date DESC LIMIT 1
        """), {'uid': user_id, 'name': metric_name}).fetchone()
        return round(float(row.qty), 1) if row and row.qty else None

    elif agg == 'hr':
        row = db.session.execute(text("""
            SELECT AVG(CAST(COALESCE(data->>'Avg', data->>'qty') AS FLOAT)) AS avg_val
            FROM health_metrics
            WHERE user_id = :uid AND metric_name = :name AND date::date >= :since
        """), {'uid': user_id, 'name': metric_name, 'since': since}).fetchone()
        return round(row.avg_val, 1) if row and row.avg_val else None

    elif agg == 'sleep':
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


def calc_progress(current, target, metric_key):
    """Calculate progress percentage for a metric goal."""
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
