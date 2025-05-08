import sqlite3

def migrate_chat_db():
    try:
        with sqlite3.connect('chat_history.db') as conn:
            # Add is_current column if it doesn't exist
            conn.execute('''
                ALTER TABLE history ADD COLUMN is_current INTEGER DEFAULT 0
            ''')
    except sqlite3.OperationalError as e:
        if 'duplicate column name' not in str(e):
            raise
        print("is_current column already exists")

    try:
        with sqlite3.connect('chat_history.db') as conn:
            # Add latest_update column if it doesn't exist
            conn.execute('''
                ALTER TABLE history ADD COLUMN latest_update TEXT
            ''')
    except sqlite3.OperationalError as e:
        if 'duplicate column name' not in str(e):
            raise
        print("latest_update column already exists")

    with sqlite3.connect('chat_history.db') as conn:
        # Set latest_update to timestamp for existing records
        conn.execute('''
            UPDATE history SET latest_update = timestamp WHERE latest_update IS NULL
        ''')
        conn.commit()
        print("Database migration completed successfully")

if __name__ == '__main__':
    migrate_chat_db()