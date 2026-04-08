---
title: Admin System Overview
status: active
last_updated: 2026-01-23
owner: Sandra
---

# Admin System Overview

## Purpose
This document defines the intended structure, data sources, and maintenance rules for the SSELFIE Admin system.

## Navigation Structure (6 Sections)
1. **Dashboard**: `/admin`
2. **Email**: `/admin/email-control`
3. **Diagnostics**: `/admin/diagnostics/system`
4. **Content**: `/admin/feed-styles`
5. **Users**: `/admin/credits`
6. **Alex**: `/admin/alex`

## Single Source of Truth
These are the required sources for metrics:
- **Revenue, MRR, Subscriptions**: Stripe API (cached) for active subscription counts + MRR, DB (`stripe_payments`) for total revenue.
- **Email Stats**: DB (`email_logs` and `admin_email_campaigns`).
- **Cron Health**: DB (`admin_cron_runs`).
- **User Counts**: DB (`users`).

## Email Management
Unified in `/admin/email-control`:
- Global kill switch and test mode.
- Test send.
- Scheduled campaigns view.
- Analytics summary.
- Automation sequence list.

Deprecated routes redirect here:
- `/admin/email-analytics`
- `/admin/email-sequences`

## Diagnostics
Unified in `/admin/diagnostics/system`:
- Cron status
- Email status

Deprecated routes redirect here:
- `/admin/health`
- `/admin/prompt-health`
- `/admin/blueprint-health`
- `/admin/cron-health`
- `/admin/webhook-diagnostics`

## Alex Cost Controls
Feature flags:
- `ALEX_ANALYTICS_TOOLS_ENABLED` (default true): Disable analytics tools to reduce token use.
- `ALEX_PROACTIVE_SUGGESTIONS_ENABLED` (default true): Disable proactive suggestions.
- `ALEX_DAILY_TOKEN_LIMIT` (default 1000000): Hard daily token budget.

## Maintenance Rules
1. **No new Admin pages** without a strong reason; merge into existing section if possible.
2. **No duplicate metrics**; use the single source of truth list above.
3. **Alex tools** must be opt-in when costly (analytics + research).
4. **Keep navigation minimal** (6 sections only).
