import os
import sys
import tempfile

import pytest
from fastapi.testclient import TestClient

# Each test gets a fresh DB by setting TYPINGAPP_DB before importing main.
@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("TYPINGAPP_DB", str(db_path))
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    for m in ("main", "db"):
        sys.modules.pop(m, None)
    import main  # noqa: WPS433
    with TestClient(main.app) as c:
        yield c


def _register(client, name="ace"):
    r = client.post("/users", json={"name": name})
    assert r.status_code == 200
    return r.json()


def test_users_register_new_then_idempotent(client):
    a = _register(client, "ace")
    b = _register(client, "ace")
    assert a == b  # same id returned for same name


def test_users_rejects_blank_name(client):
    assert client.post("/users", json={"name": ""}).status_code == 422


def test_passages_next_returns_passage(client):
    u = _register(client)
    r = client.get(f"/passages/next?user_id={u['id']}")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["id"], int) and body["text"]


def test_passages_next_unknown_user_404(client):
    assert client.get("/passages/next?user_id=999").status_code == 404


def test_results_save_and_history(client):
    u = _register(client)
    p = client.get(f"/passages/next?user_id={u['id']}").json()
    payload = {"user_id": u["id"], "passage_id": p["id"],
               "wpm": 80.0, "accuracy": 0.95, "duration_ms": 10000}
    r = client.post("/results", json=payload)
    assert r.status_code == 200 and r.json()["wpm"] == 80.0
    hist = client.get(f"/users/{u['id']}/results").json()
    assert len(hist) == 1 and hist[0]["passage_id"] == p["id"]


def test_results_unknown_user_404(client):
    bad = {"user_id": 999, "passage_id": 1,
           "wpm": 1, "accuracy": 1, "duration_ms": 1}
    assert client.post("/results", json=bad).status_code == 404


def test_passages_next_excludes_completed(client):
    u = _register(client)
    p = client.get(f"/passages/next?user_id={u['id']}").json()
    client.post("/results", json={
        "user_id": u["id"], "passage_id": p["id"],
        "wpm": 50, "accuracy": 1.0, "duration_ms": 1000,
    })
    # Across many calls we must never see the completed passage until corpus exhausted.
    seen = {client.get(f"/passages/next?user_id={u['id']}").json()["id"]
            for _ in range(30)}
    assert p["id"] not in seen


def test_leaderboard_filters_low_accuracy(client):
    u = _register(client, "good")
    v = _register(client, "sloppy")
    p = client.get(f"/passages/next?user_id={u['id']}").json()
    client.post("/results", json={"user_id": u["id"], "passage_id": p["id"],
                                  "wpm": 100, "accuracy": 0.95, "duration_ms": 1000})
    client.post("/results", json={"user_id": v["id"], "passage_id": p["id"],
                                  "wpm": 200, "accuracy": 0.5, "duration_ms": 1000})
    rows = client.get("/leaderboard").json()
    names = [r["user_name"] for r in rows]
    assert "good" in names and "sloppy" not in names
