# CALENDAR-CLEAN-01 — legacy Feed Planner cleanup (no behavior change)

Status: READY for Codex — START NOW (Sandra reprioritized 2026-07-15 morning: calendar work
runs in parallel with CAMPAIGN-OUTCOME-01, not behind it). Phase A is merged to main and
deployed (2026-07-15 ~08:00 CEST) — PULL MAIN FIRST. Build on a `codex/` branch;
zero-behavior-change means it may merge as soon as all gates are green. Note: main enforces
LINEAR history (no merge commits) — land via cherry-pick/rebase. Evidence source for every
item: `docs/audits/SUITE_CALENDAR_AUDIT_2026-07-14.md` (route inventory + hygiene sections).

Goal: shrink and de-trap the ~8,300-line legacy Feed Planner surface WITHOUT changing any
member-visible behavior, so the later Phase B product upgrade (delivered month) builds on a
clean base instead of a haunted one.

## Hard rules

- ZERO member-visible behavior change. Every commit independently revertable.
- The standalone `/feed-planner` route (paid Blueprint buyers) and the suite Calendar tab
  share these components — both must keep working identically.
- CLAUDE.md's dead-code map currently marks the feed directories "never delete". This spec
  UPDATES that map (see item 1) with the 2026-07-14 audit evidence — Sandra's approval of
  this spec is the approval for that map update. Anything not listed below stays untouched.
- Full suite + `pnpm type-check:ci` green per commit; Phase A contract tests
  (`tests/calendar-phase-a-*.{ts,tsx}`) must stay green throughout.

## Scope

1. **Retire the 21 confirmed-dead API routes as explicit 410 stubs** (the codebase already
   has this exact pattern: `app/api/feed/add-more`, `app/api/feed/refresh-concepts`).
   Convert, do not delete: `feed/clear`, `feed/auto-generate` (crashes unconditionally on a
   nulled builder today), `feed/[feedId]/add-hashtags` (no auth + nonexistent column),
   `add-highlight-overlay`, `add-row`, `check-highlight`, `check-profile`,
   `generate-profile`, `highlight-image`, `profile-image`, `regenerate-post` (double-charge
   race if ever revived), `save-highlight-image`, `status` (no auth), `upload-profile-image`,
   `feed-planner/delete-strategy` (would wipe ALL the caller's feeds, not one),
   `feed-planner/generate-all-images` (triple-broken), `feed-planner/generate-batch`
   (auth-id bug class), `feed-planner/quick-start-complete`. Each stub: 410 + one-line
   comment pointing at the audit. Update CLAUDE.md's dead-code map to list these as
   "410-stubbed 2026-07 (audit-verified dead)".
2. **Delete the 8 dead `lib/feed-planner` modules** (zero importers, audit-verified):
   `scene-resolver.ts`, `prompt-shaper.ts`, `style-coherence-resolver.ts` (464 lines) plus
   its orphan test `lib/feed-planner/__tests__/coherence-resolver.test.ts`,
   `user-selection-mapper.ts`, `instagram-strategy-agent.ts`, `maya-prompts-v2.ts`,
   `generation-helpers.ts`, `database-loader.ts`. Re-verify zero importers with a fresh
   grep before each deletion (the audit is a day old).
3. **Delete the ~350 lines of commented-out "OLD SYNCHRONOUS PROCESSING CODE"** inside
   `app/api/feed-planner/create-from-strategy/route.ts` (lines ~862-1211 pre-Phase-A).
4. **Remove the three pointless 100ms sleeps** in the `app/api/feed/[feedId]/route.ts`
   DELETE handler (audit: `feed_strategy` has ON DELETE CASCADE; the sleeps guard nothing).
5. **Finish the hook-tree convergence Phase A started**: one `use-feed-actions` and one
   `use-feed-polling` (keep the corrected behaviors), delete the duplicate tree, update the
   two consumer imports (`instagram-feed-view.tsx`, `feed-preview-card.tsx`).
6. **Remove dead UI branches** (verify each with a fresh grep first):
   `FeedPostsList` posts-tab render that is unreachable for every paid/membership user
   (`feed-tabs.tsx` redirects `posts`→`grid`), retired free-funnel branches marked by the
   "FREE FUNNEL RETIRED (Sandra, 2026-07-07)" comments, `use_feed_planner_v2` flag mentions
   (all-true since 2026-01-20, frontend hardcodes true), and remaining `"maya-blank"` gate
   references in `maya-concierge.tsx` (nothing constructs that id anymore).
7. **Sweep stale comments that lie about architecture** (the audit's P1-4 class): anything
   naming scene-resolver/prompt-shaper pipelines, "Claude Sonnet 4.5" model comments where
   the map says otherwise, and the `feed-view-screen.tsx` comments describing behavior
   Phase A changed.

## Explicitly OUT of scope

Phase B product upgrade (delivered finished month, Stories on calendar, campaign-kit
placement) — separate decision gated on the campaign read. Any redesign of
`instagram-feed-view.tsx`/`feed-header.tsx` internals beyond dead-branch removal. Any change
to `lib/maya/feed-generation-handler.ts` (shared with live Feed Planner hooks). Any change
to credits, generation pipeline behavior, or route auth beyond stubbing dead routes.

## Acceptance

- `git grep` proof in the PR that each deleted module/branch had zero live importers.
- Full suite + type-check green; Phase A contract tests green; `pnpm check:voice` green.
- Suite Calendar tab and standalone `/feed-planner` both smoke-checked (grid, open post,
  caption action, bulk generate, style change) with zero behavior diffs.
- CLAUDE.md dead-code map updated in the same PR.
- Net line count of `components/feed-planner` + `app/api/feed*` + `lib/feed-planner`
  reported before/after in the PR description.
