from datetime import date
from ..extensions import db
from ..models.goals import Goal, Phase
from ..models.user import User


def seed_travessia_goals(user_id=None):
    """Seed hierarchical goals and phases from Projeto Travessia 2026."""
    if user_id is None:
        import os
        export_email = os.environ.get('HEALTH_EXPORT_USER_EMAIL')
        user = None
        if export_email:
            user = User.query.filter_by(email=export_email).first()
        if not user:
            user = User.query.order_by(User.id.desc()).first()
        if not user:
            print('ERROR: No user found in database.')
            return
        user_id = user.id
        print(f'Using user: {user.nome} (id={user.id}, email={user.email})')

    # Check if already seeded
    existing = Phase.query.filter_by(user_id=user_id).count()
    if existing > 0:
        print(f'Deleting existing data for user {user_id}...')
        Goal.query.filter_by(user_id=user_id).delete()
        Phase.query.filter_by(user_id=user_id).delete()
        db.session.commit()

    # === META PRINCIPAL (no phase) ===
    db.session.add(Goal(
        user_id=user_id, phase_id=None,
        goal_type='check', period_type='annual',
        description='Voltar para 78kg e otimo condicionamento fisico',
    ))

    # === METAS ANUAIS (no phase) ===
    db.session.add_all([
        Goal(user_id=user_id, phase_id=None,
             goal_type='metric', period_type='annual',
             metric_key='weight', target_value=80,
             description='Peso: 80kg ate Dezembro'),
        Goal(user_id=user_id, phase_id=None,
             goal_type='metric', period_type='annual',
             metric_key='vo2max', target_value=38,
             description='VO2 Max: 38+ ate Dezembro'),
        Goal(user_id=user_id, phase_id=None,
             goal_type='check', period_type='annual',
             description='Completar a Travessia SwimRun em Dezembro'),
    ])
    db.session.flush()

    # === FASES COM METAS ===

    phase_data = [
        {
            'name': 'Fase 1 - Fundacao', 'order': 1,
            'desc': 'Habitos basicos: caminhar mais, ajustar alimentacao, iniciar walk-run.',
            'start': date(2026, 2, 17), 'end': date(2026, 3, 31),
            'targets': ['Peso: 90kg', 'Passos: 7k/dia', 'Walk-run: 500m correndo', 'Doces: 1x/dia'],
            'goals': [
                {'metric_key': 'steps', 'target_value': 7000, 'period_type': 'daily', 'goal_type': 'metric', 'desc': 'Passos: 7.000/dia'},
                {'metric_key': 'weight', 'target_value': 90, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'Peso: 90kg'},
                {'metric_key': 'vo2max', 'target_value': 32, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'VO2 Max: 32'},
                {'period_type': 'daily', 'goal_type': 'check', 'desc': 'Alimentacao correta hoje'},
                {'period_type': 'weekly', 'goal_type': 'check', 'desc': 'Walk-run: treinar 3x esta semana'},
                {'period_type': 'daily', 'goal_type': 'check', 'desc': 'Maximo 1 doce hoje'},
            ],
        },
        {
            'name': 'Fase 2 - Adaptacao', 'order': 2,
            'desc': 'Aumentar cardio, iniciar corrida continua, ajustar dieta.',
            'start': date(2026, 4, 1), 'end': date(2026, 5, 31),
            'targets': ['Peso: 89kg', 'Passos: 8k/dia', 'Corrida: 1km continuo', 'Doces: dias alternados'],
            'goals': [
                {'metric_key': 'steps', 'target_value': 8000, 'period_type': 'daily', 'goal_type': 'metric', 'desc': 'Passos: 8.000/dia'},
                {'metric_key': 'weight', 'target_value': 89, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'Peso: 89kg'},
                {'metric_key': 'vo2max', 'target_value': 33, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'VO2 Max: 33'},
                {'period_type': 'daily', 'goal_type': 'check', 'desc': 'Alimentacao correta hoje'},
                {'period_type': 'monthly', 'goal_type': 'check', 'desc': 'Corrida: 1km continuo'},
                {'period_type': 'daily', 'goal_type': 'check', 'desc': 'Doce apenas em dias alternados'},
            ],
        },
        {
            'name': 'Fase 3 - Construcao', 'order': 3,
            'desc': 'Iniciar natacao, corrida ate 2-3km, perda de gordura acelerada.',
            'start': date(2026, 6, 1), 'end': date(2026, 7, 31),
            'targets': ['Peso: 86kg', 'Passos: 9k/dia', 'Natacao: 200m continuo', 'Corrida: 2.5km'],
            'goals': [
                {'metric_key': 'steps', 'target_value': 9000, 'period_type': 'daily', 'goal_type': 'metric', 'desc': 'Passos: 9.000/dia'},
                {'metric_key': 'weight', 'target_value': 86, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'Peso: 86kg'},
                {'metric_key': 'vo2max', 'target_value': 35, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'VO2 Max: 35'},
                {'period_type': 'daily', 'goal_type': 'check', 'desc': 'Alimentacao correta hoje'},
                {'period_type': 'weekly', 'goal_type': 'check', 'desc': 'Natacao: treinar 2x esta semana'},
                {'period_type': 'monthly', 'goal_type': 'check', 'desc': 'Natacao: 200m continuo'},
            ],
        },
        {
            'name': 'Fase 4 - Volume', 'order': 4,
            'desc': 'Natacao e corrida em volume crescente. Treinos combinados (brick).',
            'start': date(2026, 8, 1), 'end': date(2026, 9, 30),
            'targets': ['Peso: 83kg', 'Passos: 10k/dia', 'Natacao: 500m', 'Corrida: 4km'],
            'goals': [
                {'metric_key': 'steps', 'target_value': 10000, 'period_type': 'daily', 'goal_type': 'metric', 'desc': 'Passos: 10.000/dia'},
                {'metric_key': 'weight', 'target_value': 83, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'Peso: 83kg'},
                {'metric_key': 'vo2max', 'target_value': 36, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'VO2 Max: 36'},
                {'period_type': 'daily', 'goal_type': 'check', 'desc': 'Alimentacao correta hoje'},
                {'period_type': 'monthly', 'goal_type': 'check', 'desc': 'Natacao: 500m continuo'},
                {'period_type': 'monthly', 'goal_type': 'check', 'desc': 'Corrida: 4km continuo'},
                {'period_type': 'weekly', 'goal_type': 'check', 'desc': 'Brick: natacao + corrida esta semana'},
            ],
        },
        {
            'name': 'Fase 5 - Especifica', 'order': 5,
            'desc': 'Treinos no mar, corrida na areia, simulacoes da prova.',
            'start': date(2026, 10, 1), 'end': date(2026, 11, 30),
            'targets': ['Peso: 80kg', 'Natacao mar: 1km', 'Corrida areia: 5km', 'Brick completo'],
            'goals': [
                {'metric_key': 'steps', 'target_value': 10000, 'period_type': 'daily', 'goal_type': 'metric', 'desc': 'Passos: 10.000/dia'},
                {'metric_key': 'weight', 'target_value': 80, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'Peso: 80kg'},
                {'metric_key': 'vo2max', 'target_value': 37, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'VO2 Max: 37'},
                {'period_type': 'daily', 'goal_type': 'check', 'desc': 'Alimentacao correta hoje'},
                {'period_type': 'monthly', 'goal_type': 'check', 'desc': 'Natacao mar: 1km'},
                {'period_type': 'monthly', 'goal_type': 'check', 'desc': 'Corrida areia: 5km'},
                {'period_type': 'monthly', 'goal_type': 'check', 'desc': 'Simulacao completa da prova'},
            ],
        },
        {
            'name': 'Fase 6 - Prova', 'order': 6,
            'desc': 'Taper + prova. Reduzir volume, manter intensidade.',
            'start': date(2026, 12, 1), 'end': date(2026, 12, 15),
            'targets': ['Peso: 78-80kg', 'TRAVESSIA!', '1km natacao + 5km corrida'],
            'goals': [
                {'metric_key': 'weight', 'target_value': 78, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'Peso: 78kg'},
                {'metric_key': 'vo2max', 'target_value': 38, 'period_type': 'monthly', 'goal_type': 'metric', 'desc': 'VO2 Max: 38+'},
                {'period_type': 'daily', 'goal_type': 'check', 'desc': 'Alimentacao correta hoje'},
                {'period_type': 'monthly', 'goal_type': 'check', 'desc': 'COMPLETAR A TRAVESSIA!'},
            ],
        },
    ]

    total_goals = 4  # main + annual goals already added
    for pd in phase_data:
        phase = Phase(
            user_id=user_id, name=pd['name'], order=pd['order'],
            description=pd['desc'],
            start_date=pd['start'], end_date=pd['end'],
            targets=pd['targets'],
        )
        db.session.add(phase)
        db.session.flush()  # get phase.id

        for gd in pd['goals']:
            goal = Goal(
                user_id=user_id,
                phase_id=phase.id,
                metric_key=gd.get('metric_key'),
                target_value=gd.get('target_value'),
                period_type=gd['period_type'],
                goal_type=gd['goal_type'],
                start_date=pd['start'],
                end_date=pd['end'],
                description=gd['desc'],
            )
            db.session.add(goal)
            total_goals += 1

    db.session.commit()
    print(f'Seeded {len(phase_data)} phases and {total_goals} goals for user {user_id}.')
