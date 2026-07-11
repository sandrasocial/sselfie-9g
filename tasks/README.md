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
| 1 | `SHOOT-STUDIO-02-live-drop-qa.md` | Publish and verify the next real Shoot Studio drop across Vault, free previews, Library, Maya, and drop-email preview/delivery. | Sandra + Codex for defects |
| 2 | `DM-LAUNCH-01-live-qa.md` | Prove the attended ManyChat/native Instagram receive-and-reply paths. Historical backlog import remains intentionally paused. | Sandra |
| 3 | `VISIBILITY-TO-PAID-01-warm-audience-offer.md` | Finish the offer/product decision and write a fresh implementation spec only after that decision is approved. | Sandra + Claude |

## Held, not active

- **Phase 2B content-engine deletion:** wait until `weekly-content-brief-draft` completes its first
  real Monday run on 2026-07-13 and the replacement IG drafting task has proven a real run. The old
  repo cron is disabled, so deleting the fallback early has no upside.
- **Legacy `/studio` deletion:** not a cleanup shortcut. It needs a dedicated dependency audit because
  live Feed Planner and shared generation code still cross legacy directories.
- **Vault Club and broad redesigns:** remain gated by current funnel and operational proof.

## Verified shipped before this cleanup

The following root specs were archived on 2026-07-11 after code and test verification against
`origin/main`: App V3 generation reliability and live bugs, trial front door and activation events,
Maya Style Director and overlay memory, floating Maya/Photos UI, Content Carousel 01-04, Shoot
Taxonomy, Customer Photoshoot 01-02, Story Overlay, Story Sequence, Vault Story Collections, presets
order bump, Voice Loop, Employee roster, Needs-Me approval queue, and the superseded numbered-prompt,
Admin-Maya, and text-overlay plans.

## GitHub baseline

The desired steady state is one remote branch: `main`, with no stale pull requests. Any temporary
branch must correspond to one current task and disappear after merge.
