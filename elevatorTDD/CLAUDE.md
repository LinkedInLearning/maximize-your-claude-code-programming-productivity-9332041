# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

Create a cli elevator project

## Stack

- Python 3 + `pytest`
- Google Python style guide
- No build system; tests are the entry point

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

## Design conventions

Inherited from `.claude/skills/oop-class-design` (if present) and applied here:

- Push back before adding classes — prefer functions/dataclasses when there's no real state+behavior or polymorphism. Let tests pull classes into existence, not speculation.
- Composition over inheritance; extract a base class only when duplication is semantic.
- No `Manager` / `Helper` / `Util` / `Handler` names.
- No getters/setters that wrap a field — expose attributes directly.
- Subclasses must obey LSP: never override a parent method to silently no-op.
- Raise on contract violations rather than silently dropping requests — and write the test for the raise first.
