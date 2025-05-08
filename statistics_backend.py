from flask import Blueprint, jsonify, request, session
from datetime import datetime, timedelta
import json

statistics_bp = Blueprint('statistics', __name__)

monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

def read_users():
    try:
        with open('users.json', 'r') as f:
            data = json.load(f)
            return data['users']
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def write_users(users):
    with open('users.json', 'w') as f:
        json.dump({'users': users}, f, indent=4)

# Existing endpoints (save_mood, clear_mood, get_mood_stats, get_focus_stats) remain unchanged

# New endpoint for plan statistics
@statistics_bp.route('/api/plan_stats', methods=['GET'])
def get_plan_stats():
    if 'user_id' not in session:
        return jsonify({'error': 'Please login first'}), 401

    user_id = session['user_id']
    users = read_users()
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    plans = user.get('plans', [])
    if not plans:
        return jsonify({
            'success': True,
            'stats': {
                'daily': {'Red': {'completed': 0, 'total': 0}, 'Blue': {'completed': 0, 'total': 0}, 'Yellow': {'completed': 0, 'total': 0}, 'Green': {'completed': 0, 'total': 0}},
                'monthly': {'Red': {'completed': 0, 'total': 0}, 'Blue': {'completed': 0, 'total': 0}, 'Yellow': {'completed': 0, 'total': 0}, 'Green': {'completed': 0, 'total': 0}},
                'all': {'Red': {'completed': 0, 'total': 0}, 'Blue': {'completed': 0, 'total': 0}, 'Yellow': {'completed': 0, 'total': 0}, 'Green': {'completed': 0, 'total': 0}}
            }
        })

    current_date = datetime.now().strftime('%Y-%m-%d')
    current_month = datetime.now().strftime('%Y-%m')
    current_year = datetime.now().strftime('%Y')

    # Filter plans by date range
    daily_plans = [p for p in plans if p['date'] == current_date]
    monthly_plans = [p for p in plans if p['date'].startswith(current_month)]
    all_plans = [p for p in plans if p['date'].startswith(current_year)]

    def calculate_stats(plans):
        stats = {'Red': {'completed': 0, 'total': 0}, 'Blue': {'completed': 0, 'total': 0}, 'Yellow': {'completed': 0, 'total': 0}, 'Green': {'completed': 0, 'total': 0}}
        for plan in plans:
            quadrant = plan.get('quadrant', 'Red')  # Default to Red if not specified
            if quadrant in stats:
                stats[quadrant]['total'] += 1
                if plan.get('completed', False):
                    stats[quadrant]['completed'] += 1
        return stats

    return jsonify({
        'success': True,
        'stats': {
            'daily': calculate_stats(daily_plans),
            'monthly': calculate_stats(monthly_plans),
            'all': calculate_stats(all_plans)
        }
    })

# Existing endpoints (save_mood, clear_mood, get_mood_stats, get_focus_stats) remain unchanged
@statistics_bp.route('/api/save_mood', methods=['POST'])
def save_mood():
    if 'user_id' not in session:
        return jsonify({'error': 'Please login first'}), 401

    data = request.json
    mood = data.get('mood')
    if not mood or mood not in range(1, 6):
        return jsonify({'error': 'Invalid mood value (1-5 required)'}), 400

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'mood_records' not in user:
        user['mood_records'] = []

    current_date = datetime.now().strftime('%Y-%m-%d')
    user['mood_records'] = [record for record in user['mood_records'] if record['date'] != current_date]
    user['mood_records'].append({'date': current_date, 'mood': mood})
    write_users(users)

    return jsonify({'success': 'Mood recorded successfully', 'mood': mood})

@statistics_bp.route('/api/clear_mood', methods=['POST'])
def clear_mood():
    if 'user_id' not in session:
        return jsonify({'error': 'Please login first'}), 401

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'mood_records' not in user:
        user['mood_records'] = []

    current_date = datetime.now().strftime('%Y-%m-%d')
    user['mood_records'] = [record for record in user['mood_records'] if record['date'] != current_date]
    write_users(users)

    return jsonify({'success': 'Mood cleared successfully'})

@statistics_bp.route('/api/mood_stats', methods=['GET'])
def get_mood_stats():
    if 'user_id' not in session:
        return jsonify({'error': 'Please login first'}), 401

    user_id = session['user_id']
    users = read_users()
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    mood_records = user.get('mood_records', [])
    if not mood_records:
        return jsonify({'success': True, 'stats': {'daily': {}, 'monthly': {}, 'all': {}}})

    current_month = datetime.now().strftime('%Y-%m')
    current_date = datetime.now().strftime('%Y-%m-%d')

    daily_mood = next((m['mood'] for m in reversed(mood_records) if m['date'] == current_date), None)
    monthly_moods = [m['mood'] for m in mood_records if m['date'].startswith(current_month)]
    monthly_stats = {
        1: monthly_moods.count(1) / len(monthly_moods) * 100 if monthly_moods else 0,
        2: monthly_moods.count(2) / len(monthly_moods) * 100 if monthly_moods else 0,
        3: monthly_moods.count(3) / len(monthly_moods) * 100 if monthly_moods else 0,
        4: monthly_moods.count(4) / len(monthly_moods) * 100 if monthly_moods else 0,
        5: monthly_moods.count(5) / len(monthly_moods) * 100 if monthly_moods else 0
    }

    all_moods = [m['mood'] for m in mood_records]
    all_stats = {
        1: all_moods.count(1) / len(all_moods) * 100 if all_moods else 0,
        2: all_moods.count(2) / len(all_moods) * 100 if all_moods else 0,
        3: all_moods.count(3) / len(all_moods) * 100 if all_moods else 0,
        4: all_moods.count(4) / len(all_moods) * 100 if all_moods else 0,
        5: all_moods.count(5) / len(all_moods) * 100 if all_moods else 0
    }

    return jsonify({
        'success': True,
        'stats': {
            'daily': {'mood': daily_mood} if daily_mood else {},
            'monthly': monthly_stats,
            'all': all_stats
        }
    })

@statistics_bp.route('/api/focus_stats', methods=['GET'])
def get_focus_stats():
    if 'user_id' not in session:
        return jsonify({'error': 'Please login first'}), 401

    user_id = session['user_id']
    users = read_users()
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    focus_records = user.get('focus_records', [])
    if not focus_records:
        return jsonify({
            'success': True,
            'stats': {
                'daily': {'sessions': 0, 'minutes': 0, 'weekly': []},
                'monthly': {'sessions': 0, 'minutes': 0, 'daily': []},
                'all': {'sessions': 0, 'minutes': 0, 'monthly': []}
            }
        })

    current_date = datetime.now().strftime('%Y-%m-%d')
    current_month = datetime.now().strftime('%Y-%m')
    current_year = datetime.now().strftime('%Y')

    daily_records = [r for r in focus_records if r['date'] == current_date]
    daily_sessions = len(daily_records)
    daily_minutes = sum(r['duration'] for r in daily_records)

    weekly_data = []
    for i in range(6, -1, -1):
        date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
        minutes = sum(r['duration'] for r in focus_records if r['date'] == date)
        weekly_data.append({'day': ['M', 'T', 'W', 'T', 'F', 'S', 'S'][(datetime.now() - timedelta(days=i)).weekday()], 'value': minutes})

    monthly_records = [r for r in focus_records if r['date'].startswith(current_month)]
    monthly_sessions = len(monthly_records)
    monthly_minutes = sum(r['duration'] for r in monthly_records)

    days_in_month = (datetime.now().replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    daily_data = []
    for day in range(1, days_in_month.day + 1):
        date = f"{current_month}-{day:02d}"
        minutes = sum(r['duration'] for r in focus_records if r['date'] == date)
        daily_data.append({'day': str(day), 'value': minutes})

    yearly_records = [r for r in focus_records if r['date'].startswith(current_year)]
    yearly_sessions = len(yearly_records)
    yearly_minutes = sum(r['duration'] for r in yearly_records)

    monthly_data = []
    for month in range(1, 13):
        month_str = f"{current_year}-{month:02d}"
        minutes = sum(r['duration'] for r in focus_records if r['date'].startswith(month_str))
        monthly_data.append({'day': monthNames[month - 1][0], 'value': minutes})

    return jsonify({
        'success': True,
        'stats': {
            'daily': {'sessions': daily_sessions, 'minutes': daily_minutes, 'weekly': weekly_data},
            'monthly': {'sessions': monthly_sessions, 'minutes': monthly_minutes, 'daily': daily_data},
            'all': {'sessions': yearly_sessions, 'minutes': yearly_minutes, 'monthly': monthly_data}
        }
    })