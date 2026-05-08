import sqlite3
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from db import get_conn, init_db, now_iso
from models import (
    HistoryRow,
    LeaderboardRow,
    PassageOut,
    ResultIn,
    ResultOut,
    UserIn,
    UserOut,
)

app = FastAPI(title="Scroll Typer API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    init_db()


@app.post("/users", response_model=UserOut)
def upsert_user(body: UserIn, conn: sqlite3.Connection = Depends(get_conn)):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "name required")
    row = conn.execute("SELECT id, name FROM users WHERE name = ?", (name,)).fetchone()
    if row:
        return UserOut(id=row["id"], name=row["name"])
    cur = conn.execute(
        "INSERT INTO users (name, created_at) VALUES (?, ?)", (name, now_iso())
    )
    conn.commit()
    return UserOut(id=cur.lastrowid, name=name)


@app.get("/passages/next", response_model=PassageOut)
def next_passage(user_id: int, conn: sqlite3.Connection = Depends(get_conn)):
    if not conn.execute("SELECT 1 FROM users WHERE id = ?", (user_id,)).fetchone():
        raise HTTPException(404, "user not found")
    row = conn.execute(
        """
        SELECT id, text FROM passages
        WHERE id NOT IN (SELECT passage_id FROM results WHERE user_id = ?)
        ORDER BY RANDOM() LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if not row:
        row = conn.execute(
            "SELECT id, text FROM passages ORDER BY RANDOM() LIMIT 1"
        ).fetchone()
    if not row:
        raise HTTPException(404, "no passages available")
    return PassageOut(id=row["id"], text=row["text"])


@app.post("/results", response_model=ResultOut)
def save_result(body: ResultIn, conn: sqlite3.Connection = Depends(get_conn)):
    if not conn.execute("SELECT 1 FROM users WHERE id = ?", (body.user_id,)).fetchone():
        raise HTTPException(404, "user not found")
    if not conn.execute(
        "SELECT 1 FROM passages WHERE id = ?", (body.passage_id,)
    ).fetchone():
        raise HTTPException(404, "passage not found")
    ts = now_iso()
    cur = conn.execute(
        """
        INSERT INTO results (user_id, passage_id, wpm, accuracy, duration_ms, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (body.user_id, body.passage_id, body.wpm, body.accuracy, body.duration_ms, ts),
    )
    conn.commit()
    return ResultOut(
        id=cur.lastrowid,
        user_id=body.user_id,
        passage_id=body.passage_id,
        wpm=body.wpm,
        accuracy=body.accuracy,
        duration_ms=body.duration_ms,
        created_at=ts,
    )


@app.get("/users/{user_id}/results", response_model=list[HistoryRow])
def my_results(
    user_id: int, limit: int = 50, conn: sqlite3.Connection = Depends(get_conn)
):
    if not conn.execute("SELECT 1 FROM users WHERE id = ?", (user_id,)).fetchone():
        raise HTTPException(404, "user not found")
    limit = max(1, min(limit, 200))
    rows = conn.execute(
        """
        SELECT id, passage_id, wpm, accuracy, duration_ms, created_at
        FROM results WHERE user_id = ?
        ORDER BY id DESC LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    return [HistoryRow(**dict(r)) for r in rows]


@app.get("/leaderboard", response_model=list[LeaderboardRow])
def leaderboard(limit: int = 10, conn: sqlite3.Connection = Depends(get_conn)):
    limit = max(1, min(limit, 100))
    rows = conn.execute(
        """
        SELECT u.name AS user_name, r.passage_id, r.wpm, r.accuracy, r.created_at
        FROM results r JOIN users u ON u.id = r.user_id
        WHERE r.accuracy >= 0.9
        ORDER BY r.wpm DESC LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [LeaderboardRow(**dict(r)) for r in rows]
