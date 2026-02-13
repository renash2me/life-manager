from datetime import date
from ..extensions import db
from ..models.gamification import Action, Event
from ..models.health import Workout
from ..models.user import User
from .leveling import process_level_up
from .trophies import evaluate_trophies


def _get_or_create_action(nome, areas, sinergia=True):
    """Get existing action by name or create it."""
    action = Action.query.filter_by(nome=nome).first()
    if not action:
        action = Action(nome=nome, areas=areas, sinergia=sinergia)
        db.session.add(action)
        db.session.flush()
    return action


def create_event_for_workout(workout, user):
    """Create a gamification event for a workout.
    Deduplicates by workout_id so multiple workouts per day each get their own event.
    """
    action = _get_or_create_action(
        'Exercicio Fisico',
        {'Saude': 10, 'Mente': 5},
    )

    event_date = workout.start_time.date() if workout.start_time else date.today()

    # Deduplicate by workout_id (allows multiple workouts per day)
    existing = Event.query.filter_by(workout_id=workout.id).first()

    if existing:
        workout.event_created = True
        return None

    duration_min = round(workout.duration / 60) if workout.duration else 0
    event = Event(
        user_id=user.id,
        action_id=action.id,
        workout_id=workout.id,
        descricao=f'{workout.name} ({duration_min} min)',
        data=event_date,
    )
    db.session.add(event)

    # XP
    xp_gained = sum(action.areas.values())
    if action.sinergia and len(action.areas) >= 2:
        xp_gained += len(action.areas)
    user.experience += xp_gained

    process_level_up(user)
    evaluate_trophies(user)

    workout.event_created = True
    return event


def create_event_for_mindfulness(user_id, mindful_minutes, event_date=None):
    """Create a gamification event for mindfulness/meditation session."""
    if mindful_minutes < 1:
        return None

    user = User.query.get(user_id)
    if not user:
        return None

    action = _get_or_create_action(
        'Meditar',
        {'Espirito': 8, 'Mente': 4},
    )

    target_date = event_date or date.today()

    # Check if event already exists for this date
    existing = Event.query.filter_by(
        user_id=user.id,
        action_id=action.id,
        data=target_date,
    ).first()

    if existing:
        return None

    event = Event(
        user_id=user.id,
        action_id=action.id,
        descricao=f'Meditação ({round(mindful_minutes)} min)',
        data=target_date,
    )
    db.session.add(event)

    # XP
    xp_gained = sum(action.areas.values())
    if action.sinergia and len(action.areas) >= 2:
        xp_gained += len(action.areas)
    user.experience += xp_gained

    process_level_up(user)
    evaluate_trophies(user)

    return event


def process_pending_workout_events(user_id=None):
    """Process all workouts that haven't created events yet."""
    query = Workout.query.filter_by(event_created=False)
    if user_id:
        query = query.filter_by(user_id=user_id)

    workouts = query.all()
    created = 0

    for workout in workouts:
        user = User.query.get(workout.user_id)
        if user:
            event = create_event_for_workout(workout, user)
            if event:
                created += 1

    if created > 0:
        db.session.commit()

    return created
