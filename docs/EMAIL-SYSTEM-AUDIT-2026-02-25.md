# SSELFIE Email System Audit
**Date:** February 26, 2026 | **Score: 4/10**

---

## THE SINGLE BIGGEST FINDING

**14 of 15 email cron jobs are NOT scheduled in vercel.json.**

Only `win-back-sequence` runs automatically. Every other email sequence — welcome, onboarding, nurture, reengagement, reactivation, upsell, subscription-ending-soon — exists in code but has never run in production. SSELFIE has a completely built email system that is functionally off.

---

## Section 1: Email Trigger Map

### Transactional Emails (via `sendEmail()`)

| Event | Email Type | When It Triggers | Scheduled? |
|-------|-----------|------------------|-----------|
| Free Blueprint Welcome | `blueprint-followup-day-0` | Free blueprint subscriber, within 7 days | ❌ Not scheduled |
| First Gen Followup | `welcome-first-generation-followup` | Generated first image 24-48h ago | ❌ Not scheduled |
| Maya Academy Inactive | `maya-academy-inactive-48h` | Generated image 48-96h ago, no feed posts | ❌ Not scheduled |
| Paid Blueprint Day 1 | `paid-blueprint-day-1` | Paid blueprint purchased 24h ago | ❌ Not scheduled |
| Paid Blueprint Day 3 | `paid-blueprint-day-3` | Paid blueprint purchased 72h ago | ❌ Not scheduled |
| Paid Blueprint Day 7 | `paid-blueprint-day-7` | Paid blueprint purchased 168h ago | ❌ Not scheduled |
| Subscription Ending 7d | `subscription-ending-soon-7` | Subscription ending in 7 days | ❌ Not scheduled |
| Subscription Ending 3d | `subscription-ending-soon-3` | Subscription ending in 3 days | ❌ Not scheduled |
| Subscription Ending 1d | `subscription-ending-soon-1` | Subscription ending in 1 day | ❌ Not scheduled |
| Monthly Usage Recap | `monthly-usage-recap` | Active member, 28+ days old | ❌ Not scheduled |

### Marketing Sequences (via Resend Broadcasts)

| Sequence | Touches | Target | Scheduled? |
|----------|---------|--------|-----------|
| Welcome | Days 0,3,7,14,21,28 | New paid members | ❌ Not scheduled |
| Nurture | Days 1,3,7,10 | Freebie subscribers | ❌ Not scheduled |
| Blueprint Followup | Days 3,7,14 | Blueprint subscribers | ❌ Not scheduled |
| Onboarding | Days 0,2,7 | New Studio members | ❌ Not scheduled |
| Upsell | Days 10,20 | Freebie subscribers | ❌ Not scheduled |
| Re-engagement | Days 0,7,14 | Inactive members | ❌ Not scheduled |
| Reactivation | 8 emails over 25 days | Cold users | ❌ Not scheduled |
| Blueprint Discovery | 5 emails | Non-blueprint subscribers | ❌ Not scheduled |
| Cold Education | Days 1,3,7 | Cold users | ❌ Not scheduled |
| Win-Back | Days 3,7,14 | Cancelled (new 3-touch) | ✅ Scheduled |

---

## Section 2: Template Inventory

**65+ email templates exist.** Categories:
- Welcome (6), Nurture (4), Blueprint (7), Discovery (5), Onboarding (3)
- Reactivation (8), Reengagement (3), Cold Education (3), Upsell (2), Win-Back (4)
- Transactional (10+), Newsletter, Launch, Social Proof, Enhanced Conversion

---

## Section 3: Overlaps & Redundancies

1. **Welcome vs Onboarding**: Both target new paid members on Days 0 and 7 — could double-send
2. **Nurture Day 10 vs Upsell Day 10**: Same audience, same timing — almost certainly a duplicate
3. **Cold Education vs Reactivation**: Both target `cold_users` tag — overlap at Day 7
4. **Unused templates**: Win-back Day 3/7/14, Enhanced Conversion, Social Proof — exist but no cron calls them

---

## Section 4: Health Score

| Category | Score | Notes |
|----------|-------|-------|
| Code Quality | 7/10 | Well-structured, good separation |
| Template Coverage | 8/10 | Comprehensive but some unused |
| Scheduling | 1/10 | **CRITICAL: 14/15 crons unscheduled** |
| Deduplication | 7/10 | Good patterns, some overlaps |
| Error Handling | 6/10 | Good in core, inconsistent in crons |

**Overall: 4/10** — The codebase is well-engineered but effectively non-functional as an email marketing system.
