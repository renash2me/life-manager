from datetime import datetime, timezone
from ..extensions import db


class HealthMetric(db.Model):
    __tablename__ = 'health_metrics'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    metric_name = db.Column(db.String(100), nullable=False)
    metric_units = db.Column(db.String(50), nullable=True)
    date = db.Column(db.DateTime, nullable=False)
    data = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('idx_health_metrics_name_date', 'metric_name', 'date'),
        db.Index('idx_health_metrics_user', 'user_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'metricName': self.metric_name,
            'metricUnits': self.metric_units,
            'date': self.date.isoformat(),
            'data': self.data,
        }


class Workout(db.Model):
    __tablename__ = 'workouts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    duration = db.Column(db.Integer, nullable=True)
    data = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'startTime': self.start_time.isoformat() if self.start_time else None,
            'endTime': self.end_time.isoformat() if self.end_time else None,
            'duration': self.duration,
            'data': self.data,
        }
