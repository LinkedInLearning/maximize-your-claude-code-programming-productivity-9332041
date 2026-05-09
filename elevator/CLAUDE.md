# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Style guide
When writing python default to the google style guide

## Repository purpose

Pedagogical OOP exercise: a tick-based elevator-bank simulator. Two iterations live side by side — `elevator.py` (v1) and `elevator_v2.py` (v2). v2 is the current/cleaner design and the one to extend by default; v1 is preserved for comparison. There are no tests, no dependencies, no build system — just pure-Python single-file scripts.

## Running

```
python3 elevator_v2.py   # runs the scripted demo in _demo()
python3 elevator.py      # v1 demo
```

## Architecture

Both files model the same domain with the same SCAN-style scheduling, but differ in how they encode availability:

- **v1 (`elevator.py`)** — uses a single `State` enum (`IDLE / MOVING / STOPPED / PAUSED / OUT_OF_SERVICE`) that conflates "what the car is doing" with "is it available". `RegularElevator` and `ServiceElevator` subclass `Elevator`; the system class is `ElevatorSystem` and exposes `regular` + `service` as separate fields. `call()` takes an `allow_service` flag.
- **v2 (`elevator_v2.py`)** — splits the two concerns: `MotionState` (IDLE/MOVING/STOPPED) is orthogonal to a boolean `operational` flag. Dispatch eligibility is delegated to `Elevator.accepts(floor)` so the bank doesn't special-case car types. The system class is `ElevatorBank`, holds cars in a single `elevators: list[Elevator]`, and is built via `ElevatorBank.default()`. `ServiceElevator.pause()` flips `operational=False` with a reason string.

Shared mechanics in both:
- `Elevator.step()` advances one floor per tick toward `_next_target()`. SCAN: keep going in the current direction while requests remain that way; otherwise reverse / pick nearest when idle.
- `bank.call(floor)` picks the nearest eligible car, ties broken by queue length, then enqueues the stop.
- `run_until_idle(max_steps)` ticks until every car is idle/non-operational with an empty queue.

When extending, prefer the v2 shape (composition + `accepts()` + `operational`) over re-introducing v1's monolithic `State` enum.

## Design conventions (from `.claude/skills/oop-class-design/SKILL.md`)

This repo has a project-local skill `oop-class-design` that fires on OOP design requests. Key rules it enforces and that future edits should respect:

- Push back before adding classes — prefer functions/dataclasses/dicts when there's no real state+behavior or polymorphism.
- Composition over inheritance; only extract a base class when duplication is semantic, not coincidental.
- No `Manager` / `Helper` / `Util` / `Handler` class names.
- No getters/setters that wrap a field — expose attributes directly.
- Subclasses must obey LSP: don't override a parent method to silently no-op (this is exactly why v2 replaced v1's `PAUSED` state with an explicit `operational` flag + `accepts()` check).
- Raise on contract violations rather than silently dropping requests.
