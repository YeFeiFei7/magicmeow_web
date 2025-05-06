import os
from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from oauthlib.oauth2 import WebApplicationClient
import requests
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Load configuration
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.environ.get('PROD_BASE_URL') if os.environ.get('FLASK_ENV') == 'production' else os.environ.get('LOCAL_BASE_URL')
    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')

app.config.from_object(Config)

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
CORS(app)

# OAuth client
client = WebApplicationClient(os.environ.get('GOOGLE_CLIENT_ID'))

# User model
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128))  # For non-OAuth users, if needed

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    google_provider_cfg = requests.get("https://accounts.google.com/.well-known/openid-configuration").json()
    authorization_endpoint = google_provider_cfg["authorization_endpoint"]
    request_uri = client.prepare_request_uri(
        authorization_endpoint,
        redirect_uri=app.config['GOOGLE_REDIRECT_URI'],
        scope=["openid", "email", "profile"]
    )
    return redirect(request_uri)

@app.route('/callback')
def callback():
    code = request.args.get("code")
    token_url = "https://oauth2.googleapis.com/token"
    token_params = {
        "code": code,
        "client_id": app.config['GOOGLE_CLIENT_ID'],
        "client_secret": app.config['GOOGLE_CLIENT_SECRET'],
        "redirect_uri": app.config['GOOGLE_REDIRECT_URI'],
        "grant_type": "authorization_code"
    }
    token_response = requests.post(token_url, data=token_params).json()
    user_info = requests.get(
        "https://www.googleapis.com/userinfo/v2/me",
        headers={"Authorization": f"Bearer {token_response['access_token']}"}
    ).json()

    email = user_info.get("email")
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email)
        db.session.add(user)
        db.session.commit()
    login_user(user)
    return redirect(url_for('focus'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/focus')
@login_required
def focus():
    return render_template('focus.html')

# Serve static files
@app.route('/static/<path:path>')
def send_static(path):
    return app.send_static_file(path)

# Create database tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))