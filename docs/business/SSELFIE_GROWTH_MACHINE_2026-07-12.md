# SSELFIE Growth Machine

Status: **current operating contract**

Locked: 2026-07-12

Owner: Sandra

## The goal

Build SSELFIE toward predictable **€20K–€30K+ monthly revenue** without turning Sandra into an
agency, support desk, or full-time systems operator.

The machine stays deliberately small. Every public path must do one of four jobs: acquire a lead,
make a sale, activate a buyer, or retain a member. A feature, automation, page, report, or offer that
does none of those jobs is not part of the active growth machine.

## The four active revenue lanes

| Audience signal | One next paid decision | What happens after purchase |
|---|---|---|
| `PROMPT` / AI-photo interest | **Prompt Vault · $37** | Instant access, then the paid-buyer SUITE activation path |
| `SELFIE` / source-photo interest | **Starter Kit · $37** | Instant access, then the paid-buyer SUITE activation path |
| `WORK` / warm business intent | **Work With Me · €2,000** | Application → attended conversation → private checkout → paid closure |
| Activated recurring customer | **SSELFIE SUITE · €97/month** | First useful image → download → repeat creation → retained member |

The Selfie To AI Photos Kit may be tested later as a controlled challenger to Prompt Vault. It does
not replace the proven Prompt Vault path without comparative purchase, activation, refund, and SUITE
upgrade data.

Presets remain a valid content-led secondary sale because customers buy them. They are fulfilled and
monitored, but they are not another primary front door competing with the four lanes above.

## Scale math, not a forecast

The goal is intentionally larger than a €5K lifestyle business. One transitional monthly mix is
approximately 80 SUITE members (€7,760), 100 low-ticket buyers (~€3,700), four attended Work With Me
clients (€8,000), and 20 Presets Bundle buyers (~€780): about **€20,240** before refunds, fees, tax,
and currency differences.

The more automated destination replaces attended client revenue with recurring members: 200 SUITE
members (€19,400), 200 low-ticket buyers (~€7,400), and roughly €3,000 of secondary product sales is
about **€30K**. These are capacity targets, not promises. The activation and retention data decides
how quickly traffic can be increased.

## What is no longer an active sales system

- **Selfie To Brand Shoot** is historical buyer access only. Existing entitlements, course access,
  payment fulfillment, and customer data remain protected. Its public landing and checkout are not
  promoted and redirect into the active SUITE path.
- `/visibility-to-paid` and the retired editorial generator no longer create parallel choices; both
  route to Work With Me.
- Free leads are not sent into the no-card SUITE trial. The experiment produced no paid conversions.
- The repo Instagram reply inbox, AI reply drafting, approval queue, senders, and unattended DM jobs
  are removed. ManyChat keyword marketing flows remain. Inbox work is attended and on demand in the
  signed-in ManyChat inbox.
- Retired content, product-QA, newsletter-poller, and Brand Shoot recovery schedules are unscheduled.
  They cannot run in the background.

Historical access is not the same as an active offer. Never delete paid access merely to simplify a
sales funnel.

## The customer journey

```text
Instagram / email / ManyChat keyword
            ↓
one relevant free or public page
            ↓
one $37 paid decision
            ↓
instant product fulfillment
            ↓
paid-buyer SUITE activation
            ↓
first image → download → next useful creation
            ↓
€97/month membership
```

Warm `WORK` leads use a separate attended lane:

```text
WORK → application → Sandra qualifies → €2,000 checkout → Stripe closes the application as won
```

The attended step is intentional. AI may score, organize, draft, and measure; it must not impersonate
Sandra or automatically send a €2,000 offer. The admin copy action checks Stripe before returning a
link, reuses only an open unexpired checkout, and safely replaces an expired one.

## Operating systems that remain live

- Stripe webhook fulfillment, pending-payment repair, and payment reconciliation.
- Prompt Vault, Starter Kit, and membership checkout recovery.
- Member onboarding, trial lifecycle, habit, win-back, and subscriber lifecycle emails.
- The Daily Sandra Briefing, activation funnel, cron health, diagnostics, and Work With Me pipeline.
- Three Claude Cowork draft tasks: daily email, daily Story sequence, and weekly content brief.
- ManyChat keyword delivery, Resend delivery, Stripe payments, Vercel hosting, and Sentry monitoring.

The exact cross-layer inventory lives in `docs/AUTOMATION_ROSTER.md`. At this lock there are **21
repo schedules**, **3 Cowork draft tasks**, and **0 Codex business automations**.

Payment hardening is part of this machine, not a separate project. Guest one-time purchases must
fulfill even when no account exists; webhook review alerts stay unresolved until access and delivery
are verified. Public credentials are forbidden in the repo and enforced by an automated scan.

The weekly content brief has one validated payload contract shared by its writer and live readers.
Incomplete or unsafe drafts fail before storage or preview email. The retired repo generator and
its duplicate reporting routes are deleted; historical rows remain.

## Measurement contract

Money comes only from Stripe or qualifying `stripe_payments` rows. Behavior comes from analytics.
The weekly decision order is:

1. Payment or fulfillment incident.
2. Paid checkout completion.
3. Paid-buyer activation and first download.
4. Second useful creation and paid continuation.
5. Only then: more traffic, a challenger offer, or a product expansion.

Run one commercial experiment at a time. An experiment must name its control, challenger, success
metric, minimum sample, and stop condition before traffic is split.

The current trial model remains no-card. Card-upfront is a held commercial decision, not an implicit
engineering change. Evaluate the newly cleaned paid-buyer cohort before changing how anyone is
charged.

Paid-buyer auto-activation is reported as its own exact source, separate from ordinary trial claims.
Generation and download behavior carries the exact persisted image/video asset ID when available,
so future retention analysis can connect a return or review to the result that created value. The
existing Day-7 member reset is behavior-gated to women who generated on one calendar day and then
stalled; it is not another unconditional email campaign.

## Review capture

Social proof belongs after demonstrated value, not as a permanent floating widget. The live contract
is a one-time, authenticated review request after a member's third successful SUITE download. It is
text-first, consent-based, moderated before publication, dismissible, rate-limited, and never blocks
creation. See `docs/product/SUITE_REVIEW_CAPTURE_2026-07-12.md`.

## Sandra's operating rhythm

Sandra should not manage code, cron jobs, queues, or databases.

- **Daily:** open Admin Home, handle a red payment/access alert first, then do the one money move.
- **When a WORK application arrives:** open Work With Me, contact the qualified lead, and create the
  private checkout only after the conversation.
- **Weekly:** approve one sales email/story direction and review the Activation Funnel's largest
  measured drop.
- **Do not:** create another offer, automation, admin report, or funnel branch because of one anecdote.

Everything else is owned by the system and should be visible only when it genuinely needs Sandra.

## Change rule for future development

Every proposed change must answer:

1. Which of the four revenue lanes does it strengthen?
2. Which measured constraint does it address?
3. What existing page, automation, report, or choice does it replace?
4. How will payment, fulfillment, activation, and rollback be verified?

If those answers are missing, the change is not ready to build.
