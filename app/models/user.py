from flask_login import UserMixin
from app import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    google_id = db.Column(db.String(120), unique=True, nullable=True)
    personality_type = db.Column(db.String(10), default='B')

    def __repr__(self):
        return f'<User {self.username}>'