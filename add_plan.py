from flask import Blueprint, request, redirect, session
import json
from datetime import datetime

add_plan_bp = Blueprint('add_plan', __name__)

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

@add_plan_bp.route('/addPlan', methods=['POST'])
def add_plan():
    if 'user_id' not in session:
        return redirect('/login')

    data = request.form
    quadrant = data.get('quadrant', 'Red')  # Default to Red if not specified
    if quadrant not in ['Red', 'Blue', 'Yellow', 'Green']:
        quadrant = 'Red'

    users = read_users()
    user_id = session['user_id']
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return redirect('/login')

    if 'plans' not in user:
        user['plans'] = []

    user['plans'].append({
        'date': datetime.now().strftime('%Y-%m-%d'),
        'quadrant': quadrant,
        'completed': False
    })

    write_users(users)
    return redirect('/statistics?planAdded=true')

@add_plan_bp.route('/addPlan', methods=['GET'])
def add_plan_page():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Add Plan</title>
    </head>
    <body>
        <h1>Add a New Plan</h1>
        <form method="POST" action="/addPlan">
            <label for="quadrant">Quadrant:</label>
            <select name="quadrant" id="quadrant">
                <option value="Red">Red</option>
                <option value="Blue">Blue</option>
                <option value="Yellow">Yellow</option>
                <option value="Green">Green</option>
            </select>
            <button type="submit">Add Plan</button>
        </form>
    </body>
    </html>
    '''