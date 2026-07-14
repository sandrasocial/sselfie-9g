# Suite Calendar (Feed Planner) — Complete Audit, 2026-07-14

Status: AUDIT ONLY — no code changed. Requested by Sandra after member-visible bugs
(caption action closes the post + apparent full refresh; expanded caption traps scroll).
Method: two independent code sweeps (UI layer ~8,300 lines; API layer ~60 routes) plus
live Neon usage queries; every P0 verified first-hand in the code before inclusion.

## What the calendar actually is

The suite Calendar tab (`components/app-v3/feed-planner-view.tsx:103`) mounts the ENTIRE
legacy Feed Planner client (`app/feed-planner/feed-planner-client.tsx` →
`components/feed-planner/*`) — the same code that serves the standalone paid-Blueprint
`/feed-planner` route. It predates the App v3 quality bar. Fixing components here upgrades
both surfaces at once.

## Usage truth (Neon, 2026-07-14)

- 323 feed plans ever, 68 distinct users; only 4 plans created in the last 30 days.
- 2,748 planned posts ever: 72% have captions (captions work), **14% ever got an image**,
  82% sit `generation_status='pending'` forever, 28 stuck `'generating'`, 64 `'failed'`.
- **0 posts ever marked as posted** (route also turns out to be broken — see P0-4).
- **1 photo ever placed from Maya chat** ("Add to calendar" was silently 403-broken until
  the 2026-07-13 fix, commit 2c41ac1a).
- Of 55 active-subscription users (incl. trials/owners), 14 have a plan, 12 ever filled a post.
- The new monthly auto-draft system has 2 `period_month` rows total (its cron skipped
  everyone until 2c41a1c4^ fix; first real run pending).

Read: members plan captions, then abandon at the image step; nothing closes the loop to
"posted". The calendar assigns homework instead of delivering a finished month. That is
the product problem underneath the bugs.

## P0 — fix first (all verified in code first-hand)

### P0-1 · SECURITY: public page exposes any member's feed — SEALED 2026-07-14
`app/feed/[feedId]/page.tsx` (all 90 lines) had **zero authentication and zero ownership
check**: by code, anyone logged out loading `/feed/57`…`/feed/1629` (sequential ids, 323
rows) would get that member's Instagram handle, full/business name, every caption, every
image URL, bio, highlights. Live-prod verification (2026-07-14 22:45) found every id
404s — NOT by protection but by accident: the Next 16 async-params migration left `params`
un-awaited, so the id never resolved and the catch → notFound() fired for all requests.
Broken-closed by luck; any refactor adding the missing `await` would have opened it.
**Resolution (Sandra-approved): sealed deliberately — unconditional `notFound()` with an
explanatory comment, main commit `d55e0faa` (zero behavior change: 404 stays 404).** If a
publishing hub returns, it lives inside the authed suite Calendar. Its child POST
`mark-posted` remains reachable by any authed user and unscoped — see P0-6, fixed in
Phase A.

### P0-2 · Her bug #1: any caption action closes the post and re-renders the grid
`components/feed-planner/feed-modals.tsx:92-95` wires the opened-post card as
`onUpdate={async () => { await onUpdate(); onClosePost() }}` — EVERY successful action
(regenerate caption `feed-post-card.tsx:215`, enhance caption `:176`, save caption `:275`,
remove image `:57`) closes the overlay. And because those callers pass no post payload,
`instagram-feed-view.tsx:716-740` skips its optimistic branch and runs
`mutate(undefined, { revalidate: true })` — a whole-feed refetch. Modal slams shut + full
grid re-render = experienced as "the entire page refreshed and I'm out of the post."
Bonus defect: the success toast says "Refresh to see the update" (`feed-post-card.tsx:178`)
— stale copy from before auto-refresh existed.
Fix: pass the updated post back through `onUpdate(updatedPost)`, use the existing
optimistic-update branch, and only close the modal for actions that must close it
(none of the caption actions).

### P0-3 · Her bug #2: expanded caption traps scroll in the post overlay
`components/feed-planner/feed-modals.tsx:41-50`: the backdrop is
`fixed inset-0 flex items-center justify-center overflow-y-auto` and the inner card has NO
height bound or internal scroll. Centering + scrolling on the same element with unbounded
content is the classic trap: once "…more" expands the caption past viewport height, the top
of the card — including the Close button at `-top-12` — becomes unreachable (worst on
mobile WebKit). Six of the seven sibling modals already do this correctly (e.g.
`feed-style-modal.tsx:249` uses `max-h-[calc(100dvh-8rem)] overflow-hidden` + inner
scroll). Fix: bound the card (`max-h`) and scroll INSIDE it, same as siblings.

### P0-4 · Four live controls hard-navigate to the retired app (dead end)
All unconditional `window.location.href = "/studio#maya/feed"` — full browser unload, all
/app state lost, destination tab is hardcoded disabled:
- "Back" chip, shown on every normal calendar view: `feed-view-screen.tsx:235-241` via
  `feed-header.tsx:469-476`.
- "Regenerate in Maya" on any post with an image: `hooks/use-feed-actions.ts:190-195` via
  `feed-modals.tsx:63-74`.
- "Generate in Maya" on empty posts: `feed-post-card.tsx:84-90` (reachable for members via
  Week view — `feed-week-view.tsx:59-65` makes every card clickable with no completeness
  gate, unlike Grid view).
- "Plan with Maya" on the no-feed placeholder for suite members: `feed-view-screen.tsx:244-249`.
Also in this class (P1 severity): the onboarding wizard's X close ejects to standalone
`/feed-planner` (`feed-planner-client.tsx:520-524`), leaving /app entirely.
Fix: route through the App v3 shell (Maya section / creationIdea channel / FeedNavContext
pattern — `feed-tabs.tsx:104-108` already shows the correct fallback pattern). Note the
nested duplicate hook `hooks/feed/use-feed-actions.ts:47` already does this correctly with
`router.push` — the two hook trees have diverged (see Hygiene).

### P0-5 · Bulk generation: near-certain timeout with credits deducted only at the end
`app/api/feed-planner/queue-all-images/route.ts` (LIVE: main "Generate Feed" action) has
NO `maxDuration` override while `lib/feed-planner/queue-images.ts:289,467` sleeps 11s
between every post (≥88s pure sleep for 9 posts) and `deductCredits` runs ONCE after the
whole loop (`:505`). A mid-loop function kill leaves: real Replicate spend with zero
credits deducted, remaining posts stuck 'pending', the member staring at a hung request.
This matches the DB (82% pending, 28 stuck 'generating'). Contrast: `generate-single`
does an atomic claim + explicit `maxDuration` — the correct in-repo pattern.
Fix: `maxDuration`, per-post claim + per-post deduction (or deduct-then-refund), stuck-
'generating' recovery, progress the client can trust.

### P0-6 · "Mark as posted" has never worked
`app/api/feed/[feedId]/mark-posted/route.ts:17-21` binds the literal STRING "NOW()" into a
`timestamptz` parameter — Postgres rejects it, so marking as posted ALWAYS 500s (matches
the 0-ever-posted data). The caller (`feed-publishing-hub.tsx:112-121`) sets optimistic
state and never checks the response — silent failure. Also no ownership check. Fix:
`NOW()` as SQL (or `new Date()`), ownership scoping, caller checks response. "Did she
post it" is exactly the outcome the strategy needs measurable, so fix rather than retire.

## P1 — degrades trust/UX

1. `router.refresh()` on feed-style change re-runs the whole /app server tree
   (`feed-header.tsx:226`); should be a scoped SWR mutate.
2. Tab-switch amnesia: leaving Calendar unmounts everything (`app-v3-shell.tsx:247-271`);
   selected feed + open post reset. Keep mounted (hidden) or persist selection.
3. Silent failures: gallery selector fetch (`feed-gallery-selector.tsx:33-49` — empty grid
   with no error), feed expansion (`feed-view-screen.tsx:214-218` — console only).
4. Native `alert()`/`confirm()` in 4 places (gallery x2, grid stop-generation x2) — jarring,
   off-brand; replace with app toasts/dialogs.
5. Mobile drag-to-reorder does nothing: HTML5 DnD doesn't fire on touch
   (`feed-grid-item.tsx:419-423`); audience is phone-first. Needs tap-to-swap or arrows.
6. Monthly draft cron: no `ORDER BY` before `LIMIT 50`, and a skipped user never
   re-qualifies (candidate rule requires last month's plan) — coverage silently shrinks
   (`app/api/cron/feed-plan-monthly-draft/route.ts:21,49-59`). Low impact at current scale;
   fix eligibility rule when touched.
7. Misleading toast copy after enhance ("Refresh to see the update").
8. `download-bundle` route: heaviest I/O in the set, no `maxDuration`.

## Hygiene (no member impact today, cheap to clean when touched)

- ~21 dead API routes confirmed caller-less (incl. `generate-batch` with a live example of
  the auth-id bug class; `generate-all-images` triple-broken; `delete-strategy` which
  would wipe ALL the user's feeds; `add-hashtags` referencing a nonexistent column;
  `auto-generate` that crashes unconditionally on a nulled builder). Inventory in audit
  agents' output; CLAUDE.md forbids deletion of the feed directories — mark/stub instead.
- 8 dead `lib/feed-planner` modules (incl. 464-line `style-coherence-resolver.ts` + its
  test); ~350 lines of commented-out code inside `create-from-strategy/route.ts`.
- Two diverged copies of `use-feed-actions` / `use-feed-polling`
  (`hooks/` vs `hooks/feed/`) — one has the /studio bug, the other the correct router.push.
  Converge on one.
- Stale doc-comment in `generate-single/route.ts:1-34` naming a pipeline that no longer
  exists (scene-resolver etc.) — actively misleading for future work.
- `use_feed_planner_v2` flag is not a real branch anymore (all-true since 2026-01-20,
  frontend hardcodes true) — retire mentions.
- `userId=""` prop into FeedPlannerClient is unused dead surface.
- Confetti + one polling timeout lack unmount cleanup (cosmetic).

## Verified solid (do not re-audit)

Body-scroll lock hook; per-post polling hook; the OTHER six modals' height/scroll
handling; FeedNavContext in-place feed switching; this-week strip; credits ledger
atomicity (`deductCredits` CTE); `generate-single`'s atomic claim pattern; auth-id
handling is CORRECT in all live routes (the two broken ones are dead); no render-time
hydration hazards found.

## Product read: how the calendar becomes valuable (proposal, needs Sandra's decision)

The data says members stall exactly where the calendar switches from delivering (captions
appear) to assigning (generate each image yourself, mark it posted yourself). Aligned with
the 2026-07-14 decision contract (deliver outcomes, don't assign homework):

- Phase A (now): repair trust — everything above. The calendar must not throw her out of
  posts, trap scroll, dead-end to /studio, or hang on generation.
- Phase B (after the campaign gate reads, ~Jul 18+): flip the model — the month arrives
  FINISHED. Maya's auto-draft delivers photos already generated for person slots (or first
  week), each day = copy caption + download image + one "posted" tap; Stories included;
  campaign-kit outputs land on calendar days. This is the Monthly-Drop shape and shares
  its fulfillment machinery with the $97 campaign product — build once, use twice.

Phase A is spec-ready for Codex on Sandra's go (build now on a codex/ branch, merge after
the 2026-07-15 18:05 CEST freeze lifts; P0-1 security gate is the one candidate for an
immediate surgical cherry-pick to main, pending Sandra's word).
