# Win-Back Email Sequence — 2026-02-26

**Status:** Templates written. Awaiting Sandra approval before wiring triggers.  
**Audience:** Cancelled Studio subscribers (24 known as of 2026-02-26)  
**Templates:** `lib/email/templates/win-back-day3.ts`, `win-back-day7.ts`, `win-back-day14.ts`  
**Email provider:** Resend (existing infrastructure via `lib/email/send-email.ts`)

---

## Why This Sequence Exists

SSELFIE dropped from 50 → 17 active Studio members. 24 people cancelled. These are warm — they paid, they tried, they left. That means something didn't land. This sequence re-engages them honestly, finds out what didn't work, shows them what's changed, and leaves the door open with no pressure.

---

## Email 1 — Day 3 After Cancellation

**Subject:** Something I want to say  
**File:** `lib/email/templates/win-back-day3.ts`  
**emailType:** `win-back-day3`

**Angle:** Honest check-in. Sandra speaking directly, not a marketing team. Acknowledge the cancellation openly. Ask one genuine question: what didn't work? Invite a real reply. Soft CTA to rejoin sits at the bottom, framed as "if there's any part of you that's still curious."

**Full body copy:**

> Hey [Name],
>
> I noticed you cancelled your Studio membership a few days ago.
>
> Honestly? I think I know why — and it's on me, not you.
>
> I've been building and updating and adding things non-stop. And somewhere along the way, SSELFIE got confusing. Features kept changing. The path to actually doing anything wasn't clear. I made it harder than it should have been.
>
> That's not on you for leaving. That's on me for not making it simple enough to stay.
>
> I do have one question — not to pitch you, just because I'm still building this and I want to get it right: **What was the moment it stopped working?**
>
> Was it the onboarding? Too slow to see results? Not sure what to do next? Life just got in the way?
>
> If you reply to this email, I will read it. Not a bot, not a team — me.
>
> And if you're curious what's changed — it's a lot. But I'll save that for another day. For now, I just wanted to say: I get it. No hard feelings. You didn't do anything wrong.
>
> [Come back and start fresh →]
>
> XoXo Sandra

**Voice Bible score (self-assessed):**
- Voice match: 5 — Warm, direct, personal, "me not a bot"
- Clarity: 5 — One question, one CTA
- Emotional truth: 5 — Acknowledges real disappointment without blame
- Action clarity: 4 — Primary ask is a reply; rejoin link is secondary
- Offer fit: 4 — No offer yet, appropriate for Day 3
- **Average: 4.6 / 5 ✅**

---

## Email 2 — Day 7 After Cancellation

**Subject:** This is different now  
**File:** `lib/email/templates/win-back-day7.ts`  
**emailType:** `win-back-day7`

**Angle:** Lead with 3 specific things that changed since they left. Each framed as "you get X without having to Y." Not a feature list — outcome language. CTA: Come back and try it free (7-day free trial restart via promo code, or credit bonus).

**Full body copy:**

> Hey [Name],
>
> A few things have changed since you left.
>
> I'm not saying that to pitch you. I'm saying it because I know one of the hardest things about signing up for something new is not knowing if it'll actually work for you. And some of what made it harder — I've fixed.
>
> **Getting started**
> You now get your first brand photo in under 2 minutes — without having to read a tutorial or figure out settings first.
>
> **Maya, your AI stylist**
> Maya now remembers your sessions — so you don't have to re-explain your style every time. She gets better the more you use her.
>
> **The welcome flow**
> No more guessing what to do next. The new onboarding walks you step by step — one action, one result, done.
>
> These aren't feature updates for the sake of it. They're the exact things I know got in the way.
>
> So I want to make it easy: come back and try it free. Use code **[OFFERCODE]** at checkout for a 7-day free restart — no charge until you decide to stay.
>
> [Come back and try it free →]
>
> If you've already moved on, I completely understand. But if there's still a part of you that wants consistent, beautiful content that actually looks and sounds like you — this is the moment.
>
> XoXo Sandra

**Voice Bible score (self-assessed):**
- Voice match: 5 — Specific, grounded, no hype
- Clarity: 5 — Three clear changes + one CTA
- Emotional truth: 4 — "The exact things I know got in the way" is honest
- Action clarity: 5 — Free trial restart, single button
- Offer fit: 5 — Right level of incentive for Day 7
- **Average: 4.8 / 5 ✅**

---

## Email 3 — Day 14 After Cancellation

**Subject:** Last one, I promise  
**File:** `lib/email/templates/win-back-day14.ts`  
**emailType:** `win-back-day14`

**Angle:** Honest, warm, no pressure close. Acknowledge this is the last touchpoint. Name what SSELFIE specifically does for her. "Door is always open." Seed the future — if she's not ready now, she will be.

**Full body copy:**

> Hey [Name],
>
> Last one, I promise.
>
> I've sent two emails already, and I don't want to be the person in your inbox who won't take the hint. So this is it from me.
>
> But before I go, I want to say something honestly.
>
> SSELFIE is built for the woman who wants to show up consistently online — without it taking over her week. She wants her Instagram to look like her. She wants content that doesn't feel forced. She wants to be the face of her brand without dreading every photoshoot.
>
> That's what it does. One selfie, and you have a week of content ready. Real photos, real you — not a stock image, not an AI that looks like a stranger.
>
> If that's still something you want, and the timing just hasn't been right — I get it. Completely.
>
> **When you're ready, here's what's waiting:**
> - Brand photos that actually look like you — on Instagram, Reels, anywhere
> - A system that keeps you consistent without burning you out
> - Maya, who gets your style and makes every session faster
> - Me, building this with you, not just for you
>
> The door is always open. There's no deadline, no lost discount, no awkward re-join form. Just click whenever the moment feels right.
>
> I hope to see you back in there one day.
>
> [Come back whenever you're ready →]
>
> XoXo Sandra

**Voice Bible score (self-assessed):**
- Voice match: 5 — Warm, personal, honest, not pushy
- Clarity: 5 — Clear list of outcomes, one CTA
- Emotional truth: 5 — "Seed the future" close is genuine, not manipulative
- Action clarity: 4 — Soft CTA appropriate for final touch
- Offer fit: 4 — No new offer needed; opens the door, not a discount push
- **Average: 4.6 / 5 ✅**

---

## Trigger Logic

### When each email fires

| Email       | Trigger                               | Condition                                         |
|-------------|---------------------------------------|--------------------------------------------------|
| Day 3       | 3 days after `subscription.canceled` | Not already in payment-recovery or reactivation sequences |
| Day 7       | 7 days after `subscription.canceled` | Day 3 sent, not converted, not unsubscribed      |
| Day 14      | 14 days after `subscription.canceled`| Day 7 sent, not converted, not unsubscribed      |

### How to track

Add a `cancellation_date` column (or use `updated_at` when `status = 'canceled'`) on the `subscriptions` table. The scheduler queries:

```sql
SELECT s.user_id, u.email, u.display_name, s.canceled_at
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE s.status = 'canceled'
  AND s.canceled_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM email_logs el
    WHERE el.user_email = u.email
      AND el.email_type = 'win-back-day3'  -- swap per email
  )
  AND s.canceled_at <= NOW() - INTERVAL '3 days'  -- swap per email
```

Use `email_logs` (existing table) to track sends by `emailType` and prevent duplicates. The suppression check in `send-email.ts` handles bounces and complaints automatically.

---

## Resend Setup Checklist

1. **Create audience segment:** "Cancelled Studio Members" — filter by `subscriptions.status = 'canceled'`.
2. **No Broadcasts needed** for this sequence. Sends are triggered per-user via `sendEmail()` from the scheduler, not batch.
3. **Promo code for Email 2:** Create a Stripe coupon for a 7-day free trial extension (or a fixed credit amount). Add the code to the environment as `WIN_BACK_OFFER_CODE` and pass it as `offerCode` when calling `generateWinBackDay7Email`.
4. **Unsubscribe handling:** The `{{{RESEND_UNSUBSCRIBE_URL}}}` placeholder in all three templates is handled automatically by Resend. No additional setup needed.
5. **Test mode:** Use `EMAIL_DRY_RUN=true` or the existing test-mode whitelist in `lib/email/email-control.ts` for staging runs.

---

## Webhook Change Required

**File:** `app/api/webhooks/stripe/route.ts`  
**Event:** `customer.subscription.deleted`  
**Current state:** Updates `subscriptions.status = 'canceled'` and notifies North. No email trigger.

**What to add** (after Sandra approves the copy):

1. Record `canceled_at = NOW()` on the `subscriptions` row (or add a `win_back_queue` table).
2. Call the scheduler or enqueue a background job that will send the 3 win-back emails at Day 3, Day 7, and Day 14.
3. Guard with: do not enqueue if the subscriber is already in an active payment-recovery sequence (`email_type = 'payment-recovery'` sent in last 30 days).

The comment marking this spot is already in the route handler at the `customer.subscription.deleted` case.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/email/templates/win-back-day3.ts` | New — Day 3 "honest check-in" template |
| `lib/email/templates/win-back-day7.ts` | New — Day 7 "thing that changed" template |
| `lib/email/templates/win-back-day14.ts` | New — Day 14 "last ask" template |
| `app/api/webhooks/stripe/route.ts` | Comment added at `customer.subscription.deleted` |
| `docs/WIN-BACK-SEQUENCE-2026-02-26.md` | This brief |

---

## Next Steps (Sandra to approve)

1. Read and approve the 3 email bodies above.
2. Confirm whether Email 2 should use a free-trial-restart promo code or a credit bonus — and create the Stripe coupon / add credits in the app logic.
3. Approve the webhook change so the trigger can be wired.
4. Decide: Vercel Cron vs. Resend Broadcasts with `scheduled_at` for the scheduler.
5. Backfill: manually send Email 1 to the 24 cancelled members who have already left (since the trigger wasn't live when they cancelled).
