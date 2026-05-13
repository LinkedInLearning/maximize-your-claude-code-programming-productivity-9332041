import random
import time

import pytest
from fastapi.testclient import TestClient

from app.elevator_service import _percentile, build_app


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
        elevator_ids=["e1"],
        top_speed=top_speed,
        rng=rng,
        technician_client=technician,
        fix_seconds=fix_seconds,
    )
    return TestClient(app), technician


CALL_URL = "/elevators/e1/call_to"
STATUS_URL = "/elevators/e1/status"


def test_status_reports_healthy_state_at_rest():
    rng = random.Random()
    rng.random = lambda: 0.99
    client, _ = make_client(break_rng=rng)
    body = client.get(STATUS_URL).json()
    assert body == {
        "elevator_id": "e1",
        "current_floor": 0.0,
        "in_motion": False,
        "is_broken": False,
        "eta_seconds": 0.0,
        "technician_id": None,
    }


def test_status_reports_broken_with_eta_after_breakdown():
    rng = random.Random()
    rng.random = lambda: 0.0
    technician = FakeTechnicianClient(eta_seconds=0.2)
    client, _ = make_client(break_rng=rng, technician=technician)
    client.post(CALL_URL, json={"floor": 5})
    body = client.get(STATUS_URL).json()
    assert body["is_broken"] is True
    assert body["technician_id"] == "t1"
    assert 0 < body["eta_seconds"] <= 0.2


def test_call_to_moves_elevator_when_not_broken():
    # rng that never breaks (always returns >= 0.01)
    rng = random.Random()
    rng.random = lambda: 0.99
    client, technician = make_client(break_rng=rng, top_speed=100)
    response = client.post(CALL_URL, json={"floor": 5})
    assert response.status_code == 200
    assert response.json()["to_floor"] == 5
    time.sleep(0.15)
    assert client.get(STATUS_URL).json()["current_floor"] == 5
    assert technician.dispatch_calls == []


def test_call_to_triggers_dispatch_and_returns_503_with_eta():
    rng = random.Random()
    rng.random = lambda: 0.0  # forces break
    technician = FakeTechnicianClient(eta_seconds=0.2)
    client, _ = make_client(break_rng=rng, technician=technician)
    response = client.post(CALL_URL, json={"floor": 5})
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

    first = client.post(CALL_URL, json={"floor": 5})
    assert first.status_code == 503
    time.sleep(0.1)  # let ETA elapse
    second = client.post(CALL_URL, json={"floor": 5})
    assert second.status_code == 200
    assert second.json()["to_floor"] == 5
    time.sleep(0.2)  # fix + trip
    assert client.get(STATUS_URL).json()["current_floor"] == 5
    assert technician.fix_calls == [("e1", 0.05)]


def test_call_to_during_eta_returns_smaller_remaining_eta_without_redispatch():
    rng = random.Random()
    rng.random = lambda: 0.0
    technician = FakeTechnicianClient(eta_seconds=1.0)
    client, _ = make_client(break_rng=rng, technician=technician)
    first = client.post(CALL_URL, json={"floor": 5})
    assert first.status_code == 503
    first_eta = first.json()["eta_seconds"]
    time.sleep(0.05)
    second = client.post(CALL_URL, json={"floor": 5})
    assert second.status_code == 503
    assert second.json()["eta_seconds"] < first_eta
    assert technician.dispatch_calls == ["e1"]


def test_call_to_returns_immediately_with_trip_info():
    rng = random.Random()
    rng.random = lambda: 0.99
    # Slow trip would take 5 seconds if blocking.
    client, _ = make_client(break_rng=rng, top_speed=1)
    start = time.monotonic()
    response = client.post(CALL_URL, json={"floor": 5})
    elapsed = time.monotonic() - start
    assert response.status_code == 200
    body = response.json()
    assert body["from_floor"] == 0
    assert body["to_floor"] == 5
    assert body["eta_seconds"] == pytest.approx(5.0, abs=0.1)
    assert elapsed < 0.5  # not 5 seconds


def test_status_shows_interpolated_current_floor_mid_trip():
    rng = random.Random()
    rng.random = lambda: 0.99
    client, _ = make_client(break_rng=rng, top_speed=5)  # 5 floors/sec, trip=1s
    client.post(CALL_URL, json={"floor": 5})
    time.sleep(0.3)  # ~floor 1.5
    body = client.get(STATUS_URL).json()
    assert body["in_motion"] is True
    assert 0 < body["current_floor"] < 5
    # let trip complete and check final state
    time.sleep(1.0)
    body = client.get(STATUS_URL).json()
    assert body["in_motion"] is False
    assert body["current_floor"] == 5


def test_call_to_rejects_second_call_while_in_motion():
    rng = random.Random()
    rng.random = lambda: 0.99
    client, _ = make_client(break_rng=rng, top_speed=1)
    first = client.post(CALL_URL, json={"floor": 5})
    assert first.status_code == 200
    second = client.post(CALL_URL, json={"floor": 2})
    assert second.status_code == 409
    assert "motion" in second.json()["error"].lower()


def test_user_lock_prevents_calling_a_second_elevator_while_first_trip_runs():
    rng = random.Random()
    rng.random = lambda: 0.99
    technician = FakeTechnicianClient()
    app = build_app(
        elevator_ids=["e1", "e2"],
        top_speed=2,  # slow so the trip is observable
        rng=rng,
        technician_client=technician,
        fix_seconds=0.05,
    )
    client = TestClient(app)
    first = client.post("/elevators/e1/call_to", json={"floor": 5, "user": "cross_user"})
    assert first.status_code == 200
    second = client.post("/elevators/e2/call_to", json={"floor": 3, "user": "cross_user"})
    assert second.status_code == 409
    assert "active" in second.json()["error"]


MAINT_URL = "/elevators/e1/maintenance"


def test_maintenance_dispatches_a_technician_and_marks_broken():
    rng = random.Random()
    rng.random = lambda: 0.99  # never auto-break
    technician = FakeTechnicianClient(eta_seconds=0.2)
    client, _ = make_client(break_rng=rng, technician=technician)
    response = client.post(MAINT_URL)
    assert response.status_code == 200
    body = response.json()
    assert body["technician_id"] == "t1"
    assert body["eta_seconds"] == pytest.approx(0.2, abs=0.05)
    assert technician.dispatch_calls == ["e1"]
    status = client.get(STATUS_URL).json()
    assert status["is_broken"] is True
    assert status["technician_id"] == "t1"


def test_maintenance_returns_409_when_already_under_repair():
    rng = random.Random()
    rng.random = lambda: 0.99
    technician = FakeTechnicianClient(eta_seconds=1.0)
    client, _ = make_client(break_rng=rng, technician=technician)
    first = client.post(MAINT_URL)
    assert first.status_code == 200
    second = client.post(MAINT_URL)
    assert second.status_code == 409
    assert technician.dispatch_calls == ["e1"]  # only one dispatch


def test_maintenance_returns_404_for_unknown_elevator():
    rng = random.Random()
    rng.random = lambda: 0.99
    client, _ = make_client(break_rng=rng)
    response = client.post("/elevators/ghost/maintenance")
    assert response.status_code == 404


def test_percentile_empty_returns_zero():
    assert _percentile([], 50) == 0.0
    assert _percentile([], 95) == 0.0


def test_percentile_single_value_returns_that_value():
    assert _percentile([7.5], 0) == 7.5
    assert _percentile([7.5], 50) == 7.5
    assert _percentile([7.5], 100) == 7.5


def test_percentile_endpoints_match_min_and_max():
    values = [1.0, 2.0, 3.0, 4.0, 5.0]
    assert _percentile(values, 0) == 1.0
    assert _percentile(values, 100) == 5.0


def test_percentile_interpolates_between_adjacent_samples():
    # Linear interpolation between rank floors. For values [10, 20, 30, 40]:
    # k = (n-1) * pct/100 = 3 * 0.5 = 1.5 → between values[1]=20 and values[2]=30,
    # midpoint = 25.
    assert _percentile([10.0, 20.0, 30.0, 40.0], 50) == 25.0
    # k = 3 * 0.25 = 0.75 → between values[0]=10 and values[1]=20, 0.75 of the way = 17.5
    assert _percentile([10.0, 20.0, 30.0, 40.0], 25) == 17.5


WAIT_STATS_URL = "/elevators/e1/wait-stats"


def test_wait_stats_empty_before_any_calls():
    rng = random.Random()
    rng.random = lambda: 0.99
    client, _ = make_client(break_rng=rng)
    body = client.get(WAIT_STATS_URL).json()
    assert body == {"count": 0, "mean": 0.0, "p50": 0.0, "p95": 0.0, "max": 0.0}


def test_wait_stats_records_near_zero_wait_for_immediate_dispatch():
    rng = random.Random()
    rng.random = lambda: 0.99
    client, _ = make_client(break_rng=rng, top_speed=100)
    client.post(CALL_URL, json={"floor": 5})
    time.sleep(0.15)
    body = client.get(WAIT_STATS_URL).json()
    assert body["count"] == 1
    assert body["max"] < 0.1
    assert body["mean"] < 0.1


def test_wait_stats_includes_fix_time_when_call_arrives_after_eta():
    # First call breaks the elevator (rng=0.0). Subsequent rolls don't break,
    # so the second call enters the needs_fix=True branch and waits for the
    # fix to complete inside _run_trip before recording its wait.
    sequence = iter([0.0, 0.5, 0.5, 0.5])
    rng = random.Random()
    rng.random = lambda: next(sequence)
    technician = FakeTechnicianClient(eta_seconds=0.05)
    fix_seconds = 0.3
    client, _ = make_client(
        break_rng=rng, technician=technician, fix_seconds=fix_seconds, top_speed=100
    )
    assert client.post(CALL_URL, json={"floor": 5}).status_code == 503
    time.sleep(0.1)  # > eta_seconds (0.05) so technician is onsite
    assert client.post(CALL_URL, json={"floor": 5}).status_code == 200
    time.sleep(fix_seconds + 0.2)  # let fix + trip finish
    body = client.get(WAIT_STATS_URL).json()
    assert body["count"] == 1
    # Recorded wait must include the fix duration spent inside _run_trip.
    assert body["max"] >= fix_seconds * 0.9
    assert technician.fix_calls == [("e1", fix_seconds)]


def test_wait_stats_returns_404_for_unknown_elevator():
    rng = random.Random()
    rng.random = lambda: 0.99
    client, _ = make_client(break_rng=rng)
    response = client.get("/elevators/ghost/wait-stats")
    assert response.status_code == 404


def test_wait_stats_aggregates_multiple_calls():
    rng = random.Random()
    rng.random = lambda: 0.99
    client, _ = make_client(break_rng=rng, top_speed=100)
    for floor in (3, 1, 4):
        client.post(CALL_URL, json={"floor": floor})
        time.sleep(0.15)
    body = client.get(WAIT_STATS_URL).json()
    assert body["count"] == 3
    assert body["p50"] >= 0
    assert body["p95"] >= body["p50"]
    assert body["max"] >= body["p95"]


def test_call_to_after_maintenance_completes_recovers_and_moves():
    rng = random.Random()
    rng.random = lambda: 0.99
    technician = FakeTechnicianClient(eta_seconds=0.05)
    client, _ = make_client(break_rng=rng, technician=technician, fix_seconds=0.05)
    assert client.post(MAINT_URL).status_code == 200
    time.sleep(0.1)
    response = client.post(CALL_URL, json={"floor": 4})
    assert response.status_code == 200
    assert response.json()["to_floor"] == 4
    time.sleep(0.2)  # fix + trip
    assert client.get(STATUS_URL).json()["current_floor"] == 4
    assert technician.fix_calls == [("e1", 0.05)]
