# Email Platform Research: SSELFIE 2026
**Prepared:** February 25, 2026  
**Audience:** Sandra (Founder) + Technical Team  
**Context:** SSELFIE is a SaaS app for women building personal brands on Instagram. ~17–50 active users scaling toward hundreds. Currently on Resend for all email. Pain points: messy segments, overlapping sequences, unclear suppression, hard to manage.

---

## Executive Summary

SSELFIE has outgrown Resend. Resend is a transactional email API — it was never designed for marketing sequences, segmentation, or lifecycle automation. The result is the mess you're experiencing: no visual tooling, no easy management, no suppression logic Sandra can actually touch.

**The recommendation:** Migrate to **Loops** as your unified email platform. It handles transactional *and* marketing emails in one place, was purpose-built for SaaS, integrates cleanly with Next.js, and has a UI that a non-technical founder can actually use. At SSELFIE's current scale (sub-500 subscribers), it costs $49/month and replaces the need for Resend entirely.

If SSELFIE is under $10M in total funding and has never used Customer.io, apply for **Customer.io's Startup Program** as a 12-month free backup option — but only pursue it if Loops proves insufficient, because Customer.io requires significant technical setup.

---

## Section 1: Platform Comparison Table

### Feature Matrix

| Platform | Best For | Price @ 500–2k subs | Transactional | Marketing Auto | Sequences | Segmentation | AI Features | Dev DX | Non-Tech UX | SaaS-Native |
|---|---|---|---|---|---|---|---|---|---|---|
| **Resend** | Transactional API | ~$20/mo | Excellent | None | None | None | None | ★★★★★ | ★ (code only) | Partial |
| **Loops** | SaaS all-in-one | Free → $49/mo | Unlimited (paid) | Event-triggered | Good | Good | Limited | ★★★★★ | ★★★★ | Yes |
| **Customer.io** | Complex behavioral automation | $100/mo (or free via startup program) | Good | Excellent | Excellent | Excellent | Good | ★★★★ | ★★ (steep) | Yes |
| **Brevo** | Budget all-in-one | $9–$18/mo | Good | Good | Good | Good | Basic | ★★★ | ★★★★ | No (generic) |
| **Klaviyo** | E-commerce / retail | $20–$45/mo | Via API only | Excellent | Excellent | Best-in-class | Excellent (predictive) | ★★★ | ★★★ | No (e-comm) |
| **ActiveCampaign** | SMB automation | $49–$79/mo | Postmark add-on | Excellent | Excellent | Excellent | Good (predictive) | ★★★ | ★★★ | No (generic) |
| **ConvertKit / Kit** | Creators / newsletters | $33/mo (1k subs) | None | Good | Good | Good | Basic | ★★★ | ★★★★ | No (creators) |
| **Mailchimp** | Legacy general purpose | $13–$20/mo | Mandrill add-on | Moderate | Moderate | Moderate | Basic | ★★★ | ★★★ | No (generic) |
| **Beehiiv** | Newsletter / media | Free → $43/mo | None | Basic | Basic | Good | Good (content gen) | ★★★ | ★★★★ | No (media) |
| **Postmark** | Transactional only | $15/mo (10k emails) | Best-in-class | None | None | None | None | ★★★★★ | ★ (code only) | Partial |

### Pricing Reality at 500–2,000 Subscribers

| Platform | 500 subs | 1,000 subs | 2,000 subs | Notes |
|---|---|---|---|---|
| Resend | ~$20/mo | ~$20/mo | ~$20/mo | Volume-based; no marketing |
| **Loops** | **Free** | **Free → $49** | **$49** | All features on paid plan |
| Customer.io | $100/mo (or free via startup program) | $100/mo | $100/mo | 5k profiles on Essentials |
| Brevo | $9/mo | $9/mo | $9/mo | Email-volume based; unlimited contacts |
| Klaviyo | $20/mo | $30/mo | $45/mo | Active profile-based pricing |
| ActiveCampaign | $15/mo (Starter, limited) | $49/mo (Plus) | $49/mo | Starter capped at 5 automation actions |
| ConvertKit / Kit | $33/mo | $33/mo | $55/mo | Creator plan |
| Mailchimp | $13/mo | $13/mo | $26/mo | Caps quickly; Mandrill is extra |
| Beehiiv | Free (up to 2.5k) | Free | Free | Scale plan $43/mo for automations |
| Postmark | $15/mo | $15/mo | $15/mo | Transactional only |

---

## Section 2: Deep Dives — Top 3 Candidates

### 2.1 Loops.so — The SaaS-Native Choice

**What it is:** Loops was built from the ground up specifically for SaaS companies (YC-backed). Unlike general-purpose marketing platforms, it understands the SaaS lifecycle: free trial → activation → paid → churn → win-back. It unifies transactional, product, and marketing emails in a single interface with a developer API for event tracking.

**Pricing (2026):**
- **Free plan:** Up to 1,000 contacts, 4,000 sends/month, "Powered by Loops" footer
- **Paid starts at $49/month:** Unlimited transactional, unlimited marketing sends, all features
- Transactional emails are completely **free and unlimited** on all paid plans (changed Dec 2024)
- No extra charges for seats or email volume — one flat price per contact tier

**What Loops does well:**

- **Unified inbox for your entire email strategy.** One platform handles password resets, welcome sequences, win-back campaigns, and newsletters. No separate Resend + marketing tool complexity.
- **Event-triggered automation.** Push user events via API (e.g., `user_signed_up`, `subscription_upgraded`, `30_days_inactive`) and Loops fires the right email. Identical pattern to what SSELFIE already does in Resend.
- **Notion-style document editor.** Clean, fast, minimal learning curve. Sandra can write and edit emails without needing a developer.
- **Audience segmentation.** Segment by contact properties (e.g., `plan = pro`, `last_active = 30d ago`, `joined_via = instagram_ad`) without writing SQL or complex rules.
- **Next.js integration is first-class.** Official SDK (`npm i loops`), official Next.js guide, example app on GitHub. Migration from Resend is a mostly mechanical swap.
- **Deliverability is solid.** SPF/DKIM/DMARC configured on setup. Built-in suppression management.

**What Loops lacks / watch-outs:**

- **No visual workflow builder.** You can create event-triggered Loops (sequences), but there's no drag-and-drop branching canvas. Complex conditional journeys require workarounds.
- **No fallback logic in automations.** Can't easily say "if the user already received email X, skip this one."
- **No built-in CRM or user history.** You see contacts and their activity, but there's no full interaction timeline in a single view.
- **AI features are limited.** No native AI content generation, no send-time optimization, no predictive churn scoring. AI integrations require third-party tools (e.g., Relevance AI).
- **Pricing jumps at scale.** At 5,000+ subscribers, pricing escalates. Fine for SSELFIE now, but revisit at 2,000+ users.
- **Only for SaaS.** If SSELFIE's email strategy evolves toward a media/newsletter brand, Loops' constraints become more painful.
- **Editor has known bugs.** Some users report undo failures and block misbehavior — minor but real.

**Verdict for SSELFIE:** Loops is the right platform for where SSELFIE is today and for the next 12–18 months. It solves the core pain: Sandra gets a platform she can actually log into and manage. The dev team gets a clean API that mirrors Resend's ergonomics. The messy Resend-as-marketing-tool hack goes away entirely.

---

### 2.2 Customer.io — The Powerful-but-Complex Option

**What it is:** Customer.io is enterprise-grade behavioral messaging. It's the platform teams graduate to when they need multi-channel automation (email, SMS, push, in-app), sophisticated segmentation logic, and deep Stripe/analytics integration. Used by serious SaaS companies at Series A and beyond.

**Pricing (2026):**
- **Essentials:** $100/month — 5,000 profiles, 1M emails/month, visual workflow builder, all core automation
- **Premium:** $1,000/month — advanced data integrations, higher volume, priority support
- **Enterprise:** Custom pricing
- **Startup Program (KEY FOR SSELFIE):** Up to **12 months FREE** if you've raised less than $10M in funding and have never been a Customer.io customer. Includes 30,000 profiles and all Essentials features.

**What Customer.io does well:**

- **Most powerful automation engine in this tier.** If-then-else branching, time delays, A/B splits, multi-step journeys, goal tracking — all visual and configurable without code.
- **Multi-channel.** Email, SMS, push notifications, in-app messages, webhooks — all from one workflow.
- **Excellent segmentation.** Any behavioral data, custom attributes, event history, Stripe data — all filterable in real-time segments.
- **Startup Program.** Effectively free for a year if SSELFIE qualifies.

**What Customer.io lacks / watch-outs:**

- **Steep learning curve.** Initial setup takes days, not hours. Sandra cannot manage this without significant training or a dedicated ops person.
- **Developer-heavy setup.** Properly integrating behavioral events, object data, and Stripe requires meaningful engineering time (estimate: 1–2 dev weeks for a proper integration).
- **Not a non-technical founder tool.** The power comes at the cost of simplicity.
- **After startup program ends, it's $100/month minimum.** The jump from free to $100 is sudden.
- **Overkill at sub-1,000 users.** Most of Customer.io's advanced features only shine when you have rich behavioral data across thousands of users.

**Verdict for SSELFIE:** Customer.io is the right platform for SSELFIE in 12–24 months, not today. If SSELFIE qualifies for the Startup Program, apply now and keep the free account as a future staging ground. But don't migrate to it as the primary email system until the team has engineering bandwidth to set it up properly.

---

### 2.3 Brevo — The Budget All-in-One

**What it is:** Brevo (formerly Sendinblue) is a generalist email marketing + CRM platform. It's neither SaaS-specific nor creator-focused — it's a solid, affordable tool for any small business that needs email + SMS in one place without paying Mailchimp or HubSpot prices.

**Pricing (2026):**
- **Free:** 300 emails/day, unlimited contacts, transactional emails, customizable templates
- **Starter:** $9/month — 5,000 emails/month, no daily limits, AI content generator, advanced segmentation
- **Business:** $18/month — full marketing automation, A/B testing, advanced analytics
- All plans use email-volume based pricing (not contact-based). Store unlimited contacts, pay only for what you send.

**What Brevo does well:**

- **Cheapest option with real automation.** $18/month for sequences, segmentation, A/B testing, and transactional email is hard to beat.
- **Email-volume pricing model.** At 2,000 subscribers with moderate sending, you stay on $9–$18/month. Klaviyo and Loops charge per contact, which escalates faster.
- **All-in-one without Mandrill add-on taxes.** Unlike Mailchimp, Brevo includes transactional in every plan.
- **Decent non-technical UX.** Not as clean as Loops, but Sandra could learn it. Drag-and-drop builder, visual automation workflow.
- **API is full-featured.** Node.js, Python, PHP SDKs. REST API. Webhooks. SMTP relay. Good for Next.js integration.

**What Brevo lacks / watch-outs:**

- **Not SaaS-optimized.** Brevo doesn't natively understand SaaS lifecycle concepts — no built-in concept of "trial users," "paying customers," or "billing events." Must build with custom attributes.
- **Deliverability is adequate but not premium.** Postmark and Loops have better deliverability track records for transactional.
- **Automation is less sophisticated than Customer.io or ActiveCampaign.** Works for basic sequences but can't handle complex conditional branching.
- **Generic brand.** If SSELFIE's email strategy leans into the community/personal brand angle, Brevo's tools feel corporate vs. creator-forward alternatives.
- **No strong AI personalization.** AI content generator is basic. No predictive segmentation or behavioral AI.

**Verdict for SSELFIE:** Brevo is the right choice *if cost is the top constraint*. If Sandra needs something working today for under $20/month with full automation, Brevo delivers. But Loops is the better long-term fit for a SaaS product — the UX is more intuitive, the SaaS-native design reduces configuration work, and unlimited transactional on paid plans removes billing confusion.

---

## Section 3: AI-Native Email Marketing in 2026 — What's Real vs. Hype

### The Real Stuff (Works, Delivers ROI)

**1. Send-Time Optimization (STO)**
AI analyzes each subscriber's engagement history and sends at their personal optimal time. Klaviyo's implementation showed a 35% increase in click rates during beta testing. Caveat: Apple Mail Privacy Protection (MPP) broke open-rate-based STO in 2023. Modern STO uses click and conversion signals instead — meaningfully less data. Still valuable but not magic. Available in Klaviyo, ActiveCampaign (predictive sending), and Customer.io.

**2. Predictive Segmentation**
AI models that predict churn risk, lifetime value, and next purchase probability — enabling proactive campaigns before users disengage. Klaviyo's Segments AI uses CLV prediction, RFM groupings, and churn modeling. Delivers 10–25% higher conversions vs. rule-based segments. For SaaS (SSELFIE's use case), the analogues are: predicting which trial users won't convert, which paid users are at churn risk, and which users are ready to upgrade.

**3. AI Content Generation (for drafting)**
Subject line suggestions, email copy drafts, and CTA optimization are available across Brevo, Beehiiv, Klaviyo, and more. These work well for first drafts but require human editing — brand voice, emotional resonance, and strategic angle stay human-led. Treat it as a copilot, not an autopilot.

**4. Behavioral Trigger Automation (AI-enhanced)**
Platforms like Customer.io and Klaviyo can now auto-identify engagement patterns — detecting when a subscriber's activity drops and triggering win-back sequences automatically. This is the intersection of rules-based automation and ML classification. It works.

### The Hype (Overstated or Premature)

**"AI builds your entire email program"** — Platforms market agents that build sequences without human input. In practice, AI-generated sequences require significant review and customization. Brand voice and sequence strategy can't be fully automated yet.

**"Email SEO for AI mail summarizers"** — Gmail and Apple Mail now use AI to summarize emails in the inbox. Some vendors warn you must optimize for "email SEO." Standard practices (clear subject lines, strong preheader, high relevance) remain more impactful.

**Hyper-personalization at small scale** — Predictive AI requires data volume to work well. At 50–500 users, you don't have enough signals for meaningful ML-driven personalization. At this stage, well-written behaviorally-triggered sequences outperform AI personalization. Save AI personalization for 5,000+ subscribers.

### What SSELFIE Should Actually Use AI For Right Now

1. **Content drafting.** Use Claude/GPT to draft email sequences, win-back campaigns, and broadcast newsletters. Edit for Sandra's voice. Highest-leverage AI use today.
2. **Subject line testing.** A/B test 2 subject lines on every broadcast. Use AI to generate the variants.
3. **Event segmentation.** Build behavioral segments based on actual product events (logged in, generated images, upgraded, went inactive). Foundation you need before AI personalization matters.
4. **Defer predictive AI.** Until you're at 1,000+ engaged users with 6+ months of behavioral data, don't pay a premium for AI-first platforms.

---

## Section 4: Transactional vs. Marketing Split — Recommendation

### The Traditional Split (What SSELFIE Has Now)

- **Resend** handles all transactional (password reset, billing receipts, welcome to app)
- No dedicated marketing tool → marketing hacked onto Resend → current mess

This is the worst of both worlds: paying for a transactional specialist but trying to use it for everything.

### The Unified Platform Approach

One platform handles both transactional and marketing emails. Examples: Loops, Customer.io, Brevo, ActiveCampaign.

**Pros:**
- Single contact record — subscriber's transactional activity informs marketing segmentation
- One suppression list — no risk of emailing someone who unsubscribed via a different tool
- One dashboard Sandra can actually log into
- Reduced operational overhead

**Cons:**
- Mixing transactional and marketing traffic on same infrastructure can theoretically affect IP reputation if marketing campaigns generate spam complaints
- Vendor lock-in for both streams

### The Professional Split (Best of Both at Scale)

- **Postmark** for transactional (password resets, billing receipts, critical system emails) — best-in-class deliverability, $15/month
- **Loops / Customer.io / Brevo** for all marketing, lifecycle, and nurture emails

**Pros:**
- Bulletproof transactional deliverability isolated from marketing traffic
- Marketing platform can be swapped without touching transactional infrastructure
- Industry-standard for companies at Series A+

**Cons:**
- Two platforms to manage
- Two billing relationships
- Slightly more engineering work

### What SSELFIE Should Do

**At current scale (sub-500 users): Use Loops alone.**

The unified approach is correct for SSELFIE right now:
1. The volume of transactional email is tiny (50 users). IP reputation risk from marketing campaigns is negligible at this scale.
2. Loops makes transactional email free and unlimited on paid plans. No cost penalty for consolidating.
3. Sandra needs *fewer* tools to manage, not more.
4. Loops' suppression management is correct — anyone who unsubscribes from marketing is still reachable for genuine transactional email (billing alerts, password resets) because those categories are handled separately within Loops.

**At 2,000+ active users (future):** Revisit the split. Add Postmark for transactional-only if SSELFIE is sending newsletters to large segments and seeing marketing-driven deliverability pressure. Until then, the split adds complexity without meaningful benefit.

---

## Section 5: SSELFIE-Specific Recommendation

### The Recommendation: Migrate to Loops

**Primary platform:** Loops  
**Keep or cancel Resend:** Cancel Resend after migration is complete and verified  
**Apply but don't migrate yet:** Customer.io Startup Program (hedge for the future)

### Why Loops

| SSELFIE Need | Loops Answer |
|---|---|
| Sandra needs to manage email herself | Clean document-style UI, no coding required for campaigns |
| Messy Resend setup: overlapping sequences | Loops separates events (triggers) from Loops (sequences) — cleaner mental model |
| Unclear suppression logic | First-class suppression: unsubscribed contacts clearly marked, excluded automatically |
| Welcome + onboarding sequences | Event-triggered Loops: fire on `user_signed_up`, sequence runs automatically |
| Win-back campaign | Contact property segment (`last_active > 30d`), trigger a Loop |
| Broadcast newsletters | "Campaigns" tab in Loops — draft, schedule, send |
| Transactional (billing, password reset) | Transactional email API, unlimited on paid plan |
| Next.js integration | Official SDK: `npm i loops`. One-hour migration for most email sends |
| AI personalization now | Not in Loops — use manually-crafted segments + behavioral triggers instead |
| Cost at 50–500 users | Free up to 1,000 contacts; $49/month after |

### Why Not the Others

**Not Resend (current):** Resend is an excellent transactional API. It is not an email marketing platform. Continuing to use it for sequences and campaigns means building on the wrong foundation. The current mess exists because the tool doesn't support what SSELFIE needs.

**Not Customer.io (yet):** Customer.io is the right destination in 12–24 months. The Startup Program makes the future migration low-cost. But setting up Customer.io properly requires 1–2 weeks of engineering, and its UI is too complex for Sandra to manage independently today.

**Not Brevo:** Brevo would work and is cheaper, but it's not SaaS-native. SSELFIE's key segments (trial users, paying users, inactive users, users who haven't uploaded a photo) map naturally to Loops' event model. With Brevo, you'd need to manually maintain all these attributes via API — equivalent work, less SaaS-aware tooling.

**Not Klaviyo:** Outstanding but built for e-commerce (Shopify data model). SaaS lifecycle emails feel like a workaround. Overkill, and the active-profile pricing model gets expensive faster than Loops.

**Not Kit/ConvertKit:** Built for newsletter creators. No SaaS event model. Not suitable as a primary product email platform.

**Not Mailchimp:** Legacy product. Transactional requires separate Mandrill add-on. The "audiences" model is confusing. Not recommended for any modern SaaS.

**Not Beehiiv:** Excellent for newsletters and media brands. Wrong category for SaaS product email.

### SSELFIE's Target Loops Email Architecture

```
LOOPS SETUP FOR SSELFIE
├── CONTACTS
│   ├── Properties synced from app:
│   │   plan, signup_date, last_active,
│   │   has_uploaded_photo, credits_remaining
│   └── Suppression: auto-handled by Loops unsubscribe
│
├── TRANSACTIONAL EMAILS (triggered via API, unlimited)
│   ├── welcome-to-sselfie (on account creation)
│   ├── billing-receipt (on Stripe charge.succeeded)
│   ├── subscription-upgraded (on Stripe upgrade event)
│   ├── subscription-cancelled (on Stripe cancellation)
│   └── password-reset (via auth provider webhook)
│
├── LOOPS / SEQUENCES (event-triggered, run automatically)
│   ├── Onboarding Loop (trigger: user_signed_up)
│   │   ├── Day 0: Welcome + what to do first
│   │   ├── Day 2: How to upload your first photo
│   │   ├── Day 5: Here's what SSELFIE creates for you
│   │   └── Day 10: Are you stuck? Here's help
│   ├── Activation Loop (trigger: has_uploaded_photo = false AND 7d since signup)
│   │   └── "You haven't taken your selfie yet — here's why it matters"
│   ├── Win-Back Loop (trigger: last_active > 30d)
│   │   ├── Day 0: "We miss you — here's what's new"
│   │   └── Day 7: Final win-back with offer or unsubscribe option
│   └── Upgrade Nurture (trigger: plan = free AND 14d active)
│       └── Series: show paid plan value, use-case walkthroughs
│
└── CAMPAIGNS (broadcast, manual sends)
    ├── Weekly/monthly newsletter
    ├── New feature announcements
    └── Seasonal campaigns
```

### Cost Projection

| Stage | Users | Platform | Monthly Cost |
|---|---|---|---|
| Today | 50 | Loops (free) | $0 |
| Near-term | 500 | Loops (paid) | $49 |
| Growth | 1,000 | Loops | $49 |
| Scaling | 2,000 | Loops | $49 |
| At scale | 5,000 | Loops or Customer.io | $149 or $100 |

Compare: Resend at ~$20/month with zero marketing capabilities. Loops at $49/month covers everything.

---

## Section 6: Migration Path from Resend to Loops

### Pre-Migration Checklist (Do Before Writing Code)

- [ ] Audit every place in the SSELFIE codebase that calls `resend.emails.send()` — list them all
- [ ] Identify which are transactional (must always arrive) vs. marketing (should respect unsubscribes)
- [ ] Export current contact list from wherever it lives (Supabase users table, Resend logs, etc.)
- [ ] Verify domain DNS: Loops will need its own SPF/DKIM records. Remove or update Resend DKIM once migration is complete — don't run both simultaneously.

### Step-by-Step Migration

**Phase 1: Setup (1 day, Sandra can do parts of this)**
1. Create Loops account at loops.so
2. Add and verify your sending domain
3. Configure SPF, DKIM, DMARC records (Loops provides the exact DNS values)
4. Import existing contacts from Supabase/CSV — map properties (plan, signup_date, etc.)
5. Create contact properties in Loops that mirror your user data model

**Phase 2: Rebuild Transactional Emails in Loops (2–4 hours dev)**
1. Install the Loops SDK: `npm i loops`
2. Add `LOOPS_API_KEY` to Vercel environment variables
3. Create each transactional email template in the Loops dashboard
4. Note the `transactionalId` for each email
5. Replace Resend calls in your codebase:

```typescript
// BEFORE (Resend)
await resend.emails.send({
  from: 'hello@sselfie.com',
  to: user.email,
  subject: 'Welcome to SSELFIE',
  react: <WelcomeEmail name={user.name} />,
});

// AFTER (Loops)
import { LoopsClient } from "loops";
const loops = new LoopsClient(process.env.LOOPS_API_KEY);

await loops.sendTransactionalEmail({
  transactionalId: 'your-welcome-email-id',
  email: user.email,
  dataVariables: {
    firstName: user.name,
  },
});
```

**Phase 3: Set Up Contact Sync (2–3 hours dev)**

Every time a user signs up, upgrades, or changes state, sync to Loops:

```typescript
// In your signup handler (server-side)
await loops.createContact(user.email, {
  firstName: user.name,
  plan: 'free',
  signupDate: new Date().toISOString(),
  hasUploadedPhoto: false,
});

// In your Stripe webhook handler on upgrade
await loops.updateContact(user.email, {
  plan: 'pro',
  upgradeDate: new Date().toISOString(),
});

// Send event to trigger a Loop sequence
await loops.sendEvent({
  email: user.email,
  eventName: 'user_signed_up',
});
```

**Phase 4: Rebuild Email Sequences in Loops (Sandra + dev, 4–8 hours)**
1. In Loops dashboard, create a new Loop for each sequence
2. Set the trigger event (e.g., `user_signed_up`)
3. Add emails to the sequence with time delays
4. Use contact properties for personalization (`{{firstName}}`, `{{plan}}`)
5. Test with a sandbox email address
6. Activate Loops one at a time

**Phase 5: Send a Test Campaign (Sandra, 30 minutes)**
1. Import a test segment (e.g., contacts with `plan = free`)
2. Draft a campaign email in Loops
3. Send a preview to yourself
4. Verify rendering on mobile + desktop
5. Send to test segment

**Phase 6: Cutover and Monitor (1 day buffer)**
1. Once all Loops emails are tested, comment out all Resend calls
2. Deploy to Vercel staging first
3. Run through core flows: signup, upgrade, password reset — verify emails arrive
4. Deploy to production
5. Monitor Loops dashboard for delivery rate, open rate, bounce rate for 48 hours
6. Cancel Resend subscription after 7-day verification window

### Migration Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Email templates look different | Medium | Test every template before cutover. Loops uses its own template engine. |
| DNS propagation delays | Low | Make DNS changes 48h before cutover. |
| Contacts not imported correctly | Medium | Verify property mapping with a sample of 10 users before bulk import. |
| Missing a Resend call in codebase | Medium | Search all `resend.` references before migration begins. |
| Sequence fires twice during cutover | Low | Disable old Resend sequences before activating Loops sequences. |
| Deliverability dip during DNS change | Low-Medium | Keep Resend active until Loops domain is verified and DMARC passing. |

### Effort Estimate

| Task | Owner | Effort |
|---|---|---|
| Domain DNS setup | Dev | 1–2 hours |
| Rebuild transactional email templates | Sandra + Dev | 2–4 hours |
| Replace Resend API calls with Loops SDK | Dev | 2–4 hours |
| Contact sync implementation | Dev | 2–3 hours |
| Build onboarding Loop sequence | Sandra | 3–6 hours |
| Build win-back Loop sequence | Sandra | 2–4 hours |
| Testing and QA | Dev + Sandra | 2–4 hours |
| **Total** | | **~15–25 hours** |

For a developer who knows the codebase, the technical work is 1–2 days. Sandra's contribution (building actual email sequences and campaign copy) is the larger time investment — plan for 2 weeks of part-time work to do it well.

---

## Appendix A: Customer.io Startup Program — Apply Now as a Hedge

Even if SSELFIE migrates to Loops today, apply for the Customer.io Startup Program immediately.

- **URL:** https://customer.io/startup-program-application
- **Requirements:** < $10M in funding raised, never been a Customer.io customer
- **What's included:** 12 months free, 30,000 profiles, full Essentials features (email, SMS, push, visual workflow builder)
- **Why hedge:** SSELFIE's needs will outgrow Loops when it hits 2,000+ users and needs multi-channel automation, sophisticated branching journeys, and deep Stripe/MRR segmentation. Having Customer.io already set up (even if unused) makes that transition faster.

Apply within the next 30 days while the eligibility window is open. This is a free hedge and there's no cost to applying.

---

## Appendix B: Competitive Intel — What to Watch

**Loops** shipped a major editor redesign in April 2025 and continues active development. The most-requested feature is visual workflow branching — if they ship this in 2026, it eliminates their primary limitation vs. Customer.io for early-stage use.

**Customer.io's Essentials plan** dropped from $150 to $100/month in 2025 — a signal that they're competing harder for the early-growth SaaS market that Loops is currently winning.

**Postmark** is a strong transactional-only option if SSELFIE ever decides to split the email stack. At $15/month for 10,000 emails and best-in-class deliverability, it would pair well with Loops or Customer.io as the transactional layer.

**Klaviyo's active-profile pricing model** (introduced 2025) makes it more expensive than it looks for growing SaaS lists. Not recommended unless SSELFIE pivots toward a strong e-commerce / digital product angle.

---

*Research grounded in publicly available pricing and documentation as of February 2026. Prices subject to change — verify at each platform's pricing page before making decisions.*
