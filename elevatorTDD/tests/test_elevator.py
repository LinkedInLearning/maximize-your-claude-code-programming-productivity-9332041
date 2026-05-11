import time

import pytest

from app.elevator import Elevator, ServiceElevator


def test_elevator_starts_at_ground_floor_by_default():
    elevator = Elevator()
    assert elevator.current_floor == 0


def test_elevator_moves_to_requested_floor():
    elevator = Elevator()
    elevator.call_to(5)
    assert elevator.current_floor == 5


def test_elevator_can_start_at_a_given_floor():
    elevator = Elevator(current_floor=3)
    assert elevator.current_floor == 3


def test_elevator_can_move_to_negative_floor_for_parking():
    elevator = Elevator()
    elevator.call_to(-2)
    assert elevator.current_floor == -2


def test_elevator_rejects_half_floor_request():
    elevator = Elevator()
    with pytest.raises(ValueError):
        elevator.call_to(2.5)


def test_user_is_locked_only_while_traveling():
    import threading

    first = Elevator(top_speed=10, current_floor=0)  # 5 floors → ~0.5s trip
    second = Elevator(top_speed=100)
    trip = threading.Thread(target=first.call_to, args=(5, "alice_lock"))
    trip.start()
    time.sleep(0.05)  # let the trip enter its travel window
    with pytest.raises(ValueError):
        second.call_to(7, user="alice_lock")
    trip.join()
    # After the first trip arrives, alice is released and can call again.
    second.call_to(2, user="alice_lock")
    assert second.current_floor == 2


def test_service_elevator_cannot_be_booked_by_multiple_users():
    service = ServiceElevator()
    service.book(user="alice", duration_hours=1)
    with pytest.raises(ValueError):
        service.book(user="bob", duration_hours=1)


def test_idle_elevator_has_zero_velocity():
    elevator = Elevator()
    assert elevator.velocity == 0


def test_elevator_top_speed_is_configurable():
    elevator = Elevator(top_speed=2)
    assert elevator.top_speed == 2


def test_velocity_is_positive_while_traveling_up():
    elevator = Elevator(top_speed=3, current_floor=0)
    trip = elevator.begin_trip(5)
    assert elevator.velocity == 3
    trip.complete()


def test_velocity_is_negative_while_traveling_down():
    elevator = Elevator(top_speed=3, current_floor=5)
    trip = elevator.begin_trip(0)
    assert elevator.velocity == -3
    trip.complete()


def test_velocity_returns_to_zero_after_arrival():
    elevator = Elevator(top_speed=100, current_floor=0)
    elevator.call_to(5)
    assert elevator.velocity == 0


def test_call_to_takes_real_time_proportional_to_distance_and_top_speed():
    elevator = Elevator(top_speed=20, current_floor=0)  # 20 floors/sec
    start = time.monotonic()
    elevator.call_to(2)  # ~0.1s
    elapsed = time.monotonic() - start
    assert 0.08 <= elapsed <= 0.3


def test_service_elevator_rejects_calls_from_non_booker():
    service = ServiceElevator(top_speed=100)
    service.book(user="alice", duration_hours=1)
    with pytest.raises(PermissionError):
        service.call_to(4, user="bob")


def test_service_elevator_accepts_calls_from_booker():
    service = ServiceElevator(top_speed=100)
    service.book(user="alice", duration_hours=1)
    service.call_to(4, user="alice")
    assert service.current_floor == 4


def test_service_elevator_booking_expires_after_duration():
    service = ServiceElevator(top_speed=100)
    # 50ms expressed in hours so the test runs fast but uses the real clock.
    service.book(user="alice", duration_hours=0.05 / 3600)
    time.sleep(0.1)
    with pytest.raises(PermissionError):
        service.call_to(4, user="alice")


def test_wait_time_reflects_real_elapsed_seconds_between_request_and_pickup():
    elevator = Elevator(top_speed=100, current_floor=0)
    request = elevator.request_pickup(from_floor=3)
    time.sleep(0.05)
    elevator.fulfill(request)
    assert request.wait_time >= 0.05
    assert request.wait_time < 0.5


def test_two_users_requesting_elevators_one_service_elevator_blocked():
    # three users want to call an elevator, but user C has the service elevator booked. The service elevator is closest to the two users.
    # Elevator 1 is on floor 3, elevator 2 is on floor 5 and service elevator is on floor 1
    # make sure that the two users call elevators 1 and 2 and the times match
    top_speed = 100  # floors per second
    elevator1 = Elevator(top_speed=top_speed, current_floor=3)
    elevator2 = Elevator(top_speed=top_speed, current_floor=5)
    service = ServiceElevator(top_speed=top_speed, current_floor=1)
    service.book(user="charlie", duration_hours=1)

    assert elevator1.current_floor == 3
    assert elevator2.current_floor == 5
    assert service.current_floor == 1

    # Both regular users are blocked from the service elevator that charlie booked.
    with pytest.raises(PermissionError):
        service.call_to(0, user="dana")
    with pytest.raises(PermissionError):
        service.call_to(0, user="eve")
    assert service.current_floor == 1  # service did not move

    # They fall back to the two regular elevators; travel time matches distance / top_speed.
    start = time.monotonic()
    elevator1.call_to(0, user="dana")  # 3 floors → 0.03s
    elapsed1 = time.monotonic() - start

    start = time.monotonic()
    elevator2.call_to(0, user="eve")  # 5 floors → 0.05s
    elapsed2 = time.monotonic() - start

    assert elevator1.current_floor == 0
    assert elevator2.current_floor == 0

    expected1 = 3 / top_speed
    expected2 = 5 / top_speed
    tolerance = 0.04
    assert expected1 <= elapsed1 <= expected1 + tolerance
    assert expected2 <= elapsed2 <= expected2 + tolerance
