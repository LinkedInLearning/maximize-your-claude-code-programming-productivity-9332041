import logging
import time

logger = logging.getLogger("elevator")


class Elevator:
    _active_users = set()

    def __init__(self, current_floor=0, top_speed=None):
        self.current_floor = current_floor
        self.top_speed = top_speed
        self.velocity = 0

    def call_to(self, floor, user=None):
        if not isinstance(floor, int) or isinstance(floor, bool):
            raise ValueError(f"Floor must be a whole number, got {floor!r}")
        if user is not None:
            if user in Elevator._active_users:
                raise ValueError(
                    f"User {user!r} already has an active elevator request"
                )
            Elevator._active_users.add(user)
        try:
            self._travel_to(floor)
        finally:
            if user is not None:
                Elevator._active_users.discard(user)

    def _travel_to(self, floor):
        distance = abs(floor - self.current_floor)
        logger.info(
            "travel_to start: from=%s to=%s distance=%s top_speed=%s",
            self.current_floor, floor, distance, self.top_speed,
        )
        if self.top_speed and distance:
            self.velocity = _direction(self.current_floor, floor) * self.top_speed
            time.sleep(distance / self.top_speed)
        self.current_floor = floor
        self.velocity = 0
        logger.info("travel_to done: at floor=%s", self.current_floor)

    def begin_trip(self, floor):
        self.velocity = _direction(self.current_floor, floor) * (self.top_speed or 0)
        return _Trip(self, floor)

    def request_pickup(self, from_floor):
        return _PickupRequest(from_floor, time.monotonic())

    def fulfill(self, request):
        request.wait_time = time.monotonic() - request._requested_at


class _Trip:
    def __init__(self, elevator, target):
        self._elevator = elevator
        self._target = target

    def complete(self):
        self._elevator.current_floor = self._target
        self._elevator.velocity = 0


class _PickupRequest:
    def __init__(self, from_floor, requested_at):
        self.from_floor = from_floor
        self._requested_at = requested_at
        self.wait_time = None


class ServiceElevator:
    def __init__(self, top_speed=None, current_floor=0):
        self.top_speed = top_speed
        self.current_floor = current_floor
        self._booked_by = None
        self._expires_at = None

    def book(self, user, duration_hours):
        if self._booked_by is not None and not self._booking_expired():
            raise ValueError(
                f"Service elevator already booked by {self._booked_by!r}"
            )
        self._booked_by = user
        self._expires_at = time.monotonic() + duration_hours * 3600

    def call_to(self, floor, user=None):
        if user != self._booked_by:
            raise PermissionError(
                f"User {user!r} is not the booker of this service elevator"
            )
        if self._booking_expired():
            raise PermissionError("Service elevator booking has expired")
        distance = abs(floor - self.current_floor)
        if self.top_speed and distance:
            time.sleep(distance / self.top_speed)
        self.current_floor = floor

    def _booking_expired(self):
        return self._expires_at is not None and time.monotonic() >= self._expires_at


def _direction(from_floor, to_floor):
    if to_floor > from_floor:
        return 1
    if to_floor < from_floor:
        return -1
    return 0
