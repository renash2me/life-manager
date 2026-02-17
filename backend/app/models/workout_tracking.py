from datetime import datetime, timezone
from ..extensions import db


MUSCLE_GROUPS = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps',
    'legs', 'glutes', 'abs', 'cardio', 'full_body',
]

MUSCLE_GROUP_LABELS = {
    'chest': 'Peito',
    'back': 'Costas',
    'shoulders': 'Ombros',
    'biceps': 'Biceps',
    'triceps': 'Triceps',
    'legs': 'Pernas',
    'glutes': 'Gluteos',
    'abs': 'Abdomen',
    'cardio': 'Cardio',
    'full_body': 'Corpo Inteiro',
}

EQUIPMENT_TYPES = [
    'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight',
    'kettlebell', 'band', 'none',
]


class Exercise(db.Model):
    """Exercise catalog - global + user custom."""
    __tablename__ = 'exercises'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    muscle_group = db.Column(db.String(30), nullable=False)
    equipment = db.Column(db.String(30), nullable=True, default='none')
    exercise_type = db.Column(db.String(30), nullable=True, default='strength')
    instructions = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'muscleGroup': self.muscle_group,
            'muscleGroupLabel': MUSCLE_GROUP_LABELS.get(self.muscle_group, self.muscle_group),
            'equipment': self.equipment,
            'exerciseType': self.exercise_type,
            'instructions': self.instructions,
            'isCustom': self.user_id is not None,
        }


class WorkoutPlan(db.Model):
    """Workout plan (ficha de treino)."""
    __tablename__ = 'workout_plans'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, default=True)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    exercises = db.relationship('WorkoutPlanExercise', backref='workout_plan',
                               cascade='all, delete-orphan',
                               order_by='WorkoutPlanExercise.order')

    def to_dict(self, include_exercises=True):
        d = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'active': self.active,
            'order': self.order,
        }
        if include_exercises:
            d['exercises'] = [e.to_dict() for e in self.exercises]
        return d


class WorkoutPlanExercise(db.Model):
    """Exercise in a workout plan."""
    __tablename__ = 'workout_plan_exercises'

    id = db.Column(db.Integer, primary_key=True)
    workout_plan_id = db.Column(db.Integer, db.ForeignKey('workout_plans.id', ondelete='CASCADE'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    sets = db.Column(db.Integer, default=3)
    reps = db.Column(db.String(20), default='12')  # "12", "8-12", "AMRAP"
    rest_seconds = db.Column(db.Integer, default=60)
    notes = db.Column(db.Text, nullable=True)
    order = db.Column(db.Integer, default=0)

    exercise = db.relationship('Exercise', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'exerciseId': self.exercise_id,
            'exercise': self.exercise.to_dict() if self.exercise else None,
            'sets': self.sets,
            'reps': self.reps,
            'restSeconds': self.rest_seconds,
            'notes': self.notes,
            'order': self.order,
        }


class WorkoutSession(db.Model):
    """A completed workout session."""
    __tablename__ = 'workout_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    workout_plan_id = db.Column(db.Integer, db.ForeignKey('workout_plans.id'), nullable=True)
    date = db.Column(db.Date, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    workout_plan = db.relationship('WorkoutPlan', lazy='joined')
    sets = db.relationship('WorkoutSet', backref='session', cascade='all, delete-orphan',
                          order_by='WorkoutSet.order')

    def to_dict(self, include_sets=True):
        d = {
            'id': self.id,
            'workoutPlanId': self.workout_plan_id,
            'planName': self.workout_plan.name if self.workout_plan else None,
            'date': self.date.isoformat(),
            'durationMinutes': self.duration_minutes,
            'notes': self.notes,
            'completed': self.completed,
        }
        if include_sets:
            d['sets'] = [s.to_dict() for s in self.sets]
        return d


class WorkoutSet(db.Model):
    """Individual set within a workout session."""
    __tablename__ = 'workout_sets'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('workout_sessions.id', ondelete='CASCADE'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    set_number = db.Column(db.Integer, default=1)
    reps = db.Column(db.Integer, nullable=True)
    weight_kg = db.Column(db.Float, nullable=True)
    completed = db.Column(db.Boolean, default=True)
    order = db.Column(db.Integer, default=0)

    exercise = db.relationship('Exercise', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'exerciseId': self.exercise_id,
            'exerciseName': self.exercise.name if self.exercise else None,
            'setNumber': self.set_number,
            'reps': self.reps,
            'weightKg': self.weight_kg,
            'completed': self.completed,
            'order': self.order,
        }
