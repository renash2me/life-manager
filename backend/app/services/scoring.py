from datetime import date, timedelta
from ..constants import LIFE_AREAS
from ..models.gamification import Event, Action
from ..extensions import db

DECAY_DAYS = 7
DECAY_MULTIPLIER = 0.8


def calculate_daily_score(user_id, target_date=None):
    """
    Calculate score for a given date.
    Ported from Better Life/server/index.js scoring algorithm.

    - 7 life areas
    - Decay: 0.8x if no events in area for 7+ days
    - Synergy: +1 per area if action has sinergia=true and hits 2+ areas
    - Financial penalties for planned vs unplanned expenses
    """
    if target_date is None:
        target_date = date.today()
    if isinstance(target_date, str):
        target_date = date.fromisoformat(target_date)

    score = {area: 0.0 for area in LIFE_AREAS}
    multipliers = {area: 1.0 for area in LIFE_AREAS}

    all_events = Event.query.filter_by(user_id=user_id).all()
    all_actions = {a.id: a for a in Action.query.all()}

    # Calculate decay multipliers per area
    for area in LIFE_AREAS:
        last_date = None
        for ev in all_events:
            action = all_actions.get(ev.action_id)
            if action and action.areas and area in action.areas:
                if action.areas[area] > 0:
                    if last_date is None or ev.data > last_date:
                        last_date = ev.data

        if last_date:
            if (target_date - last_date).days >= DECAY_DAYS:
                multipliers[area] = DECAY_MULTIPLIER
        else:
            multipliers[area] = DECAY_MULTIPLIER

    # Score events for the target date
    day_events = [ev for ev in all_events if ev.data == target_date]

    for ev in day_events:
        action = all_actions.get(ev.action_id)
        if not action or not action.areas:
            continue

        for area, points in action.areas.items():
            if area in score:
                score[area] += points * multipliers.get(area, 1.0)

        # Synergy bonus
        if action.sinergia and len(action.areas) >= 2:
            for area in action.areas:
                if area in score:
                    score[area] += 1 * multipliers.get(area, 1.0)

        # Financial penalties
        if "Financas" in action.areas:
            if ev.gasto_planejado:
                score["Financas"] += action.penalidade_planejado * multipliers.get("Financas", 1.0)
            else:
                score["Financas"] += action.penalidade_nao_planejado * multipliers.get("Financas", 1.0)

    total = sum(score.values())

    return {
        'total': round(total, 1),
        'porArea': {k: round(v, 1) for k, v in score.items()},
        'multiplicadores': multipliers,
        'date': target_date.isoformat(),
    }


def calculate_score_history(user_id, days=30):
    """Calculate score for each day in the past N days."""
    today = date.today()
    history = []
    for i in range(days, -1, -1):
        d = today - timedelta(days=i)
        history.append(calculate_daily_score(user_id, d))
    return history
