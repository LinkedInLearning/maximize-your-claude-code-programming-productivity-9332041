import random
import time

import pytest
from fastapi.testclient import TestClient

from app.elevator_service import build_app


class FakeTechnicianClient:
    def __init__(self, eta_seconds=0.1):
        self.eta_seconds = eta_seconds
        self.dispatch_calls = []
        self.fix_calls = []

    def dispatch(self, elevator_id):
        self.dispatch_calls.append(elevator_id)
        return {"technician_id": "t1", "eta_seconds": self.eta_seconds}

    def fix(self, elevator_id, fix_seconds):
        self.fix_calls.append((elevator_id, fix_seconds))
        time.sleep(fix_seconds)
        return {"fixed": True}


def make_client(*, break_rng=None, technician=None, fix_seconds=0.05, top_speed=100):
    technician = technician or FakeTechnicianClient(eta_seconds=0.1)
    rng = break_rng or random.Random(0)
    app = build_app(
        elevator_id="e1",
        top_speed=top_speed,
        rng=rng,
        technician_client=technician,
        fix_seconds=fix_seconds,
    )
    return TestClient(app), technician


def test_call_to_moves_elevator_when_not_broken():
    # rng that never breaks (always returns >= 0.01)
    rng = random.Random()
    rng.random = lambda: 0.99
    client, technician = make_client(break_rng=rng)
    response = client.post("/call_to", json={"floor": 5})
    assert response.status_code == 200
    assert response.json()["current_floor"] == 5
    assert technician.dispatch_calls == []


def test_call_to_triggers_dispatch_and_returns_503_with_eta():
    rng = random.Random()
    rng.random = lambda: 0.0  # forces break
    technician = FakeTechnicianClient(eta_seconds=0.2)
    client, _ = make_client(break_rng=rng, technician=technician)
    response = client.post("/call_to", json={"floor": 5})
    assert response.status_code == 503
    body = response.json()
    assert body["error"] == "fixing"
    assert body["eta_seconds"] == pytest.approx(0.2, abs=0.05)
    assert body["technician_id"] == "t1"
    assert technician.dispatch_calls == ["e1"]


def test_call_to_after_eta_triggers_fix_and_recovers():
    # First call breaks; rng must return >= 0.01 on later calls so no re-break.
    sequence = iter([0.0, 0.5, 0.5, 0.5])
    rng = random.Random()
    rng.random = lambda: next(sequence)
    technician = FakeTechnicianClient(eta_seconds=0.05)
    client, _ = make_client(break_rng=rng, technician=technician, fix_seconds=0.05)

    first = client.post("/call_to", json={"floor": 5})
    assert first.status_code == 503
    time.sleep(0.1)  # let ETA elapse
    second = client.post("/call_to", json={"floor": 5})
    assert second.status_code == 200
    assert second.json()["current_floor"] == 5
    assert technician.fix_calls == [("e1", 0.05)]


def test_call_to_during_eta_returns_smaller_remaining_eta_without_redispatch():
    rng = random.Random()
    rng.random = lambda: 0.0
    technician = FakeTechnicianClient(eta_seconds=1.0)
    client, _ = make_client(break_rng=rng, technician=technician)
    first = client.post("/call_to", json={"floor": 5})
    assert first.status_code == 503
    first_eta = first.json()["eta_seconds"]
    time.sleep(0.05)
    second = client.post("/call_to", json={"floor": 5})
    assert second.status_code == 503
    assert second.json()["eta_seconds"] < first_eta
    assert technician.dispatch_calls == ["e1"]
