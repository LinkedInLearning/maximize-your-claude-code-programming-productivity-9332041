# Non-Functional Specification

## Performance

- Time from page load to first accepted keystroke must be under 10 seconds on a modern desktop browser on a typical home broadband connection (cold CDN cache).
- Live stats bar (WPM, accuracy, elapsed time) must update at least every 100 ms during a run.
- Per-character render feedback (correct / incorrect / caret advance) must occur within one animation frame (≤ 16 ms) of the keystroke under normal load.
- Results, Dashboard, and Home screens must render their initial paint in under 500 ms on a typical desktop browser.

## Security

- No user credentials, PII, or authentication state are collected or transmitted; the product is a pure client-side application with no backend.
- All state is scoped to the browser origin via `localStorage`; profile names are user-chosen and not assumed to be personally identifying.
- Code-mode content is rendered as text (never evaluated) so user-typed input and stored content cannot trigger code execution.
- First-load assets come from third-party CDNs (unpkg, Google Fonts); subresource integrity or pinned versions should be used so a CDN compromise cannot silently swap libraries. Exact SRI policy is _TBD_.

## Reliability

- The application has no server, so service availability is bounded by the static host and CDN providers. Chosen host SLA is _TBD_.
- A corrupt or partially written `keyquest.v1` blob must not crash the app; on parse failure the app falls back to a fresh empty state and surfaces a recoverable error to the user.
- Closing the tab mid-run discards the in-progress run but never corrupts prior history.

## Scalability

- The product is single-user-per-browser by design; "scale" means concurrent independent browser sessions, which is bounded only by the static host.
- Per-browser data growth is bounded by run history; the schema should remain performant with at least 1,000 stored runs per profile and 8 profiles.
- No server, database, or shared infrastructure to scale.

## Usability

- Primary input is a physical desktop keyboard; touch devices are out of scope for v1 and should at minimum display a "best on desktop" hint.
- Copy, motion, and color follow the arcade voice and brand system: Nunito / Fredoka / Quicksand / Bagel Fat One typography and the documented accent palette.
- Motion (confetti, shake-on-error, combo pop) must be user-disableable via Settings to support motion-sensitive users.
- Color is never the sole signal: correct vs error characters differ in both color and background, and heatmap cells expose absolute miss counts via tooltip.
- Formal accessibility conformance target (e.g., WCAG 2.2 AA) is _TBD_.

## Maintainability

- The code is organized as one screen per `screen-*.jsx` module plus shared `components.jsx`, `data.jsx`, `icons.jsx`, and `styles.css`, so a screen can be modified in isolation.
- Content (words, quotes, code snippets, avatar glyphs, achievement definitions) lives in `data.jsx` and is editable without touching engine code.
- The `localStorage` key is versioned (`keyquest.v1`); schema-breaking changes must bump the version and include a migration or reset path.
- The product runs without a build step (React + Babel standalone in the browser); any move to a build pipeline must be captured as an ADR.
- Observability is currently absent (no analytics, no error reporting). Adding an opt-in anonymous ping is an open product question, not yet a requirement.
