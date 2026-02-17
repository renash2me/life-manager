from datetime import date
from ..extensions import db
from ..models.goals import Goal
from ..models.user import User


def seed_travessia_goals(user_id=None):
    """Seed hierarchical goals as a tree using parent_id (v3 - no phases)."""
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

    # Delete existing goals for user
    existing = Goal.query.filter_by(user_id=user_id).count()
    if existing > 0:
        print(f'Deleting {existing} existing goals for user {user_id}...')
        Goal.query.filter_by(user_id=user_id, parent_id=None).delete()
        db.session.commit()

    # === ROOT: Projeto Travessia 2026 ===
    root = Goal(
        user_id=user_id, name='Projeto Travessia 2026',
        goal_type='group', period_type='annual',
        start_date=date(2026, 2, 17), end_date=date(2026, 12, 15),
        description='Voltar para 78kg e otimo condicionamento fisico para completar a Travessia SwimRun.',
        order=0,
    )
    db.session.add(root)
    db.session.flush()

    # === METAS ANUAIS (children of root) ===
    annual_goals = [
        Goal(user_id=user_id, parent_id=root.id, name='Peso: 80kg',
             goal_type='metric', period_type='annual',
             metric_key='weight', target_value=80,
             description='Peso: 80kg ate Dezembro', order=1),
        Goal(user_id=user_id, parent_id=root.id, name='VO2 Max: 38+',
             goal_type='metric', period_type='annual',
             metric_key='vo2max', target_value=38,
             description='VO2 Max: 38+ ate Dezembro', order=2),
        Goal(user_id=user_id, parent_id=root.id, name='Completar a Travessia',
             goal_type='check', period_type='annual',
             description='Completar a Travessia SwimRun em Dezembro', order=3),
    ]
    db.session.add_all(annual_goals)
    db.session.flush()

    # === FASES (group goals, children of root) ===
    phase_data = [
        {
            'name': 'Fase 1 - Fundacao', 'order': 10,
            'desc': 'Habitos basicos: caminhar mais, ajustar alimentacao, iniciar walk-run.',
            'start': date(2026, 2, 17), 'end': date(2026, 3, 31),
            'goals': [
                {'name': 'Passos: 7.000/dia', 'metric_key': 'steps', 'target_value': 7000,
                 'period_type': 'daily', 'goal_type': 'metric'},
                {'name': 'Peso: 90kg', 'metric_key': 'weight', 'target_value': 90,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'VO2 Max: 32', 'metric_key': 'vo2max', 'target_value': 32,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'Alimentacao correta hoje', 'period_type': 'daily', 'goal_type': 'check'},
                {'name': 'Walk-run: treinar 3x esta semana', 'period_type': 'weekly', 'goal_type': 'check'},
                {'name': 'Maximo 1 doce hoje', 'period_type': 'daily', 'goal_type': 'check'},
            ],
        },
        {
            'name': 'Fase 2 - Adaptacao', 'order': 20,
            'desc': 'Aumentar cardio, iniciar corrida continua, ajustar dieta.',
            'start': date(2026, 4, 1), 'end': date(2026, 5, 31),
            'goals': [
                {'name': 'Passos: 8.000/dia', 'metric_key': 'steps', 'target_value': 8000,
                 'period_type': 'daily', 'goal_type': 'metric'},
                {'name': 'Peso: 89kg', 'metric_key': 'weight', 'target_value': 89,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'VO2 Max: 33', 'metric_key': 'vo2max', 'target_value': 33,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'Alimentacao correta hoje', 'period_type': 'daily', 'goal_type': 'check'},
                {'name': 'Corrida: 1km continuo', 'period_type': 'monthly', 'goal_type': 'check'},
                {'name': 'Doce apenas em dias alternados', 'period_type': 'daily', 'goal_type': 'check'},
            ],
        },
        {
            'name': 'Fase 3 - Construcao', 'order': 30,
            'desc': 'Iniciar natacao, corrida ate 2-3km, perda de gordura acelerada.',
            'start': date(2026, 6, 1), 'end': date(2026, 7, 31),
            'goals': [
                {'name': 'Passos: 9.000/dia', 'metric_key': 'steps', 'target_value': 9000,
                 'period_type': 'daily', 'goal_type': 'metric'},
                {'name': 'Peso: 86kg', 'metric_key': 'weight', 'target_value': 86,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'VO2 Max: 35', 'metric_key': 'vo2max', 'target_value': 35,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'Alimentacao correta hoje', 'period_type': 'daily', 'goal_type': 'check'},
                {'name': 'Natacao: treinar 2x esta semana', 'period_type': 'weekly', 'goal_type': 'check'},
                {'name': 'Natacao: 200m continuo', 'period_type': 'monthly', 'goal_type': 'check'},
            ],
        },
        {
            'name': 'Fase 4 - Volume', 'order': 40,
            'desc': 'Natacao e corrida em volume crescente. Treinos combinados (brick).',
            'start': date(2026, 8, 1), 'end': date(2026, 9, 30),
            'goals': [
                {'name': 'Passos: 10.000/dia', 'metric_key': 'steps', 'target_value': 10000,
                 'period_type': 'daily', 'goal_type': 'metric'},
                {'name': 'Peso: 83kg', 'metric_key': 'weight', 'target_value': 83,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'VO2 Max: 36', 'metric_key': 'vo2max', 'target_value': 36,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'Alimentacao correta hoje', 'period_type': 'daily', 'goal_type': 'check'},
                {'name': 'Natacao: 500m continuo', 'period_type': 'monthly', 'goal_type': 'check'},
                {'name': 'Corrida: 4km continuo', 'period_type': 'monthly', 'goal_type': 'check'},
                {'name': 'Brick: natacao + corrida esta semana', 'period_type': 'weekly', 'goal_type': 'check'},
            ],
        },
        {
            'name': 'Fase 5 - Especifica', 'order': 50,
            'desc': 'Treinos no mar, corrida na areia, simulacoes da prova.',
            'start': date(2026, 10, 1), 'end': date(2026, 11, 30),
            'goals': [
                {'name': 'Passos: 10.000/dia', 'metric_key': 'steps', 'target_value': 10000,
                 'period_type': 'daily', 'goal_type': 'metric'},
                {'name': 'Peso: 80kg', 'metric_key': 'weight', 'target_value': 80,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'VO2 Max: 37', 'metric_key': 'vo2max', 'target_value': 37,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'Alimentacao correta hoje', 'period_type': 'daily', 'goal_type': 'check'},
                {'name': 'Natacao mar: 1km', 'period_type': 'monthly', 'goal_type': 'check'},
                {'name': 'Corrida areia: 5km', 'period_type': 'monthly', 'goal_type': 'check'},
                {'name': 'Simulacao completa da prova', 'period_type': 'monthly', 'goal_type': 'check'},
            ],
        },
        {
            'name': 'Fase 6 - Prova', 'order': 60,
            'desc': 'Taper + prova. Reduzir volume, manter intensidade.',
            'start': date(2026, 12, 1), 'end': date(2026, 12, 15),
            'goals': [
                {'name': 'Peso: 78kg', 'metric_key': 'weight', 'target_value': 78,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'VO2 Max: 38+', 'metric_key': 'vo2max', 'target_value': 38,
                 'period_type': 'monthly', 'goal_type': 'metric'},
                {'name': 'Alimentacao correta hoje', 'period_type': 'daily', 'goal_type': 'check'},
                {'name': 'COMPLETAR A TRAVESSIA!', 'period_type': 'monthly', 'goal_type': 'check'},
            ],
        },
    ]

    total_goals = len(annual_goals) + 1  # root + annual
    for pd in phase_data:
        phase_goal = Goal(
            user_id=user_id, parent_id=root.id,
            name=pd['name'], goal_type='group', period_type='monthly',
            start_date=pd['start'], end_date=pd['end'],
            description=pd['desc'], order=pd['order'],
        )
        db.session.add(phase_goal)
        db.session.flush()
        total_goals += 1

        for i, gd in enumerate(pd['goals']):
            goal = Goal(
                user_id=user_id, parent_id=phase_goal.id,
                name=gd['name'],
                metric_key=gd.get('metric_key'),
                target_value=gd.get('target_value'),
                period_type=gd['period_type'],
                goal_type=gd['goal_type'],
                start_date=pd['start'], end_date=pd['end'],
                order=i,
            )
            db.session.add(goal)
            total_goals += 1

    db.session.commit()
    print(f'Seeded {total_goals} goals (hierarchical tree) for user {user_id}.')
