"""
helper.py

Database connection helper for the application.
Handles path detection for both normal and PyInstaller execution.
"""

import sqlite3
import os
import sys


def get_connection():
    """
    Establish and return a SQLite database connection.

    This function determines the correct base directory depending on whether the
    program is running normally or from a PyInstaller bundle, then connects to
    the SQLite database file located in the 'database' folder.
    """
    try:
        if getattr(sys, 'frozen', False):
            # If running from a PyInstaller bundle, use the temporary directory
            baseDir = sys._MEIPASS
        else:
            # If running normally, use the parent directory of the current file
            baseDir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        dbPath = os.path.join(baseDir, 'database', 'mydatabase.db')
        print(f'[DEBUG] Using database path: {dbPath}')

        conn = sqlite3.connect(dbPath)
        conn.row_factory = sqlite3.Row
        return conn

    except Exception as e:
        print(f'[ERROR] Failed to connect to DB: {e}')
        raise


