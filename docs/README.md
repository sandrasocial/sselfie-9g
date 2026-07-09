# SSELFIE Documentation Index

Last verified: 2026-07-09

This index separates current operating truth from research, audits, implementation history, and
archives. A document being detailed does not make it current.

## Read First

Use this order:

1. `../AS-BUILT.md` — repository, hosting, and live-stack facts.
2. `../CLAUDE.md` — business state, admin data contract, and priorities.
3. `CODEX_CONTEXT.md` — compact technical context and file map.
4. `../tasks/README.md` — active, completed, and held implementation work.

## Current Brand And Business Contracts

- `brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md` — voice, audience, story, expertise, and
  positioning.
- `brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md` — purpose, category, founder-led message,
  and drift prevention.
- `business/SSELFIE_HIGHER_SELF_OPERATING_SYSTEM_2026-07-07.md` — daily CEO focus and offer
  routing.
- `business/SSELFIE_FORWARD_REVENUE_PLAN_2026-07-01.md` — current revenue direction.
- `funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md` — recognizable, still-you AI doctrine.

The supporting brand source files live in `brand/source/2026-06-27/`.

## Current Product And Operations Contracts

- `SSELFIE_DESIGN_SYSTEM.md` — product, public-page, and email design authority.
- `product/SUITE_MAYA_SINGLE_OWNER_UX_2026-07-06.md` — Maya-owned creation workflow.
- `AUTOMATION_ROSTER.md` — the only cross-layer automation map.
- `PROMPT_VAULT_ADD_COLLECTION_SOP.md` — collection publishing procedure.
- `MAYA_RELIABILITY_PROGRAM_2026-03-11.md` — legacy Maya compatibility guardrails only; `/app`
  behavior is controlled by the current SUITE product contract and code.

## Research, Audits, And Plans

These folders contain evidence and proposals. They do not automatically override the current
contracts above:

- `audits/`
- `business/`
- `funnel/`
- `research/`
- `strategy/`
- `academy/`

Before implementing from a plan, confirm that `CLAUDE.md` or `tasks/README.md` still names it as
active and verify its assumptions against current code.

## Email

Production templates and send logic live in `../lib/email/` and `../lib/resend/`. Historical email
drafts and audits are archived. A Markdown draft never authorizes a send.

## Archive

`archive/` contains historical plans, drafts, audits, and retired operating systems. Archived files
may intentionally contain old routes, metrics, models, product names, and agent instructions.

Do not revive an archived document directly. If a real gap remains, write a current task or contract
that references the historical evidence and the live code.

## Cleanup Rule

Archive or correct a document when it:

- claims current authority but is superseded by a newer protected contract;
- points agents at missing directories, retired tools, or inactive automations;
- uses pre-cutover `/studio` behavior as the definition of the live `/app`;
- presents old metrics, prices, models, or funnels as live truth;
- duplicates an operating map already owned by `CLAUDE.md`, `CODEX_CONTEXT.md`,
  `AUTOMATION_ROSTER.md`, or `tasks/README.md`.
