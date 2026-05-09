from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Direction(Enum):
    UP = 1
    DOWN = -1
    IDLE = 0


class MotionState(Enum):
    IDLE = "idle"
    MOVING = "moving"
    STOPPED = "stopped"


@dataclass
class Elevator:
    name: str
    min_floor: int = 1
    max_floor: int = 10
    current_floor: int = 1
    direction: Direction = Direction.IDLE
    motion: MotionState = MotionState.IDLE
    operational: bool = True
    requests: set[int] = field(default_factory=set)

    def accepts(self, floor: int) -> bool:
        return self.operational and self.min_floor <= floor <= self.max_floor

    def request_floor(self, floor: int) -> None:
        if not self.min_floor <= floor <= self.max_floor:
            raise ValueError(f"Floor {floor} out of range for {self.name}")
        if not self.operational:
            raise RuntimeError(f"{self.name} is not operational")
        if floor != self.current_floor:
            self.requests.add(floor)

    def step(self) -> None:
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
        return (
            f"[{self.name}] floor={self.current_floor} "
            f"dir={self.direction.name} motion={self.motion.value} "
            f"operational={self.operational} queue={sorted(self.requests)}"
        )


class ServiceElevator(Elevator):
    pause_reason: Optional[str] = None

    def pause(self, reason: str) -> None:
        self.operational = False
        self.pause_reason = reason

    def resume(self) -> None:
        self.operational = True
        self.pause_reason = None

    def status(self) -> str:
        base = super().status()
        if self.pause_reason:
            return f"{base} paused={self.pause_reason!r}"
        return base


class ElevatorBank:
    def __init__(self, elevators: list[Elevator]):
        if not elevators:
            raise ValueError("ElevatorBank requires at least one elevator")
        self.elevators = elevators

    @classmethod
    def default(cls, min_floor: int = 1, max_floor: int = 10) -> ElevatorBank:
        return cls([
            Elevator("R1", min_floor=min_floor, max_floor=max_floor),
            Elevator("R2", min_floor=min_floor, max_floor=max_floor),
            ServiceElevator("S1", min_floor=min_floor, max_floor=max_floor),
        ])

    def call(self, floor: int) -> Elevator:
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
        for e in self.elevators:
            e.step()

    def run_until_idle(self, max_steps: int = 200) -> int:
        for i in range(max_steps):
            self.step()
            if all(
                (not e.operational or (e.motion == MotionState.IDLE and not e.requests))
                for e in self.elevators
            ):
                return i + 1
        return max_steps

    def status(self) -> str:
        return "\n".join(e.status() for e in self.elevators)


def _demo() -> None:
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
