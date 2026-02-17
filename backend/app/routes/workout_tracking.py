from datetime import date, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, func
from ..extensions import db
from ..models.workout_tracking import (
    Exercise, WorkoutPlan, WorkoutPlanExercise,
    WorkoutSession, WorkoutSet,
    MUSCLE_GROUP_LABELS,
)
from ..models.gamification import Action, Event
from ..models.user import User
from .auth_helpers import get_current_user_id

workout_bp = Blueprint('workouts_tracking', __name__)


# --- Exercises ---

@workout_bp.route('/exercises', methods=['GET'])
@jwt_required()
def list_exercises():
    """Search exercises with optional filters."""
    user_id = get_current_user_id()
    q = request.args.get('q', '').strip()
    muscle_group = request.args.get('muscle_group', '').strip()

    query = Exercise.query.filter(
        or_(Exercise.user_id == None, Exercise.user_id == user_id)
    )
    if q:
        query = query.filter(Exercise.name.ilike(f'%{q}%'))
    if muscle_group:
        query = query.filter(Exercise.muscle_group == muscle_group)

    exercises = query.order_by(Exercise.muscle_group, Exercise.name).all()
    return jsonify([e.to_dict() for e in exercises])


@workout_bp.route('/exercises', methods=['POST'])
@jwt_required()
def create_exercise():
    """Create a custom exercise."""
    user_id = get_current_user_id()
    data = request.get_json()

    exercise = Exercise(
        user_id=user_id,
        name=data['name'],
        muscle_group=data.get('muscleGroup', 'full_body'),
        equipment=data.get('equipment', 'none'),
        exercise_type=data.get('exerciseType', 'strength'),
        instructions=data.get('instructions'),
    )
    db.session.add(exercise)
    db.session.commit()
    return jsonify(exercise.to_dict()), 201


@workout_bp.route('/exercises/muscle-groups', methods=['GET'])
@jwt_required()
def muscle_groups():
    """Return available muscle groups."""
    return jsonify([{'value': k, 'label': v} for k, v in MUSCLE_GROUP_LABELS.items()])


# --- Workout Plans ---

@workout_bp.route('/plans', methods=['GET'])
@jwt_required()
def list_plans():
    user_id = get_current_user_id()
    plans = WorkoutPlan.query.filter_by(user_id=user_id).order_by(WorkoutPlan.order, WorkoutPlan.id).all()
    return jsonify([p.to_dict() for p in plans])


@workout_bp.route('/plans', methods=['POST'])
@jwt_required()
def create_plan():
    user_id = get_current_user_id()
    data = request.get_json()
    plan = WorkoutPlan(
        user_id=user_id,
        name=data['name'],
        description=data.get('description'),
        order=data.get('order', 0),
    )
    db.session.add(plan)
    db.session.commit()
    return jsonify(plan.to_dict()), 201


@workout_bp.route('/plans/<int:plan_id>', methods=['GET'])
@jwt_required()
def get_plan(plan_id):
    user_id = get_current_user_id()
    plan = WorkoutPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    return jsonify(plan.to_dict())


@workout_bp.route('/plans/<int:plan_id>', methods=['PUT'])
@jwt_required()
def update_plan(plan_id):
    user_id = get_current_user_id()
    plan = WorkoutPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    data = request.get_json()
    if 'name' in data:
        plan.name = data['name']
    if 'description' in data:
        plan.description = data['description']
    if 'active' in data:
        plan.active = data['active']
    if 'order' in data:
        plan.order = data['order']
    db.session.commit()
    return jsonify(plan.to_dict())


@workout_bp.route('/plans/<int:plan_id>', methods=['DELETE'])
@jwt_required()
def delete_plan(plan_id):
    user_id = get_current_user_id()
    plan = WorkoutPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    db.session.delete(plan)
    db.session.commit()
    return '', 204


# --- Plan Exercises ---

@workout_bp.route('/plans/<int:plan_id>/exercises', methods=['POST'])
@jwt_required()
def add_plan_exercise(plan_id):
    user_id = get_current_user_id()
    plan = WorkoutPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    data = request.get_json()

    pe = WorkoutPlanExercise(
        workout_plan_id=plan.id,
        exercise_id=data['exerciseId'],
        sets=data.get('sets', 3),
        reps=data.get('reps', '12'),
        rest_seconds=data.get('restSeconds', 60),
        notes=data.get('notes'),
        order=data.get('order', 0),
    )
    db.session.add(pe)
    db.session.commit()
    return jsonify(pe.to_dict()), 201


@workout_bp.route('/plans/<int:plan_id>/exercises/<int:pe_id>', methods=['PUT'])
@jwt_required()
def update_plan_exercise(plan_id, pe_id):
    user_id = get_current_user_id()
    WorkoutPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    pe = WorkoutPlanExercise.query.filter_by(id=pe_id, workout_plan_id=plan_id).first_or_404()
    data = request.get_json()

    if 'exerciseId' in data:
        pe.exercise_id = data['exerciseId']
    if 'sets' in data:
        pe.sets = data['sets']
    if 'reps' in data:
        pe.reps = data['reps']
    if 'restSeconds' in data:
        pe.rest_seconds = data['restSeconds']
    if 'notes' in data:
        pe.notes = data['notes']
    if 'order' in data:
        pe.order = data['order']

    db.session.commit()
    return jsonify(pe.to_dict())


@workout_bp.route('/plans/<int:plan_id>/exercises/<int:pe_id>', methods=['DELETE'])
@jwt_required()
def delete_plan_exercise(plan_id, pe_id):
    user_id = get_current_user_id()
    WorkoutPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    pe = WorkoutPlanExercise.query.filter_by(id=pe_id, workout_plan_id=plan_id).first_or_404()
    db.session.delete(pe)
    db.session.commit()
    return '', 204


# --- Workout Sessions ---

@workout_bp.route('/sessions', methods=['GET'])
@jwt_required()
def list_sessions():
    user_id = get_current_user_id()
    days = request.args.get('days', 30, type=int)
    since = date.today() - timedelta(days=days)

    sessions = WorkoutSession.query.filter(
        WorkoutSession.user_id == user_id,
        WorkoutSession.date >= since,
    ).order_by(WorkoutSession.date.desc()).all()

    return jsonify([s.to_dict(include_sets=False) for s in sessions])


@workout_bp.route('/sessions', methods=['POST'])
@jwt_required()
def create_session():
    user_id = get_current_user_id()
    data = request.get_json()

    session = WorkoutSession(
        user_id=user_id,
        workout_plan_id=data.get('workoutPlanId'),
        date=date.fromisoformat(data['date']) if data.get('date') else date.today(),
        duration_minutes=data.get('durationMinutes'),
        notes=data.get('notes'),
        completed=data.get('completed', False),
    )
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201


@workout_bp.route('/sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_session(session_id):
    user_id = get_current_user_id()
    session = WorkoutSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    return jsonify(session.to_dict())


@workout_bp.route('/sessions/<int:session_id>', methods=['PUT'])
@jwt_required()
def update_session(session_id):
    user_id = get_current_user_id()
    session = WorkoutSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    data = request.get_json()

    if 'durationMinutes' in data:
        session.duration_minutes = data['durationMinutes']
    if 'notes' in data:
        session.notes = data['notes']
    if 'completed' in data:
        was_completed = session.completed
        session.completed = data['completed']

        # Award XP when completing a session
        if data['completed'] and not was_completed:
            _award_workout_xp(user_id, session)

    db.session.commit()
    return jsonify(session.to_dict())


@workout_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(session_id):
    user_id = get_current_user_id()
    session = WorkoutSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    db.session.delete(session)
    db.session.commit()
    return '', 204


def _award_workout_xp(user_id, session):
    """Award XP for completing a workout session."""
    action = Action.query.filter_by(nome='Exercicio Fisico').first()
    if not action:
        action = Action(nome='Exercicio Fisico', areas={'Saude': 8, 'Mente': 4}, sinergia=True)
        db.session.add(action)
        db.session.flush()

    plan_name = session.workout_plan.name if session.workout_plan else 'Treino livre'
    event = Event(
        user_id=user_id,
        action_id=action.id,
        descricao=f'Treino concluido: {plan_name}',
        data=session.date,
    )
    db.session.add(event)
    db.session.flush()

    xp = sum(action.areas.values())
    if action.sinergia and len(action.areas) > 1:
        xp = int(xp * 1.2)

    user = User.query.get(user_id)
    user.experience += xp
    while user.experience >= user.next_level_exp:
        user.level += 1
        user.next_level_exp = int(user.next_level_exp * 1.2)


# --- Session Sets ---

@workout_bp.route('/sessions/<int:session_id>/sets', methods=['POST'])
@jwt_required()
def add_set(session_id):
    user_id = get_current_user_id()
    session = WorkoutSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    data = request.get_json()

    ws = WorkoutSet(
        session_id=session.id,
        exercise_id=data['exerciseId'],
        set_number=data.get('setNumber', 1),
        reps=data.get('reps'),
        weight_kg=data.get('weightKg'),
        completed=data.get('completed', True),
        order=data.get('order', 0),
    )
    db.session.add(ws)
    db.session.commit()
    return jsonify(ws.to_dict()), 201


@workout_bp.route('/sessions/<int:session_id>/sets/<int:set_id>', methods=['PUT'])
@jwt_required()
def update_set(session_id, set_id):
    user_id = get_current_user_id()
    WorkoutSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    ws = WorkoutSet.query.filter_by(id=set_id, session_id=session_id).first_or_404()
    data = request.get_json()

    if 'reps' in data:
        ws.reps = data['reps']
    if 'weightKg' in data:
        ws.weight_kg = data['weightKg']
    if 'completed' in data:
        ws.completed = data['completed']

    db.session.commit()
    return jsonify(ws.to_dict())


@workout_bp.route('/sessions/<int:session_id>/sets/<int:set_id>', methods=['DELETE'])
@jwt_required()
def delete_set(session_id, set_id):
    user_id = get_current_user_id()
    WorkoutSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    ws = WorkoutSet.query.filter_by(id=set_id, session_id=session_id).first_or_404()
    db.session.delete(ws)
    db.session.commit()
    return '', 204


# --- Progress ---

@workout_bp.route('/progress/<int:exercise_id>', methods=['GET'])
@jwt_required()
def exercise_progress(exercise_id):
    """Return weight/volume progression for a specific exercise."""
    user_id = get_current_user_id()
    days = request.args.get('days', 90, type=int)
    since = date.today() - timedelta(days=days)

    # Get sessions that have sets for this exercise
    sessions = WorkoutSession.query.filter(
        WorkoutSession.user_id == user_id,
        WorkoutSession.date >= since,
    ).order_by(WorkoutSession.date).all()

    data_points = []
    for s in sessions:
        exercise_sets = [ws for ws in s.sets if ws.exercise_id == exercise_id and ws.completed]
        if not exercise_sets:
            continue

        max_weight = max((ws.weight_kg or 0) for ws in exercise_sets)
        total_volume = sum((ws.weight_kg or 0) * (ws.reps or 0) for ws in exercise_sets)
        total_reps = sum(ws.reps or 0 for ws in exercise_sets)

        data_points.append({
            'date': s.date.isoformat(),
            'maxWeight': max_weight,
            'totalVolume': round(total_volume),
            'totalReps': total_reps,
            'sets': len(exercise_sets),
        })

    exercise = Exercise.query.get(exercise_id)

    return jsonify({
        'exercise': exercise.to_dict() if exercise else None,
        'data': data_points,
    })
