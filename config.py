import os

class Config:
    # Secret key for session management, with a fallback default for safety
    SECRET_KEY = os.environ.get('SECRET_KEY')

    # Database configuration
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        SQLALCHEMY_DATABASE_URI = DATABASE_URL.replace("postgres://", "postgresql://")
    else:
        raise ValueError("DATABASE_URL environment variable is not set. Please set it in Render's Environment settings.")

    # SQLAlchemy settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Google OAuth configuration
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.environ.get('PROD_BASE_URL') if os.environ.get('FLASK_ENV') == 'production' else os.environ.get('LOCAL_BASE_URL')

    # Flask environment
    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')