# TASK M-10 — Brand Engine Email Broadcast
Priority: URGENT · Send today or tomorrow
Estimated time: 1-2 hours
Context: Sandra has 3,000 email subscribers who have never received
a Brand Engine email. This is a one-time broadcast, not a sequence.
The email infrastructure (Resend, send-newsletter-broadcast.ts,
admin_email_campaigns table) is already built and working.

---

## Goal
Create and send one broadcast email to all 3,000 subscribers
announcing Brand Engine and driving them to apply.

---

## The email

### Subject line (use exactly):
I went to the mountains. Here's what I came back with.

### Preview text:
This is the most honest email I've written all year.

### Body HTML to create:

Use Sandra's existing email template styling.
Font: clean, minimal, mobile-first.
No heavy design — this email should feel like a personal letter.
Sandra's brand colors: #0a0a0a text on #ffffff background.

---

EMAIL BODY (write this in HTML using existing template structure):

---

Hey [first_name] 🤍

Let me be really honest for a second.

I built an app from €12. Learned to code. Grew to 180K followers.
Did it all as a single mom with two boys and my own ADHD to manage.

And I still doubted myself every single day.

In January I hit a wall. Not burnout. More like... I couldn't
celebrate what I'd built because I was already chasing the next thing.

So I took my boys to the mountains.
No wifi. No electricity. No running water.
Just a fireplace, red wine and quiet.

And sitting there I realised — I had been running so hard
I forgot to look at how far I'd come.

Here's the thing. Rewiring your mind is harder than
building the actual thing. Wild, right?

---

This chapter I'm doing things differently.

And I'm ready to help a small group of women do the same.

I'm opening Brand Engine in March — 6 weeks where we build
your entire personal brand together using AI.

Not a course. Not theory. Actually built.

Week by week:
→ Your Brand DNA — story, voice, message, values
→ Your Control Centre — website, tools, everything connected
→ Your AI Director — an agent that thinks and talks like you
→ Your Offer + Funnel — three-tier offers, automations live
→ Your Content System — 30 days batched and ready
→ Your full AI Team — running your brand while you live your life

You leave with everything built and a brand that works
while you're with your kids.

---

Two options:

THE COHORT — €2,497
12 women. Weekly live sessions. Private Telegram.
Starts March 16.

THE VIP — €4,997
Just you and me. Weekly private calls.
Unlimited access between sessions.
Only 2 spots.

---

Small API running costs on top — typically €10–50/month.
I guide you through keeping these minimal.

---

[APPLY NOW BUTTON]
→ Links to: https://sselfie.ai/apply/brand-engine

---

If this isn't for you right now — that's completely okay.
But if something in this email made you feel seen —
that's probably not a coincidence.

Sandra 🤍

---

P.S. Only 12 cohort spots and 2 VIP spots exist.
I'm not doing a big launch. Just telling the people who already know me.

---

### CTA Button:
Text: "Apply for Brand Engine"
URL: https://sselfie.ai/apply/brand-engine
UTM params: utm_source=email&utm_medium=broadcast&utm_campaign=brand-engine-feb-2026

---

## Technical instructions

1. Create campaign in admin_email_campaigns table:
   - campaign_name: 'Brand Engine Launch Broadcast Feb 2026'
   - subject_line: 'I went to the mountains. Here\'s what I came back with.'
   - preview_text: 'This is the most honest email I\'ve written all year.'
   - campaign_type: 'broadcast'
   - status: 'draft'
   - approval_status: 'pending'
   - target_segment: 'all_subscribers' (all 3,000)
   - scheduled_for: NULL (Sandra will approve and trigger manually)

2. Write body_html using existing email template structure
   - Use transactional-sender.ts or existing template as base
   - Mobile-first, minimal styling
   - Personalisation token: [first_name] via Resend

3. Add admin UI trigger button in email campaign dashboard
   - Sandra clicks "Preview" to see email before sending
   - Sandra clicks "Approve + Send" to trigger sendNewsletterBroadcast()
   - Show subscriber count clearly before send: "Sending to ~3,000 subscribers"
   - Require confirmation modal: "Are you sure? This sends to 3,000 people."

4. Track UTM source on apply form
   - utm_campaign=brand-engine-feb-2026 auto-populates source in application

## Out of scope
- Do NOT create an email sequence
- Do NOT modify existing welcome or nurture sequences
- Do NOT send automatically — Sandra must manually approve and trigger

## Acceptance criteria
- [ ] Campaign created in database with correct fields
- [ ] Email HTML renders correctly on mobile
- [ ] First name personalisation working
- [ ] CTA button links to apply form with UTM params
- [ ] Preview visible in admin dashboard
- [ ] Approve + Send button triggers sendNewsletterBroadcast()
- [ ] Confirmation modal shows subscriber count before send
- [ ] Sandra can preview before approving
