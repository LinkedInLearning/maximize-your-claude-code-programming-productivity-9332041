# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This directory is for doing spec driven development

## Structure

`specifications/` contains four documents that together define a project:

- **Functional.md** — Starts with a `## Summary` of what's being built, followed by `## Features`. Each feature is a `###` subsection with a `**Summary:**` line and a `**Verification Criteria:**` bulleted list. When adding a feature, follow this exact shape so verification criteria stay machine-scannable.
- **Non-Functional.md** — Performance, Security, Reliability, Scalability, Usability, Maintainability.
- **Architecture-Decisions.md** — Lightweight ADR log. Each entry: Status / Context / Decision / Consequences. Append new ADRs as `ADR-NNN` rather than rewriting prior ones.
- **Relevant-Standards.md** — Industry standards, internal standards, compliance/regulations.

## Conventions

- Verification criteria in `Functional.md` should describe observable behavior or an acceptance scenario — they're the contract the implementation will be checked against.
- ADRs are append-only. To reverse a prior decision, add a new ADR with status `Superseded` and reference the old one rather than editing it in place.
