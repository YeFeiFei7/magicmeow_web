import os
from flask import Flask, request, render_template, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, EqualTo, ValidationError
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth
import string
import random

# Load environment variables
load_dotenv()

# Environment variables
IS_PROD = os.environ.get('FLASK_ENV') == 'production'
BASE_URL = os.environ.get('PROD_BASE_URL' if IS_PROD else 'LOCAL_BASE_URL')
HOST = os.environ.get('PROD_HOST' if IS_PROD else 'LOCAL_HOST')

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key')

# Use PostgreSQL database URI from environment variables
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
oauth = OAuth(app)

# Google OAuth
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
google = oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# User model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=True)
    google_id = db.Column(db.String(120), unique=True, nullable=True)

# Forms
class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Create Account')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already exists. Try: ' + generate_unique_username_suggestion())

def generate_unique_username_suggestion():
    existing_usernames = {u.username for u in User.query.all()}
    base = ''.join(random.choices(string.ascii_lowercase, k=5))
    suggestion = base
    counter = 1
    while suggestion in existing_usernames:
        suggestion = f"{base}{counter}"
        counter += 1
    return suggestion

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main'))
    return render_template('index.html')

@app.route('/main')
def main():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    return render_template('main.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and check_password_hash(user.password, form.password.data):
            login_user(user)
            return redirect(url_for('welcome', username=user.username))
        flash('Invalid username or password.', 'error')
    return render_template('login.html', form=form)

@app.route('/create_account', methods=['GET', 'POST'])
def create_account():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    form = RegistrationForm()
    if form.validate_on_submit():
        requirements = [
            lambda p: any(c.isupper() for c in p),
            lambda p: any(c.islower() for c in p),
            lambda p: any(c.isdigit() for c in p),
            lambda p: any(c in '!@#$%^&*' for c in p)
        ]
        if not all(req(form.password.data) for req in requirements):
            flash('Password must include uppercase, lowercase, numbers, and special characters.', 'error')
        else:
            user = User(username=form.username.data, password=generate_password_hash(form.password.data))
            db.session.add(user)
            db.session.commit()
            login_user(user)
            return redirect(url_for('welcome', username=user.username))
    return render_template('create_account.html', form=form)

@app.route('/auth/google/callback' if not IS_PROD else '/api/auth/google/callback')
def google_callback():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    token = google.authorize_access_token()
    resp = google.get('userinfo')
    user_info = resp.json()
    user = User.query.filter_by(google_id=user_info['sub']).first()
    if not user:
        session['google_user'] = user_info
        return redirect(url_for('create_account'))
    login_user(user)
    return redirect(url_for('welcome', username=user.username))

@app.route('/google_login')
def google_login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/welcome')
def welcome():
    username = request.args.get('username')
    if not username:
        username = session.get('google_user', {}).get('email', 'User')
    return render_template('welcome.html', username=username)

@app.route('/home')
@login_required
def home():
    return render_template('home.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)