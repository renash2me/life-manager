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

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(health_bp, url_prefix='/api/health')
    app.register_blueprint(gamification_bp, url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(goals_bp, url_prefix='/api/goals')

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

    # CLI: create goals and phases tables
    @app.cli.command('create-goals-tables')
    def create_goals_tables():
        """Create goals and phases tables."""
        from sqlalchemy import text as sa_text
        with db.engine.connect() as conn:
            # Check if goals table exists
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

            # Check if phases table exists
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

    # CLI: seed goals from Projeto Travessia
    @app.cli.command('seed-goals')
    def seed_goals_command():
        """Seed goals and phases from Projeto Travessia 2026."""
        from .seed.seed_goals import seed_travessia_goals
        seed_travessia_goals()

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
    import click

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
