# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Scroll Typer — a single-page browser typing trainer. Vanilla HTML/CSS/JS, no build step, no dependencies, no package.json. The text "scrolls" horizontally past a fixed caret marker rather than the user's cursor moving through static text.

## Running

Open `index.html` directly in a browser, or serve the directory statically (e.g. `python3 -m http.server`). There are no build, lint, or test commands.

## Architecture

Three files, all at the repo root:

- `index.html` — DOM skeleton: stats header, `#viewport` containing the fixed `#caret-marker` and the moving `#strip`, controls, and a results modal.
- `style.css` — Layout and the per-character states (`.cur`, `.done`, `.err`) on `.ch` spans.
- `game.js` — Single IIFE holding all state and logic.

### Scrolling model (the core mechanic)

The caret marker is fixed at `CARET_RATIO` (50%) of the viewport width. The `#strip` element is translated leftward via `transform: translate(-scrollOffsetPx, -50%)` each animation frame. Per-character spans never move relative to the strip; only the strip's transform changes.

`tick()` advances `scrollOffsetPx` by `(targetWpm * 5 / 60) * charWidthPx * dt`, where `targetWpm = max(MIN_WPM, liveWpm())`. Two clamps matter:
- Upper: strip cannot scroll more than `MAX_LOOKAHEAD_CHARS` ahead of where the caret index would sit centered under the marker. This keeps the active character from being pushed off-screen left when the user pauses.
- Lower: cannot scroll behind the initial centered position of char 0.

Char width is measured at runtime by inserting a 50-`M` probe span (`measureCharWidth`) — needed because positioning math is in pixels but driven by character counts.

### Typing state

`caretIndex` tracks the position in `passage`. `chars[]` holds the span for each character. Keystroke handling in `handleKey`:
- Backspace decrements `caretIndex`, removes `done`/`err` classes, and decrements `correctChars` only if the prior char wasn't already in `errorPositions` (uncorrected errors don't refund the correct counter).
- Printable single-char keys advance the caret, mark the span `done` or `err`, and start the clock on the first keystroke.
- Modifier-prefixed keys and non-printable keys (length ≠ 1) are ignored.

`liveWpm()` uses a rolling 5s window (`LIVE_WPM_WINDOW_MS`) over `keystrokeLog`; `overallWpm()` uses the full elapsed time. Live WPM drives scroll speed; overall WPM is what's shown in the header and saved.

### Results persistence

Results are appended to `localStorage` under `typingapp.results` as a JSON array of `{timestamp, passageId, wpm, accuracy, durationMs}`. `exportResults()` builds a TSV-ish text file and triggers a download. There is no server or sync.

### Adding passages

`PASSAGES` is a hardcoded array at the top of `game.js`. Indices wrap modulo the array length in `loadPassage`.

## Testing
For creating tests, create the smallest possible test you can. Don't install additional tooling for tests unless absolutely needed, and think of one positive and one negative test per case.

Run tests with `node --test tests/passages.test.js` (Node ≥18, no install). Tests use `node:test` + `node:assert/strict`. The corpus lives in `passages.js` so it's `require`-able from tests and loadable via `<script>` from `index.html`.
