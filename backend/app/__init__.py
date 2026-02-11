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

    app = Flask(
        __name__,
        static_folder=os.path.abspath(static_folder),
        static_url_path='',
    )
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

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(health_bp, url_prefix='/api/health')
    app.register_blueprint(gamification_bp, url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

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

    # SPA catch-all: serve index.html for non-API routes
    @app.route('/')
    @app.route('/<path:path>')
    def serve_spa(path=''):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        index_path = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, 'index.html')
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
