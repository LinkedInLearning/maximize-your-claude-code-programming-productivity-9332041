"""Integration test wiring the elevator service to a real technician service.

Scenario: alice rides normally; bob's call rolls a breakdown; charlie and
dana both arrive while the technician is still en route; dana calls again
right after the ETA elapses and her call triggers the fix and the move.
"""

import random
import time

from fastapi.testclient import TestClient

from app.elevator_service import build_app as build_elevator_app
from app.technician_service import build_app as build_technician_app


class _TechnicianClientAdapter:
    def __init__(self, technician_client):
        self._client = technician_client

    def dispatch(self, elevator_id):
        response = self._client.post("/dispatch", json={"elevator_id": elevator_id})
        response.raise_for_status()
        return response.json()

    def fix(self, elevator_id, fix_seconds):
        response = self._client.post(
            "/fix", json={"elevator_id": elevator_id, "fix_seconds": fix_seconds}
        )
        response.raise_for_status()
        return response.json()


def _scripted_rng(values):
    iterator = iter(values)
    rng = random.Random()
    rng.random = lambda: next(iterator)
    return rng


def test_multi_user_call_sequence_with_breakdown_in_the_middle():
    travel_seconds = 0.1
    fix_seconds = 0.1
    technician = TestClient(
        build_technician_app(technician_ids=["t1", "t2"], travel_seconds=travel_seconds)
    )
    # rng is only consulted when the elevator isn't already in the broken state,
    # so only alice, bob, and dana's recovery call roll the dice. Only bob breaks.
    rng = _scripted_rng([0.5, 0.0, 0.5])
    elevator = TestClient(
        build_elevator_app(
            elevator_id="e1",
            top_speed=100,
            rng=rng,
            technician_client=_TechnicianClientAdapter(technician),
            fix_seconds=fix_seconds,
        )
    )

    # 1. Alice rides normally.
    alice = elevator.post("/call_to", json={"floor": 3, "user": "alice_multi"})
    assert alice.status_code == 200
    assert alice.json()["current_floor"] == 3
    assert technician.get("/technicians/t1/status").json()["state"] == "idle"

    # 2. Bob's call rolls a breakdown — dispatch fires, response is 503 + ETA.
    bob = elevator.post("/call_to", json={"floor": 7, "user": "bob_multi"})
    assert bob.status_code == 503
    bob_body = bob.json()
    assert bob_body["error"] == "fixing"
    assert bob_body["technician_id"] == "t1"
    assert 0 < bob_body["eta_seconds"] <= travel_seconds + 0.05
    en_route = technician.get("/technicians/t1/status").json()
    assert en_route["state"] == "en_route"
    assert en_route["elevator_id"] == "e1"

    # 3. Charlie arrives while technician is still en route: same dispatch,
    #    smaller remaining ETA, no second dispatch (would 409 if it happened).
    charlie = elevator.post("/call_to", json={"floor": 2, "user": "charlie_multi"})
    assert charlie.status_code == 503
    assert charlie.json()["technician_id"] == "t1"
    assert charlie.json()["eta_seconds"] <= bob_body["eta_seconds"]

    # 4. Dana also tries while the technician is still inbound — still 503.
    dana_first = elevator.post(
        "/call_to", json={"floor": 5, "user": "dana_multi_first"}
    )
    assert dana_first.status_code == 503
    assert dana_first.json()["technician_id"] == "t1"
    assert dana_first.json()["eta_seconds"] <= charlie.json()["eta_seconds"]

    # 5. Wait for the technician to arrive; status flips to onsite.
    time.sleep(travel_seconds + 0.05)
    onsite = technician.get("/technicians/t1/status").json()
    assert onsite["state"] == "onsite"
    assert onsite["eta_seconds"] == 0.0

    # 6. Dana calls again — this one triggers the fix and then moves the elevator.
    start = time.monotonic()
    dana_again = elevator.post(
        "/call_to", json={"floor": 1, "user": "dana_multi_second"}
    )
    fix_elapsed = time.monotonic() - start
    assert dana_again.status_code == 200
    assert dana_again.json()["current_floor"] == 1
    assert fix_elapsed >= fix_seconds  # the fix actually slept

    # Technician is freed once the fix completes.
    after_fix = technician.get("/technicians/t1/status").json()
    assert after_fix["state"] == "idle"
    assert after_fix["elevator_id"] is None
