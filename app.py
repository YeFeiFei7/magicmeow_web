from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, EqualTo, Regexp
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
import os
import json
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid
import logging
from chat_api import handle_chat_message
from statistics_backend import statistics_bp

# 设置日志
logging.basicConfig(level=logging.DEBUG)

# 加载环境变量
load_dotenv()

app = Flask(__name__)
app.static_folder = 'static'
app.template_folder = 'templates'
app.secret_key = os.getenv('SECRET_KEY')

# 文件上传配置
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# 确保上传文件夹存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# JSON 文件路径
USERS_JSON = 'users.json'

# 初始化 SQLite 数据库
def init_chat_db():
    with sqlite3.connect('chat_history.db') as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                session_title TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                is_current INTEGER DEFAULT 0,
                latest_update TEXT NOT NULL
            )
        ''')
        conn.commit()

init_chat_db()

# 初始化 JSON 文件
def init_json_db():
    if not os.path.exists(USERS_JSON):
        with open(USERS_JSON, 'w') as f:
            json.dump({'users': []}, f, indent=4)

# 读取 JSON 文件
def read_users():
    try:
        with open(USERS_JSON, 'r') as f:
            data = json.load(f)
            return data['users']
    except (FileNotFoundError, json.JSONDecodeError):
        init_json_db()
        return []

# 写入 JSON 文件
def write_users(users):
    with open(USERS_JSON, 'w') as f:
        json.dump({'users': users}, f, indent=4)

# 检查文件扩展名
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Google OAuth 配置
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# 登录表单
class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

# 创建账户表单
class CreateAccountForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField(
        'Password',
        validators=[
            DataRequired(),
            Regexp(
                r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$',
                message='Password must include uppercase, lowercase, number, special character, and be at least 8 characters.'
            ),
        ],
    )
    confirm_password = PasswordField(
        'Confirm Password', validators=[DataRequired(), EqualTo('password', message='Passwords must match.')]
    )
    submit = SubmitField('Create Account')

# 主页路由（Landing Page）
@app.route('/')
def index():
    return render_template('index.html')

# Main 页面路由
@app.route('/main')
def main():
    return render_template('main.html')

# 登录页面路由
@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        users = read_users()
        user = next((u for u in users if u['username'] == username), None)
        if user and user['password_hash'] and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session.pop('chat_session_id', None)  # Clear session on login
            return redirect(url_for('welcome'))
        flash('Invalid username or password.', 'error')
    return render_template('login.html', form=form)

# Google 登录路由
@app.route('/auth/google')
def google_login():
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

# Google 回调路由
@app.route('/auth/google/callback')
def google_callback():
    try:
        token = google.authorize_access_token()
        user_info = token['userinfo']
        email = user_info['email']
        users = read_users()
        user = next((u for u in users if u['email'] == email), None)

        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session.pop('chat_session_id', None)  # Clear session on login
            return redirect(url_for('welcome'))
        else:
            session['google_email'] = email
            flash('No account found for this email. Please create an account.', 'error')
            return redirect(url_for('create_account'))
    except Exception as e:
        flash('Google login failed. Please try again.', 'error')
        return redirect(url_for('login'))

# 创建账户路由
@app.route('/create_account', methods=['GET', 'POST'])
def create_account():
    form = CreateAccountForm()
    email = session.get('google_email')

    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        users = read_users()

        # 检查用户名和邮箱唯一性
        if any(u['username'] == username for u in users):
            flash('Username already exists.', 'error')
            return render_template('createAccount.html', form=form, email=email)
        if email and any(u['email'] == email for u in users):
            flash('Email already registered.', 'error')
            return render_template('createAccount.html', form=form, email=email)

        # 创建新用户
        new_user = {
            'id': max([u['id'] for u in users], default=0) + 1,
            'username': username,
            'password_hash': generate_password_hash(password),
            'email': email or f'{username}@magicmeow.com',
            'avatar': None,
            'settings': {
                'theme': 'light',
                'notifications': True,
                'language': 'en'
            },
            'focus_records': [],
            'mood_records': [],
            'plans': [],
            'folders': [
                {'id': 1, 'name': 'UI/UX'},
                {'id': 2, 'name': 'Default'}
            ]
        }
        users.append(new_user)
        write_users(users)

        session['user_id'] = new_user['id']
        session['username'] = new_user['username']
        session.pop('google_email', None)
        session.pop('chat_session_id', None)
        return redirect(url_for('time_personality_quiz'))
    else:
        # Flash specific validation errors
        for field, errors in form.errors.items():
            for error in errors:
                flash(error, 'error')

    return render_template('createAccount.html', form=form, email=email)

# 欢迎页面路由
@app.route('/welcome')
def welcome():
    if 'user_id' not in session:
        flash('Please login first.', 'error')
        return redirect(url_for('login'))
    username = session.get('username', 'User')
    return render_template('welcome.html', username=username)

# 时间人格测评页面路由
@app.route('/time_personality_quiz')
def time_personality_quiz():
    if 'user_id' not in session:
        flash('Please login first.', 'error')
        return redirect(url_for('login'))
    return render_template('time_personality_quiz.html')

# 保存测评结果 API
@app.route('/api/save_quiz_result', methods=['POST'])
def save_quiz_result():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    data = request.json
    time_personality = data.get('time_personality')
    if not time_personality:
        return jsonify({'success': False, 'error': 'Time personality is required'}), 400

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    user['settings']['time_personality'] = time_personality
    write_users(users)
    return jsonify({'success': True, 'time_personality': time_personality})

# Home 页面路由
@app.route('/home')
def home():
    if 'user_id' not in session:
        flash('Please login first.', 'error')
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('home.html', user=user)

# Profile 页面路由
@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('profile.html', user=user)

@app.route('/viewMonthly')
def view_monthly():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('viewMonthly.html', user=user)

@app.route('/viewMonthly/folder')
def folder_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('folder.html', user=user)

@app.route('/viewWeekly')
def view_weekly():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('viewWeekly.html', user=user)

@app.route('/viewDaily')
def view_daily():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('viewDaily.html', user=user)

@app.route('/focus')
def focus():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('focus.html', user=user, session=session)

@app.route('/statistics')
def statistics():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('statistics.html', user=user)

@app.route('/setting')
def setting():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('setting.html', user=user)

@app.route('/aboutUs')
def about_us():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('aboutUs.html', user=user)

@app.route('/addPlan')
def add_plan_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('addPlan.html', user=user)

@app.route('/discover')
def discover():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('login'))
    return render_template('discover.html', user=user)
# 注销路由
@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    session.pop('google_email', None)
    session.pop('chat_session_id', None)
    return redirect(url_for('main'))

# 创建新会话
@app.route('/api/chat/new', methods=['POST'])
def create_new_chat_session():
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400

    # Generate new session ID
    session_id = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    session['chat_session_id'] = session_id

    # Unset is_current for all other sessions
    with sqlite3.connect('chat_history.db') as conn:
        conn.execute('UPDATE history SET is_current = 0 WHERE user_id = ?', (user_id,))
        conn.commit()

    return jsonify({'session_id': session_id}), 200

# 删除会话
@app.route('/api/chat/delete/<session_id>', methods=['DELETE'])
def delete_chat_session(session_id):
    user_id = session.get('user_id', 'guest')
    with sqlite3.connect('chat_history.db') as conn:
        cursor = conn.execute('SELECT COUNT(*) FROM history WHERE user_id = ? AND session_id = ?', (user_id, session_id))
        if cursor.fetchone()[0] == 0:
            return jsonify({'error': 'Session not found'}), 404

        conn.execute('DELETE FROM history WHERE user_id = ? AND session_id = ?', (user_id, session_id))
        conn.commit()

        # Clear current session if deleted
        if session.get('chat_session_id') == session_id:
            session.pop('chat_session_id', None)

    return jsonify({'success': 'Session deleted successfully'}), 200

# 聊天 API 路由
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    tone = data.get('tone', 'cute')
    user_id = session.get('user_id', 'guest')
    if not message:
        return jsonify({'error': 'Message cannot be empty'}), 400
    try:
        # Update is_current and latest_update for the current session
        session_id = session.get('chat_session_id')
        if session_id:
            with sqlite3.connect('chat_history.db') as conn:
                conn.execute('UPDATE history SET is_current = 0 WHERE user_id = ?', (user_id,))
                conn.execute('UPDATE history SET is_current = 1, latest_update = ? WHERE user_id = ? AND session_id = ?',
                             (datetime.now().isoformat(), user_id, session_id))
                conn.commit()

        response = handle_chat_message(user_id, message, tone)
        return jsonify({'reply': response})
    except Exception as e:
        return jsonify({'error': f'Sorry, something went wrong! Error: {str(e)}'}), 500

# 聊天历史路由
@app.route('/api/chat_history', methods=['GET'])
def chat_history():
    user_id = session.get('user_id', 'guest')
    with sqlite3.connect('chat_history.db') as conn:
        cursor = conn.execute('''
            SELECT DISTINCT session_id, session_title, MAX(timestamp) as timestamp, is_current, MAX(latest_update) as latest_update
            FROM history
            WHERE user_id = ?
            GROUP BY session_id
            ORDER BY latest_update DESC
            LIMIT 10
        ''', (user_id,))
        sessions = [
            {
                'session_id': row[0],
                'session_title': row[1],
                'timestamp': row[2],
                'is_current': bool(row[3]),
                'latest_update': row[4]
            } for row in cursor.fetchall()
        ]
    return jsonify({'sessions': sessions})

# 获取特定会话的消息
@app.route('/api/chat_history/<session_id>', methods=['GET'])
def chat_session(session_id):
    user_id = session.get('user_id', 'guest')
    with sqlite3.connect('chat_history.db') as conn:
        # Update is_current and latest_update when accessing a session
        conn.execute('UPDATE history SET is_current = 0 WHERE user_id = ?', (user_id,))
        conn.execute('UPDATE history SET is_current = 1, latest_update = ? WHERE user_id = ? AND session_id = ?',
                     (datetime.now().isoformat(), user_id, session_id))
        conn.commit()

        cursor = conn.execute('''
            SELECT role, content, is_current, latest_update
            FROM history
            WHERE user_id = ? AND session_id = ?
            ORDER BY timestamp
        ''', (user_id, session_id))
        messages = [
            {
                'role': row[0],
                'content': row[1],
                'is_current': bool(row[2]),
                'latest_update': row[3]
            } for row in cursor.fetchall()
        ]
    session['chat_session_id'] = session_id  # Set as current session
    return jsonify({'messages': messages})

# 获取当前会话的聊天记录
@app.route('/api/current_session', methods=['GET'])
def current_session():
    user_id = session.get('user_id', 'guest')
    session_id = session.get('chat_session_id')
    if not session_id:
        return jsonify({'messages': []})
    with sqlite3.connect('chat_history.db') as conn:
        cursor = conn.execute('''
            SELECT role, content, is_current, latest_update
            FROM history
            WHERE user_id = ? AND session_id = ?
            ORDER BY timestamp
        ''', (user_id, session_id))
        messages = [
            {
                'role': row[0],
                'content': row[1],
                'is_current': bool(row[2]),
                'latest_update': row[3]
            } for row in cursor.fetchall()
        ]
    return jsonify({'messages': messages})

# 获取用户摘要数据
@app.route('/api/user_summary', methods=['GET'])
def user_summary():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    user_id = session['user_id']
    users = read_users()
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    # Fetch recent chat messages
    with sqlite3.connect('chat_history.db') as conn:
        cursor = conn.execute('''
            SELECT content FROM history
            WHERE user_id = ? AND role = 'user'
            ORDER BY timestamp DESC LIMIT 3
        ''', (user_id,))
        recent_messages = [row[0] for row in cursor.fetchall()]

    return jsonify({
        'success': True,
        'plans': user.get('plans', []),
        'focus_records': user.get('focus_records', []),
        'recent_messages': recent_messages
    })

# 保存专注会话
@app.route('/api/save_focus_session', methods=['POST'])
def save_focus_session():
    logging.debug('Received save_focus_session request: %s', request.json)
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    data = request.json
    duration = data.get('duration')
    timestamp = data.get('timestamp')

    if not duration or not timestamp:
        return jsonify({'success': False, 'error': 'Duration and timestamp are required'}), 400

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    if 'focus_records' not in user:
        user['focus_records'] = []

    focus_record = {
        'id': str(uuid.uuid4()),
        'duration': duration,  # Duration in seconds
        'timestamp': timestamp,
        'type': 'focus'  # Optional: to differentiate focus types if needed
    }

    user['focus_records'].append(focus_record)
    write_users(users)
    logging.debug('Focus session saved: %s', focus_record)
    return jsonify({'success': True, 'focus_record': focus_record})

# 更新头像路由
@app.route('/update_avatar', methods=['POST'])
def update_avatar():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    if 'avatar' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400

    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'Invalid file type. Allowed types: png, jpg, jpeg, gif'}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    avatar_url = f'/static/uploads/{filename}'
    users = read_users()
    user_id = session['user_id']
    for user in users:
        if user['id'] == user_id:
            user['avatar'] = avatar_url
            break
    write_users(users)

    return jsonify({'success': True, 'avatar_url': avatar_url})

# 更新用户名路由
@app.route('/update_username', methods=['POST'])
def update_username():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    data = request.json
    new_username = data.get('username')
    if not new_username:
        return jsonify({'success': False, 'error': 'Username cannot be empty'}), 400

    users = read_users()
    user_id = session['user_id']

    if any(u['username'] == new_username and u['id'] != user_id for u in users):
        return jsonify({'success': False, 'error': 'Username already exists'}), 400

    for user in users:
        if user['id'] == user_id:
            user['username'] = new_username
            break
    write_users(users)

    session['username'] = new_username

    return jsonify({'success': True})

# 获取当前用户信息
@app.route('/api/user_info', methods=['GET'])
def user_info():
    if 'user_id' not in session:
        return jsonify({'error': 'Please login first'}), 401
    user = next((u for u in read_users() if u['id'] == session['user_id']), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'avatar': user.get('avatar') or '/static/images/user.png',
        'settings': user.get('settings', {
            'theme': 'light',
            'notifications': True,
            'language': 'en'
        })
    })

# 保存用户设置
@app.route('/update_settings', methods=['POST'])
def update_settings():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    data = request.json
    theme = data.get('theme')
    notifications = data.get('notifications')
    language = data.get('language')

    if not theme or notifications is None or not language:
        return jsonify({'success': False, 'error': 'Invalid settings data'}), 400

    users = read_users()
    user_id = session['user_id']
    for user in users:
        if user['id'] == user_id:
            user['settings'] = {
                'theme': theme,
                'notifications': notifications,
                'language': language
            }
            break
    write_users(users)

    return jsonify({'success': True})

# 获取文件夹列表
@app.route('/api/get_folders', methods=['GET'])
def get_folders():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    folders = user.get('folders', [{'id': 1, 'name': 'UI/UX'}, {'id': 2, 'name': 'Default'}])
    return jsonify({'success': True, 'folders': folders})

# 创建新文件夹
@app.route('/api/create_folder', methods=['POST'])
def create_folder():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    data = request.json
    folder_name = data.get('name')
    if not folder_name:
        return jsonify({'success': False, 'error': 'Folder name is required'}), 400

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    if 'folders' not in user:
        user['folders'] = [{'id': 1, 'name': 'UI/UX'}, {'id': 2, 'name': 'Default'}]

    # Check for duplicate folder names
    if any(folder['name'] == folder_name for folder in user['folders']):
        return jsonify({'success': False, 'error': 'Folder already exists'}), 400

    # Generate new folder ID
    max_id = max([folder['id'] for folder in user['folders']], default=0)
    new_folder = {'id': max_id + 1, 'name': folder_name}
    user['folders'].append(new_folder)
    write_users(users)
    return jsonify({'success': True})

# 重命名文件夹
@app.route('/api/rename_folder', methods=['POST'])
def rename_folder():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    data = request.json
    folder_id = data.get('folder_id')
    new_name = data.get('new_name')
    if not folder_id or not new_name:
        return jsonify({'success': False, 'error': 'Folder ID and new name are required'}), 400

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    if 'folders' not in user:
        user['folders'] = [{'id': 1, 'name': 'UI/UX'}, {'id': 2, 'name': 'Default'}]

    # Check for duplicate folder names
    if any(folder['name'] == new_name for folder in user['folders'] if folder['id'] != folder_id):
        return jsonify({'success': False, 'error': 'Folder name already exists'}), 400

    # Find and update the folder
    folder = next((f for f in user['folders'] if f['id'] == folder_id), None)
    if not folder:
        return jsonify({'success': False, 'error': 'Folder not found'}), 404

    folder['name'] = new_name
    write_users(users)
    return jsonify({'success': True})

# 删除文件夹
@app.route('/api/delete_folder', methods=['POST'])
def delete_folder():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    data = request.json
    folder_id = data.get('folder_id')
    if not folder_id:
        return jsonify({'success': False, 'error': 'Folder ID is required'}), 400

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    if 'folders' not in user:
        user['folders'] = [{'id': 1, 'name': 'UI/UX'}, {'id': 2, 'name': 'Default'}]

    # Remove the folder
    initial_length = len(user['folders'])
    user['folders'] = [f for f in user['folders'] if f['id'] != folder_id]

    if len(user['folders']) == initial_length:
        return jsonify({'success': False, 'error': 'Folder not found'}), 404

    write_users(users)
    return jsonify({'success': True})

# 保存计划
@app.route('/api/add_plan', methods=['POST'])
def add_plan():
    if 'user_id' not in session:
        return jsonify({'error': 'Please login first'}), 401

    data = request.json
    user_id = session['user_id']

    if not data.get('plan_name') or not data.get('folder'):
        return jsonify({'error': 'Plan name and folder are required'}), 400

    users = read_users()
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'plans' not in user:
        user['plans'] = []

    plan = {
        'id': str(uuid.uuid4()),
        'plan_name': data.get('plan_name'),
        'folder': data.get('folder'),
        'notes': data.get('notes', ''),
        'date_start': data.get('date_start'),
        'date_end': data.get('date_end'),
        'time_start': data.get('time_start'),
        'time_end': data.get('time_end'),
        'repeat': data.get('repeat'),
        'reminder': data.get('reminder'),
        'quadrant': data.get('quadrant'),
        'completed': False,
        'created_at': datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    }

    user['plans'].append(plan)
    write_users(users)
    return jsonify({'success': 'Plan added successfully', 'plan': plan})

# 删除计划
@app.route('/api/delete_plan', methods=['POST'])
def delete_plan():
    if 'user_id' not in session:
        return jsonify({'error': 'Please login first'}), 401

    data = request.json
    plan_id = data.get('plan_id')
    if not plan_id:
        return jsonify({'error': 'Plan ID is required'}), 400

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'plans' not in user:
        return jsonify({'error': 'No plans found for this user'}), 404

    user['plans'] = [plan for plan in user['plans'] if plan['id'] != plan_id]
    write_users(users)
    return jsonify({'success': 'Plan deleted successfully'})

# 编辑计划
@app.route('/api/edit_plan', methods=['POST'])
def edit_plan():
    if 'user_id' not in session:
        return jsonify({'error': 'Please login first'}), 401

    data = request.json
    plan_id = data.get('plan_id')
    if not plan_id:
        return jsonify({'error': 'Plan ID is required'}), 400

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'plans' not in user:
        return jsonify({'error': 'No plans found for this user'}), 404

    for plan in user['plans']:
        if plan['id'] == plan_id:
            plan.update({
                'plan_name': data.get('plan_name', plan['plan_name']),
                'folder': data.get('folder', plan['folder']),
                'notes': data.get('notes', plan['notes']),
                'date_start': data.get('date_start', plan['date_start']),
                'date_end': data.get('date_end', plan['date_end']),
                'time_start': data.get('time_start', plan['time_start']),
                'time_end': data.get('time_end', plan['time_end']),
                'repeat': data.get('repeat', plan['repeat']),
                'reminder': data.get('reminder', plan['reminder']),
                'quadrant': data.get('quadrant', plan['quadrant']),
                'completed': data.get('completed', plan['completed'])
            })
            break
    write_users(users)
    return jsonify({'success': 'Plan updated successfully'})

# 获取计划
@app.route('/api/get_plans', methods=['GET'])
def get_plans():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Please login first'}), 401

    user_id = session['user_id']
    users = read_users()
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    plans = user.get('plans', [])
    return jsonify({'success': True, 'plans': plans})

if __name__ == '__main__':
    app.run(debug=True)