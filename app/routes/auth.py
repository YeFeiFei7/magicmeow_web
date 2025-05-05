import app
from flask import Blueprint, request, redirect, url_for, render_template, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models.user import User
from werkzeug.security import generate_password_hash, check_password_hash
import requests
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/google', methods=['GET'])
def google_login():
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={app.config['GOOGLE_CLIENT_ID']}&redirect_uri={app.config['GOOGLE_REDIRECT_URI']}&scope=email%20profile"
    return redirect(google_auth_url)

@auth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    code = request.args.get('code')
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        'code': code,
        'client_id': app.config['GOOGLE_CLIENT_ID'],
        'client_secret': app.config['GOOGLE_CLIENT_SECRET'],
        'redirect_uri': app.config['GOOGLE_REDIRECT_URI'],
        'grant_type': 'authorization_code'
    }
    response = requests.post(token_url, data=data)
    access_token = response.json().get('access_token')
    user_info = requests.get('https://www.googleapis.com/oauth2/v1/userinfo', headers={'Authorization': f'Bearer {access_token}'})
    google_id = user_info.json().get('id')
    email = user_info.json().get('email')

    user = User.query.filter_by(google_id=google_id).first()
    if user:
        login_user(user)
        return redirect(url_for('main.welcome'))
    else:
        return redirect(url_for('auth.create_account', google_id=google_id, email=email))

@auth_bp.route('/register', methods=['GET', 'POST'])
def create_account():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        google_id = request.args.get('google_id')

        if User.query.filter_by(username=username).first():
            flash('Username already exists. Try another.', 'error')
            return render_template('createAccount.html')

        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('createAccount.html')

        if not (re.search(r'[A-Z]', password) and re.search(r'[a-z]', password) and
                re.search(r'[0-9]', password) and re.search(r'[!@#$%^&*]', password)):
            flash('Password must include uppercase, lowercase, numbers, and special characters.', 'error')
            return render_template('createAccount.html')

        hashed_password = generate_password_hash(password, method='sha256')
        new_user = User(username=username, password=hashed_password, google_id=google_id)
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        return redirect(url_for('main.welcome'))

    return render_template('createAccount.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('main.welcome'))
        else:
            flash('Invalid username or password.', 'error')
            return render_template('login.html')
    return render_template('login.html')

@auth_bp.route('/logout', methods=['GET'])
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))