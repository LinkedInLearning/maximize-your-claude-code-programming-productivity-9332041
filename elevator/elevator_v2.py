"""Tick-based simulation of a small elevator bank.

Models a fixed set of `Elevator` cars dispatched by an `ElevatorBank`. Service
cars (`ServiceElevator`) can be paused mid-operation to handle deliveries or
moves; pausing makes them ineligible for dispatch until resumed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Direction(Enum):
    """Travel direction. The integer value is the per-tick floor delta."""

    UP = 1
    DOWN = -1
    IDLE = 0


class MotionState(Enum):
    """What the car is doing this tick. Orthogonal to availability (`Elevator.operational`)."""

    IDLE = "idle"
    MOVING = "moving"
    STOPPED = "stopped"


@dataclass
class Elevator:
    """A single elevator car servicing a contiguous floor range with SCAN scheduling.

    Set `operational=False` to take the car out of service; it will refuse new
    requests and not move on `step()` until restored. Subclasses may add reasons
    for going non-operational (see `ServiceElevator.pause`).
    """

    name: str
    min_floor: int = 1
    max_floor: int = 10
    current_floor: int = 1
    direction: Direction = Direction.IDLE
    motion: MotionState = MotionState.IDLE
    operational: bool = True
    requests: set[int] = field(default_factory=set)

    def accepts(self, floor: int) -> bool:
        """Reports whether this car can take a new call for a floor right now.

        Args:
            floor: The floor being requested.

        Returns:
            True if the car is operational and `floor` is in its served range.
        """
        return self.operational and self.min_floor <= floor <= self.max_floor

    def request_floor(self, floor: int) -> None:
        """Queues a stop at `floor`.

        Args:
            floor: The floor to enqueue.

        Raises:
            ValueError: If `floor` is outside the car's served range.
            RuntimeError: If the car is not operational.
        """
        if not self.min_floor <= floor <= self.max_floor:
            raise ValueError(f"Floor {floor} out of range for {self.name}")
        if not self.operational:
            raise RuntimeError(f"{self.name} is not operational")
        if floor != self.current_floor:
            self.requests.add(floor)

    def step(self) -> None:
        """Advances one tick: moves one floor toward the next target, or stops/idles.

        No-ops when non-operational. Stops (clears the request) on arrival.
        """
        if not self.operational:
            return
        target = self._next_target()
        if target is None:
            self.direction = Direction.IDLE
            self.motion = MotionState.IDLE
            return
        if target == self.current_floor:
            self.requests.discard(self.current_floor)
            self.motion = MotionState.STOPPED
            return
        self.direction = Direction.UP if target > self.current_floor else Direction.DOWN
        self.motion = MotionState.MOVING
        self.current_floor += self.direction.value
        if self.current_floor in self.requests:
            self.requests.discard(self.current_floor)
            self.motion = MotionState.STOPPED

    def _next_target(self) -> Optional[int]:
        """Picks the next floor to serve using SCAN scheduling.

        Continues in the current direction while pending floors lie that way;
        otherwise reverses, or picks the nearest pending floor when idle.

        Returns:
            The next floor to serve, or None if no requests are queued.
        """
        if not self.requests:
            return None
        if self.direction == Direction.UP:
            above = [f for f in self.requests if f > self.current_floor]
            return min(above) if above else max(self.requests)
        if self.direction == Direction.DOWN:
            below = [f for f in self.requests if f < self.current_floor]
            return max(below) if below else min(self.requests)
        return min(self.requests, key=lambda f: abs(f - self.current_floor))

    def status(self) -> str:
        """Returns a one-line human-readable snapshot of the car's state."""
        return (
            f"[{self.name}] floor={self.current_floor} "
            f"dir={self.direction.name} motion={self.motion.value} "
            f"operational={self.operational} queue={sorted(self.requests)}"
        )


class ServiceElevator(Elevator):
    """Elevator that can be temporarily held for deliveries or moves.

    Pausing flips `operational` off (so the bank stops dispatching to it and
    `step()` no-ops) and records a human-readable reason.
    """

    pause_reason: Optional[str] = None

    def pause(self, reason: str) -> None:
        """Takes the car out of service until `resume()` is called.

        Args:
            reason: Human-readable explanation, surfaced in `status()`.
        """
        self.operational = False
        self.pause_reason = reason

    def resume(self) -> None:
        """Returns the car to service and clears the pause reason."""
        self.operational = True
        self.pause_reason = None

    def status(self) -> str:
        base = super().status()
        if self.pause_reason:
            return f"{base} paused={self.pause_reason!r}"
        return base


class ElevatorBank:
    """A group of elevators with shared dispatch.

    Owns its cars by composition; pass them in for testability or use
    `ElevatorBank.default()` for the standard 2-regular + 1-service config.
    """

    def __init__(self, elevators: list[Elevator]):
        """Initializes the bank with a non-empty list of cars.

        Args:
            elevators: The cars owned by this bank.

        Raises:
            ValueError: If `elevators` is empty.
        """
        if not elevators:
            raise ValueError("ElevatorBank requires at least one elevator")
        self.elevators = elevators

    @classmethod
    def default(cls, min_floor: int = 1, max_floor: int = 10) -> ElevatorBank:
        """Builds the standard configuration: two regular cars and one service car.

        Args:
            min_floor: Lowest floor served by all cars.
            max_floor: Highest floor served by all cars.

        Returns:
            A new `ElevatorBank` with cars R1, R2, and S1.
        """
        return cls([
            Elevator("R1", min_floor=min_floor, max_floor=max_floor),
            Elevator("R2", min_floor=min_floor, max_floor=max_floor),
            ServiceElevator("S1", min_floor=min_floor, max_floor=max_floor),
        ])

    def call(self, floor: int) -> Elevator:
        """Dispatches the nearest eligible car to `floor` and queues the stop.

        Eligibility is determined by each car's `accepts(floor)`. Ties are
        broken by current queue length.

        Args:
            floor: The floor being called.

        Returns:
            The car that was dispatched.

        Raises:
            RuntimeError: If no car can service `floor`.
        """
        eligible = [e for e in self.elevators if e.accepts(floor)]
        if not eligible:
            raise RuntimeError(f"No elevator can service floor {floor}")
        chosen = min(
            eligible,
            key=lambda e: (abs(e.current_floor - floor), len(e.requests)),
        )
        chosen.request_floor(floor)
        return chosen

    def step(self) -> None:
        """Advances every car by one tick."""
        for e in self.elevators:
            e.step()

    def run_until_idle(self, max_steps: int = 200) -> int:
        """Steps the bank until all cars are idle or paused.

        Args:
            max_steps: Safety cap on iterations.

        Returns:
            The number of ticks elapsed, capped at `max_steps`.
        """
        for i in range(max_steps):
            self.step()
            if all(
                (not e.operational or (e.motion == MotionState.IDLE and not e.requests))
                for e in self.elevators
            ):
                return i + 1
        return max_steps

    def status(self) -> str:
        """Returns a multi-line status with one line per car."""
        return "\n".join(e.status() for e in self.elevators)


def _demo() -> None:
    """Runs a scripted scenario showing dispatch, pausing for a delivery, and resuming."""
    bank = ElevatorBank.default()
    service = next(e for e in bank.elevators if isinstance(e, ServiceElevator))

    bank.call(5)
    bank.call(7)
    bank.call(2)
    service.request_floor(8)

    print("Initial:")
    print(bank.status())

    for tick in range(1, 12):
        bank.step()
        if tick == 4:
            print("\n-- Pausing service elevator for delivery --")
            service.pause("delivery on floor 8")
        if tick == 8:
            print("\n-- Resuming service elevator --")
            service.resume()
            service.request_floor(3)
        print(f"\nTick {tick}:")
        print(bank.status())


if __name__ == "__main__":
    _demo()
