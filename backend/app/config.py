import os
from datetime import timedelta
from urllib.parse import quote_plus


def build_database_uri():
    """Build database URI from individual env vars or DATABASE_URL."""
    db_host = os.environ.get('DB_HOST')
    if db_host:
        db_user = os.environ.get('DB_USER', 'renato')
        db_pass = quote_plus(os.environ.get('DB_PASSWORD', ''))
        db_name = os.environ.get('DB_NAME', 'lifemanager')
        db_port = os.environ.get('DB_PORT', '5432')
        return f'postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}'
    return os.environ.get(
        'DATABASE_URL',
        'postgresql://renato:Teste01@192.168.15.184:5432/lifemanager'
    )


class Config:
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_DATABASE_URI = build_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'life-manager-jwt-secret')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
