# Light Editorial Email Audit

Date: 2026-05-21

Update: 2026-05-26 — AI Prompts now bridge primarily to Prompt Vault, not Starter Kit.

Source of truth: `docs/SSELFIE_DESIGN_SYSTEM.md`

## Email System Map

Templates live mainly in:

- `lib/email/templates/**`
- `email-templates/README.md`

Sequences and scheduling live in:

- `lib/email/ai-prompts-email-sequence.ts`
- `lib/email/freebie-guide-email-sequence.ts`
- `lib/email/starter-kit-email-sequence.ts`
- `lib/email/masterclass-email-sequence.ts`
- `app/api/cron/nurture-sequence/route.ts`
- `app/api/cron/onboarding-sequence/route.ts`
- `app/api/cron/win-back-sequence/route.ts`

Sending is handled by:

- `lib/email/send-email.ts`
- `lib/email/transactional-sender.ts`
- `lib/email/marketing-sender.ts`

Provider:

- Resend.

## Shared Shell

`lib/email/templates/stone-email.ts` is a shared shell, not a one-off template.

It provides:

- `renderStoneShell`
- `renderStoneButton`
- `renderStonePanel`

The previous implementation was dark-first. It was used by prompt/freebie nurture, Starter Kit, Masterclass, onboarding, win-back-adjacent templates, legacy Brand Strategy, Academy product delivery, and Blueprint legacy emails.

## Deliverability And Compliance

Current compliance behavior is centralized in `lib/email/send-email.ts` and `lib/email/unsubscribe.ts`.

Preserved:

- Marketing send suppression checks.
- App unsubscribe checks.
- Resend audience unsubscribe checks.
- Bounce/complaint/suppression checks.
- Visible unsubscribe footer insertion for marketing sends.
- `List-Unsubscribe` header.
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click` header.
- Canonical unsubscribe URL at `https://www.sselfie.ai/unsubscribe`.

Do not remove these in future template work.

## Image Support

The new shared shell supports optional:

- `heroImageUrl`
- `heroImageAlt`

Rules:

- Only `https://` image URLs render.
- Local desktop paths are ignored.
- No images are currently enabled by default.
- Hosted production-safe images are still needed before using visual transformation examples in email.
- Every future email image needs useful alt text.

Safe hosting pattern:

- Use already public HTTPS assets.
- Prefer Vercel Blob or production app/public URLs that are stable and cacheable.
- Do not reference local files, temporary localhost URLs, or desktop paths.

## CTA Tracking

Revenue tracking currently uses:

- `lib/email/templates/revenue-links.ts`
- `lib/email/generate-tracked-link.ts`

Current active nurture links mostly preserve:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `email_type`
- `campaign_id` where applicable

Do not replace CTA URLs with raw untracked links in revenue emails.

## Revenue-Critical Copy Audit

### AI Prompts Pack

Files:

- `ai-prompts-day0-delivery.ts`
- `ai-prompts-day2-try-first-prompt.ts`
- `ai-prompts-day5-edit-makes-postable.ts`
- `ai-prompts-day7-prompt-vault-offer.ts`
- `prompt-vault-delivery.ts`

Current role:

- Prompt reel audience.
- Free prompt pack delivery and nurture.
- Bridges to Prompt Vault as the primary paid upgrade.

Status:

- Strongest current revenue lane.
- Copy aligns with prompt audience.
- Day 7 must no longer be treated as a Starter Kit-first bridge. Rename or rewrite it to sell Prompt Vault.
- Starter Kit can remain a secondary support link only when framed as improving the source selfie before AI.

Visual opportunity:

- One before/after or AI-ready selfie example would help later.

Revenue risk if unchanged:

- High. The audience asked for AI photoshoot prompts; sending the primary CTA to Starter Kit repeats the underperforming funnel.

### Free Selfie Guide

Files:

- `freebie-guide-email.tsx`
- `freebie-guide-day1-light-tip.ts`
- `freebie-guide-day3-edit-bridge.ts`
- `freebie-guide-day5-story.ts`
- `freebie-guide-day8-starter-kit-direct.ts`
- `freebie-guide-day14-masterclass-bridge.ts`

Current role:

- Free guide delivery and nurture.
- Bridges to Starter Kit first, then Masterclass for the selfie-education path only.
- This is not the current AI Prompts front-door path.

Status:

- Copy is simple, selfie-first, and aligned.
- No urgent rewrite.

Visual opportunity:

- One clean selfie/light example could work in Day 1 or Day 3 later.

Revenue risk if unchanged:

- Low.

### Starter Kit

Files:

- `starter-kit-day0-delivery.ts`
- `starter-kit-day1-quick-win.ts`
- `starter-kit-day3-story.ts`
- `starter-kit-day5-proof.ts`
- `starter-kit-day7-soft-masterclass.ts`
- `starter-kit-day10-masterclass-breakdown.ts`
- `starter-kit-day14-masterclass-offer.ts`

Current role:

- Purchase delivery.
- Post-purchase activation.
- Masterclass bridge.

Status:

- Delivery/access email is transactional and should stay clear.
- Nurture copy is practical and aligned with selfie education.
- Later copy pass should connect the Kit more explicitly to AI-ready inputs and visual transformation.

Visual opportunity:

- One Starter Kit result example could improve Day 1 or Day 5 later.

Revenue risk if unchanged:

- Medium. The sales page now speaks AI-ready language, but post-purchase nurture is still mostly selfie/edit language.

### Masterclass

Files:

- `masterclass-day0-delivery.ts`
- `masterclass-day2-checkin.ts`
- `masterclass-day5-deepen.ts`
- `masterclass-day7-soft-work-with-me.ts`
- `masterclass-day10-direct-invite.ts`

Current role:

- Purchase delivery.
- Post-purchase progression.
- Work With Me bridge.

Status:

- Active but not the first tripwire.
- No urgent template-copy rewrite needed for the prompt funnel.

Visual opportunity:

- Later, use one transformation or content-system visual if hosted safely.

Revenue risk if unchanged:

- Low for current Prompt Vault funnel.

### Studio, Onboarding, Win-Back, Legacy

Files include:

- `onboarding-day-0.tsx`
- `onboarding-day-2.tsx`
- `onboarding-day-7.tsx`
- `welcome-email.tsx`
- `welcome-first-generation-followup.ts`
- `free-user-day5.ts`
- `free-user-day10.ts`
- `win-back-day3.ts`
- `win-back-day7.ts`
- `win-back-day14.ts`
- legacy Brand Strategy / Blueprint / Academy product emails

Status:

- Mixed age and mixed positioning.
- Some copy reflects older Studio/workflow language.
- Not the first revenue-critical prompt lane, but should be reviewed after the Prompt Vault email path is stable.

Revenue risk if unchanged:

- Medium for Studio retention and win-back clarity.
- Low for immediate Prompt Vault launch.

## Implementation Decision

Safe change made:

- Replace the dark shared shell in `stone-email.ts` with a light editorial shell while preserving the same function names and call signatures.
- Add optional hero image support without enabling images yet.
- Preserve unsubscribe and compliance behavior in `send-email.ts`.
- Preserve CTA tracking.
- Preserve active copy and routes.

Not changed:

- Cron timing.
- Send logic.
- Sender config.
- Unsubscribe logic.
- Database schema.
- Product delivery.
- CTA URLs.
- Email copy.

## Follow-Up Tasks

1. Host 2 to 4 production-safe email images.
2. Add one visual proof image to the AI Prompts Day 7 or Prompt Vault bridge email.
3. Done 2026-05-26: `ai-prompts-day7-starter-kit-offer.ts` was renamed to `ai-prompts-day7-prompt-vault-offer.ts`. The cron suppresses the legacy email type so previous sends are not duplicated.
4. Later: review Studio onboarding and win-back copy for old workflow language.
