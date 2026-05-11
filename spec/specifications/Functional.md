# Functional Specification

## Summary

KeyQuest is a browser-based typing game that turns deliberate typing practice into a short, replayable arcade loop. Players pick a mode (Words, Quote, Code, or Ghost Race), type a target passage, and immediately see a celebratory results card with WPM, accuracy, achievement unlocks, and trend deltas. The product targets four personas — Arcade Kids (8–14), Self-Improvers (18–35), Coders practicing symbols/indentation, and Family Device Sharers — and competes on delight rather than pedagogy. Multi-profile local accounts, a per-key heatmap, ghost racing against personal best, and a 12-badge achievement system create the return-tomorrow loop. All state lives in `localStorage`; there is no backend, no login, and no network dependency beyond first-load CDN assets.

---

## Features

### Player Select

**Summary:** Arcade-styled roster screen where users create, pick, or delete local profiles before entering the game. No network account creation is required.

**Verification Criteria:**
- A user can create a profile by entering a name (1–8 characters), picking one of 20 avatar glyphs, and picking one of 8 color palettes.
- Each profile tile displays the profile's best WPM and total run count.
- Selecting a profile routes to Home and persists the active profile across page reloads.
- A profile can be deleted; confirmation is required and deletion removes that profile's run history from `localStorage`.
- "Insert coin" arcade framing copy is present on the screen.

### Home / Mode Picker

**Summary:** Landing screen after profile selection. Presents the four typing modes in a 2×2 grid and surfaces recent activity and a ghost-race callout.

**Verification Criteria:**
- The grid shows exactly four modes: Words, Quote, Code, Ghost Race.
- Selecting Words offers 25 / 50 / 100 word lengths drawn from the ~500-word common-English pool.
- Selecting Quote starts a run from the curated quote library (with author attribution rendered on the typing screen).
- Selecting Code starts a run from one of the language samples (JS, Python, TS, CSS, Rust) with newlines and indentation preserved in a `<pre>`-style render.
- Selecting Ghost Race starts a run where the ghost target is 95% of the player's all-time best WPM.
- The sidebar shows the player's best WPM and the last 3 runs (mode, time, WPM, accuracy).
- When the player has a personal best, a ghost-challenge callout is visible.

### Typing Engine

**Summary:** The core run experience: live stats, per-character feedback, combo system, optional strict mode, and quit-on-Escape.

**Verification Criteria:**
- A live stats bar shows WPM, accuracy %, and elapsed time, updating at least every 100 ms.
- Untyped characters render faint; correct characters render normal; incorrect characters render white-on-red.
- A blinking caret renders in the user's chosen style (bar / block / underline) from Settings.
- Combo counter becomes visible at a streak of 8 correct keystrokes and escalates color at 16 and 24.
- Any incorrect keystroke resets combo to zero and increments `keyMisses[key]` for that player.
- Backspace is permitted in normal mode; in Strict Mode the user cannot advance past an error without backspacing it.
- Pressing `Escape` ends the run and returns to Home without recording a result.
- A run auto-completes the moment typed length equals target length, routing to Results.
- When the active mode is Ghost Race, a progress bar shows both the player's marker and a ghost marker positioned by 95% of all-time best WPM.

### Results Screen

**Summary:** Celebratory post-run card showing performance, trend, and any newly unlocked achievements, with one-tap replay actions.

**Verification Criteria:**
- A personal best triggers a gold gradient and "PERSONAL BEST!" banner; otherwise a dynamic positive headline (e.g., "NICE RUN!", "CLEAN!", "GOOD GAME!") is shown.
- Three large stat boxes display WPM, Accuracy %, and Duration for the just-completed run.
- A "Beat your ghost" badge appears if and only if the run was Ghost Race and the player exceeded the ghost target.
- A side panel shows character count, error count, lifetime best WPM, and run number.
- A sparkline plots the last 12 runs plus the current run.
- Any achievements newly unlocked by this run are listed with icon, name, and description.
- Confetti plays on a personal best or on any new achievement unlock, unless the user has disabled confetti in Settings.
- Action buttons present: "Run it again" (same mode and config), "Modes" (return to Home), "Progress" (open Dashboard).

### Dashboard

**Summary:** Per-player analytics surface with KPIs, trend charts, mode bests, key heatmap, achievement grid, and run history.

**Verification Criteria:**
- Four KPI cards show Best WPM, Average Accuracy, Total Runs, and Total Time Typed for the active player.
- A WPM trend line chart renders one point per run with a running-average annotation.
- An Accuracy trend line chart renders one point per run.
- A "Personal Best per Mode" panel lists all six mode variants (Words 25 / 50 / 100, Quote, Code, Ghost Race) with "—not yet—" shown for any mode the player has not attempted.
- A QWERTY key heatmap colors each key green → yellow → red by miss frequency from `keyMisses`, with a hover tooltip showing the absolute miss count.
- An achievement grid renders all 12 badges; unlocked badges are colorful, locked badges are grayscale with a lock indicator.
- The run history table shows the last 15 runs with timestamps rendered as relative time (e.g., "just now", "2m ago", "3d ago").

### Settings

**Summary:** Per-player preferences for feedback, input strictness, and visual rendering, plus profile switch and stats reset.

**Verification Criteria:**
- Toggles exist for SFX, combo counter visibility, confetti, and strict mode; each toggle persists across reloads.
- A segmented selector for text size offers S / M / L and is reflected in the Typing screen rendering.
- A segmented selector for cursor style offers bar / block / underline and is reflected in the Typing screen rendering.
- A "Switch player" action routes back to Player Select without losing other profiles' data.
- A "Reset stats" action prompts for confirmation and, on confirm, clears the active player's run history and key-miss data but preserves the profile itself.
- A version footer is visible.

### Achievements System

**Summary:** A fixed set of 12 unlockable badges tied to WPM thresholds, accuracy targets, run-count milestones, and mode diversity.

**Verification Criteria:**
- The system tracks all 12 named badges: First Steps, Cruisin', Speed Demon, Lightning, Untouchable, Sharpshooter, Flawless, Warming Up, Marathoner, Code Master, Wordsmith, Ghostbuster.
- A badge unlocks the first run on which its trigger condition is met and never re-unlocks.
- "Ghostbuster" unlocks only when a Ghost Race run beats the 95%-of-best ghost target.
- Newly unlocked badges appear on the Results screen for the run that unlocked them.
- The Dashboard grid reflects unlocked / locked state immediately after a qualifying run completes.

### Persistence & Multi-Profile Storage

**Summary:** All state for up to 8 named local profiles is held in `localStorage` under a single versioned key so the product works without a backend.

**Verification Criteria:**
- A `localStorage` key `keyquest.v1` holds players, settings, and run history.
- Each run record stored has the shape `{ mode, wpm, accuracy, duration, timestamp, keyMisses, beatGhost }`.
- Closing and reopening the browser preserves all profiles, settings, run history, key-miss data, and achievement unlocks.
- Clearing site data wipes all KeyQuest state and the next visit starts at Player Select with no profiles.
- The product loads and operates with no network requests after the first visit, assuming the browser has cached CDN assets.

### Tweaks Panel (Dev Overlay)

**Summary:** Bottom-right developer overlay for live-tweaking presentation values during development; not user-facing in normal use.

**Verification Criteria:**
- The panel exposes controls for font family, display weight (400–900), accent color, combo behavior, shake-on-error, and confetti.
- Tweaks apply immediately to the running session.
- Tweaks are not written to `localStorage` and reset on page reload.
