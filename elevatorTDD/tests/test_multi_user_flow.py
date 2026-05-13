"""Integration test wiring the elevator service to a real technician service.

Scenario: alice rides normally; bob's call rolls a breakdown; charlie and
dana both arrive while the technician is still en route; dana calls again
right after the ETA elapses and her call triggers the fix and the move.

The browser-driven test below mirrors the same scenario through the UI. Setup:
    pip install -r requirements.txt
    playwright install chromium
"""

import random
import socket
import threading
import time

import pytest
import uvicorn
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
            elevator_ids=["e1"],
            top_speed=100,
            rng=rng,
            technician_client=_TechnicianClientAdapter(technician),
            fix_seconds=fix_seconds,
        )
    )

    # 1. Alice rides normally.
    alice = elevator.post("/elevators/e1/call_to", json={"floor": 3, "user": "alice_multi"})
    assert alice.status_code == 200
    assert alice.json()["to_floor"] == 3
    time.sleep(0.1)  # let alice's trip complete
    assert elevator.get("/elevators/e1/status").json()["current_floor"] == 3
    assert technician.get("/technicians/t1/status").json()["state"] == "idle"

    # 2. Bob's call rolls a breakdown — dispatch fires, response is 503 + ETA.
    bob = elevator.post("/elevators/e1/call_to", json={"floor": 7, "user": "bob_multi"})
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
    charlie = elevator.post("/elevators/e1/call_to", json={"floor": 2, "user": "charlie_multi"})
    assert charlie.status_code == 503
    assert charlie.json()["technician_id"] == "t1"
    assert charlie.json()["eta_seconds"] <= bob_body["eta_seconds"]

    # 4. Dana also tries while the technician is still inbound — still 503.
    dana_first = elevator.post(
        "/elevators/e1/call_to", json={"floor": 5, "user": "dana_multi_first"}
    )
    assert dana_first.status_code == 503
    assert dana_first.json()["technician_id"] == "t1"
    assert dana_first.json()["eta_seconds"] <= charlie.json()["eta_seconds"]

    # 5. Wait for the technician to arrive; status flips to onsite.
    time.sleep(travel_seconds + 0.05)
    onsite = technician.get("/technicians/t1/status").json()
    assert onsite["state"] == "onsite"
    assert onsite["eta_seconds"] == 0.0

    # 6. Dana calls again — this one triggers the fix and then moves the elevator
    #    asynchronously. The HTTP call returns immediately with the combined ETA.
    dana_again = elevator.post(
        "/elevators/e1/call_to", json={"floor": 1, "user": "dana_multi_second"}
    )
    assert dana_again.status_code == 200
    assert dana_again.json()["to_floor"] == 1
    assert dana_again.json()["eta_seconds"] >= fix_seconds

    # Wait for the fix + trip to actually complete.
    time.sleep(fix_seconds + 0.1)
    final = elevator.get("/elevators/e1/status").json()
    assert final["current_floor"] == 1
    assert final["in_motion"] is False

    after_fix = technician.get("/technicians/t1/status").json()
    assert after_fix["state"] == "idle"
    assert after_fix["elevator_id"] is None


def _free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def test_multi_user_call_sequence_through_the_browser():
    sync_playwright = pytest.importorskip("playwright.sync_api").sync_playwright

    travel_seconds = 0.5
    fix_seconds = 0.5
    technician = TestClient(
        build_technician_app(technician_ids=["t1", "t2"], travel_seconds=travel_seconds)
    )
    rng = _scripted_rng([0.5, 0.0, 0.5])
    elevator_app = build_elevator_app(
        elevator_ids=["e1"],
        top_speed=10,
        rng=rng,
        technician_client=_TechnicianClientAdapter(technician),
        fix_seconds=fix_seconds,
    )

    port = _free_port()
    config = uvicorn.Config(elevator_app, host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    deadline = time.monotonic() + 5.0
    while not server.started and time.monotonic() < deadline:
        time.sleep(0.05)
    assert server.started, "uvicorn server failed to start"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            try:
                page.goto(f"http://127.0.0.1:{port}/")
                page.wait_for_selector(".panel")
                panel = page.locator(".panel")
                state = panel.locator(".state-label")
                floor = panel.locator(".floor-display")
                eta = panel.locator(".eta")
                user_input = panel.locator(".user")
                log_rows = panel.locator(".log .log-entry")

                def click_floor(label):
                    panel.locator(".buttons button", has_text=str(label)).get_by_text(
                        str(label), exact=True
                    ).first.click()

                def floor_text():
                    # .floor-display has an integer text node + a .ring child;
                    # take only the leading text node.
                    return page.evaluate(
                        "() => document.querySelector('.panel .floor-display')"
                        ".firstChild.nodeValue"
                    )

                # 1. Alice rides normally.
                user_input.fill("alice_multi")
                click_floor(3)
                page.wait_for_function(
                    "() => document.querySelector('.panel .floor-display')"
                    ".firstChild.nodeValue === '3'",
                    timeout=5_000,
                )
                state.get_by_text("idle", exact=True).wait_for(timeout=5_000)
                log_rows.filter(has_text="arrived at floor 3").first.wait_for(timeout=5_000)

                # 2. Bob's call triggers a breakdown.
                user_input.fill("bob_multi")
                click_floor(7)
                state.get_by_text("broken", exact=True).wait_for(timeout=5_000)
                log_rows.filter(has_text="tech t1").first.wait_for(timeout=5_000)
                # Technician id is surfaced in the panel's motion label, not a status table.
                # CSS uppercases the motion label, so compare case-insensitively.
                assert "t1" in panel.locator(".motion-label").inner_text().lower()

                # 3. Charlie arrives while technician en route — still broken.
                user_input.fill("charlie_multi")
                click_floor(2)
                log_rows.filter(has_text="call → floor 2 · by charlie_multi").first.wait_for(
                    timeout=5_000
                )
                page.wait_for_function(
                    "() => Array.from(document.querySelectorAll('.panel .log .log-entry'))"
                    ".filter(d => d.textContent.includes('tech t1')).length >= 2",
                    timeout=5_000,
                )
                assert "broken" in state.text_content()

                # 4. Dana first call — still broken.
                user_input.fill("dana_multi_first")
                click_floor(5)
                log_rows.filter(has_text="call → floor 5 · by dana_multi_first").first.wait_for(
                    timeout=5_000
                )
                page.wait_for_function(
                    "() => Array.from(document.querySelectorAll('.panel .log .log-entry'))"
                    ".filter(d => d.textContent.includes('tech t1')).length >= 3",
                    timeout=5_000,
                )
                assert "broken" in state.text_content()

                # 5. Wait for technician to arrive (ETA -> 0.0 while still broken).
                page.wait_for_function(
                    "() => {"
                    "  const s = document.querySelector('.panel .state-label').textContent;"
                    "  const e = document.querySelector('.panel .eta').textContent;"
                    "  return s.includes('broken') && /ETA 0\\.0s/.test(e);"
                    "}",
                    timeout=int((travel_seconds + 2.0) * 1000),
                )

                # 6. Dana's second call triggers the fix and the recovery trip.
                user_input.fill("dana_multi_second")
                click_floor(1)
                # Elevator is at floor 3 (alice's destination) when dana's recovery
                # call fires, so the log line is "trip 3 → 1".
                log_rows.filter(has_text="trip 3 → 1").first.wait_for(
                    timeout=int((fix_seconds + 5.0) * 1000)
                )
                page.wait_for_function(
                    "() => document.querySelector('.panel .floor-display')"
                    ".firstChild.nodeValue === '1'"
                    " && document.querySelector('.panel .state-label').textContent"
                    ".includes('idle')",
                    timeout=int((fix_seconds + 5.0) * 1000),
                )
                log_rows.filter(has_text="arrived at floor 1").first.wait_for(timeout=5_000)
                assert floor_text() == "1"
            finally:
                browser.close()
    finally:
        server.should_exit = True
        thread.join(timeout=5.0)


def test_two_users_in_separate_browsers_can_queue_concurrent_calls():
    """RED: alice and bob each open their own browser tab and call the elevator
    nearly simultaneously. We expect both trips to complete. Today the second
    call hits a 409 ("elevator is in motion"), so this test fails until the
    service learns to queue requests."""
    sync_playwright = pytest.importorskip("playwright.sync_api").sync_playwright

    travel_seconds = 0.5
    fix_seconds = 0.5
    technician = TestClient(
        build_technician_app(technician_ids=["t1"], travel_seconds=travel_seconds)
    )
    rng = _scripted_rng([0.5, 0.5])  # neither alice nor bob break the elevator
    elevator_app = build_elevator_app(
        elevator_ids=["e1"],
        top_speed=2,  # slow enough that bob's click lands while alice is moving
        rng=rng,
        technician_client=_TechnicianClientAdapter(technician),
        fix_seconds=fix_seconds,
    )

    port = _free_port()
    server = uvicorn.Server(
        uvicorn.Config(elevator_app, host="127.0.0.1", port=port, log_level="warning")
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 5.0
    while not server.started and time.monotonic() < deadline:
        time.sleep(0.05)
    assert server.started

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                alice_ctx = browser.new_context()
                bob_ctx = browser.new_context()
                alice = alice_ctx.new_page()
                bob = bob_ctx.new_page()
                alice.goto(f"http://127.0.0.1:{port}/")
                bob.goto(f"http://127.0.0.1:{port}/")
                alice.wait_for_selector(".panel")
                bob.wait_for_selector(".panel")

                alice.locator(".panel .user").fill("alice_concurrent")
                bob.locator(".panel .user").fill("bob_concurrent")

                alice.locator(".panel .buttons button").get_by_text("5", exact=True).first.click()
                # tiny stagger so alice's request lands first and the elevator is in motion
                time.sleep(0.05)
                bob.locator(".panel .buttons button").get_by_text("8", exact=True).first.click()

                # Both should eventually see a successful trip start in their own log.
                alice.locator(".panel .log .log-entry").filter(
                    has_text="trip 0 → 5"
                ).first.wait_for(timeout=5_000)
                # When queueing lands, bob's trip starts after alice arrives at 5.
                bob.locator(".panel .log .log-entry").filter(
                    has_text="trip 5 → 8"
                ).first.wait_for(timeout=5_000)

                # And ultimately the elevator should reach floor 8 (the last queued call).
                alice.wait_for_function(
                    "() => document.querySelector('.panel .floor-display')"
                    ".firstChild.nodeValue === '8'",
                    timeout=int((travel_seconds + 10.0) * 1000),
                )
            finally:
                browser.close()
    finally:
        server.should_exit = True
        thread.join(timeout=5.0)
