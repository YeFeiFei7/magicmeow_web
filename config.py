import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')  # 提供默认值
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        SQLALCHEMY_DATABASE_URI = DATABASE_URL.replace("postgres://", "postgresql://")
    else:
        raise ValueError("DATABASE_URL environment variable is not set")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.environ.get('PROD_BASE_URL') if os.environ.get('FLASK_ENV') == 'production' else os.environ.get('LOCAL_BASE_URL')