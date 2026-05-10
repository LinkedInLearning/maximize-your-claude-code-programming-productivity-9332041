# KeyQuest — Product Requirements Document

**Author:** PM (drafted via Claude)
**Status:** Draft v1.0
**Last updated:** 2026-05-10
**Source artifact:** `/Users/linkedin/Code/claudeType/KeyQuest.html` and module bundle (`app.jsx`, `data.jsx`, six screen modules, shared components)

---

## 1. TL;DR

KeyQuest is a browser-based typing game that turns deliberate typing practice into a short, replayable arcade loop. Players pick a mode (Words, Quote, Code, or Ghost Race), type a target passage, and immediately see a celebratory results card with WPM, accuracy, achievement unlocks, and trend deltas. Multi-profile local accounts, a per-key heatmap, ghost racing against your own personal best, and a 12-badge achievement system create a reason to come back tomorrow. All state lives in `localStorage`; there is no backend, no login, and no network dependency beyond first-load font/library CDNs.

---

## 2. Problem & Opportunity

**Problem.** Typing tutors (typing.com, keybr) optimize for instruction; speed-test sites (Monkeytype, 10fastfingers) optimize for raw benchmarking. Neither feels *fun* enough for a casual learner to choose over a 30-second mobile game, and neither makes daily return obvious to a kid or early-career typist.

**Opportunity.** Wrap a real typing engine (live WPM, error tracking, ghost racing) in an arcade aesthetic — playful display fonts, avatar glyphs, confetti on personal bests, "insert coin" framing — and pair it with progress surfaces (dashboard, heatmap, achievements) that reward repeat visits. The result is a typing product that competes on *delight*, not pedagogy.

**Why now.** The reference build is already feature-complete enough to user-test. This PRD captures the current product as a baseline, names the differentiators worth doubling down on, and proposes the next set of bets.

---

## 3. Target Users & Personas

| Persona | Age | Primary motivation | Hook |
|---|---|---|---|
| **Arcade Kid** | 8–14 | Beat my friend / beat myself | Avatars, confetti, badges, ghost racing |
| **Self-Improver** | 18–35 | Get measurably faster | Dashboard, key heatmap, mode personal bests |
| **Coder Practicing** | 22–45 | Type code fluently (symbols, indentation) | Code mode with real syntax (JS, Python, TS, CSS, Rust) |
| **Family Device Sharer** | All | One laptop, multiple typists | Multi-profile local accounts, no login required |

Non-goals: classroom administration, teacher dashboards, anti-cheat leaderboards, paid tiers.

---

## 4. Goals & Non-Goals

### Goals (v1.0 — what shipped)
1. **Sub-10-second time-to-first-keystroke** from page load to typing.
2. **Always-celebratory results screen** — every run gets a positive framing (PB, clean, good game).
3. **Per-player persistent progress** without account creation.
4. **Measurable improvement signal** — WPM trend, accuracy trend, key heatmap, mode-by-mode personal bests.
5. **Zero-friction replay** — "Run it again" repeats the exact config; "Play again" re-rolls content.

### Non-goals (explicit)
- Multiplayer over the network.
- User accounts, cloud sync, social features.
- Lesson plans, structured curriculum, or grade-level scoring.
- Mobile-first experience (desktop keyboard is the assumed input).
- Monetization in v1.

---

## 5. Product Surface

### 5.1 Information architecture
```
Player Select  ─┐
                ├─► Home (mode picker) ─► Typing ─► Results ─┬─► Home
Dashboard ◄─────┤                                            ├─► Typing (same config)
Settings  ◄─────┘                                            └─► Dashboard
```

### 5.2 Screens

**Player Select** — Arcade roster. Create up-to-8-char names, pick an avatar (20 glyphs × 8 color palettes), see each profile's best WPM and run count. "Insert coin" copy reinforces the arcade frame. Profiles deletable.

**Home** — 2×2 grid of modes:
- **Words** (25 / 50 / 100 words, drawn from a 500-word common-English pool)
- **Quote** (7 curated quotes with author attribution)
- **Code** (5 language samples — JS, Python, TS, CSS, Rust — `<pre>`-rendered with newlines intact)
- **Ghost Race** (race your 95%-of-best-WPM ghost; win unlocks "Ghostbuster")

Sidebar shows best WPM and the last 3 runs (mode, time, WPM, accuracy). PB callout offers a ghost challenge.

**Typing** — The core engine.
- Live stats bar: WPM, accuracy %, elapsed time, updating every 100ms.
- Progress bar with ghost marker (when racing).
- Character-by-character feedback: untyped (faint), correct (normal), error (white-on-red).
- Blinking caret; configurable bar / block / underline.
- Combo counter pops in at 8 streak; color escalates at 16 / 24.
- Backspace allowed; Strict Mode (settings) forces error correction before progressing.
- `Escape` to quit. Run ends auto-magically when typed length == target length.

**Results** — Celebratory card.
- Gold gradient + "PERSONAL BEST!" banner on PB; otherwise dynamic headline ("NICE RUN!", "CLEAN!", "GOOD GAME!").
- Three large stat boxes (WPM, Accuracy, Duration).
- "Beat your ghost" badge if applicable.
- Side panel: char count, error count, lifetime best, run #.
- 12-run trend sparkline (last 12 + current).
- Newly unlocked achievements shown in a dark card with icon + name + description.
- Confetti on PB or new achievements (toggleable).
- Actions: **Run it again** (same config) · **Modes** · **Progress**.

**Dashboard** — Analytics surface.
- 4 KPI cards: Best WPM · Avg Accuracy · Total Runs · Time Typed.
- WPM trend line chart (with running average annotated).
- Accuracy trend line chart.
- Personal best per mode (6 rows; "—not yet—" for untried modes).
- **Key heatmap** — QWERTY layout, green → yellow → red by miss frequency, hover tooltip with miss count.
- 12 achievement badges (earned colorful, locked grayscale with lock emoji).
- Run history table (last 15) with relative timestamps ("just now", "2m ago", "3d ago").

**Settings** — Toggles for SFX, combo counter, confetti, strict mode. Segmented selectors for text size (S/M/L) and cursor (bar/block/underline). Player switch and stats reset (with confirmation). Version footer.

**Tweaks Panel** (dev-facing, bottom-right overlay) — Font family, display weight (400–900), accent color, combo, shake-on-error, confetti. In-memory only; not persisted.

---

## 6. Core Mechanics (Specs)

| Mechanic | Spec |
|---|---|
| **WPM** | `(correct_chars / 5) / (elapsed_seconds / 60)` |
| **Accuracy** | `(typed_length − errors) / typed_length × 100%` |
| **Combo** | Increments on each correct keystroke; resets on any error. Visible at ≥ 8. |
| **Ghost target** | 95% of player's all-time best WPM (per player) |
| **Personal best** | Highest WPM ever recorded for that player, any mode |
| **Strict mode** | Blocks forward progress until current error is backspaced |
| **Error logging** | Every wrong key → `keyMisses[key]++` saved to player record; feeds heatmap |
| **Run record** | `{ mode, wpm, accuracy, duration, timestamp, keyMisses, beatGhost }` |

**Achievements (12 total):** First Steps, Cruisin', Speed Demon, Lightning, Untouchable, Sharpshooter, Flawless, Warming Up, Marathoner, Code Master, Wordsmith, Ghostbuster. Trigger conditions are WPM thresholds, accuracy targets, run-count milestones, and mode diversity.

---

## 7. Content Library

| Content type | Source | Volume |
|---|---|---|
| Common words | `data.jsx` → `COMMON_WORDS` | ~500 |
| Quotes | `data.jsx` → `QUOTES` | 7 (Alan Kay, Einstein, Rowling, Abelson, Jobs, Churchill, +1) |
| Code snippets | `data.jsx` → `CODE_SNIPPETS` | 5 languages, 2–15 lines each |
| Avatar glyphs | `data.jsx` | 20 glyphs × 8 colors = 160 combos |

**v1.0 gap:** Content depth is thin for quotes (7) and code (5). Repeat players will see the same passages within a session. See §10.

---

## 8. Visual & Brand System

- **Fonts:** Nunito (UI), Fredoka & Quicksand (alt), Bagel Fat One (display headlines).
- **Accent palette:** `#FF5F8A` coral · `#4FB8E0` sky · `#B69CFF` lavender · `#4DD9A1` mint · `#FFCC2E` sun.
- **Motion:** Bounce (PB trophy), Wiggle (achievement icon), Pop (combo, new cards), Shake (errors, opt-out), Caret blink, Confetti fall.
- **Voice:** Playful arcade — "Insert coin", "keep your fingers warm", emoji-rich (🎯🔥⚡👑💎🏆📜👻).

---

## 9. Technical Architecture

- **Stack:** React 18 + Babel standalone (in-browser JSX transpile), no build step. Pure client-side.
- **Persistence:** `localStorage` key `keyquest.v1` — players, settings, run history.
- **Files:**
  - `KeyQuest.html` — shell, loads React/Babel from unpkg + module bundle in order
  - `app.jsx` — global state, screen router, persistence layer
  - `data.jsx` — content library
  - `components.jsx` — Avatar, TopBar, Confetti, LineChart
  - `screen-*.jsx` — six screens (home, typing, results, dashboard, settings, player-select)
  - `tweaks-panel.jsx` — dev overlay
  - `icons.jsx`, `styles.css`
- **Dependencies:** React 18.3.1, ReactDOM 18.3.1, Babel 7.29.0, Google Fonts.
- **Offline:** Works after first load if browser caches CDN assets; otherwise online-required.

---

## 10. Known Gaps & v1.1 Bets (PM recommendations)

Listed in priority order. Each is justified by the user need it serves.

1. **Expand content library** — *Repeat-play wears thin at the current 7 quotes / 5 snippets.* Target 50+ quotes, 25+ code snippets across 8+ languages. Add difficulty tags so we can scope passages to the player's current WPM band.
2. **Daily challenge** — *No reason to come back tomorrow specifically.* A single seeded passage everyone gets each day, with a personal "today's best" tile on Home. No leaderboard needed; the loop is self vs. self.
3. **Adaptive practice from heatmap** — *Heatmap is read-only.* Add a "Train your worst keys" mode that generates word lists weighted toward the player's red keys.
4. **Mobile fallback** — *Pure desktop today.* Detect touch device, show a "Best on desktop" gate; longer-term, ship an on-screen keyboard for tablet practice.
5. **Sound design pass** — *SFX toggle exists; assets implied.* Confirm actual audio shipped; if not, add typewriter clicks, error buzz, combo escalation chimes, PB fanfare.
6. **Export / shareable result card** — *Bragging is fuel.* PNG export of the results card with player name, WPM, mode.
7. **Run-level review** — *History table is data-only.* Tap a run to replay the passage you typed with your errors annotated.
8. **Cloud sync (opt-in)** — *Stats die with the browser.* A simple "export / import code" first; full sync later.

---

## 11. Success Metrics (proposed for v1.1)

| Metric | Target | How measured |
|---|---|---|
| **D1 return rate** | ≥ 35% | Player record `lastSeen` revisits within 24h |
| **Runs per session** | ≥ 4 | Run count between page-load events |
| **PB rate** | 5–15% of runs | PB flag on run record |
| **Achievement coverage** | ≥ 6 of 12 unlocked by run 50 | Per-player achievement set size |
| **Mode diversity** | ≥ 3 modes used per active player | Distinct `mode` values in run history |

(All measurable client-side; would require a minimal opt-in analytics ping to aggregate.)

---

## 12. Open Questions

1. **Audience priority** — Are we leaning Arcade Kid or Self-Improver for v1.1? Affects whether we invest in daily challenge (kid) or adaptive practice (self-improver) first.
2. **Content sourcing** — Do we curate quotes/snippets in-house, or open a contribution path?
3. **Analytics** — Are we willing to add a single anonymous ping to validate success metrics, or stay 100% offline?
4. **Monetization** — Stays free forever, or is there a future "KeyQuest Plus" (themes, content packs)?

---

## 13. Appendix — Critical files

- `/Users/linkedin/Code/claudeType/KeyQuest.html` — entry point
- `/Users/linkedin/Code/claudeType/app.jsx` — state, routing, persistence
- `/Users/linkedin/Code/claudeType/data.jsx` — content + achievement definitions
- `/Users/linkedin/Code/claudeType/screen-typing.jsx` — core engine (WPM/accuracy/combo logic)
- `/Users/linkedin/Code/claudeType/screen-dashboard.jsx` — heatmap, trend charts, achievements grid

---

## 14. Verification (for the PRD itself)

This PRD is a documentation artifact, not a code change. To verify it accurately reflects the product:

1. Open `KeyQuest.html` in a browser and confirm each screen described in §5 exists and behaves as specified.
2. Walk the flow in §5.1 end-to-end as a new player; confirm time-to-first-keystroke is under 10s.
3. Spot-check §6 mechanics by playing one Words run and one Ghost Race — verify WPM formula, combo trigger at 8, ghost at 95% of best.
4. Open DevTools → Application → Local Storage → confirm `keyquest.v1` key matches the schema in §9.
5. Confirm content counts in §7 by reading `data.jsx`.
