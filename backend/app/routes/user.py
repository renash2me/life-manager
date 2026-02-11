from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import text
from ..extensions import db
from ..models.user import User
from ..models.health import Workout
from ..services.scoring import calculate_score_history
from .auth_helpers import get_current_user_id

user_bp = Blueprint('user', __name__)


@user_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_current_user_id()
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@user_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    user_id = get_current_user_id()
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if 'nome' in data:
        user.nome = data['nome']
    if 'email' in data:
        user.email = data['email']
    db.session.commit()
    return jsonify(user.to_dict())


@user_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """RPG character stats based on last 30 days of health data."""
    user_id = get_current_user_id()
    since = datetime.now(timezone.utc) - timedelta(days=30)

    # --- Health Stats (0-100) ---

    # Vitalidade: avg steps/day (10000 steps = 100)
    steps_row = db.session.execute(text("""
        SELECT AVG(daily_total) AS avg_steps FROM (
            SELECT SUM(CAST(data->>'qty' AS FLOAT)) AS daily_total
            FROM health_metrics
            WHERE user_id = :uid AND metric_name = 'step_count' AND date >= :since
            GROUP BY date::date
        ) sub
    """), {'uid': user_id, 'since': since}).fetchone()
    avg_steps = steps_row.avg_steps if steps_row and steps_row.avg_steps else 0
    vitalidade = min(100, round(avg_steps / 100))  # 10000 steps = 100

    # Resistencia: avg sleep hours (8h = 100)
    sleep_row = db.session.execute(text("""
        SELECT AVG(CAST(data->>'asleep' AS FLOAT)) AS avg_sleep
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = 'sleep_analysis' AND date >= :since
    """), {'uid': user_id, 'since': since}).fetchone()
    avg_sleep_secs = sleep_row.avg_sleep if sleep_row and sleep_row.avg_sleep else 0
    avg_sleep_hours = avg_sleep_secs / 3600 if avg_sleep_secs else 0
    resistencia = min(100, round(avg_sleep_hours / 8 * 100))

    # Forca: workouts count + duration (10 workouts/month = 100)
    workouts = Workout.query.filter(
        Workout.user_id == user_id,
        Workout.start_time >= since,
    ).all()
    workout_count = len(workouts)
    forca = min(100, round(workout_count / 10 * 100))

    # Foco: mindfulness days + minutes (15 days of meditation = 100)
    mindful_row = db.session.execute(text("""
        SELECT COUNT(DISTINCT date::date) AS days,
               SUM(CAST(data->>'qty' AS FLOAT)) AS total_min
        FROM health_metrics
        WHERE user_id = :uid AND metric_name = 'mindful_minutes' AND date >= :since
    """), {'uid': user_id, 'since': since}).fetchone()
    mindful_days = mindful_row.days if mindful_row and mindful_row.days else 0
    foco = min(100, round(mindful_days / 15 * 100))

    # --- Life Area Stats (0-100, from score history) ---
    score_history = calculate_score_history(user_id, 30)
    area_totals = {}
    for day in score_history:
        for area, val in (day.get('porArea') or {}).items():
            area_totals[area] = area_totals.get(area, 0) + val

    # Normalize: max possible per area ~ 30 days * 10 points = 300
    area_stats = {}
    for area, total in area_totals.items():
        area_stats[area] = min(100, round(total / 300 * 100))

    return jsonify({
        'health': {
            'Vitalidade': vitalidade,
            'Resistência': resistencia,
            'Força': forca,
            'Foco': foco,
        },
        'areas': area_stats,
    })


@user_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@user_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if 'nome' in data:
        user.nome = data['nome']
    if 'email' in data:
        user.email = data['email']
    db.session.commit()
    return jsonify(user.to_dict())
