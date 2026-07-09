# SUITE Month-One Habit System — Email Drafts
*Drafted 2026-06-10 — Sandra must approve every word before anything is built or sent.*
*Voice: texting a close friend. Doctrine: docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md.*

Why this system exists (the data): average member lifetime is ~102 days with cancellations
clustered at month 3; 4 of 8 current members have never generated a single image; every active
member sits on 600-1,650 unused credits. Churn is a habit problem, not a price problem. These
three emails are the habit engine: get to the first win in 48 hours, then a weekly reason to
come back.

---

## 1. The rescue email (one-time, to the 4 members who never generated)
*Sent personally from Sandra, plain style, reply-to her. Not automated.*

**Subject:** your membership (I noticed something)

Hi {firstName},

I was going through SSELFIE accounts today and noticed you haven't made your first photos yet.

You've been a member for a while, so you have {credits} credits just sitting there. Each one is a photo. I don't want you paying for something you're not using.

So here's what I'd love to do: if you send me one selfie (just reply to this email, window light, face visible, nothing fancy), I'll personally set up your first brand shoot and send the photos back to you this week.

And if the timing isn't right for you, tell me that too. I'll take care of you either way.

Sandra x

---

## 2. First-shoot onboarding (Day 0, right after joining — replaces the generic welcome)

**Subject:** your first brand shoot (5 minutes, one selfie)

Hi {firstName},

Welcome in. I'm so glad you're here.

Before anything else, let's get your first photos done today. It takes about 5 minutes:

1. Take one selfie by a window. Face visible, soft light. Don't overthink it.
2. Open your studio: {studioUrl}
3. Upload the selfie, pick the look that feels most like you, and hit create.

That's it. Maya keeps your face, your age, your features. The photos will look like you, because they're made from you.

The first time you see yourself in a real brand shoot is the moment this clicks. Go get it.

Sandra x

P.S. Stuck anywhere? Just reply. A real person answers.

**Follow-up at +48h, ONLY if no image generated yet:**

**Subject:** still here when you're ready

Hi {firstName},

Quick nudge, with love: your first brand shoot is still waiting.

Most members tell me the same thing: they put it off because they don't have a "good enough" selfie. You don't need one. You need a window and 30 seconds.

{studioUrl}

One selfie. Three directions. Pick your favorite. Done before your coffee's cold.

Sandra x

---

## 3. The weekly drop (every Monday, the habit anchor)
*Template — the look rotates weekly, ideally matched to her recent activity or the newest Vault collection.*

**Subject:** this week's shoot is ready

Hi {firstName},

Your week of content starts here. This week's look: **{lookName}**.

{lookOneLiner — e.g. "Camel coat, London morning, coffee in hand. Quiet luxury energy."}

Open your studio and Maya will pull three directions in this look for you: {studioUrl}

One photo today is enough. Post it, and you're ahead of most people who are still overthinking.

Sandra x

P.S. You have {credits} credits ready. They're there to be used.

---

## Build plan (after copy approval)

1. Rescue email: manual send by Sandra (4 people) or one-off script with her go-ahead. No cron.
2. Day-0 onboarding: hook into membership welcome flow (replaces/augments current welcome).
   +48h follow-up: cron checks `ai_images` count for new members, sends only if zero.
3. Weekly drop: new cron (Mondays, members only), env-gated `SUITE_WEEKLY_DROP_ENABLED=true`,
   look rotation from the Vault collections list, logged to email_logs with its own email_type.
4. Exit ramp (separate decision): pause-instead-of-cancel option + annual offer at month 2.
