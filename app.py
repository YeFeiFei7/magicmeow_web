import os
from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

# Load environment variables from .env file for local development
load_dotenv()

app = Flask(__name__)

# Configure database using DATABASE_URL from environment variables
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://localhost/timemanagement')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy and Migrate
db = SQLAlchemy(app)

# User model for storing personality test results
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    personality = db.Column(db.String(50), nullable=False)

# Route for the landing page
@app.route('/')
def index():
    return render_template('index.html')

# Route for the main application page (placeholder for time management features)
@app.route('/main')
def main():
    return render_template('main.html')  # You'll need to create this template

# Route to handle personality test submission
@app.route('/submit_test', methods=['POST'])
def submit_test():
    data = request.get_json()
    if not data or not all(key in data for key in ['q1', 'q2', 'q3']):
        return jsonify({'error': 'Invalid input'}), 400

    try:
        scores = [int(data['q1']), int(data['q2']), int(data['q3'])]
        total_score = sum(scores)

        if total_score <= 5:
            personality = "规划大师"
            description = "你喜欢严格的时间管理，适合有条理的AI助手，帮你制定详细计划。"
        elif total_score <= 7:
            personality = "灵活行者"
            description = "你偏好灵活的时间安排，适合随和的AI助手，提醒你关键任务。"
        else:
            personality = "目标驱动者"
            description = "你注重目标达成，适合激励型AI助手，推动你完成大事。"

        # Example: Save result to database (uncomment and modify as needed)
        # user = User(username="test_user_" + str(total_score), personality=personality)
        # db.session.add(user)
        # db.session.commit()

        return jsonify({
            'personality': personality,
            'description': description
        })
    except (ValueError, KeyError) as e:
        return jsonify({'error': 'Invalid data format'}), 400

if __name__ == '__main__':
    app.run(debug=True)