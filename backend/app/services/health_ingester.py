from datetime import datetime
from ..extensions import db
from ..models.health import HealthMetric, Workout
from ..models.user import User


def parse_date(date_str):
    """Parse date string from Health Auto Export: '2026-02-09 18:00:00 Z'"""
    formats = [
        '%Y-%m-%d %H:%M:%S %z',
        '%Y-%m-%d %H:%M:%S %Z',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S%z',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%d',
    ]
    cleaned = date_str.strip()
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    # Fallback: replace ' Z' with '+00:00' for fromisoformat
    try:
        return datetime.fromisoformat(cleaned.replace(' Z', '+00:00'))
    except Exception:
        raise ValueError(f"Cannot parse date: {date_str}")


def process_health_export(payload, user_id):
    """
    Process a Health Auto Export JSON payload.
    Stores each metric data point and workout as a separate row.
    Uses upsert to avoid duplicates.
    After storing, creates auto-events for workouts and mindfulness.
    """
    data = payload.get('data', payload)
    metrics_list = data.get('metrics', [])
    workouts_list = data.get('workouts', [])

    metrics_stored = 0
    workouts_stored = 0
    events_created = 0
    errors = []
    new_workout_ids = []
    mindful_by_date = {}

    for metric in metrics_list:
        metric_name = metric.get('name', 'Unknown')
        metric_units = metric.get('units', '')
        data_points = metric.get('data', [])

        for point in data_points:
            try:
                date_str = point.get('date', '')
                if not date_str:
                    continue
                parsed_date = parse_date(date_str)
                data_without_date = {k: v for k, v in point.items() if k != 'date'}

                existing = HealthMetric.query.filter_by(
                    user_id=user_id,
                    metric_name=metric_name,
                    date=parsed_date,
                ).first()

                if existing:
                    existing.data = data_without_date
                    existing.metric_units = metric_units
                else:
                    db.session.add(HealthMetric(
                        user_id=user_id,
                        metric_name=metric_name,
                        metric_units=metric_units,
                        date=parsed_date,
                        data=data_without_date,
                    ))
                metrics_stored += 1

                # Track mindfulness minutes by date
                if metric_name in ('mindful_minutes', 'apple_exercise_time') and \
                        metric_name == 'mindful_minutes':
                    qty = data_without_date.get('qty', 0)
                    if qty:
                        day = parsed_date.date()
                        mindful_by_date[day] = mindful_by_date.get(day, 0) + float(qty)

            except Exception as e:
                errors.append(f"Metric {metric_name}: {str(e)}")

    for workout in workouts_list:
        try:
            name = workout.get('name', 'Unknown Workout')
            start_str = workout.get('start', workout.get('date', ''))
            end_str = workout.get('end', '')
            duration = workout.get('duration')

            start_time = parse_date(start_str) if start_str else None
            end_time = parse_date(end_str) if end_str else None
            workout_data = {k: v for k, v in workout.items()
                           if k not in ('name', 'start', 'end')}

            existing = None
            if start_time:
                existing = Workout.query.filter_by(
                    user_id=user_id, name=name, start_time=start_time,
                ).first()

            if existing:
                existing.data = workout_data
                existing.duration = duration
                existing.end_time = end_time
                # If existing workout never created an event, include it
                if not existing.event_created:
                    new_workout_ids.append(existing.id)
            else:
                w = Workout(
                    user_id=user_id,
                    name=name,
                    start_time=start_time,
                    end_time=end_time,
                    duration=duration,
                    data=workout_data,
                    event_created=False,
                )
                db.session.add(w)
                db.session.flush()
                new_workout_ids.append(w.id)
            workouts_stored += 1
        except Exception as e:
            errors.append(f"Workout: {str(e)}")

    db.session.commit()

    # Auto-create events for new workouts
    try:
        from .auto_events import create_event_for_workout
        user = User.query.get(user_id)
        if user and new_workout_ids:
            for wid in new_workout_ids:
                workout = Workout.query.get(wid)
                if workout and not workout.event_created:
                    event = create_event_for_workout(workout, user)
                    if event:
                        events_created += 1
            db.session.commit()
    except Exception as e:
        errors.append(f"Auto-event workout: {str(e)}")

    # Auto-create events for mindfulness
    try:
        from .auto_events import create_event_for_mindfulness
        for day, minutes in mindful_by_date.items():
            if minutes >= 1:
                event = create_event_for_mindfulness(user_id, minutes, day)
                if event:
                    events_created += 1
        if mindful_by_date:
            db.session.commit()
    except Exception as e:
        errors.append(f"Auto-event mindfulness: {str(e)}")

    return {
        'status': 'ok',
        'metricsStored': metrics_stored,
        'workoutsStored': workouts_stored,
        'eventsCreated': events_created,
        'errors': errors if errors else None,
    }
