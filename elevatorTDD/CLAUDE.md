# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

Simulate an apartment-building elevator system, grown test-first from a domain model into two cooperating FastAPI services. See `Ideas.md` for feature concepts.

## Stack

- Python 3 + `pytest`
- FastAPI + uvicorn (two services), httpx (inter-service client), Playwright (browser tests)
- Google Python style guide
- No build system; tests are the entry point. `conftest.py` at the repo root puts the repo on `sys.path` so `from app...` imports resolve.

## Architecture

Three layers, kept separate so the domain stays test-driven and the HTTP edges stay thin:

- `app/elevator.py` — pure domain. `Elevator` (regular) and `ServiceElevator` (booked, single-user). `Elevator._active_users` is a *class-level* set enforcing "one active request per user" across instances; mutating it from tests requires care.
- `app/elevator_service.py` — FastAPI app built by `build_app(...)`. Holds per-elevator `_Trip` / `_Repair` state, runs trips in background threads, exposes `_live_floor` for in-flight position. Calls into the technician service via an injected `technician_client` (dependency-injected for tests). Random 1% breakage on `call_to` triggers a repair dispatch. Module-level `app` is constructed from env vars (`ELEVATOR_IDS`, `TOP_SPEED`, `TECHNICIAN_URL`, `FIX_SECONDS`).
- `app/technician_service.py` — separate FastAPI app for technician dispatch/fix. Picks the least-busy technician, tracks `busy_until` and `assignments`. `/fix` blocks (`time.sleep`) for the requested duration — callers must size their HTTP timeouts accordingly (see `TechnicianHttpClient.fix`).

`app/technician_client.py` is the httpx wrapper the elevator service uses to reach the technician service. Tests substitute a fake client via `build_app`'s `technician_client` parameter rather than spinning up a second server.

### Running the services locally

```
uvicorn app.technician_service:app --port 8002
uvicorn app.elevator_service:app  --port 8001   # expects TECHNICIAN_URL=http://localhost:8002
```

Static UI is served from `app/static/index.html` at `GET /`.

### Smoke testing the deployment

Unit tests stub the technician client, so they cannot catch wiring failures
(wrong `TECHNICIAN_URL`, technician on the wrong port, etc.). The smoke
suite hits both services over real HTTP and is the gate that catches those:

```
scripts/install_hooks.sh           # once per clone — enables pre-commit smoke gate

scripts/deploy.sh                  # working config: technician :8002, elevator :8001
pytest tests/smoke -m smoke -q     # expected: all pass
scripts/stop.sh

scripts/deploy_broken.sh           # broken config: technician :8003, elevator still points at :8002
pytest tests/smoke -m smoke -q     # expected: test_maintenance_reaches_technician fails
scripts/stop.sh
```

Every `git commit` whose staged files include any path under `elevatorTDD/`
runs `scripts/deploy.sh` → `pytest tests/smoke -m smoke` → `scripts/stop.sh`
via `.githooks/pre-commit`. Commits to sibling projects in the surrounding
`/Users/linkedin/Code` repo are unaffected — the hook filters by path
prefix. Bypass with `SKIP_SMOKE=1 git commit …` for docs-only changes.

## Workflow — strict red-green-refactor

Every change must follow this loop. Do not skip steps, even for "obvious" code:

1. **Red** — write exactly one failing test that describes the next smallest piece of behavior. Run `pytest` and confirm it fails for the *expected reason* (not an import error masking a missing assertion).
2. **Green** — write the *minimum* production code to make that test pass. Hardcoding return values is acceptable at this stage; the next test will force generalization.
3. **Refactor** — with tests green, clean up duplication and naming in both test and production code. Re-run tests after each refactor step.

Guidelines that follow from strict TDD:
- No production code without a failing test that requires it. If tempted to add a method "because we'll need it," write the test first or don't add it.
- One assertion concept per test; name tests as behavior statements (`test_idle_elevator_accepts_call_to_any_floor`).
- Refactor only on green. If a refactor breaks tests, revert rather than chase the failure forward.
- Commit at each green (and optionally after refactors) so the TDD trail is visible in git history.

## Running tests

```
pytest                           # full suite
pytest -x                        # stop at first failure (preferred during red-green)
pytest tests/test_elevator.py::test_name   # single test
pytest -k "idle"                 # by keyword
pytest --lf                      # rerun last failures
```

`tests/test_multi_user_flow.py` is an end-to-end Playwright test against the running services; the others are in-process unit/integration tests that import `build_app` directly with fakes.

## Design conventions

Inherited from `.claude/skills/oop-class-design` (if present) and applied here:

- Push back before adding classes — prefer functions/dataclasses when there's no real state+behavior or polymorphism. Let tests pull classes into existence, not speculation.
- Composition over inheritance; extract a base class only when duplication is semantic.
- No `Manager` / `Helper` / `Util` / `Handler` names.
- No getters/setters that wrap a field — expose attributes directly.
- Subclasses must obey LSP: never override a parent method to silently no-op.
- Raise on contract violations rather than silently dropping requests — and write the test for the raise first.
