---
name: daily-email-draft
description: Prepare one useful SSELFIE customer email and preview for Sandra. Never sends to customers. Uses Sandra's current voice without forcing every email into one sales template.
---

# Daily Email Draft

Working directory: `/Users/MD760HA/ACTIVE/sselfie-9g`.

Read:

1. `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
2. `docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`
3. `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
4. `docs/brand/SANDRA_VOICE_OS_2026-07-16.md`
5. `lib/email/templates/stone-email.ts` and `scripts/daily-email-prep.ts` for mechanics

Use the current documents as live pointers. Do not load every historical funnel or source file
unless today's angle actually needs it.

## Unattended safety

This task may use Read and `npx tsx scripts/daily-email-prep.ts ...` only. Do not use ad-hoc API or
database commands. Never run the `send` or `coupon-create` subcommands. The task may create a Resend
broadcast draft and send a preview to Sandra through the approved script. It never sends to the
customer list.

## Editorial judgment

Choose the best email for today from real data and recent output. It may be:

- a practical tutorial;
- a raw, specific story;
- an honest lesson from building;
- a simple demonstration of what technology makes possible;
- a direct invitation when a current public product is the honest next step;
- a human note with no sale.

Do not force every story to teach or sell. Do not manufacture a promotion because sales are quiet.
Private and unvalidated offers stay out of this unattended public task.

Write for the capable, overwhelmed woman who may be starting again. Help her feel understood, show
one useful possibility, and give one clear next step. Use Sandra's Voice OS: honest before
impressive, specific before inspirational, simple before clever, hopeful without pretending, and
beside her rather than above her.

## Run

1. Run `npx tsx scripts/daily-email-prep.ts data`.
2. Choose one fresh angle from current sales, recent broadcasts, public bridge history, unused
   photos, and Instagram performance. A quiet data pull may justify a useful no-ask email.
3. Write one email. Verify any claim, price, route, quote, or deadline. Use one CTA at most.
4. Run a quiet truth and voice pass. Rewrite the generic line. Do not produce a numeric score.
5. Pipe the draft JSON into `npx tsx scripts/daily-email-prep.ts draft` using the schema the script
   documents: `subject`, `name`, `paragraphs`, optional `ctaLabel`, `ctaUrl`, `ctaAfterIndex`,
   `heroPhoto`, and `audienceId`.
6. Stop after the preview and broadcast draft are created.

Report the angle, why it fits today, subject, public door or no-ask choice, photo used, target
audience, draft id, and the exact send command printed by the script. The command is for Sandra's
later approval. Do not run it.

If there is nothing honest and fresh to say, or the script fails, report that plainly instead of
forcing filler.
