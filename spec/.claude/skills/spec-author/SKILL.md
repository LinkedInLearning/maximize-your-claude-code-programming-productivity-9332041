---
name: spec-author
description: Author or update the four-file project specification (Functional, Non-Functional, Architecture-Decisions, Relevant-Standards) from a PRD, raw thoughts, or interactive interview. Use this skill whenever the user wants to draft a spec, turn a PRD into a spec, fill out or populate `specifications/`, structure loose requirements, or add a new feature/ADR to an existing spec — even if they don't say "spec-author" explicitly. The skill enforces the repo's required headings, asks targeted questions to fill gaps, and pauses to resolve contradictions before writing.
---

# spec-author

Turn a PRD or raw thoughts into the four canonical spec files in `specifications/`, following this repo's `CLAUDE.md` conventions exactly.

## When to invoke

Trigger on any of:
- "draft a spec", "write the spec", "create a spec from this PRD"
- "fill out specifications/", "populate the spec files"
- "structure these requirements", "turn these notes into a spec"
- "add a feature/ADR to the spec"

## Inputs

The skill accepts (any combination, all optional):
1. **A file path** to a PRD or notes doc → Read it first.
2. **Inline thoughts** pasted into the slash command args → treat as raw source material.
3. **Nothing** → go straight to the interview.

If the user gave both a file and inline text, treat them as additive sources.

## Canonical shape (load before writing)

Before writing anything, Read all four templates from this skill's own folder so the output matches the exact required shape:

- `references/Functional.md`
- `references/Non-Functional.md`
- `references/Architecture-Decisions.md`
- `references/Relevant-Standards.md`

These mirror what `CLAUDE.md` requires:

- **Functional.md** — `## Summary` then `## Features`. Each feature is `### <Name>` with a `**Summary:**` line and a `**Verification Criteria:**` bulleted list of observable behavior / acceptance scenarios. Keep this shape — verification criteria must stay machine-scannable.
- **Non-Functional.md** — six fixed `##` sections: Performance, Security, Reliability, Scalability, Usability, Maintainability.
- **Architecture-Decisions.md** — append-only `ADR-NNN` entries (`ADR-001`, `ADR-002`, …) each with `**Status:**`, `**Context:**`, `**Decision:**`, `**Consequences:**`. Never edit a prior ADR; supersede it with a new one.
- **Relevant-Standards.md** — three `##` sections: Industry Standards, Internal Standards, Compliance & Regulations.

## Workflow

### 1. Read sources
- If a PRD path was given, Read it.
- Read the four `references/*.md` templates.
- Read the current `specifications/*.md` to know whether you're starting fresh or extending an existing spec (especially the highest existing `ADR-NNN` number).

### 2. Interview to fill gaps
Use `AskUserQuestion` to fill what the source material doesn't cover. Group questions by file (max 4 per call) to minimize round-trips. Probe for:

- **Functional**: product summary (what / who / why), feature list, and for each feature its verification criteria (observable behavior, edge cases, acceptance scenario).
- **Non-Functional**: latency/throughput targets, auth model, threat model, availability target, scale assumptions, accessibility level, observability requirements.
- **Architecture Decisions**: significant choices the user has already made (framework, datastore, sync vs async, deployment model) — each becomes an ADR.
- **Relevant Standards**: industry specs (RFCs, OAuth, OpenAPI), internal style guides, compliance regimes (GDPR, SOC 2, HIPAA, WCAG).

Skip questions for sections the user has already explicitly addressed. If the user defers a question, mark the section `_TBD_` rather than inventing content.

### 3. Detect and resolve contradictions
After gathering material but **before writing**, scan everything for contradictions. Examples:

- NFR targets that conflict (e.g., `<50ms p99` vs a feature that requires a synchronous third-party API call).
- A verification criterion that contradicts an ADR (e.g., feature requires offline mode, ADR mandates server-side rendering only).
- Standards/compliance vs NFRs (e.g., "store no PII" vs "retain user email 90 days").
- ADRs that contradict the functional summary.
- Two features whose verification criteria conflict.

For **each** contradiction found, immediately call `AskUserQuestion` with:
- The two conflicting statements quoted verbatim.
- 2–4 concrete resolution options (relax one side, drop the constraint, defer to `_TBD_`, etc.).

Resolve every contradiction before proceeding to the write phase.

### 4. Write the four files
Overwrite `specifications/Functional.md`, `Non-Functional.md`, `Architecture-Decisions.md`, `Relevant-Standards.md`.

Rules:
- Preserve the required headings exactly — `## Summary`, `## Features`, `### <Feature>`, `**Summary:**`, `**Verification Criteria:**`, the six NFR sections, the three standards sections.
- Every `### Feature` must have both `**Summary:**` and a non-empty `**Verification Criteria:**` bulleted list. No exceptions — if criteria are unknown, ask first.
- Verification criteria describe observable behavior or acceptance scenarios, never implementation details.
- ADRs are append-only. If extending an existing spec, continue numbering from the highest existing `ADR-NNN`. To reverse a prior decision, add a new ADR with `**Status:** Superseded` referencing the old one's number — never rewrite it.
- Mark genuinely unknown sections `_TBD_` rather than fabricating.

### 5. Summarize
After writing, print a short report:
- Which files were written / updated.
- How many features, ADRs, and standards entries were captured.
- Any `_TBD_` sections the user still needs to fill.
- Any contradictions that were resolved, and how.

## Notes

- This skill is conversational, not script-driven. Do not write helper scripts.
- The `references/` copies are the authoritative shape — if the live `specifications/` templates drift, prefer the references.
- Stay terse in chat. The deliverable is the four spec files, not a wall of explanation.
