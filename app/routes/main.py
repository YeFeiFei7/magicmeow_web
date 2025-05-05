from flask import Blueprint, render_template, redirect, url_for
from flask_login import current_user

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template('index.html')

@main_bp.route('/main')
def main():
    if not current_user.is_authenticated:
        return render_template('main.html', require_login=True)
    return render_template('main.html', username=current_user.username)

@main_bp.route('/welcome')
def welcome():
    if not current_user.is_authenticated:
        return redirect(url_for('auth.login'))
    return render_template('welcome.html', username=current_user.username)