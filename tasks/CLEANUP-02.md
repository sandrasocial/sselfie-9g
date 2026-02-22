# 🔵 CODEX TASK: CLEANUP-02
**Created:** 2026-02-20 by Claude (AI Director)
**Priority:** HIGH — Do after CLEANUP-01 is confirmed complete
**Pre-condition:** Read STATUS.md first. Confirm CLEANUP-01 is marked complete.

---

## CONTEXT

CLEANUP-01 is done. The app is cleaner. Now we need to understand exactly what's live
for users — because we have duplicate components and we don't know which ones are
actually being rendered. No deletions until we know what's safe.

This task is **audit-first, delete-second**. Report findings before cutting anything.

---

## YOUR 4 TASKS IN ORDER

---

### TASK 1 — FIX BROKEN ADMIN NAV LINKS (15 min)

STATUS.md flagged this: the admin dashboard still has links/redirects to pages we deleted
in CLEANUP-01:
- `/admin/project-tracker`
- `/admin/feed-styles-v2`

And potentially others from the deleted list:
- `/admin/content-templates`
- `/admin/fashion-styles`
- `/admin/libraries`
- `/admin/journal`
- `/admin/content-engine`
- `/admin/generation`
- `/admin/marketing`
- `/admin/exit-impersonation`

**What to do:**
1. Search the entire codebase for links/hrefs/redirects pointing to any of the above paths
2. For each one found: remove the link or replace with a comment `// removed in CLEANUP-01`
3. Check `components/admin/admin-nav.tsx` specifically — this is the most likely culprit
4. Deploy fix

---

### TASK 2 — MAYA COMPONENT AUDIT (report only, no deletions yet)

There are 3 Maya header components. We need to know which one users actually see.

Files to investigate:
- `components/sselfie/maya/maya-header-unified.tsx` — 1044 lines
- `components/sselfie/maya/maya-header.tsx` — 886 lines
- `components/sselfie/maya/maya-header-old.tsx` — 127 lines

Also:
- `components/sselfie/maya-chat-screen.tsx` — 3546 lines (massive)
- `components/sselfie/maya/maya-chat-interface.tsx` — 1189 lines

**What to do:**
1. Find what imports/renders each Maya header — trace back to the page that users land on
2. Find the main app entry point for Maya (likely `app/` somewhere or `sselfie-app.tsx`)
3. Determine: which header is live? Which are dead?
4. Same for maya-chat-screen vs maya-chat-interface — which one is rendered?
5. Write findings to STATUS.md under a new section: `## Maya Component Audit`

**Do NOT delete anything yet. Report only.**

Format your finding clearly:
```
## Maya Component Audit
- Live header: [filename]
- Dead headers: [filenames] — safe to delete
- Live chat component: [filename]
- Dead chat components: [filenames] — safe to delete
- Notes: [anything unexpected]
```

---

### TASK 3 — DELETE SAFE DEAD API ROUTES (30 min)

These routes are safe to delete — they are test/debug/dev-only routes that should
never be in production and are not called from anywhere in the app:

**Delete these entire directories:**
- `app/api/debug/` (entire directory)
- `app/api/test/` (entire directory)  
- `app/api/testing/` (entire directory)
- `app/api/test-sentry-simple/` (if exists as directory)
- `app/api/stripe/create-test-coupon/`
- `app/api/stripe/test-checkout/`
- `app/api/stripe/cleanup-products/`
- `app/api/sentry-status/`

**Before deleting each one:**
- Confirm no page or component imports from it
- If anything imports it, note in STATUS.md and skip that one

**After deleting:** run `pnpm type-check` and note any new errors (pre-existing errors
from CLEANUP-01 are known — only flag NEW ones from your deletions).

Deploy after this task.

---

### TASK 4 — FEED PLANNER AUDIT (report only, no changes yet)

Sandra confirmed: users use the feed planner a lot, but it's confusing and needs
simplifying. Before we touch it, we need to understand what it actually does.

The feed planner component folder is large:
- `feed-planner/feed-preview-card.tsx` — 1427 lines
- `feed-planner/feed-single-placeholder.tsx` — 699 lines
- `feed-planner/instagram-feed-view.tsx` — 787 lines
- `feed-planner/feed-header.tsx` — 761 lines
- And 15+ more components

**What to do — read the code and answer these questions:**

1. What is the user journey? (what does a user do step by step in the feed planner?)
2. How many distinct "modes" or "views" does it have? (free mode, paid mode, etc.)
3. What API routes does it call? (list them)
4. What is `feed-single-placeholder.tsx`? Is it still used?
5. What does `feed-preview-card.tsx` (1427 lines) actually do — can it be split?
6. Is there any dead code inside the feed planner that's clearly unused?

Write a clear summary to STATUS.md under:
```
## Feed Planner Audit
[your findings]
```

**Do NOT make any changes. Report only.**

---

## DEFINITION OF DONE

Update STATUS.md with:

```
## Last Updated: [timestamp]
## Last Task: CLEANUP-02 complete

## Maya Component Audit
- Live header: [filename]
- Dead headers: [list]
- Live chat: [filename]
- Dead chat: [list]

## Feed Planner Audit
[summary of findings]

## What's Live in Production
[update this section — add what was deployed]

## What's Broken / Unconfirmed
[anything found during this task]

## Currently In Progress
Nothing — awaiting CLEANUP-03 from Claude

## Next Task
CLEANUP-03 (Claude will write based on audit findings)

## Blocked On Sandra
[anything that needs a decision]
```

---

## WHAT YOU MUST NOT DO

- Do NOT delete Maya components yet — audit only in Task 2
- Do NOT change the feed planner — audit only in Task 4
- Do NOT touch any email code — that's Phase 3
- Do NOT touch Pro Mode or Classic Mode
- Do NOT start A-01 (Academy) — that comes after Phase 2

---

## IF YOU GET STUCK

Write your blocker clearly in STATUS.md and stop.
Do not guess. Do not proceed past a blocker.
Claude reads STATUS.md at the start of every session.
