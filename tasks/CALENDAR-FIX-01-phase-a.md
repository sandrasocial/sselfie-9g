# CALENDAR-FIX-01 — Suite Calendar Phase A trust repairs

Status: READY for Codex 2026-07-14 late. Build on a `codex/` branch NOW; **do not merge or
deploy before 2026-07-15 18:05 CEST** (One Selfie event close). Evidence + line numbers for
every item: `docs/audits/SUITE_CALENDAR_AUDIT_2026-07-14.md` (read it first — it is the
source of truth for this spec). P0-1 (public `/feed/[feedId]` page) is ALREADY sealed on
main (`d55e0faa`) — rebase on current main and do not re-open that page.

Context: the suite Calendar tab mounts the legacy Feed Planner client; these components also
serve the standalone `/feed-planner` route for paid-Blueprint buyers. Every change here must
keep BOTH mounts working. Audience is phone-first: verify member-visible fixes at 375px.

## Scope (in priority order)

1. **Post overlay must survive its own actions** (audit P0-2, Sandra's bug #1).
   `components/feed-planner/feed-modals.tsx:92-95` currently closes the post after EVERY
   successful `onUpdate`. Fix: the four actions in `feed-post-card.tsx` (regenerate `:215`,
   enhance `:176`, save caption `:275`, remove image `:57`) pass the updated post back
   through `onUpdate(updatedPost)`; the optimistic branch in
   `instagram-feed-view.tsx:716-735` then updates in place instead of falling through to the
   whole-feed `mutate(undefined, { revalidate: true })`. The overlay stays OPEN after
   caption actions. Also fix the stale toast copy at `feed-post-card.tsx:178-180`
   ("Refresh to see the update" — the update is already applied).

2. **Bound the post overlay; kill the scroll trap** (audit P0-3, Sandra's bug #2).
   `feed-modals.tsx:41-50` centers and scrolls on the same element with an unbounded card.
   Apply the sibling pattern (`feed-style-modal.tsx:249`): height-bound the CARD
   (`max-h-[calc(100dvh-…)]`), scroll inside it, backdrop stays a pure centerer. The Close
   control must remain reachable with a fully expanded caption on a 375px viewport.

3. **No control may leave /app for the retired legacy app** (audit P0-4).
   Replace all `window.location.href = "/studio#maya/feed"`:
   `feed-view-screen.tsx:235-241` (Back chip) and `:244-249` (Plan with Maya),
   `hooks/use-feed-actions.ts:190-195` (Regenerate in Maya via `feed-modals.tsx:63-74`),
   `feed-post-card.tsx:84-90` (Generate in Maya). Also `feed-planner-client.tsx:520-524`
   (wizard X ejects to standalone `/feed-planner`).
   In the suite mount: stay inside `/app` — use the shell's section switching /
   `FeedNavContext` / the `feed-tabs.tsx:104-108` fallback pattern (the nested
   `hooks/feed/use-feed-actions.ts:47` already does this correctly with `router.push`).
   In the standalone mount: a sensible in-product destination, never `/studio`.
   Any new visible button copy ships as DRAFT for Sandra.

4. **Bulk generation must survive its own runtime** (audit P0-5).
   `app/api/feed-planner/queue-all-images/route.ts` + `lib/feed-planner/queue-images.ts`:
   add `export const maxDuration = 300`; claim each post atomically before generating
   (copy the `generate-single` pattern, `route.ts:282-293`); charge credits PER successful
   post (or deduct upfront + refund failures — pick one and document in the PR); recovery
   for stuck `'generating'` rows (>10 min → `'failed'` with error note) so the grid stops
   accumulating zombies; progress the client can trust. Do NOT redesign the generation
   pipeline, prompts, or models.

5. **`mark-posted` route correctness** (audit P0-6).
   `app/api/feed/[feedId]/mark-posted/route.ts`: the bound string `"NOW()"` can never write
   a `timestamptz` (marking as posted has failed 100% of the time, ever) — bind a real
   timestamp; add ownership (post's `feed_layout` must belong to the resolved NEON user);
   route stays (future in-calendar "posted" toggle is an outcome metric we want), its old
   caller page stays sealed. Add a route test proving `posted_at` persists.

6. **Small P1 batch** (audit P1 list):
   - `feed-header.tsx:226`: scoped SWR mutate instead of `router.refresh()`.
   - Silent failures get error states: `feed-gallery-selector.tsx:33-49` (failed fetch must
     not render as "you have no photos"), `feed-view-screen.tsx:214-218` (expansion failure
     → toast).
   - Replace the four native `alert()`/`confirm()` calls (`feed-gallery-selector.tsx:105,167`,
     `feed-grid-item.tsx:96`, `feed-single-placeholder.tsx:290`) with the app's toast/dialog.
   - Calendar tab keeps its place: persist the selected feed across bottom-nav tab switches
     (`app-v3-shell.tsx:247-271` unmounts everything; minimal fix = persist `selectedFeedId`
     — open-post state may stay volatile).
   - Monthly draft cron (`app/api/cron/feed-plan-monthly-draft/route.ts:21,49-59`): add
     `ORDER BY`, and fix eligibility so a skipped month cannot permanently exclude a member
     (candidate = any access-holding user without a plan for THIS month; drop the
     "had-last-month" dependency). Keep `MAX_USERS_PER_RUN`.

7. **Mobile reorder fallback** (audit P1-5): HTML5 drag-and-drop does nothing on touch
   (`feed-grid-item.tsx:419-423`) and the audience is phones. Propose the simplest fallback
   (tap-to-select-then-tap-to-swap, or explicit reorder controls) as a small design note for
   Sandra's approval BEFORE building the UI; keep desktop DnD.

8. **Hygiene, separate commits** (audit Hygiene list): converge the duplicated
   `use-feed-actions`/`use-feed-polling` trees (`hooks/` vs `hooks/feed/`) on the correct
   behaviors; delete the stale pipeline doc-comment in
   `app/api/feed/[feedId]/generate-single/route.ts:1-34` (comment only — the code is live
   and correct); remove the unused `userId` prop plumbing (`feed-planner-view.tsx:103`,
   `feed-planner-client.tsx:18`); add unmount cleanup to `use-feed-confetti` timers and the
   stray timeout in `hooks/use-feed-polling.ts:99-136`. Do NOT delete any route or
   directory (CLAUDE.md dead-code map governs); leave dead routes untouched.

## Explicitly OUT of scope

Phase B (delivered finished month, Stories on the calendar, campaign-kit placement) — gated
on the campaign test read. New tabs/features/controls beyond the fixes above. Pricing or
marketing surfaces. Anything touching the live one-selfie event. Autonomous sends.

## Acceptance

- Manual repro checks at 375px, in the SUITE mount: open a post → enhance/regenerate/save
  caption → overlay stays open, caption updates in place, no full-grid flash. Expand a long
  caption → page scrolls, Close reachable. No tap anywhere in the calendar leaves `/app`
  (`grep -rn '"/studio' components/feed-planner app/feed-planner` → 0 live hits).
- Bulk generate on a 9-post feed: every post ends `'completed'` or `'failed'` (no
  `'pending'`/`'generating'` zombies), credits charged match successful posts.
- `mark-posted` round-trips (test asserts `posted_at` set and scoped to owner).
- Standalone `/feed-planner` still works for Blueprint buyers (both mounts smoke-checked).
- Full suite green + `pnpm type-check:ci` + `pnpm check:voice`; no em-dashes in UI copy; all
  new customer-visible copy marked DRAFT for Sandra.
