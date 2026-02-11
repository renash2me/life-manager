from ..extensions import db
from ..models.user import User
from ..models.gamification import Action, Trophy


def seed_initial_data():
    """Seed the database with initial data from Better Life project."""
    # Default user
    if not User.query.first():
        user = User(nome='Renato', email='renato@lifemanager.local')
        user.set_password('mudar123')
        db.session.add(user)
    else:
        # Set password for existing user if not set
        user = User.query.first()
        if not user.password_hash:
            user.set_password('mudar123')

    # Actions (from Better Life/server/actions.json)
    if not Action.query.first():
        db.session.add_all([
            Action(
                nome='Exercicio Fisico',
                areas={'Saude': 10, 'Mente': 5},
                sinergia=True,
            ),
            Action(
                nome='Estudar',
                areas={'Vida Profissional': 8, 'Mente': 6},
                sinergia=True,
            ),
            Action(
                nome='Meditar',
                areas={'Espirito': 8, 'Mente': 4},
                sinergia=True,
            ),
            Action(
                nome='Conversar com Amigos',
                areas={'Relacionamentos': 7, 'Mente': 3},
                sinergia=True,
            ),
            Action(
                nome='Ler um Livro',
                areas={'Hobbies e Lazer': 6, 'Mente': 4},
                sinergia=True,
            ),
        ])

    # Trophies (from Better Life/server/trophies.json)
    if not Trophy.query.first():
        db.session.add_all([
            Trophy(
                nome='Primeiro Passo',
                descricao='Complete sua primeira atividade',
                criteria={'eventos': 1},
                recompensa={'exp': 100},
            ),
            Trophy(
                nome='Consistente',
                descricao='Complete 7 atividades em uma semana',
                criteria={'eventos': 7, 'periodo': '7d'},
                recompensa={'exp': 500},
            ),
            Trophy(
                nome='Dedicado',
                descricao='Complete 30 atividades',
                criteria={'eventos': 30},
                recompensa={'exp': 1000},
            ),
            Trophy(
                nome='Imparavel',
                descricao='Complete 100 atividades',
                criteria={'eventos': 100},
                recompensa={'exp': 5000},
            ),
        ])

    db.session.commit()
