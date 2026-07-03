"""
Shared SQLite access for the whole app.

Both the camera_capture module (writes) and the gallery module (reads) go
through here so there is a single place that owns the schema and the
connection settings.
"""
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

# Overridable via .env, defaults to a file next to main.py
DB_PATH = Path(os.getenv("DATABASE_PATH", "photobooth.db"))


@contextmanager
def get_connection():
    """
    Yields a fresh sqlite3 connection, closed automatically.

    A new connection per call (rather than one shared global connection)
    keeps this safe to use from FastAPI's threadpool, since sync route
    handlers may run on different worker threads.
    """
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Create the photos table if it doesn't exist yet. Safe to call on every startup."""
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT NOT NULL UNIQUE,
                s3_url_low_res TEXT NOT NULL,
                s3_url_high_res TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.commit()