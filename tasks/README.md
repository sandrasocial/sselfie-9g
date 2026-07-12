# Current Task Board

Last cleaned: 2026-07-11

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
| 1 | `ACTIVATION-FUNNEL-SCORECARD-01.md` | Build the 7-step activation scorecard admin view from events that already exist — reporting, not new instrumentation. Ready now. | Codex |
| 2 | `WORK-WITH-ME-INSTRUMENTATION-01.md` | Zero analytics on the Work With Me page/form — instrument before redesigning anything. Ready now. | Codex |
| 3 | `DM-LAUNCH-01-live-qa.md` | Send one non-keyword test DM after the 2026-07-11 bridge repair, reply from admin, and confirm it arrives. Native replies are already proven; historical backlog import stays paused. | Sandra + Codex |

## Held, not active

- **Work With Me form redesign:** held until `WORK-WITH-ME-INSTRUMENTATION-01` has 1-2 weeks of real
  page-view/form-start/submit data — don't redesign an already-decent form on a guess.
- **ManyChat flow content/link verification:** the public API only returns the flow list (name +
  namespace), not flow content or destination URLs — confirmed 2026-07-12 (`getFlow` 404s on every
  namespace tried). One flow worth a look: "Untitled," created 2026-07-10, no name. Full link/URL
  verification needs an attended browser session with Sandra's ManyChat login.
- **Trial engine redesign:** `grantSuiteTrial` (`lib/trial/suite-trial.ts`) creates a pure DB row —
  no card, no Stripe subscription, no default outcome at expiry. Plausibly the root cause behind the
  trial's 0/50 lifetime conversion (found 2026-07-11/12). Whether to require a card upfront (standard
  SaaS auto-convert pattern) is a real product/pricing decision, not a quick fix — held for Sandra.
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

## GitHub baseline

The desired steady state is one remote branch: `main`, with no stale pull requests. Any temporary
branch must correspond to one current task and disappear after merge.
