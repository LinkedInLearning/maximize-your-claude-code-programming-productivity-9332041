# Relevant Standards

Standards, specifications, and conventions this project must adhere to or interoperate with.

## Industry Standards

- **WPM convention** — Words-per-minute is computed as `(correct_chars / 5) / (elapsed_seconds / 60)`, the long-standing five-character "word" convention used by typing tests including Monkeytype and 10fastfingers.
- **Web Storage API** — `localStorage` is used per the WHATWG HTML Living Standard, including the ~5 MB origin quota assumption.
- **ECMAScript / React** — Code targets ES2020+ syntax transpiled by Babel Standalone; UI uses React 18.x component conventions (function components, hooks).
- **QWERTY layout** — The key heatmap renders the US QWERTY layout as its baseline visual; alternate layouts (Dvorak, Colemak) are not modeled in v1.

## Internal Standards

- **Brand system** — Fonts: Nunito (UI), Fredoka & Quicksand (alt), Bagel Fat One (display). Accent palette: `#FF5F8A` coral, `#4FB8E0` sky, `#B69CFF` lavender, `#4DD9A1` mint, `#FFCC2E` sun. Voice is playful arcade; emoji are permitted in product copy.
- **Motion vocabulary** — Bounce (PB trophy), Wiggle (achievement icon), Pop (combo / new cards), Shake (errors, opt-out), Caret blink, Confetti fall.
- **File layout** — One screen per `screen-*.jsx` module; shared UI in `components.jsx`; all content in `data.jsx`; icons in `icons.jsx`; styles in `styles.css`.
- **Storage key versioning** — `localStorage` key is namespaced and versioned (`keyquest.v1`); schema-breaking changes require a version bump and a new ADR.

## Compliance & Regulations

- **Privacy** — No PII is collected, transmitted, or stored server-side; all profile data is local to the user's browser. This keeps the product out of scope for GDPR/CCPA data-controller obligations in v1. Any future addition of analytics pings or cloud sync would re-open this analysis.
- **Accessibility** — Formal WCAG 2.2 conformance level is _TBD_. Current commitments: motion is user-disableable, color is never the sole signal, and tooltips expose numeric values behind heatmap color.
- **Children's privacy (COPPA, age-appropriate design)** — The Arcade Kid persona spans ages 8–14. Because no data leaves the device, COPPA's data-collection triggers are not invoked in v1; this must be revisited before adding any network telemetry or accounts.
