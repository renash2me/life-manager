from datetime import date, datetime, timezone
from ..extensions import db


class Action(db.Model):
    __tablename__ = 'actions'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    areas = db.Column(db.JSON, nullable=False)
    sinergia = db.Column(db.Boolean, default=False)
    penalidade_planejado = db.Column(db.Float, default=0.0)
    penalidade_nao_planejado = db.Column(db.Float, default=0.0)

    events = db.relationship('Event', backref='action', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'areas': self.areas,
            'sinergia': self.sinergia,
            'penalidadeFinanceiraPlanejado': self.penalidade_planejado,
            'penalidadeFinanceiraNaoPlanejado': self.penalidade_nao_planejado,
        }


class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action_id = db.Column(db.Integer, db.ForeignKey('actions.id'), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    gasto_planejado = db.Column(db.Boolean, default=False)
    data = db.Column(db.Date, nullable=False, default=date.today)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'actionId': self.action_id,
            'descricao': self.descricao,
            'gastoPlanejado': self.gasto_planejado,
            'data': self.data.isoformat(),
        }


class Trophy(db.Model):
    __tablename__ = 'trophies'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    criteria = db.Column(db.JSON, nullable=False)
    recompensa = db.Column(db.JSON, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'criteria': self.criteria,
            'recompensa': self.recompensa,
        }


class UserTrophy(db.Model):
    __tablename__ = 'user_trophies'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    trophy_id = db.Column(db.Integer, db.ForeignKey('trophies.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    trophy = db.relationship('Trophy', backref='earners', lazy=True)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'trophy_id', name='uq_user_trophy'),
    )
