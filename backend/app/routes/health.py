from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.health import HealthMetric, Workout
from ..services.health_ingester import process_health_export

health_bp = Blueprint('health', __name__)


@health_bp.route('/ingest', methods=['POST'])
def ingest_health_data():
    """Receives POST JSON from Health Auto Export iOS app."""
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'No JSON payload'}), 400

    try:
        result = process_health_export(payload, user_id=1)
        return jsonify(result), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@health_bp.route('/metrics', methods=['GET'])
def get_metrics():
    """Get health metrics with optional filters."""
    metric_name = request.args.get('name')
    days = request.args.get('days', 30, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    query = HealthMetric.query.filter(
        HealthMetric.user_id == 1,
        HealthMetric.date >= since,
    )
    if metric_name:
        query = query.filter(HealthMetric.metric_name == metric_name)

    metrics = query.order_by(HealthMetric.date.asc()).all()
    return jsonify([m.to_dict() for m in metrics])


@health_bp.route('/metrics/names', methods=['GET'])
def get_metric_names():
    """Get list of all unique metric names stored."""
    names = db.session.query(HealthMetric.metric_name).distinct().all()
    return jsonify([n[0] for n in names])


@health_bp.route('/workouts', methods=['GET'])
def get_workouts():
    """Get workouts with optional filters."""
    days = request.args.get('days', 30, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    workouts = Workout.query.filter(
        Workout.user_id == 1,
        Workout.start_time >= since,
    ).order_by(Workout.start_time.desc()).all()
    return jsonify([w.to_dict() for w in workouts])
