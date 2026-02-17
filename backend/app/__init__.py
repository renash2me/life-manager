import os
from flask import Flask, send_from_directory
from .config import config
from .extensions import db, migrate, cors, jwt


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')

    # Determine static folder (Vite build output)
    static_folder = os.path.join(os.path.dirname(__file__), '..', 'static')
    if not os.path.exists(static_folder):
        static_folder = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist')

    static_dir = os.path.abspath(static_folder)
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    jwt.init_app(app)

    # Import models so Alembic can detect them
    from . import models  # noqa: F401

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.health import health_bp
    from .routes.gamification import gamification_bp
    from .routes.user import user_bp
    from .routes.dashboard import dashboard_bp
    from .routes.goals import goals_bp
    from .routes.nutrition import nutrition_bp
    from .routes.workout_tracking import workout_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(health_bp, url_prefix='/api/health')
    app.register_blueprint(gamification_bp, url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(goals_bp, url_prefix='/api/goals')
    app.register_blueprint(nutrition_bp, url_prefix='/api/nutrition')
    app.register_blueprint(workout_bp, url_prefix='/api/workouts-tracking')

    # API info endpoint
    @app.route('/api/info')
    def api_info():
        from .constants import LIFE_AREAS, AREA_DISPLAY_NAMES, AREA_COLORS
        return {
            'name': 'Life Manager',
            'version': '2.0.0',
            'areas': LIFE_AREAS,
            'areaDisplayNames': AREA_DISPLAY_NAMES,
            'areaColors': AREA_COLORS,
        }

    # SPA catch-all: serve static files or index.html for client-side routes
    @app.route('/')
    @app.route('/<path:path>')
    def serve_spa(path=''):
        if path and os.path.exists(os.path.join(static_dir, path)):
            return send_from_directory(static_dir, path)
        index_path = os.path.join(static_dir, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_dir, 'index.html')
        return {'message': 'Life Manager API running. Frontend not built yet.'}, 200

    # CLI: init-db command
    @app.cli.command('init-db')
    def init_db_command():
        """Create all tables and seed initial data."""
        db.create_all()
        print('Tables created.')
        from .seed.seed_data import seed_initial_data
        seed_initial_data()
        print('Database seeded successfully.')

    # CLI: seed command (without table creation)
    @app.cli.command('seed')
    def seed_command():
        """Seed the database with initial data."""
        from .seed.seed_data import seed_initial_data
        seed_initial_data()
        print('Database seeded successfully.')

    # CLI: backfill workout events
    @app.cli.command('backfill-workout-events')
    def backfill_workout_events():
        """Create gamification events for existing workouts that don't have them."""
        from .services.auto_events import process_pending_workout_events
        created = process_pending_workout_events()
        print(f'Created {created} events from existing workouts.')

    # CLI: add workout_id column to events table
    @app.cli.command('add-workout-id-to-events')
    def add_workout_id_to_events():
        """Add workout_id FK column to events table."""
        from sqlalchemy import text as sa_text
        with db.engine.connect() as conn:
            # Check if column exists
            result = conn.execute(sa_text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='events' AND column_name='workout_id'"
            ))
            if result.fetchone():
                print('Column workout_id already exists.')
                return
            conn.execute(sa_text(
                'ALTER TABLE events ADD COLUMN workout_id INTEGER '
                'REFERENCES workouts(id)'
            ))
            conn.commit()
        print('Added workout_id column to events table.')

    # CLI: add preferences column to users table
    @app.cli.command('add-user-preferences')
    def add_user_preferences():
        """Add preferences JSONB column to users table."""
        from sqlalchemy import text as sa_text
        with db.engine.connect() as conn:
            result = conn.execute(sa_text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='preferences'"
            ))
            if result.fetchone():
                print('Column preferences already exists.')
                return
            conn.execute(sa_text(
                "ALTER TABLE users ADD COLUMN preferences JSON NOT NULL DEFAULT '{}'"
            ))
            conn.commit()
        print('Added preferences column to users table.')

    # Helper: create goals and phases tables
    def _ensure_goals_tables():
        from sqlalchemy import text as sa_text
        with db.engine.connect() as conn:
            result = conn.execute(sa_text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_name='goals'"
            ))
            if result.fetchone():
                print('Goals table already exists.')
            else:
                conn.execute(sa_text("""
                    CREATE TABLE goals (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        metric_key VARCHAR(50) NOT NULL,
                        target_value FLOAT NOT NULL,
                        period_type VARCHAR(20) NOT NULL,
                        start_date DATE,
                        end_date DATE,
                        description TEXT,
                        active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """))
                print('Created goals table.')

            result = conn.execute(sa_text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_name='phases'"
            ))
            if result.fetchone():
                print('Phases table already exists.')
            else:
                conn.execute(sa_text("""
                    CREATE TABLE phases (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        name VARCHAR(100) NOT NULL,
                        description TEXT,
                        start_date DATE NOT NULL,
                        end_date DATE NOT NULL,
                        targets JSON NOT NULL DEFAULT '[]',
                        "order" INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """))
                print('Created phases table.')
            conn.commit()

    # CLI: create goals and phases tables
    @app.cli.command('create-goals-tables')
    def create_goals_tables():
        """Create goals and phases tables."""
        _ensure_goals_tables()

    # Helper: migrate goals to v2 (hierarchical)
    def _migrate_goals_v2():
        from sqlalchemy import text as sa_text
        with db.engine.connect() as conn:
            # Add phase_id column
            result = conn.execute(sa_text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='goals' AND column_name='phase_id'"
            ))
            if not result.fetchone():
                conn.execute(sa_text(
                    'ALTER TABLE goals ADD COLUMN phase_id INTEGER REFERENCES phases(id)'
                ))
                print('Added phase_id column to goals.')
            else:
                print('phase_id already exists.')

            # Add goal_type column
            result = conn.execute(sa_text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='goals' AND column_name='goal_type'"
            ))
            if not result.fetchone():
                conn.execute(sa_text(
                    "ALTER TABLE goals ADD COLUMN goal_type VARCHAR(20) DEFAULT 'metric'"
                ))
                print('Added goal_type column to goals.')
            else:
                print('goal_type already exists.')

            # Make metric_key nullable (check goals may not have a metric)
            conn.execute(sa_text(
                'ALTER TABLE goals ALTER COLUMN metric_key DROP NOT NULL'
            ))
            conn.execute(sa_text(
                'ALTER TABLE goals ALTER COLUMN target_value DROP NOT NULL'
            ))

            # Create goal_checks table
            result = conn.execute(sa_text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_name='goal_checks'"
            ))
            if not result.fetchone():
                conn.execute(sa_text("""
                    CREATE TABLE goal_checks (
                        id SERIAL PRIMARY KEY,
                        goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        date DATE NOT NULL DEFAULT CURRENT_DATE,
                        event_id INTEGER REFERENCES events(id),
                        created_at TIMESTAMP DEFAULT NOW(),
                        CONSTRAINT uq_goal_check_date UNIQUE (goal_id, date)
                    )
                """))
                print('Created goal_checks table.')
            else:
                print('goal_checks table already exists.')

            # Ensure "Meta Cumprida" action exists
            result = conn.execute(sa_text(
                "SELECT id FROM actions WHERE nome = 'Meta Cumprida'"
            ))
            if not result.fetchone():
                conn.execute(sa_text(
                    "INSERT INTO actions (nome, areas, sinergia) "
                    "VALUES ('Meta Cumprida', '{\"Saude\": 5, \"Mente\": 3}', true)"
                ))
                print('Created "Meta Cumprida" action.')
            else:
                print('"Meta Cumprida" action already exists.')

            conn.commit()
        print('Goals v2 migration complete.')

    # Helper: migrate goals to v3 (parent_id hierarchy, remove phases)
    def _migrate_goals_v3():
        from sqlalchemy import text as sa_text
        with db.engine.connect() as conn:
            # 1. Add parent_id column
            result = conn.execute(sa_text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='goals' AND column_name='parent_id'"
            ))
            if not result.fetchone():
                conn.execute(sa_text(
                    'ALTER TABLE goals ADD COLUMN parent_id INTEGER REFERENCES goals(id) ON DELETE CASCADE'
                ))
                print('Added parent_id column to goals.')
            else:
                print('parent_id already exists.')

            # 2. Add name column (populate from description, then set NOT NULL)
            result = conn.execute(sa_text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='goals' AND column_name='name'"
            ))
            if not result.fetchone():
                conn.execute(sa_text(
                    'ALTER TABLE goals ADD COLUMN name VARCHAR(200)'
                ))
                # Populate name from description
                conn.execute(sa_text(
                    "UPDATE goals SET name = COALESCE(LEFT(description, 200), 'Meta sem nome')"
                ))
                conn.execute(sa_text(
                    'ALTER TABLE goals ALTER COLUMN name SET NOT NULL'
                ))
                print('Added and populated name column.')
            else:
                print('name column already exists.')

            # 3. Add order column
            result = conn.execute(sa_text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='goals' AND column_name='order'"
            ))
            if not result.fetchone():
                conn.execute(sa_text(
                    'ALTER TABLE goals ADD COLUMN "order" INTEGER DEFAULT 0'
                ))
                print('Added order column.')
            else:
                print('order column already exists.')

            # 4. Convert phases into group goals and reparent phase goals
            result = conn.execute(sa_text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_name='phases'"
            ))
            if result.fetchone():
                # Check if there are phases to migrate
                phases = conn.execute(sa_text(
                    'SELECT id, user_id, name, description, start_date, end_date, "order" FROM phases'
                )).fetchall()

                if phases:
                    print(f'Migrating {len(phases)} phases to group goals...')
                    for p in phases:
                        # Insert phase as group goal
                        new_goal = conn.execute(sa_text(
                            "INSERT INTO goals (user_id, name, goal_type, period_type, "
                            "start_date, end_date, description, active, \"order\") "
                            "VALUES (:uid, :name, 'group', 'monthly', :start, :end, :desc, true, :ord) "
                            "RETURNING id"
                        ), {
                            'uid': p.user_id, 'name': p.name,
                            'start': p.start_date, 'end': p.end_date,
                            'desc': p.description, 'ord': p.order,
                        }).fetchone()

                        # Reparent goals that belonged to this phase
                        conn.execute(sa_text(
                            'UPDATE goals SET parent_id = :new_id WHERE phase_id = :old_id'
                        ), {'new_id': new_goal.id, 'old_id': p.id})
                        print(f'  Phase "{p.name}" -> goal #{new_goal.id}')

                # 5. Drop phase_id column from goals
                result = conn.execute(sa_text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='goals' AND column_name='phase_id'"
                ))
                if result.fetchone():
                    conn.execute(sa_text(
                        'ALTER TABLE goals DROP COLUMN phase_id'
                    ))
                    print('Dropped phase_id column from goals.')

                # 6. Drop phases table
                conn.execute(sa_text('DROP TABLE IF EXISTS phases CASCADE'))
                print('Dropped phases table.')
            else:
                print('No phases table found (already migrated or fresh install).')

                # Still try to drop phase_id if it exists
                result = conn.execute(sa_text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='goals' AND column_name='phase_id'"
                ))
                if result.fetchone():
                    conn.execute(sa_text(
                        'ALTER TABLE goals DROP COLUMN phase_id'
                    ))
                    print('Dropped orphan phase_id column.')

            conn.commit()
        print('Goals v3 migration complete.')

    import click

    # CLI: migrate goals to v2 (hierarchical)
    @app.cli.command('migrate-goals-v2')
    def migrate_goals_v2_cmd():
        """Add phase_id, goal_type to goals and create goal_checks table."""
        _migrate_goals_v2()

    # CLI: migrate goals to v3 (parent_id hierarchy, remove phases)
    @app.cli.command('migrate-goals-v3')
    def migrate_goals_v3_cmd():
        """Migrate goals to v3: parent_id hierarchy, remove phases."""
        _migrate_goals_v3()

    # CLI: seed goals from Projeto Travessia
    @app.cli.command('seed-goals')
    @click.option('--user-id', default=None, type=int, help='User ID to seed goals for')
    def seed_goals_command(user_id):
        """Migrate to v3 and seed hierarchical goals tree."""
        _ensure_goals_tables()
        _migrate_goals_v2()
        _migrate_goals_v3()
        from .seed.seed_goals import seed_travessia_goals
        seed_travessia_goals(user_id=user_id)

    # CLI: seed TACO foods
    @app.cli.command('seed-taco')
    def seed_taco_command():
        """Seed TACO food database (597 Brazilian foods)."""
        db.create_all()
        from .seed.seed_nutrition import seed_taco_foods
        seed_taco_foods()

    # CLI: migrate nutrition tables
    @app.cli.command('migrate-nutrition')
    def migrate_nutrition_cmd():
        """Create nutrition + workout tables."""
        db.create_all()
        print('Nutrition and workout tables created.')

    # CLI: seed exercises
    @app.cli.command('seed-exercises')
    def seed_exercises_command():
        """Seed exercise catalog (~48 exercises)."""
        db.create_all()
        from .seed.seed_exercises import seed_exercises
        seed_exercises()

    # CLI: add altura column to users table
    @app.cli.command('add-user-altura')
    def add_user_altura():
        """Add altura column to users table."""
        from sqlalchemy import text as sa_text
        with db.engine.connect() as conn:
            result = conn.execute(sa_text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='altura'"
            ))
            if result.fetchone():
                print('Column altura already exists.')
                return
            conn.execute(sa_text(
                'ALTER TABLE users ADD COLUMN altura FLOAT'
            ))
            conn.commit()
        print('Added altura column to users table.')

    # CLI: migrate data from one user to another
    @app.cli.command('migrate-user-data')
    @click.argument('from_id', type=int)
    @click.argument('to_id', type=int)
    def migrate_user_data(from_id, to_id):
        """Migrate all data from one user to another. Usage: flask migrate-user-data 1 2"""
        from .models.user import User
        from .models.health import HealthMetric, Workout
        from .models.gamification import Event, UserTrophy

        src = User.query.get(from_id)
        dst = User.query.get(to_id)
        if not src:
            print(f'User {from_id} not found.')
            return
        if not dst:
            print(f'User {to_id} not found.')
            return

        # Migrate health metrics
        metrics = HealthMetric.query.filter_by(user_id=from_id).count()
        HealthMetric.query.filter_by(user_id=from_id).update({'user_id': to_id})
        print(f'Migrated {metrics} health metrics.')

        # Migrate workouts
        workouts = Workout.query.filter_by(user_id=from_id).count()
        Workout.query.filter_by(user_id=from_id).update({'user_id': to_id})
        print(f'Migrated {workouts} workouts.')

        # Migrate events
        events = Event.query.filter_by(user_id=from_id).count()
        Event.query.filter_by(user_id=from_id).update({'user_id': to_id})
        print(f'Migrated {events} events.')

        # Migrate trophies (skip duplicates)
        user_trophies = UserTrophy.query.filter_by(user_id=from_id).all()
        migrated_trophies = 0
        for ut in user_trophies:
            existing = UserTrophy.query.filter_by(
                user_id=to_id, trophy_id=ut.trophy_id
            ).first()
            if not existing:
                ut.user_id = to_id
                migrated_trophies += 1
            else:
                db.session.delete(ut)
        print(f'Migrated {migrated_trophies} trophies.')

        # Transfer XP and level
        dst.experience += src.experience
        dst.level = max(dst.level, src.level)
        dst.next_level_exp = max(dst.next_level_exp, src.next_level_exp)
        print(f'Transferred XP: {src.experience}, Level: {src.level}')

        db.session.commit()
        print(f'Done! All data migrated from user {from_id} ({src.nome}) to user {to_id} ({dst.nome}).')

    return app
