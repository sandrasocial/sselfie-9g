# Current Task Board

Last cleaned: 2026-07-13

This root contains only work that still needs a real-world decision, asset, or verification. Shipped,
superseded, obsolete, and completed code specs are archived under `tasks/archive/`.

## Operating rule

- Start from `origin/main` on a short-lived `codex/` branch.
- Do not revive an archived spec without verifying the current production code first.
- When work ships, move its spec to a dated archive in the same commit.
- Delete the merged task branch locally and remotely.

## Active queue

- `MAYA-GOLDEN-01-regression-suite.md`: golden regression suite (Phase A deterministic for
  Codex now; Phase B attended scored image runs with Sandra). Gate for ANY future creative
  change per the freeze contract.
- `CAMPAIGN-OUTCOME-01-your-next-campaign.md`: held pay-per-outcome product. Payment/intake/QA/
  delivery infrastructure exists on `codex/campaign-outcome-held`, but the three-post deliverable
  must be revised to the complete v3 campaign kit before release. Never merge before the current
  One Selfie event closes on 2026-07-15 at 18:05 CEST.
- `RECOVERY-CADENCE-01-three-touch.md`: campaign-specific checkout recovery that ships only with the
  approved campaign product. Copy remains draft and no recovery email may send before approval.

## Safety boundaries — not open tasks

Sandra does not need to act on this section. These are explicit stop signs for future agents, not an
unfinished founder to-do list.

- **Work With Me form redesign:** held until `WORK-WITH-ME-INSTRUMENTATION-01` has 1-2 weeks of real
  page-view/form-start/submit data — don't redesign an already-decent form on a guess.
- **Broader ManyChat flow hygiene:** the live WORK automation was verified in Sandra's signed-in
  account and renamed `WORK — Sprint Application` on 2026-07-12. Its triggers, first-name mapping,
  destination, and tracking parameters are correct. Older non-WORK flows can be audited separately;
  they do not block the active revenue path.
- **Trial engine redesign:** `grantSuiteTrial` (`lib/trial/suite-trial.ts`) creates a pure DB row —
  no card, no Stripe subscription, no default outcome at expiry. Plausibly the root cause behind the
  trial's 0/50 lifetime conversion (found 2026-07-11/12). Whether to require a card upfront (standard
  SaaS auto-convert pattern) is a real product/pricing decision, not a quick fix. Known paid buyers
  now start their included trial automatically; guests keep the claim-token fallback. Card-upfront
  stays intentionally unbuilt until the paid-buyer cohort is measured.
  Trial users have never opened the Academy/course content, so there is no active course-library
  leakage to fix before making that decision.
- **Legacy `/studio` deletion:** not a cleanup shortcut. It needs a dedicated dependency audit because
  live Feed Planner and shared generation code still cross legacy directories.
- **Vault Club and broad redesigns:** remain gated by current funnel and operational proof.
- **Vault static-file consolidation (the harder half):** `VAULT-DROP-AUTOSYNC-01` (queued above) closes
  the Library-drops gap. What's still held: `lib/ai-prompts/prompt-data.ts` (the hand-authored static
  library behind `/prompt-vault`, `/ai-prompts`, `/selfie-to-brand-shoot`, and Maya's style tiles) stays
  a separate hand-maintained source from the DB `vault_collections`/`vault_prompts` Shoot Studio writes
  to. Collapsing that one touches revenue/checkout-adjacent pages and thousands of lines of curated
  copy — needs a dedicated design pass, not a quick spec. Not ready for Codex yet.

## Verified shipped before this cleanup

The following root specs were archived on 2026-07-11 after code and test verification against
`origin/main`: App V3 generation reliability and live bugs, trial front door and activation events,
Maya Style Director and overlay memory, floating Maya/Photos UI, Content Carousel 01-04, Shoot
Taxonomy, Customer Photoshoot 01-02, Story Overlay, Story Sequence, Vault Story Collections, presets
order bump, Voice Loop, Employee roster, Needs-Me approval queue, and the superseded numbered-prompt,
Admin-Maya, and text-overlay plans.

## Shipped from the 2026-07-15 Suite vibe check

- Maya now repairs semantically invalid full-shoot and story plans before the member sees them,
  with a hard two-attempt ceiling and the existing graceful fallback.
- Likeness learning is visible: captures are acknowledged, low-confidence feedback asks permission,
  and Memory exposes learned likeness notes and preferred worlds with deletion controls.
- The two story-sequence policy failures were confirmed as benign motherhood/business false
  positives. The graphic path's existing one-retry safety parity and the durable credit-refund
  contract are pinned by focused regressions. The format stays offered until its 2026-07-29
  measurement gate.
- Release records: `tasks/archive/2026-07-15/MAYA-PLAN-REPAIR-01-silent-plan-repair.md`,
  `tasks/archive/2026-07-15/MAYA-LEARNING-01-visible-memory.md`, and
  `tasks/archive/2026-07-15/STORY-SEQUENCE-01-triage.md`.

## Shipped from the 2026-07-13 machine continuation

- The **One Selfie Visibility Bundle** is the one attended July 13–15 commercial experiment: $97
  once, five lifetime tools, and a fixed 30-day/200-credit SUITE pass with no renewal. Its landing,
  fixed deadline, Stripe checkout, idempotent fulfillment, secure checkout-bound account setup,
  buyer home, expiry, attribution, annual continuation, three approval-only email drafts, and exact
  ManyChat/social runbook ship together. No unattended flash-sale schedule was added. Release record:
  `tasks/archive/2026-07-13/codex-one-selfie-visibility-bundle.md`.
- The **Start with one selfie** handoff now commits photo + Maya decides before opening the selfie
  manager. Continue goes directly to one recommended concept; the pre-result drawer no longer shows
  the format/style/shot-director/source/extra-angle/composer maze, and stale inspiration no longer
  auto-attaches. Release record: `tasks/archive/2026-07-13/codex-maya-one-step-first-photo.md`.
- Maya's first-result path now leads with one personalized recommendation, chooses one strongest
  Vault world by default, shows one concept before alternatives, records value only after a real
  download, and recommends one useful next move. Exact active work resumes, while in-flight renders
  cannot spill into another chat. The shipped spec is archived at
  `tasks/archive/2026-07-13/codex-maya-invisible-ai-first-result.md`.
- The replacement weekly Cowork brief completed its first real Monday run. Its payload contract is
  now validated before storage/email, this week's row is canonical, and Content/Shoot Studio readers
  no longer depend on the retired generator.
- The old weekly content engine, daily briefing intelligence layer, duplicate Product QA reporter,
  legacy scheduled-newsletter poller, and retired Brand Shoot checkout recovery are deleted after
  dependency audits. Historical data and active replacements remain.
- Paid-buyer trials are a distinct Activation Funnel source, and App v3 generation/download events
  now carry stable saved-asset IDs so retention can be tied to the exact result.
- The existing SUITE Day-7 email is behavior-gated to one-time creators who stalled, instead of being
  sent to every member on a calendar. No new campaign or email copy was added.
- The final North/OpenClaw/Telegram runtime was removed from the repo; the local zero-job OpenClaw
  gateway was stopped and disabled, and the secret scan now protects its token pattern.

## Shipped from the 2026-07-11 content-system audit

All three specs from that audit's Codex queue are live in production, in `tasks/archive/2026-07-11/`:
`CONTENT-BRIEF-JOBS-GATE-01` (`9dfb08df`), `CONTENT-BRIEF-UI-CLEANUP-01` (`2878de8c`),
`VAULT-DROP-AUTOSYNC-01` (`4f13e7fd`). The 17-collection Library-drop gap Codex's own post-deploy
audit flagged was backfilled the same day (`scripts/backfill-vault-library-drops.ts`) — 0 gaps
remain. See `content-system-audit-2026-07` in Claude's memory for the full audit and what's still
held.

## Shipped from the 2026-07-12 checkout diagnosis

`CHECKOUT-EMAIL-PASSTHROUGH-01` now carries each trial recipient into membership checkout with her
email already recognized. `MEMBERSHIP-RECOVERY-NO-DOWNGRADE-01` removes the trial-claim downgrade
from membership checkout recovery and returns abandoners to the prefilled paid checkout. Both specs
are archived under `tasks/archive/2026-07-12/` with focused regressions.

## Shipped from the 2026-07-12 growth-engine completion

- `ACTIVATION-FUNNEL-SCORECARD-01` is complete: `/admin/activation-funnel` now shows the seven real
  activation and retention steps, trials by source, mature 7/14-day denominators, and honest
  measurement limits. Its query was run successfully against production aggregate data.
- `WORK-WITH-ME-INSTRUMENTATION-01` is complete: landing views, application starts, successful
  applications, and failures are now measurable without changing the page or form.
- Membership checkout recovery no longer suppresses a paid-checkout reminder merely because the
  same person previously received a trial email. The in-app trial upgrade explicitly selects the
  monthly plan, and trial downloads in the revenue scorecard are limited to actual trial users.
- The failed no-card trial is no longer promoted to free AI Prompts or legacy free-guide leads.
  Included trials for paid Kit/Vault buyers remain active, creating a cleaner high-intent cohort
  without changing any customer's charge or taking away an already-claimed trial.
- The repo-hosted Instagram/ManyChat reply system was removed on 2026-07-12. The ManyChat Default
  Reply bridge and AI Replies are stopped, DM schedules are retired, and old reply approvals are
  invalid. Marketing keyword flows, including the verified WORK flow, remain live.
- The active sales machine is consolidated to PROMPT → $37 Prompt Vault, SELFIE → $37 Starter Kit,
  WORK → attended €2,000 offer, and activated buyers → €97/month SUITE. Selfie To Brand Shoot public
  sales are retired while historical access remains protected.
- `/admin/work-with-me` now owns the complete attended application-to-payment pipeline. Stripe closes
  the exact application as won without double-counting cash. The copy action verifies the Stripe
  session and replaces expired links without creating duplicate attempts.
- Known Prompt Vault, Starter Kit, and AI Photos Kit buyers receive their included SUITE trial at
  payment; guest buyers retain the claim link.
- The authenticated SUITE review prompt appears only after the third download and stores unpublished
  proof for moderation. The generic feedback widget and unsafe public feedback/review routes are gone.
- Seven retired Vercel schedules, all Codex business automations, and four obsolete Cowork task
  directories are removed. The running baseline is 21 repo schedules and three Cowork draft tasks.
- Presets guest fulfillment is repaired; the July 12 $39 order was reprocessed successfully and the
  webhook review queue returned to zero.
- Publicly exposed database and Stripe webhook credentials were rotated and removed from the current
  tree. A repository-wide secret regression test now blocks recurrence.

## GitHub baseline

The desired steady state is one remote branch: `main`, with no stale pull requests. Any temporary
branch must correspond to one current task and disappear after merge.
