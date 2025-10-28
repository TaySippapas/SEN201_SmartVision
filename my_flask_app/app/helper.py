import sqlite3
import os
import sys

def get_connection():
    try:
        if getattr(sys, 'frozen', False):
            # Running from PyInstaller bundle
            base_dir = sys._MEIPASS
        else:
            # Running normally in Python
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        db_path = os.path.join(base_dir, 'database', 'mydatabase.db')
        print(f"[DEBUG] Using database path: {db_path}")

        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"[ERROR] Failed to connect to DB: {e}")
        raise
