# SUITE Wave 1 control inventory

Date: 2026-07-18
Baseline: `origin/main` at `5cec1b0f8b471c226afa2af0da8ff7e2fec3cea2`
Scope: Create and Calendar release stabilization only

This is the independent Workstream C QA map. It separates deterministic local coverage from the
authenticated desktop/mobile production journey. A local passing test is not evidence that a live
member session, browser console, network, database persistence, or provider response is healthy.

## Evidence levels

- **Independent automated**: exercised in `tests/suite-wave1-independent-interactions.test.tsx`.
- **Owner automated**: implementation-agent coverage; review the final branch diff and local gate.
- **Production manual**: requires the clean authenticated QA user after deployment.
- **Gap**: no release evidence yet; do not call complete.

## Member-state matrix

| State | Create evidence required | Calendar evidence required | Release evidence |
|---|---|---|---|
| New member | First-selfie guidance only when no usable identity; New, Inspiration, and typed request remain understandable | Empty grid teaches first-feed path; guide matches Grid + Maya | Owner automated + production manual |
| Returning member | Server-confirmed primary selfie survives hydration success, delay, failure, refresh, New, and history reopen | Current feed and selected post survive reload; saved direction/context return | Owner automated + production manual |
| Empty data | Gallery/Create empty state has one working keyboard/touch action | Empty Calendar has a working first-feed action and recoverable create failure | Independent automated for Gallery; owner + production for Calendar |
| Partial data | Missing identity slots do not erase the usable primary; partial creative history still opens | Image-only, caption-only, pending, generating, and failed posts expose the correct next action | Owner automated + production manual |
| Completed data | Result, favorite, fullscreen, Gallery, history, and Saved Looks remain consistent after reload | Ready posts open predictably; single/bulk actions do not overwrite completed work | Owner automated + production manual |

## Create controls

| Control/state | Promised interaction | Evidence | Status |
|---|---|---|---|
| New | Starts fresh creative work without deleting saved identity | Owner tests + production reload | Pending final gate |
| Inspiration | Opens the inspiration path and preserves identity | Owner tests + production mobile/desktop | Pending final gate |
| Tell Maya what you need | Sends once; visibly disables while busy | Owner tests + console/network production check | Pending final gate |
| History row / thumbnail | Reopens non-current work; Close closes; failure is visible | Owner tests + reload production check | Pending final gate |
| For You | Performs a real action rather than acting as a dead anchor | Owner tests + production click | Pending final gate |
| Saved Looks | Opens Gallery directly in Favorites | Owner tests + production navigation/reload | Pending final gate |
| Memory entry | Opens the member-readable memory surface | Owner tests + production keyboard/focus | Pending final gate |
| Gallery favorite | Optimistic selected state, accessible `aria-pressed`, one in-flight request, rollback/error | Independent automated | Resolved: W1-C-001, W1-C-002 |
| Gallery empty Create | Keyboard-operable and at least 44px high | Independent automated | Resolved: W1-C-003 |
| Gallery load Retry | Failed request announces an alert; Retry restores server-backed assets | Independent automated | Pass |

## Calendar controls

| Control/state | Promised interaction | Evidence | Status |
|---|---|---|---|
| Current guide | Describes current Grid + Maya flow without obsolete tabs | Owner tests + production content check | Pending final gate |
| Direction save | Saves once, exposes failure, and returns after reload | Owner tests + production reload | Pending final gate |
| State-aware suggestion | Empty/partial/ready/failed slot produces a truthful next action | Owner behavioral tests + production state matrix | Pending final gate |
| Post open | Tap/click and keyboard open the same detail surface; Maya selection remains explicit | Owner tests + desktop/mobile production | Pending final gate |
| Single image/caption | Uses only the current engine and preserves credit protections | Owner route/interaction tests + network production check | Pending final gate |
| Bulk image/caption | Explicit choices; visible progress; blocks concurrent submit | Independent automated + owner per-slot tests | Pass for concurrent-submit contract |
| Bulk API failure/retry | Announces the server error, re-enables the action, and permits explicit retry | Independent automated | Pass |
| Per-slot queued/generating/ready/failed | State is labelled and associated with the affected post; failed post has Retry | Owner behavioral tests + production state matrix | Pending final gate |
| Legacy model boundary | Calendar never offers/defaults legacy; eligible legacy use requires explicit Account action | Independent Account interaction + owner route tests | Pass for Account opt-in; route needs final gate |

## Accessibility and responsive release checks

Run at desktop and mobile widths, with keyboard-only operation on desktop:

- All controls have a unique accessible name and expose selection/expanded/busy state.
- Focus enters dialogs predictably, stays trapped, closes with Escape, and returns to the trigger.
- No critical action is hover-only or removed on mobile.
- Tap targets are at least 44 by 44 CSS pixels, including icon controls and empty-state actions.
- Status and errors use an appropriate live region or alert without stealing focus.
- Text remains readable at 200% zoom and no horizontal overflow hides controls.

## Persistence, failure, and concurrency release checks

- Hard reload during identity hydration delay/failure, active Create work, completed result, favorite,
  selected Calendar post, direction save, and failed generation.
- Double-click/tap every credit-using, favorite, save, retry, and bulk control while its first request
  is pending; confirm one request or an explicit idempotent server response.
- Force 401, 402, 409, 429, 500, offline rejection, slow response, and malformed JSON where supported.
- Confirm zero unexpected failed requests, uncaught console errors, and unhandled promise rejections.
- Confirm a failed optimistic mutation visibly rolls back and does not change again after reload.

## Resolved deterministic defects

### W1-C-001 — Favorite selected state is not exposed

`components/app-v3/gallery-view.tsx` changes the label/icon but the favorite button has no
`aria-pressed`. A screen-reader user cannot determine whether the image is currently saved.

Resolved with an explicit pressed state on Gallery and the shared result/fullscreen Favorite
control. Covered by `tests/suite-wave1-create-favorites.test.tsx` and
`tests/suite-wave1-independent-interactions.test.tsx`.

### W1-C-002 — Favorite double-submit is not blocked

Two clicks while the first `/api/app-v3/gallery/favorite` request is unresolved produce two POSTs.
The second mutation can race the first and leave client/server favorite state inconsistent.

Resolved with a synchronous in-flight guard, disabled pending state, optimistic rollback, and
cross-surface state event. Covered by `tests/suite-wave1-create-favorites.test.tsx`,
`tests/suite-wave1-favorite-cross-surface.test.tsx`, and
`tests/suite-wave1-independent-interactions.test.tsx`.

### W1-C-003 — Gallery empty-state Create target is below the 44px contract

The rendered `Create with Maya` button is keyboard-operable, but has no `h-11`, `min-h-11`, or
larger equivalent. Its current typography and vertical padding do not guarantee a 44px target.

Resolved with a guaranteed 44px minimum target. Covered by
`tests/suite-wave1-independent-interactions.test.tsx`.

### W1-C-004 — Historical prediction ID overrides a ready image

A completed post can retain its provider prediction ID. Maya previously treated any prediction ID
as active even when the post already had a visible image, so a ready post could receive an
in-progress next action. Resolved by making the visible image authoritative. Covered by
`tests/calendar-maya-workspace.test.tsx`.

### W1-C-005 — Credit-stopped bulk posts remain queued

When a 402 or 429 response stopped new bulk image requests, posts that never started could remain
labelled `Queued` after the operation ended. Resolved by moving every untouched slot to a failed,
retryable terminal state and retaining the explanatory error. Covered by
`tests/calendar-current-engine-and-bulk.test.tsx`.

## QA-engine repair

`scripts/maya-ui-health-engine.mjs` referenced the retired
`components/feedback/feedback-button.tsx` and `tests/feedback-button.test.tsx`. The new
`tests/maya-ui-health-engine-control.test.ts` prevents those dead controls from returning. After
removing only those stale checks, `pnpm audit:maya-ui-health` reports zero failed checks.

## Production sign-off record

Record device/browser, account state, request/response evidence, console result, persistence after
reload, and defect ID for every failure. Do not mark the production gate complete from screenshots
alone.
