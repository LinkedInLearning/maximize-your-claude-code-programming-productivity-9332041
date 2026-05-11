import pytest

from elevator import Elevator


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
