# NEEDS-ME-01 — One "Waiting on you" queue (kill the invisible pileup)

Date: 2026-07-08
Completed: 2026-07-10 (final scope below)
Owner: Codex (after VOICE-LOOP-01 / EMPLOYEE-01 — shares the briefing + admin surfaces)
Priority: 3

## Problem

Work that needs Sandra's approval or trigger piles up invisibly across surfaces with zero
notifications: Resend draft broadcasts waiting for a send-yes, flagged IG conversations,
webhook-review items, content pieces awaiting approval, open `codex/` PRs, trial members
needing a concierge DM. Nothing finishes because nothing tells her it's waiting.

## Final scope (consolidate, don't add)

The original draft below was narrowed after Sandra's operating feedback: extra alert emails created
more noise, GitHub PR approval is no longer part of the delivery model, and a dead-end list was less
useful than actions she can actually finish. The shipped system therefore uses the existing daily
briefing and admin home, with secure completion links only for actions that are safe to finish there.

### A. Durable action queue

`admin_action_queue` stores signed, expiring, idempotent actions. Sources:

1. **Broadcast drafts awaiting send** — Resend API: broadcasts with status draft created by
   the email engine (name prefix `Story ·` etc.).
2. **Flagged DM conversations** — `ig_conversations` where `status='flagged'` and no admin
   reply after flag time.
3. Payment, support, health, and concierge context continues to use the existing admin-home and
   briefing links. It is not turned into an executable bearer-link action.
4. GitHub PR items are excluded under Sandra's no-PR direction.

### B. Surfaces (existing ones only — Admin Data Contract rule 5)

- `/admin` home: the existing needs-me section renders this list (data layer:
  `lib/admin/home-report.ts` consumes the aggregator).
- **Daily Sandra Briefing**: a "Waiting on you" block — max 5 items, oldest first, each with
  its deep link. Omitted entirely when empty.
- No separate alert email. The daily briefing is the single approval inbox and is omitted when empty.

### C. Every item must be closable

Each approval link opens a read-only confirmation page. Opening the link never sends. A deliberate
POST sends/dismisses the item, with an atomic database claim preventing duplicate execution. DM text
is editable before approval. Failed actions remain visible instead of silently retrying.

## Acceptance

- Signed-token creation, tamper rejection, expiry, and conditional briefing rendering covered locally;
  existing DM-send policy and Resend broadcast-send tests remain green.
- Briefing shows "Waiting on you" only when non-empty (test with seeded items).
- No new admin page, no new daily email. Source labels per Admin Data Contract.
- Existing `/admin` home renders ready approval links.
- Focused tests, targeted lint, repo invariants, and production build green before direct-to-main deploy.
  Repo-wide type-check has unrelated pre-existing failures in concierge/feed/content-kit and archived
  email-template files; this task does not broaden into those active cleanup areas.
