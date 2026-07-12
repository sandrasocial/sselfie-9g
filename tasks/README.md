# Current Task Board

Last cleaned: 2026-07-12

This root contains only work that still needs a real-world decision, asset, or verification. Shipped,
superseded, obsolete, and completed code specs are archived under `tasks/archive/`.

## Operating rule

- Start from `origin/main` on a short-lived `codex/` branch.
- Do not revive an archived spec without verifying the current production code first.
- When work ships, move its spec to a dated archive in the same commit.
- Delete the merged task branch locally and remotely.

## Active queue

| Order | Task | What remains | Owner |
|---:|---|---|---|
| 1 | `DM-LAUNCH-01-live-qa.md` | Inbound is proven with five real post-repair ManyChat conversations. Review and approve one prepared reply, then confirm it arrives in Instagram. No code remains. | Sandra |

## Held, not active

- **Work With Me form redesign:** held until `WORK-WITH-ME-INSTRUMENTATION-01` has 1-2 weeks of real
  page-view/form-start/submit data — don't redesign an already-decent form on a guess.
- **Broader ManyChat flow hygiene:** the live WORK automation was verified in Sandra's signed-in
  account and renamed `WORK — Sprint Application` on 2026-07-12. Its triggers, first-name mapping,
  destination, and tracking parameters are correct. Older non-WORK flows can be audited separately;
  they do not block the active revenue path.
- **Trial engine redesign:** `grantSuiteTrial` (`lib/trial/suite-trial.ts`) creates a pure DB row —
  no card, no Stripe subscription, no default outcome at expiry. Plausibly the root cause behind the
  trial's 0/50 lifetime conversion (found 2026-07-11/12). Whether to require a card upfront (standard
  SaaS auto-convert pattern) is a real product/pricing decision, not a quick fix — held for Sandra.
  Trial users have never opened the Academy/course content, so there is no active course-library
  leakage to fix before making that decision.
- **Phase 2B content-engine deletion:** wait until `weekly-content-brief-draft` completes its first
  real Monday run on 2026-07-13 and the replacement IG drafting task has proven a real run. The old
  repo cron is disabled, so deleting the fallback early has no upside. **Bundle in:** deleting
  `lib/admin/daily-briefing-intelligence.ts` (confirmed zero callers, 2026-07-11 audit) in the same
  pass — same reasoning, same window.
- **Legacy `/studio` deletion:** not a cleanup shortcut. It needs a dedicated dependency audit because
  live Feed Planner and shared generation code still cross legacy directories.
- **Vault Club and broad redesigns:** remain gated by current funnel and operational proof.
- **Vault static-file consolidation (the harder half):** `VAULT-DROP-AUTOSYNC-01` (queued above) closes
  the Library-drops gap. What's still held: `lib/ai-prompts/prompt-data.ts` (the hand-authored static
  library behind `/prompt-vault`, `/ai-prompts`, `/selfie-to-brand-shoot`, and Maya's style tiles) stays
  a separate hand-maintained source from the DB `vault_collections`/`vault_prompts` Shoot Studio writes
  to. Collapsing that one touches revenue/checkout-adjacent pages and thousands of lines of curated
  copy — needs a dedicated design pass, not a quick spec. Not ready for Codex yet.
- **`sselfie-content-engine` plugin — full unregistration:** content risk is neutralized (all 9
  skill/command files overwritten with refusal stubs, 2026-07-11), but the plugin's actual
  registration couldn't be found in any Claude Code config this session could reach (`claude plugin
  list` doesn't show it; only usage-tracking data exists in `~/.claude.json`, no source entry).
  Sandra needs to remove it herself via the Cowork app's own plugin/skill settings.

## Verified shipped before this cleanup

The following root specs were archived on 2026-07-11 after code and test verification against
`origin/main`: App V3 generation reliability and live bugs, trial front door and activation events,
Maya Style Director and overlay memory, floating Maya/Photos UI, Content Carousel 01-04, Shoot
Taxonomy, Customer Photoshoot 01-02, Story Overlay, Story Sequence, Vault Story Collections, presets
order bump, Voice Loop, Employee roster, Needs-Me approval queue, and the superseded numbered-prompt,
Admin-Maya, and text-overlay plans.

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
- The ManyChat Default Reply bridge has received five real post-repair conversations. The live WORK
  automation is verified and clearly named. Automated sending remains off; one Sandra-approved
  reply is the only remaining live proof.

## GitHub baseline

The desired steady state is one remote branch: `main`, with no stale pull requests. Any temporary
branch must correspond to one current task and disappear after merge.
