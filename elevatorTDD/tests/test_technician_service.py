import time

import pytest
from fastapi.testclient import TestClient

from app.technician_service import build_app


@pytest.fixture
def client():
    app = build_app(technician_ids=["t1", "t2"], travel_seconds=0.2)
    return TestClient(app)


def test_dispatch_returns_eta_and_technician_id_immediately(client):
    start = time.monotonic()
    response = client.post("/dispatch", json={"elevator_id": "e1"})
    elapsed = time.monotonic() - start

    assert response.status_code == 200
    body = response.json()
    assert body["elevator_id"] == "e1"
    assert body["technician_id"] == "t1"
    assert body["eta_seconds"] == pytest.approx(0.2, abs=0.05)
    assert elapsed < 0.1


def test_dispatch_assigns_different_technicians_to_concurrent_elevators(client):
    first = client.post("/dispatch", json={"elevator_id": "e1"}).json()
    second = client.post("/dispatch", json={"elevator_id": "e2"}).json()
    assert first["technician_id"] != second["technician_id"]


def test_dispatch_extends_eta_when_all_technicians_busy():
    app = build_app(technician_ids=["t1"], travel_seconds=0.2)
    client = TestClient(app)
    first = client.post("/dispatch", json={"elevator_id": "e1"}).json()
    second = client.post("/dispatch", json={"elevator_id": "e2"}).json()
    assert second["eta_seconds"] >= first["eta_seconds"] + 0.2 - 0.01


def test_dispatch_rejects_duplicate_dispatch_for_same_elevator(client):
    client.post("/dispatch", json={"elevator_id": "e1"})
    response = client.post("/dispatch", json={"elevator_id": "e1"})
    assert response.status_code == 409


def test_fix_sleeps_for_requested_fix_seconds():
    app = build_app(technician_ids=["t1"], travel_seconds=0.0)
    client = TestClient(app)
    client.post("/dispatch", json={"elevator_id": "e1"})
    start = time.monotonic()
    response = client.post("/fix", json={"elevator_id": "e1", "fix_seconds": 0.1})
    elapsed = time.monotonic() - start
    assert response.status_code == 200
    body = response.json()
    assert body["fixed"] is True
    assert body["technician_id"] == "t1"
    assert 0.1 <= elapsed < 0.4


def test_fix_rejects_negative_duration(client):
    client.post("/dispatch", json={"elevator_id": "e1"})
    response = client.post("/fix", json={"elevator_id": "e1", "fix_seconds": -1})
    assert response.status_code == 422 or response.status_code == 400


def test_fix_rejects_when_technician_not_yet_onsite(client):
    client.post("/dispatch", json={"elevator_id": "e1"})
    response = client.post("/fix", json={"elevator_id": "e1", "fix_seconds": 0.0})
    assert response.status_code == 409


def test_status_for_idle_technician_reports_idle(client):
    response = client.get("/technicians/t1/status")
    assert response.status_code == 200
    body = response.json()
    assert body["technician_id"] == "t1"
    assert body["state"] == "idle"
    assert body["elevator_id"] is None
    assert body["eta_seconds"] == 0.0


def test_status_for_en_route_technician_reports_remaining_eta(client):
    client.post("/dispatch", json={"elevator_id": "e1"})
    response = client.get("/technicians/t1/status")
    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "en_route"
    assert body["elevator_id"] == "e1"
    assert 0 < body["eta_seconds"] <= 0.2


def test_status_for_arrived_technician_reports_onsite(client):
    client.post("/dispatch", json={"elevator_id": "e1"})
    time.sleep(0.25)  # ETA was 0.2s
    response = client.get("/technicians/t1/status")
    body = response.json()
    assert body["state"] == "onsite"
    assert body["elevator_id"] == "e1"
    assert body["eta_seconds"] == 0.0


def test_status_unknown_technician_returns_404(client):
    response = client.get("/technicians/unknown/status")
    assert response.status_code == 404
