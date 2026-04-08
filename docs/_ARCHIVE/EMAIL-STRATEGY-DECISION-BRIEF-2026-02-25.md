# Email Marketing Strategy — Decision Brief
**For Sandra | February 26, 2026**

---

## The 30-Second Summary

Your email system has been broken since it was built — not because of bad code, but because:

1. **The tool is wrong for the job.** Resend is a transactional API. It's what you use to send receipts and password resets. Every "sequence" and "broadcast" your system tries to run is a workaround on top of a tool that was never designed for that.

2. **Almost nothing is actually running.** 14 of 15 email cron jobs are not scheduled. Your welcome sequence, onboarding, nurture, reengagement, reactivation, subscription reminders — none of them have ever fired automatically in production. The only email sequence running is the win-back we just wired.

3. **You have 65+ templates and almost none of your users have seen them.** All that copy, all those sequences — sitting in files, never sent.

---

## What the Agents Found

### Codebase Audit (Score: 4/10)
- 65+ email templates built
- 14 cron jobs exist but are not scheduled
- Overlapping sequences that could double-send to the same user
- No monitoring — impossible to know what's working

### Resend Audit (Score: 7/10)
- The Resend configuration is technically solid
- But 3 segment IDs are missing (welcome Day 14/21/28 campaigns will fail)
- Duplicate contact sync is slow and inefficient
- Root cause: **Resend was never designed to run sequences**

### Market Research (2026)
- **Loops** ($49/month): Purpose-built for SaaS. Handles transactional + marketing in one platform. Notion-style editor Sandra can manage without dev help. Unlimited transactional on paid plan. First-class Next.js SDK. ~15-25 hours to migrate.
- **Customer.io** (startup program — potentially free): More powerful but significantly more complex. Better for when SSELFIE is at 2,000+ users and needs multi-channel behavioral automation.
- **Klaviyo, ActiveCampaign, Mailchimp**: Overkill for current scale. E-commerce/creator focus, not SaaS.

---

## The Recommendation

### Short-term (now): Fix the scheduling problem
Before spending time migrating, schedule the 3-4 highest-value cron jobs in vercel.json so the most important emails actually run. Priority order:
1. Welcome sequence (paid members)
2. Subscription ending soon (retention)
3. Onboarding (new Studio members)
4. Monthly usage recap (active members)

Cost: 30 minutes. Impact: Immediate.

### Medium-term (next 2-4 weeks): Migrate to Loops
**Loops replaces Resend for everything** — transactional emails, sequences, broadcasts — in one clean interface Sandra can manage. No more 72 segments, no more custom broadcast queues, no more cron jobs for email.

What you get:
- Visual sequence builder (no code for Sandra to manage sequences)
- Contact properties that update from your app automatically
- Proper behavioral triggers (e.g., "user hasn't generated an image in 3 days")
- One dashboard for everything
- Real deliverability metrics

Migration path:
1. Sign up for Loops, connect domain
2. Migrate 4-5 core sequences (welcome, nurture, win-back, onboarding, reengagement)
3. Use Loops transactional API for billing emails (replaces Resend API calls)
4. Deprecate custom cron jobs and Resend segments over 2-3 weeks
5. Keep Resend account live as backup for ~30 days, then cancel

### Long-term (6-12 months): Apply for Customer.io Startup Program
Apply now (free if under $10M raised, never a customer). Use it when SSELFIE needs:
- Multi-channel (email + push + SMS + in-app)
- ML-driven send-time optimization
- Predictive churn scoring
- Advanced segmentation by behavioral events

---

## Decision Required

| Option | Cost | Effort | What It Solves |
|--------|------|--------|----------------|
| A: Fix scheduling only | $0 (current Resend plan) | 30 min | Gets sequences running NOW on current system |
| B: Migrate to Loops | $49/month | 15-25 hours | Eliminates complexity, gives Sandra direct control |
| C: Fix scheduling + migrate | $49/month | 16-26 hours | Best outcome — schedule now, rebuild clean |

**Recommended: Option C.** Fix scheduling immediately (so users get emails tonight), then migrate to Loops at a pace that doesn't disrupt anything live.

---

## What This Means for Sandra

Right now, every person who signs up gets nothing after their initial billing confirmation. No welcome. No onboarding. No "here's how to do your first photo." No "you haven't logged in, come back." That's a retention and activation hole that's been open since launch.

The good news: You have the copy. You have the templates. You built this. It just hasn't been turned on.

The move is: fix the switch, then simplify the system so it runs without needing an engineer to maintain it.

---

*Full audit docs:*
- `docs/EMAIL-SYSTEM-AUDIT-2026-02-25.md`
- `docs/RESEND-PLATFORM-AUDIT-2026-02-25.md`
- `docs/EMAIL-PLATFORM-RESEARCH-2026-02-25.md`
