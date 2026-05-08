import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.environ.get(
    "TYPINGAPP_DB",
    os.path.join(os.path.dirname(__file__), "typingapp.db"),
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS passages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  passage_id INTEGER NOT NULL REFERENCES passages(id),
  wpm REAL NOT NULL,
  accuracy REAL NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_passage_user ON results(passage_id, user_id);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect(path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(path: str = DB_PATH) -> None:
    conn = connect(path)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
        count = conn.execute("SELECT COUNT(*) FROM passages").fetchone()[0]
        if count == 0:
            from seed_passages import PASSAGES
            conn.executemany(
                "INSERT INTO passages (text) VALUES (?)",
                [(p,) for p in PASSAGES],
            )
            conn.commit()
    finally:
        conn.close()


def get_conn():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()
