from datetime import date
from ..extensions import db
from ..models.goals import Goal, Phase
from ..models.user import User


def seed_travessia_goals(user_id=None):
    """Seed goals and phases from Projeto Travessia 2026."""
    if user_id is None:
        user = User.query.first()
        if not user:
            print('No user found.')
            return
        user_id = user.id

    # Check if already seeded
    if Phase.query.filter_by(user_id=user_id).first():
        print('Goals already seeded for this user. Skipping.')
        return

    # --- Phases ---
    phases = [
        Phase(user_id=user_id, name='Fase 1 - Fundacao', order=1,
              description='Habitos basicos: caminhar mais, ajustar alimentacao, iniciar walk-run.',
              start_date=date(2026, 2, 17), end_date=date(2026, 3, 31),
              targets=['Peso: 90kg', 'Passos: 7k/dia', 'Walk-run: 500m correndo', 'Doces: 1x/dia']),
        Phase(user_id=user_id, name='Fase 2 - Adaptacao', order=2,
              description='Aumentar cardio, iniciar corrida continua, ajustar dieta.',
              start_date=date(2026, 4, 1), end_date=date(2026, 5, 31),
              targets=['Peso: 89kg', 'Passos: 8k/dia', 'Corrida: 1km continuo', 'Doces: dias alternados']),
        Phase(user_id=user_id, name='Fase 3 - Construcao', order=3,
              description='Iniciar natacao, corrida ate 2-3km, perda de gordura acelerada.',
              start_date=date(2026, 6, 1), end_date=date(2026, 7, 31),
              targets=['Peso: 86kg', 'Passos: 9k/dia', 'Natacao: 200m continuo', 'Corrida: 2.5km']),
        Phase(user_id=user_id, name='Fase 4 - Volume', order=4,
              description='Natacao e corrida em volume crescente. Treinos combinados (brick).',
              start_date=date(2026, 8, 1), end_date=date(2026, 9, 30),
              targets=['Peso: 83kg', 'Passos: 10k/dia', 'Natacao: 500m', 'Corrida: 4km']),
        Phase(user_id=user_id, name='Fase 5 - Especifica', order=5,
              description='Treinos no mar, corrida na areia, simulacoes da prova.',
              start_date=date(2026, 10, 1), end_date=date(2026, 11, 30),
              targets=['Peso: 80kg', 'Natacao mar: 1km', 'Corrida areia: 5km', 'Brick completo']),
        Phase(user_id=user_id, name='Fase 6 - Prova', order=6,
              description='Taper + prova. Reduzir volume, manter intensidade.',
              start_date=date(2026, 12, 1), end_date=date(2026, 12, 15),
              targets=['Peso: 78-80kg', 'TRAVESSIA!', '1km natacao + 5km corrida']),
    ]
    db.session.add_all(phases)

    # --- Goals ---
    goals = [
        # Steps goals (daily average)
        Goal(user_id=user_id, metric_key='steps', target_value=7000, period_type='daily',
             start_date=date(2026, 2, 17), end_date=date(2026, 3, 31),
             description='Fase 1: 7k passos/dia'),
        Goal(user_id=user_id, metric_key='steps', target_value=8000, period_type='daily',
             start_date=date(2026, 4, 1), end_date=date(2026, 5, 31),
             description='Fase 2: 8k passos/dia'),
        Goal(user_id=user_id, metric_key='steps', target_value=9000, period_type='daily',
             start_date=date(2026, 6, 1), end_date=date(2026, 7, 31),
             description='Fase 3: 9k passos/dia'),
        Goal(user_id=user_id, metric_key='steps', target_value=10000, period_type='daily',
             start_date=date(2026, 8, 1), end_date=date(2026, 12, 31),
             description='Fases 4-6: 10k passos/dia'),

        # Weight goals (monthly target)
        Goal(user_id=user_id, metric_key='weight', target_value=90, period_type='monthly',
             start_date=date(2026, 2, 17), end_date=date(2026, 3, 31),
             description='Fase 1: 90kg'),
        Goal(user_id=user_id, metric_key='weight', target_value=89, period_type='monthly',
             start_date=date(2026, 4, 1), end_date=date(2026, 5, 31),
             description='Fase 2: 89kg'),
        Goal(user_id=user_id, metric_key='weight', target_value=86, period_type='monthly',
             start_date=date(2026, 6, 1), end_date=date(2026, 7, 31),
             description='Fase 3: 86kg'),
        Goal(user_id=user_id, metric_key='weight', target_value=83, period_type='monthly',
             start_date=date(2026, 8, 1), end_date=date(2026, 9, 30),
             description='Fase 4: 83kg'),
        Goal(user_id=user_id, metric_key='weight', target_value=80, period_type='monthly',
             start_date=date(2026, 10, 1), end_date=date(2026, 11, 30),
             description='Fase 5: 80kg'),
        Goal(user_id=user_id, metric_key='weight', target_value=78, period_type='monthly',
             start_date=date(2026, 12, 1), end_date=date(2026, 12, 31),
             description='Fase 6: 78kg'),

        # VO2 Max goals (monthly target)
        Goal(user_id=user_id, metric_key='vo2max', target_value=32, period_type='monthly',
             start_date=date(2026, 2, 17), end_date=date(2026, 3, 31),
             description='Fase 1: VO2 32'),
        Goal(user_id=user_id, metric_key='vo2max', target_value=33, period_type='monthly',
             start_date=date(2026, 4, 1), end_date=date(2026, 5, 31),
             description='Fase 2: VO2 33'),
        Goal(user_id=user_id, metric_key='vo2max', target_value=35, period_type='monthly',
             start_date=date(2026, 6, 1), end_date=date(2026, 7, 31),
             description='Fase 3: VO2 35'),
        Goal(user_id=user_id, metric_key='vo2max', target_value=36, period_type='monthly',
             start_date=date(2026, 8, 1), end_date=date(2026, 9, 30),
             description='Fase 4: VO2 36'),
        Goal(user_id=user_id, metric_key='vo2max', target_value=37, period_type='monthly',
             start_date=date(2026, 10, 1), end_date=date(2026, 11, 30),
             description='Fase 5: VO2 37'),
        Goal(user_id=user_id, metric_key='vo2max', target_value=38, period_type='monthly',
             start_date=date(2026, 12, 1), end_date=date(2026, 12, 31),
             description='Fase 6: VO2 38+'),
    ]
    db.session.add_all(goals)

    db.session.commit()
    print(f'Seeded {len(phases)} phases and {len(goals)} goals for user {user_id}.')
