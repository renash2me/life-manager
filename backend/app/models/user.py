from datetime import datetime, timezone
from ..extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(200), nullable=True)
    level = db.Column(db.Integer, default=1)
    experience = db.Column(db.Integer, default=0)
    next_level_exp = db.Column(db.Integer, default=1000)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    events = db.relationship('Event', backref='user', lazy=True)
    health_metrics = db.relationship('HealthMetric', backref='user', lazy=True)
    workouts = db.relationship('Workout', backref='user', lazy=True)
    earned_trophies = db.relationship('UserTrophy', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'level': self.level,
            'experience': self.experience,
            'nextLevelExp': self.next_level_exp,
        }
