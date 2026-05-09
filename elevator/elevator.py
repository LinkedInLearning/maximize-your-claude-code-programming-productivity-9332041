from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Direction(Enum):
    UP = 1
    DOWN = -1
    IDLE = 0


class State(Enum):
    IDLE = "idle"
    MOVING = "moving"
    STOPPED = "stopped"
    PAUSED = "paused"
    OUT_OF_SERVICE = "out_of_service"


@dataclass
class Elevator:
    name: str
    min_floor: int = 1
    max_floor: int = 10
    current_floor: int = 1
    direction: Direction = Direction.IDLE
    state: State = State.IDLE
    requests: set[int] = field(default_factory=set)

    def request_floor(self, floor: int) -> None:
        if not self.min_floor <= floor <= self.max_floor:
            raise ValueError(f"Floor {floor} out of range for {self.name}")
        if self.state == State.OUT_OF_SERVICE:
            raise RuntimeError(f"{self.name} is out of service")
        if floor != self.current_floor:
            self.requests.add(floor)

    def _next_target(self) -> Optional[int]:
        if not self.requests:
            return None
        if self.direction == Direction.UP:
            above = [f for f in self.requests if f > self.current_floor]
            if above:
                return min(above)
            return max(self.requests)
        if self.direction == Direction.DOWN:
            below = [f for f in self.requests if f < self.current_floor]
            if below:
                return max(below)
            return min(self.requests)
        return min(self.requests, key=lambda f: abs(f - self.current_floor))

    def step(self) -> None:
        if self.state in (State.PAUSED, State.OUT_OF_SERVICE):
            return
        target = self._next_target()
        if target is None:
            self.direction = Direction.IDLE
            self.state = State.IDLE
            return
        if target == self.current_floor:
            self.requests.discard(self.current_floor)
            self.state = State.STOPPED
            return
        self.direction = Direction.UP if target > self.current_floor else Direction.DOWN
        self.state = State.MOVING
        self.current_floor += self.direction.value
        if self.current_floor in self.requests:
            self.requests.discard(self.current_floor)
            self.state = State.STOPPED

    def status(self) -> str:
        return (
            f"[{self.name}] floor={self.current_floor} "
            f"dir={self.direction.name} state={self.state.value} "
            f"queue={sorted(self.requests)}"
        )


class RegularElevator(Elevator):
    pass


class ServiceElevator(Elevator):
    def __init__(self, name: str, **kwargs):
        super().__init__(name=name, **kwargs)
        self.pause_reason: Optional[str] = None

    def pause(self, reason: str = "service") -> None:
        if self.state == State.OUT_OF_SERVICE:
            raise RuntimeError(f"{self.name} is out of service")
        self.pause_reason = reason
        self.state = State.PAUSED

    def resume(self) -> None:
        if self.state != State.PAUSED:
            return
        self.pause_reason = None
        self.state = State.IDLE


class ElevatorSystem:
    def __init__(self, min_floor: int = 1, max_floor: int = 10):
        self.min_floor = min_floor
        self.max_floor = max_floor
        self.regular: list[RegularElevator] = [
            RegularElevator("R1", min_floor=min_floor, max_floor=max_floor),
            RegularElevator("R2", min_floor=min_floor, max_floor=max_floor),
        ]
        self.service: ServiceElevator = ServiceElevator(
            "S1", min_floor=min_floor, max_floor=max_floor
        )

    @property
    def elevators(self) -> list[Elevator]:
        return [*self.regular, self.service]

    def call(self, floor: int, allow_service: bool = False) -> Elevator:
        candidates: list[Elevator] = list(self.regular)
        if allow_service and self.service.state != State.PAUSED:
            candidates.append(self.service)
        available = [e for e in candidates if e.state != State.OUT_OF_SERVICE]
        if not available:
            raise RuntimeError("No elevators available")
        chosen = min(
            available,
            key=lambda e: (abs(e.current_floor - floor), len(e.requests)),
        )
        chosen.request_floor(floor)
        return chosen

    def step(self) -> None:
        for e in self.elevators:
            e.step()

    def run_until_idle(self, max_steps: int = 200) -> int:
        for i in range(max_steps):
            self.step()
            if all(
                e.state in (State.IDLE, State.PAUSED, State.OUT_OF_SERVICE)
                and not e.requests
                for e in self.elevators
            ):
                return i + 1
        return max_steps

    def status(self) -> str:
        return "\n".join(e.status() for e in self.elevators)


def _demo() -> None:
    system = ElevatorSystem(min_floor=1, max_floor=10)

    system.call(5)
    system.call(7)
    system.call(2)
    system.service.request_floor(8)

    print("Initial:")
    print(system.status())

    for tick in range(1, 12):
        system.step()
        if tick == 4:
            print("\n-- Pausing service elevator for delivery --")
            system.service.pause("delivery on floor 8")
        if tick == 8:
            print("\n-- Resuming service elevator --")
            system.service.resume()
            system.service.request_floor(3)
        print(f"\nTick {tick}:")
        print(system.status())


if __name__ == "__main__":
    _demo()
