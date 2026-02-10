import os
from flask import Flask, send_from_directory
from .config import config
from .extensions import db, migrate, cors


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

    # Import models so Alembic can detect them
    from . import models  # noqa: F401

    # Register blueprints
    from .routes.health import health_bp
    from .routes.gamification import gamification_bp
    from .routes.user import user_bp
    from .routes.dashboard import dashboard_bp

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

    # CLI: seed command
    @app.cli.command('seed')
    def seed_command():
        """Seed the database with initial data."""
        from .seed.seed_data import seed_initial_data
        seed_initial_data()
        print('Database seeded successfully.')

    return app
