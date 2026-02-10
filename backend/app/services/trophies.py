from datetime import date, timedelta
from ..extensions import db
from ..models.gamification import Trophy, UserTrophy, Event


def evaluate_trophies(user):
    """
    Check all trophies the user has not yet earned.
    Award if criteria are met.

    Criteria format:
      {"eventos": 7, "periodo": "7d"}  -- 7 events in last 7 days
      {"eventos": 1}                    -- 1 event total
    """
    earned_ids = {ut.trophy_id for ut in
                  UserTrophy.query.filter_by(user_id=user.id).all()}

    if earned_ids:
        unearned = Trophy.query.filter(~Trophy.id.in_(earned_ids)).all()
    else:
        unearned = Trophy.query.all()

    newly_earned = []

    for trophy in unearned:
        criteria = trophy.criteria
        required_events = criteria.get('eventos', 0)
        period_str = criteria.get('periodo')

        query = Event.query.filter_by(user_id=user.id)

        if period_str:
            days = int(period_str.replace('d', ''))
            since = date.today() - timedelta(days=days)
            query = query.filter(Event.data >= since)

        event_count = query.count()

        if event_count >= required_events:
            db.session.add(UserTrophy(user_id=user.id, trophy_id=trophy.id))

            reward = trophy.recompensa
            if 'exp' in reward:
                user.experience += reward['exp']

            newly_earned.append(trophy)

    return newly_earned
