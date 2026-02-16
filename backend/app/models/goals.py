from datetime import date, datetime, timezone
from ..extensions import db


class Goal(db.Model):
    __tablename__ = 'goals'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    phase_id = db.Column(db.Integer, db.ForeignKey('phases.id'), nullable=True)
    metric_key = db.Column(db.String(50), nullable=True)
    target_value = db.Column(db.Float, nullable=True)
    period_type = db.Column(db.String(20), nullable=False)  # daily, weekly, monthly, annual
    goal_type = db.Column(db.String(20), nullable=False, default='metric')  # metric | check
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    description = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    phase = db.relationship('Phase', backref='goals', lazy=True)
    checks = db.relationship('GoalCheck', backref='goal', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'phaseId': self.phase_id,
            'metricKey': self.metric_key,
            'targetValue': self.target_value,
            'periodType': self.period_type,
            'goalType': self.goal_type,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'description': self.description,
            'active': self.active,
        }


class Phase(db.Model):
    __tablename__ = 'phases'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    targets = db.Column(db.JSON, nullable=False, default=list)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        today = date.today()
        if today > self.end_date:
            status = 'past'
        elif today >= self.start_date:
            status = 'active'
        else:
            status = 'future'

        total_days = (self.end_date - self.start_date).days or 1
        elapsed = max(0, (today - self.start_date).days)
        progress = 100 if status == 'past' else min(round(elapsed / total_days * 100), 100) if status == 'active' else 0

        return {
            'id': self.id,
            'userId': self.user_id,
            'name': self.name,
            'description': self.description,
            'startDate': self.start_date.isoformat(),
            'endDate': self.end_date.isoformat(),
            'targets': self.targets,
            'order': self.order,
            'status': status,
            'progress': progress,
        }


class GoalCheck(db.Model):
    __tablename__ = 'goal_checks'

    id = db.Column(db.Integer, primary_key=True)
    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    event = db.relationship('Event', lazy=True)

    __table_args__ = (
        db.UniqueConstraint('goal_id', 'date', name='uq_goal_check_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'goalId': self.goal_id,
            'date': self.date.isoformat(),
            'eventId': self.event_id,
        }
