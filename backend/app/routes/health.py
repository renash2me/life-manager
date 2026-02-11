from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.health import HealthMetric, Workout
from ..models.user import User
from ..services.health_ingester import process_health_export
from .auth_helpers import get_current_user_id

health_bp = Blueprint('health', __name__)


def _resolve_ingest_user():
    """Resolve user for /ingest: JWT token > X-Api-Key header > fallback user 1."""
    # Try JWT first
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    try:
        verify_jwt_in_request()
        return get_jwt_identity()
    except Exception:
        pass

    # Fallback: API key or default user 1 (for Health Auto Export)
    api_key = request.headers.get('X-Api-Key')
    if api_key:
        user = User.query.filter_by(email=api_key).first()
        if user:
            return user.id
    # Default to user 1 for Health Auto Export compatibility
    return 1


@health_bp.route('/ingest', methods=['POST'])
def ingest_health_data():
    """Receives POST JSON from Health Auto Export iOS app."""
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'No JSON payload'}), 400

    user_id = _resolve_ingest_user()

    try:
        result = process_health_export(payload, user_id=user_id)
        return jsonify(result), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@health_bp.route('/metrics', methods=['GET'])
@jwt_required()
def get_metrics():
    """Get health metrics with optional filters."""
    user_id = get_current_user_id()
    metric_name = request.args.get('name')
    days = request.args.get('days', 30, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    query = HealthMetric.query.filter(
        HealthMetric.user_id == user_id,
        HealthMetric.date >= since,
    )
    if metric_name:
        query = query.filter(HealthMetric.metric_name == metric_name)

    metrics = query.order_by(HealthMetric.date.asc()).all()
    return jsonify([m.to_dict() for m in metrics])


@health_bp.route('/metrics/names', methods=['GET'])
@jwt_required()
def get_metric_names():
    """Get list of all unique metric names stored."""
    names = db.session.query(HealthMetric.metric_name).distinct().all()
    return jsonify([n[0] for n in names])


@health_bp.route('/workouts', methods=['GET'])
@jwt_required()
def get_workouts():
    """Get workouts with optional filters."""
    user_id = get_current_user_id()
    days = request.args.get('days', 30, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    workouts = Workout.query.filter(
        Workout.user_id == user_id,
        Workout.start_time >= since,
    ).order_by(Workout.start_time.desc()).all()
    return jsonify([w.to_dict() for w in workouts])
