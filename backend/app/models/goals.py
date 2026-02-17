from datetime import date, datetime, timezone
from ..extensions import db


class Goal(db.Model):
    __tablename__ = 'goals'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('goals.id', ondelete='CASCADE'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    metric_key = db.Column(db.String(50), nullable=True)
    target_value = db.Column(db.Float, nullable=True)
    period_type = db.Column(db.String(20), nullable=False)  # daily, weekly, monthly, annual
    goal_type = db.Column(db.String(20), nullable=False, default='metric')  # metric | check | group
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    description = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, default=True)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    children = db.relationship(
        'Goal',
        backref=db.backref('parent', remote_side='Goal.id'),
        lazy=True,
        cascade='all, delete-orphan',
        order_by='Goal.order, Goal.id',
    )
    checks = db.relationship('GoalCheck', backref='goal', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_children=False):
        from ..services.metrics import get_user_today
        today = get_user_today()

        d = {
            'id': self.id,
            'userId': self.user_id,
            'parentId': self.parent_id,
            'name': self.name,
            'metricKey': self.metric_key,
            'targetValue': self.target_value,
            'periodType': self.period_type,
            'goalType': self.goal_type,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'description': self.description,
            'active': self.active,
            'order': self.order,
        }

        # Add status for group goals (like former Phase)
        if self.goal_type == 'group' and self.start_date and self.end_date:
            if today > self.end_date:
                d['status'] = 'past'
            elif today >= self.start_date:
                d['status'] = 'active'
            else:
                d['status'] = 'future'

            total_days = (self.end_date - self.start_date).days or 1
            elapsed = max(0, (today - self.start_date).days)
            if d['status'] == 'past':
                d['progress'] = 100
            elif d['status'] == 'active':
                d['progress'] = min(round(elapsed / total_days * 100), 100)
            else:
                d['progress'] = 0

        if include_children:
            d['children'] = [c.to_dict(include_children=True) for c in self.children]

        return d


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
