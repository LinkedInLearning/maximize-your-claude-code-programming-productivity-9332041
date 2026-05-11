# Architecture Decisions

A log of significant architectural decisions made during this project. Each entry follows a lightweight ADR format.

---

## ADR-001: Pure client-side, no backend

**Status:** Accepted

**Context:**
KeyQuest targets casual typists across four personas with a "zero-friction" goal. Account creation, login, or any server round-trip would add friction and operational cost for a product whose value loop (type → see results → replay) is entirely local. There is also no multiplayer or social requirement in v1.

**Decision:**
Ship as a pure client-side single-page app. No backend, no API, no authentication. All persistence is local to the browser.

**Consequences:**
- Easier: deployment is static hosting; no servers to run; no privacy/compliance surface for user data.
- Harder: stats die with the browser; no cross-device sync; no aggregate analytics without an explicit later opt-in; no anti-cheat or shared leaderboard is possible.

---

## ADR-002: `localStorage` as the persistence layer, single versioned key

**Status:** Accepted

**Context:**
The app needs to persist multiple profiles, per-profile run history, key-miss data, settings, and achievement unlocks across reloads. Options considered: `localStorage`, `IndexedDB`, in-memory only. Run history per profile is small structured JSON and is read/written infrequently relative to keystrokes.

**Decision:**
Persist all state under a single `localStorage` key, `keyquest.v1`, containing the players array, global settings, and per-player run history.

**Consequences:**
- Easier: trivial read/write; one JSON blob; no schema migrations across multiple keys.
- Harder: a corrupted blob loses everything for that browser; growth is bounded by the ~5 MB `localStorage` quota; large datasets (e.g., thousands of runs across many profiles) may need migration to IndexedDB later, which would require a superseding ADR.

---

## ADR-003: React 18 with in-browser Babel transpile, no build step

**Status:** Accepted

**Context:**
The team wants the code to be readable and editable directly in the served files, with no tooling between source and browser. The product is small (one HTML shell, a handful of `.jsx` modules) and performance is dominated by keystroke handling, not initial bundle size.

**Decision:**
Use React 18 and ReactDOM 18 loaded from unpkg, with Babel Standalone transpiling `.jsx` modules in the browser. No bundler, no build pipeline.

**Consequences:**
- Easier: zero-tooling onboarding; "view source" is the source; iteration loop is reload.
- Harder: first-load cost includes Babel; transpilation happens on the user's CPU; production minification, tree-shaking, and dead-code elimination are unavailable. Any future move to a build pipeline (Vite, esbuild, Next.js) must be captured as a new ADR superseding this one.

---

## ADR-004: Multi-profile local accounts instead of OS users or login

**Status:** Accepted

**Context:**
The "Family Device Sharer" persona requires multiple typists on one browser without account creation. Options: rely on OS-level user accounts, require login, or implement in-app local profiles.

**Decision:**
Implement up to 8 in-app local profiles selected at app start, each with its own avatar, settings, and stats, all stored under the single `keyquest.v1` key.

**Consequences:**
- Easier: one browser, many typists, no auth surface; preserves the zero-friction goal.
- Harder: profiles are unauthenticated, so any user of the browser can pick or delete any profile; profiles do not roam across devices.

---

## ADR-005: Ghost target fixed at 95% of personal best

**Status:** Accepted

**Context:**
Ghost Race needs a target that is reliably beatable enough to feel like a daily win, but not trivial. Options considered: rolling average of last N runs, fixed percentile of all-time history, or a fixed percentage of personal best.

**Decision:**
Compute the ghost target as 95% of the player's all-time best WPM, recomputed per run.

**Consequences:**
- Easier: deterministic, easy to explain, gives a clear "beat your ghost" win condition tied to a single metric.
- Harder: a single fluke high-WPM run permanently raises the bar; cannot tune difficulty per player without superseding this decision.
