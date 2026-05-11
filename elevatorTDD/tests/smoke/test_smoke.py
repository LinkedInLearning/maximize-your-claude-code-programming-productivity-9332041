"""Smoke tests run against already-deployed services over real HTTP.

Not collected by the default `pytest` run — invoke explicitly:
    pytest tests/smoke -q

Override targets via env: ELEVATOR_BASE_URL, TECHNICIAN_URL.
"""
import os

import httpx
import pytest

pytestmark = pytest.mark.smoke


ELEVATOR_BASE_URL = os.environ.get("ELEVATOR_BASE_URL", "http://localhost:8001")
TECHNICIAN_URL = os.environ.get("TECHNICIAN_URL", "http://localhost:8002")


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=ELEVATOR_BASE_URL, timeout=10.0) as c:
        yield c


def test_list_elevators_ok(client):
    response = client.get("/elevators")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list) and body, "expected at least one elevator"
    assert all("elevator_id" in e for e in body)


def test_maintenance_reaches_technician(client):
    elevators = client.get("/elevators").json()
    eid = elevators[0]["elevator_id"]

    response = client.post(f"/elevators/{eid}/maintenance")
    assert response.status_code == 200, (
        f"maintenance returned {response.status_code} — the elevator service "
        f"could not reach the technician service. Body: {response.text}"
    )
    body = response.json()
    assert body.get("technician_id")
    assert body.get("eta_seconds", -1) >= 0


def test_technician_reachable_at_configured_url():
    response = httpx.get(f"{TECHNICIAN_URL}/docs", timeout=5.0)
    assert response.status_code == 200, (
        f"technician service unreachable at {TECHNICIAN_URL} "
        f"(status={response.status_code})"
    )
