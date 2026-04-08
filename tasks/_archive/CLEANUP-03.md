# 🟢 CODEX TASK: CLEANUP-03
**Created:** 2026-02-20 by Claude (AI Director)
**Priority:** MEDIUM — Clean execution based on confirmed audit findings
**Pre-condition:** Read STATUS.md first. Confirm CLEANUP-02 is marked complete.

---

## CONTEXT

CLEANUP-02 gave us the map. We know exactly what's dead and why.
This task executes the deletions the audit confirmed are safe.

No new discoveries needed — just clean execution of confirmed findings.

---

## YOUR 4 TASKS IN ORDER

---

### TASK 1 — DELETE 2 DEAD MAYA HEADERS (10 min)

The audit confirmed these two files have zero imports anywhere in the codebase:
- `components/sselfie/maya/maya-header-unified.tsx`
- `components/sselfie/maya/maya-header-old.tsx`

The live header is `components/sselfie/maya/maya-header.tsx` — do NOT touch this.

**What to do:**
1. Double-check with a quick grep: `grep -r "maya-header-unified\|maya-header-old" app/ components/ lib/ --include="*.ts" --include="*.tsx"`
2. If zero results → delete both files
3. If anything imports them → stop, note in STATUS.md, do not delete
4. Run `pnpm type-check` — note any new errors (pre-existing errors are already known)

---

### TASK 2 — DELETE 5 DEAD FEED-PLANNER COMPONENTS (15 min)

The audit confirmed these have zero imports:
- `components/feed-planner/bulk-generation-progress.tsx`
- `components/feed-planner/feed-grid-preview.tsx`
- `components/feed-planner/feed-strategy-panel.tsx`
- `components/feed-planner/strategy-preview.tsx`
- `components/feed-planner/buy-blueprint-modal.tsx`

Note: `buy-blueprint-modal.tsx` is shadowed by `components/sselfie/buy-blueprint-modal.tsx` — the sselfie version is live, the feed-planner version is dead.

**What to do:**
1. Quick grep for each filename to confirm no imports:
   `grep -r "bulk-generation-progress\|feed-grid-preview\|feed-strategy-panel\|strategy-preview" components/feed-planner/ components/sselfie/ app/ --include="*.ts" --include="*.tsx"`
   `grep -r "feed-planner/buy-blueprint-modal" app/ components/ --include="*.ts" --include="*.tsx"`
2. Delete confirmed dead files
3. If any file has imports → skip it, note in STATUS.md
4. Run `pnpm type-check` after deletions

---

### TASK 3 — FIX PLAYWRIGHT TEST SPECS (20 min)

Two test files reference the deleted `/api/testing/stripe-mock` endpoint:
- `tests/paid-user-flow.spec.ts`
- `tests/complete-blueprint-flow.spec.ts`

**What to do:**
1. Open both files and find every reference to `/api/testing/stripe-mock`
2. The mock endpoint is gone — these tests can't run as written
3. Options (pick the right one based on what the test actually does):
   - If the test is testing real Stripe checkout flow → replace mock with a note that this requires a real Stripe test environment and skip the mock call
   - If the test is purely mocking payment → stub the fetch call at the test level using Playwright's `page.route()` to intercept and return a fake 200 response
4. Make the minimum change to stop the test from failing due to the missing endpoint
5. Do NOT rewrite the whole test — just fix the broken reference

---

### TASK 4 — SPLIT feed-preview-card.tsx (45 min)

The audit flagged `components/feed-planner/feed-preview-card.tsx` at **1,427 lines** mixing 6 different concerns:
1. Persistence restore
2. SWR polling
3. Unsaved → saved conversion
4. Queue-all generation orchestration
5. Modal/image preview UX
6. UI rendering

This is the component that makes the feed planner hard to maintain and debug.

**What to do — split into 4 files:**

`hooks/feed/useFeedPolling.ts`
- SWR polling logic
- Persistence restore
- Status checking

`hooks/feed/useFeedActions.ts`
- Unsaved → saved conversion
- Queue-all generation orchestration
- Action handlers (save, generate, reorder)

`components/feed-planner/feed-preview-image-modal.tsx`
- Modal/image preview UX
- Image selection, lightbox
- Extract from the card

`components/feed-planner/feed-preview-card.tsx` (kept, but slimmed)
- UI rendering only
- Imports from the hooks above
- Target: under 300 lines

**Rules:**
- Keep the same external API (props in, same callbacks out) — nothing that imports this component should need to change
- Run `pnpm type-check` after
- Test that the feed planner still loads correctly in dev (`pnpm dev`)
- If the split gets complicated → do hooks only (Tasks 1+2) and leave the modal extraction for CLEANUP-04. Don't break it trying to be thorough.

---

## DEFINITION OF DONE

Update STATUS.md:

```
## Last Updated: [timestamp]
## Last Task: CLEANUP-03 complete

## What's Confirmed Live in Production
[update — add what was deployed]

## What's Broken / Unconfirmed
[anything found or skipped]

## Currently In Progress
Nothing — awaiting next task from Claude

## Next Task
Claude to assess whether Phase 4 (email rebuild) starts now
or if CLEANUP-04 is needed first

## Blocked On Sandra
[anything needing a decision]
```

---

## WHAT YOU MUST NOT DO

- Do NOT touch `maya-header.tsx` (the live one)
- Do NOT touch `maya-chat-screen.tsx` or `maya-chat-interface.tsx`
- Do NOT change any email code
- Do NOT touch Pro Mode or Classic Mode logic
- Do NOT start A-01 (Academy) — Phase 4 first
- If Task 4 (split) risks breaking the feed planner → do only the hooks, stop, report

---

## IF YOU GET STUCK

Write your blocker clearly in STATUS.md and stop.
Do not guess. Do not proceed past a blocker.
