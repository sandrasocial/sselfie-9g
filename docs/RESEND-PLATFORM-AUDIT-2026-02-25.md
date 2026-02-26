# Resend Platform Audit
**Date:** February 26, 2026 | **Score: 7/10**

---

## How Resend Is Configured

- API Key: `re_AdXwyunq_...` (live key, confirmed in `.env.local`)
- Audience ID: `762d7ab8-7a72-40d1-8f26-9ddfcff52e73`
- From: `SSelfie <hello@sselfie.ai>` (transactional) / `Sandra from SSELFIE <hello@sselfie.ai>` (marketing)
- 37 segment IDs configured (3 missing from .env.local but referenced in code)

---

## How Contact Management Works

Users enter Resend through 4 entry points:
1. Freebie subscription
2. Blueprint subscription
3. Stripe webhook (paid customers)
4. Prompt guide subscription

Each gets tagged with `source`, `status`, `product`, and `journey` tags. Segments are then populated per broadcast send and cleaned up after.

---

## Known Issues

### Critical
1. **Duplicate contact handling fetches entire audience list** — slow and hits rate limits at scale
2. **Suppression list not synced with Resend** — local `email_logs` only; may send to suppressed addresses if webhook missed
3. **3 segment IDs missing** from `.env.local`: `WELCOME_DAY_14`, `WELCOME_DAY_21`, `WELCOME_DAY_28`, `MONTHLY_USAGE_RECAP` — these campaigns will fail silently

### Moderate
4. **Sequential contact sync**: 650ms delay per contact — a batch of 100 users = 65 seconds
5. **No deduplication check before adding to segment** — redundant API calls
6. **Webhook signature verification** may be using wrong header format

---

## Root Cause of the "Mess"

**Resend is a transactional email API.** It was never designed to power automated marketing sequences. The system built on top of it (72 segments, marketing queues, broadcast runner, segment history) is a custom-built marketing automation platform layered on a transactional tool. This is why it feels messy — it is, structurally, the wrong tool for the job.

## Health Score: 7/10

The Resend integration itself is solid. The architecture of using it for sequences is the problem, not the platform configuration.
