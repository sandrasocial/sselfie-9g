# SSELFIE Higher Self Operating System

Last updated: 2026-07-07

Status: **SUPERSEDED ROUTING CONTRACT 2026-07-16 — HISTORICAL EVIDENCE ONLY**

The Admin Command Center remains active, but its current money, content, and offer decisions are
controlled by `docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`. Do not restore automatic public
Work With Me routing from the history below.

Use with:

- `docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md`
- `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
- `docs/business/SSELFIE_FORWARD_REVENUE_PLAN_2026-07-01.md`
- `docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md` (current authority)

## Purpose

This system exists to stop Sandra from disappearing into more building when the business needs visible story, warm conversations, and clear offer movement.

The business is organized around one path:

Photo -> visibility -> story -> trust -> offer -> income.

The daily system should answer:

1. What is today's money move?
2. What story should Sandra tell?
3. What offer bridge fits the audience temperature?
4. Which warm conversations need follow-up?
5. What is the one system improvement that makes tomorrow easier?

## Daily CEO Rule

Do the money move before opening a new build thread.

One story.

One offer bridge.

One follow-up loop.

One system improvement.

## Decision Order

The admin Command Center chooses the first move in this order:

1. Payment/webhook review if money truth or fulfillment may be at risk.
2. Work With Me / Visibility To Paid follow-up if warm leads are already open.
3. Warm story and WORK reply invitation if payments have been quiet for 48 hours.
4. Checkout bridge repair if a funnel has starts but no purchases.
5. A visible offer bridge if the business is otherwise stable.

## Offer Temperature Rules

Cold attention:

- Feed reels, tutorials, AI prompt demos, selfie examples.
- Bridge to the Kit, Prompt Vault, or the right low-ticket door.
- Goal: simple visible result and buyer bridge.

Warm trust:

- Stories, DMs, email, audience replies, Sandra's real life and beliefs.
- Bridge to Visibility To Paid / Work With Me.
- Goal: conversation, application, higher-value sale.

Paid activation:

- SUITE members, trials, buyers, and post-purchase paths.
- Bridge to first output, repeatable creation, retention, and monthly rhythm.
- Goal: keep the woman creating.

## What The System Must Not Do

- Do not tell Sandra to build more before the money move is done.
- Do not push warm Story viewers into another low-ticket offer when the real need is Visibility To Paid.
- Do not treat all traffic as the same buyer.
- Do not let a quiet sales day become a full business rewrite.
- Do not turn Sandra's story into generic motivation.

## Current Implementation

Data layer:

- `lib/admin/higher-self-command-center.ts`
- `lib/admin/home-report.ts`

Admin surface:

- `/admin`
- `app/admin/page.tsx`

Tests:

- `tests/higher-self-command-center.test.ts`

The Command Center is deliberately deterministic. It does not invent strategy with an LLM. It reads the existing admin truth and applies the locked decision order above.
