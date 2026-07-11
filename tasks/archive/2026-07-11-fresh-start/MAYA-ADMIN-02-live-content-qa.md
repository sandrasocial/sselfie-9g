# MAYA-ADMIN-02 - Admin Maya Content QA

OWNER: sandra

Status: OBSOLETE 2026-07-09. The "Maya-led admin surface" this spec asks Sandra to QA was
already removed from the live UI on 2026-06-18 (commit 6b124ec6, "Fix admin shoot studio quality
path") — Shoot Studio became the direct, standalone tool specifically so Suite Maya stays out of
admin content creation. The admin-Maya chat branch (persona, tool-calling) has been dead code
since that commit; retiring it fully is scoped into the Phase 2 Codex cleanup alongside
VOICE-LOOP-01/EMPLOYEE-01 follow-on work (see tasks/README.md). Do not run this QA — the flow
described below no longer exists.

## What Is Built

- Maya Admin content tools.
- Admin editorial memory.
- Weekly brief context injection.
- Approve/publish/drop-email handoff.
- Shoot Studio support tool is collapsed under the Maya-led admin surface.

## QA Steps

1. Ask Maya what to create this week.
2. Confirm the answer uses current brief data and Sandra's voice.
3. Ask Maya to create or select a shoot/drop.
4. Approve/publish through the admin handoff.
5. Ask for the email preview.
6. Confirm Maya can explain what is queued, what is live, and what needs approval.

## Acceptance

- Maya answers from current data, not generic advice.
- Voice is simple, warm, clear, and close to Sandra's real phrasing.
- Approve/publish/drop-email actions are visible and understandable.
- No duplicate parallel admin tool is needed for the same job.

## Known Follow-Up

Optional after QA: add reel-cover and caption-specific helper tools if Sandra still needs them.
