from datetime import datetime, timezone
import bcrypt
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
    altura = db.Column(db.Float, nullable=True)  # meters, e.g. 1.71
    preferences = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    events = db.relationship('Event', backref='user', lazy=True)
    health_metrics = db.relationship('HealthMetric', backref='user', lazy=True)
    workouts = db.relationship('Workout', backref='user', lazy=True)
    earned_trophies = db.relationship('UserTrophy', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

    def check_password(self, password):
        if not self.password_hash:
            return False
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8'),
        )

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'level': self.level,
            'experience': self.experience,
            'nextLevelExp': self.next_level_exp,
            'altura': self.altura,
            'preferences': self.preferences or {},
        }
