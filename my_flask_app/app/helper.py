"""
helper.py

Provides `get_connection()` to create a connection to the SQLite,
returning rows as dictionary-like objects using `sqlite3.Row`.
"""
import sqlite3

DB_NAME = "database/mydatabase.db"


def get_connection():
    """
    Create and return a connection to the SQLite database.

    This function connects to the database defined by `DB_NAME`
    and configures the connection to return rows as dictionary-like
    objects (using `sqlite3.Row`).

    Returns:
        sqlite3.Connection: A connection object to the SQLite database.
    """
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn
