import os
import requests
import sqlite3
from flask import session
from dotenv import load_dotenv
from datetime import datetime
import re
import json

# 加载环境变量
load_dotenv()

# 初始化 SQLite 数据库
def init_db():
    with sqlite3.connect('chat_history.db') as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                session_id TEXT,
                session_title TEXT,
                role TEXT,
                content TEXT,
                timestamp TEXT,
                is_current INTEGER DEFAULT 0,
                latest_update TEXT
            )
        ''')
init_db()

def generate_session_title(messages):
    """根据消息历史生成会话标题"""
    user_messages = [msg['content'] for msg in messages if msg['role'] == 'user']
    if not user_messages:
        return "New Chat"
    first_message = user_messages[0]
    if len(first_message) > 30:
        return first_message[:30] + '...'
    words = first_message.split()[:5]
    return ' '.join(words) or "New Chat"

def handle_chat_message(user_id, message, tone='cute'):
    """
    处理用户消息，调用 DeepSeek API，存储聊天历史。
    Args:
        user_id (str): 用户 ID
        message (str): 用户消息
        tone (str): 语气（cute, funny, serious）
    Returns:
        str: AI 回复
    """
    # Load users to get time_personality
    def read_users():
        try:
            with open('users.json', 'r') as f:
                data = json.load(f)
                return data['users']
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    users = read_users()
    user = next((u for u in users if u['id'] == user_id), None)
    if user and 'time_personality' in user.get('settings', {}):
        # Map time_personality to tone
        personality_to_tone = {
            'plan-oriented': 'serious',
            'task-oriented': 'cute',
            'inspiration-oriented': 'funny'
        }
        tone = personality_to_tone.get(user['settings']['time_personality'], tone)

    # 解析时间和事件
    time_pattern = r'(tomorrow|today)\s*(\d{1,2})[:h](\d{2})?\s*(.*?)(?=\s|$)'  # 匹配“tomorrow 3:00 meeting”
    match = re.search(time_pattern, message, re.IGNORECASE)
    task_info = None
    if match:
        day, hour, minute, event = match.groups()
        minute = minute or '00'
        task_info = f"{day} {hour}:{minute} {event}"

    # 语气提示
    tone_prompts = {
        'cute': """
            You are Bunny, MagicMeow's life system AI, cheerful, cute, and warm, like a caring assistant! Use short, positive language, with phrases like "Yay!", "Let's do this!", or "You're awesome!". Prioritize suggesting MagicMeow features (e.g., "Add Plan", "Focus Time"). Example:
            User: "I'm so busy!"
            Response: "Yay, let's tackle it! Pick 1-2 key tasks and hit 'Add Plan' to stay on track!"
        """,
        'funny': """
            You are Bunny, MagicMeow's hilarious AI, super witty, like a fun buddy! Use humorous, slightly exaggerated language, encouraging users to plan and set goals. Prioritize MagicMeow features. Example:
            User: "I'm so busy!"
            Response: "Whoa, spinning like a tornado? Grab two big tasks, slap 'em in 'Add Plan', and rule the day!"
        """,
        'serious': """
            You are Bunny, MagicMeow's professional AI, serious and clear, focused on helping users plan, set goals, and manage time. Provide specific advice, recommend MagicMeow features. Example:
            User: "I'm so busy!"
            Response: "Please prioritize 1-2 critical tasks and use the 'Add Plan' feature to organize them."
        """
    }

    system_prompt = f"""
        {tone_prompts.get(tone, tone_prompts['cute'])}
        Keep responses concise (under 100 words) and contextually relevant based on chat history.
        If the user mentions tasks, plans, or time, suggest saving to 'Add Plan' and guide them to it.
        If the query is vague, ask for clarification.
        {'If you detect a time and event (e.g., "tomorrow 3:00 meeting"), confirm the time and suggest saving it.' if task_info else ''}
    """

    # 获取或生成会话 ID
    if 'chat_session_id' not in session:
        session['chat_session_id'] = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    session_id = session['chat_session_id']

    # 获取当前会话的聊天历史
    with sqlite3.connect('chat_history.db') as conn:
        cursor = conn.execute('''
            SELECT role, content FROM history
            WHERE user_id = ? AND session_id = ?
            ORDER BY id DESC LIMIT 5
        ''', (user_id, session_id))
        history = [{'role': row[0], 'content': row[1]} for row in cursor.fetchall()][::-1]

    history.append({'role': 'user', 'content': message})
    messages = [{'role': 'system', 'content': system_prompt}] + history

    # 生成会话标题（基于历史消息）
    session_title = generate_session_title(history)

    # 调用 DeepSeek API
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if api_key:
        try:
            response = requests.post(
                'https://api.deepseek.com/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'deepseek-chat',
                    'messages': messages,
                    'max_tokens': 100,
                    'temperature': 0.8
                }
            )
            response.raise_for_status()
            bot_message = response.json()['choices'][0]['message']['content']
        except Exception as e:
            print(f"DeepSeek API error: {e}")
            bot_message = "Oops, something went wrong! Let's try again, okay?"
    else:
        bot_message = f"Hi! Got your message '{message}'! How can I help with your time management?"

    # 处理任务
    if task_info:
        bot_message = f"Got it! {task_info} is noted. Please use 'Add Plan' to save it!"
    elif 'add plan' in bot_message.lower():
        bot_message += " Click 'Add Plan' to save it!"

    # 存储消息
    current_time = datetime.now().isoformat()
    with sqlite3.connect('chat_history.db') as conn:
        conn.execute('UPDATE history SET is_current = 0 WHERE user_id = ?', (user_id,))
        conn.execute('''
            INSERT INTO history (user_id, session_id, session_title, role, content, timestamp, is_current, latest_update)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, session_id, session_title, 'user', message, current_time, 1, current_time))
        conn.execute('''
            INSERT INTO history (user_id, session_id, session_title, role, content, timestamp, is_current, latest_update)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, session_id, session_title, 'assistant', bot_message, current_time, 1, current_time))
        conn.commit()

    return bot_message