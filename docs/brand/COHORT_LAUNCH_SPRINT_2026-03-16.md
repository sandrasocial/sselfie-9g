# Cohort Launch Sprint (7 Days)

## Campaign setup

- Offer: Cohort (first launch priority)
- Cohort start date: 2026-03-16
- Seat cap: 12
- Calls target: 3 per day
- Single CTA on all channels: **Apply for Cohort** (`/apply/brand-engine`)
- Operating mode: Draft-only for outbound copy

## Daily operating loop

1. Publish the daily IG CTA touchpoint(s) that point only to `/apply/brand-engine`.
2. Send one daily email CTA to the 3k list (single link to `/apply/brand-engine`).
3. Open `/admin/brand-engine-applications` and work this order:
   - `qualified_queue`
   - `contacted`
   - `call_booked`
   - `offer_sent`
   - `closed_won`
4. Book/confirm 3 calls minimum for the day.
5. Move every outcome to the next stage before end-of-day.
6. Log `cash_collected` immediately for every closed-won lead.
7. Review daily launch digest and adjust next day focus.

## 7-day channel structure (single CTA)

### Day 1
- IG: launch announcement + authority proof + apply CTA
- Email: launch email + apply CTA

### Day 2
- IG: objection handling + apply CTA
- Email: case insight + apply CTA

### Day 3
- IG: behind-the-scenes + process + apply CTA
- Email: framework education + apply CTA

### Day 4
- IG: FAQ + urgency reminder + apply CTA
- Email: FAQ + apply CTA

### Day 5
- IG: social proof + apply CTA
- Email: transformation angle + apply CTA

### Day 6
- IG: seat scarcity + deadline reminder + apply CTA
- Email: seats update + apply CTA

### Day 7
- IG: final call + deadline + apply CTA
- Email: final call + apply CTA

## KPIs to track daily

- Applications (24h)
- Calls booked (24h and today)
- Offers sent (24h)
- Closes won (24h and total)
- Cash collected (24h and total)
- Seats filled / remaining
- Pace needed per day to fill by 2026-03-16

## Reporting and automation

- Vercel cron: `/api/cron/brand-engine-launch-digest` (daily)
- Vercel cron: `/api/cron/arpu-churn-weekly` (weekly)
- Vercel cron: `/api/cron/cohort-delivery-load-weekly` (weekly)
- Output report (local automation): `output/automation/brand-engine-launch-digest-YYYY-MM-DD.md`
- Output report (local automation): `output/automation/arpu-churn-weekly-YYYY-MM-DD.md`
- Output report (local automation): `output/automation/cohort-delivery-load-YYYY-MM-DD.md`
- Admin command center: `/admin/brand-engine-applications`
