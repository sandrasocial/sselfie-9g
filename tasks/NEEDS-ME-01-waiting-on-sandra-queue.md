# NEEDS-ME-01 — One "Waiting on you" queue (kill the invisible pileup)

Date: 2026-07-08
Owner: Codex (after VOICE-LOOP-01 / EMPLOYEE-01 — shares the briefing + admin surfaces)
Priority: 3

## Problem

Work that needs Sandra's approval or trigger piles up invisibly across surfaces with zero
notifications: Resend draft broadcasts waiting for a send-yes, flagged IG conversations,
webhook-review items, content pieces awaiting approval, open `codex/` PRs, trial members
needing a concierge DM. Nothing finishes because nothing tells her it's waiting.

## Fix (consolidate, don't add)

### A. Aggregator: `lib/admin/needs-sandra.ts`

One function returning a typed list of open items, each: `kind`, `title`, `count`, `age`,
`link` (deep link to the exact surface), `urgency` (`today` | `this-week`). Sources:

1. **Broadcast drafts awaiting send** — Resend API: broadcasts with status draft created by
   the email engine (name prefix `Story ·` etc.).
2. **Flagged DM conversations** — `ig_conversations` where `status='flagged'` and no admin
   reply after flag time.
3. **Webhook review items** — existing pending `webhook_review` data (same source
   resolve-pending-payments alerts on).
4. **Content awaiting approval** — pieces with approve controls once VOICE-LOOP-01 lands
   (skip gracefully until then).
5. **Open `codex/` PRs** — GitHub API via `GITHUB_TOKEN` env; if the token is absent, omit
   the section (never fake it). Note: per standing approval Claude merges green PRs, so this
   row is informational ("3 PRs in flight") not an ask.
6. **Concierge list** — active members/trials with zero generations in 7+ days (reuse the
   win-back-sequence dormant query), capped at 5 names.

### B. Surfaces (existing ones only — Admin Data Contract rule 5)

- `/admin` home: the existing needs-me section renders this list (data layer:
  `lib/admin/home-report.ts` consumes the aggregator).
- **Daily Sandra Briefing**: a "Waiting on you" block — max 5 items, oldest first, each with
  its deep link. Omitted entirely when empty.
- **Alert-only email** (allowed by contract as exception): when a `today`-urgency item is
  NEW since the last briefing (e.g. fresh flagged DM, fresh broadcast draft), send one short
  alert with the deep link. Reuse the `admin_alert_sent` cooldown table; max one alert per
  item kind per 12h.

### C. Every item must be closable

Each queue item's `link` lands Sandra on a page where ONE tap resolves it (send/dismiss the
broadcast, reply/dismiss the DM, approve/kill the content). If a source has no closing
action, that's a bug in the source — file it, don't ship a dead-end link.

## Acceptance

- Aggregator unit-tested per source incl. empty/absent-token cases.
- Briefing shows "Waiting on you" only when non-empty (test with seeded items).
- Alert email respects cooldown (test).
- No new admin page, no new daily email. Source labels per Admin Data Contract.
- Full suite green before merge.
