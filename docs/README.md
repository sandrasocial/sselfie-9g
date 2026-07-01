# SSELFIE Docs Index

This folder contains current operating docs, product history, audits, and archived planning notes.

Use this file to avoid treating old strategy drafts as current truth.

## Read First

Current operating docs:

- `../AS-BUILT.md` — verified repo facts and live app stack.
- `../CLAUDE.md` — live business context, admin data contract, and current priorities.
- `CODEX_CONTEXT.md` — implementation context and file map.
- `brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md` — current voice, audience, story, expertise, and product positioning.
- `SSELFIE_DESIGN_SYSTEM.md` — current product, page, and email design authority.

## Brand And Copy

Current:

- `brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
- `brand/source/2026-06-27/SSELFIE_VOICE_STYLE_GUIDE.md`
- `brand/source/2026-06-27/SSELFIE_TARGET_AUDIENCE_PERSONA.md`
- `brand/source/2026-06-27/SSELFIE_REWRITTEN_STORY_BANK.md`
- `brand/source/2026-06-27/SANDRA_EXPERTISE.md`

Historical or superseded copy docs should not be used as active guidance.

## Design

Current:

- `SSELFIE_DESIGN_SYSTEM.md`
- `brand/DESIGN_SYSTEM.md` — compatibility pointer to the current design system.

Historical:

- `archive/legacy-design-systems/`

## Product And Funnel

Current context depends on the surface:

- Prompt Vault funnel: `funnel/AI_PROMPT_FUNNEL_RESEARCH_AND_LADDER_2026-05-26.md`
- No-fake buyer psychology: `funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md`
- Prompt Vault collection SOP: `PROMPT_VAULT_ADD_COLLECTION_SOP.md`
- Business and revenue audits: `business/`
- Current live app architecture: `CLAUDE.md`, `CODEX_CONTEXT.md`, and code under `app/app/`

Treat older funnel plans as historical unless `CLAUDE.md` still references them as active.

## Audits And Reports

Audit reports live in:

- `audits/`
- `business/`
- `output/automation/` at repo root

They are evidence and history. They are not automatically current strategy.

## Email

Email drafts and audits live in:

- `email/`

Production email templates live in:

- `../lib/email/templates/`

Never send or schedule emails from a doc alone. Sandra approval is required.

## Cleanup Rule

If a doc:

- says it is the source of truth but is older than the current source docs,
- contains old Studio, AI-headshot, or prompt-marketplace positioning,
- tells agents to use `VOICE_BIBLE.md` as the active voice source,
- contradicts `CLAUDE.md`, `CODEX_CONTEXT.md`, or `brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`,

then either delete it, move it to an archive, or add an explicit superseded warning.
