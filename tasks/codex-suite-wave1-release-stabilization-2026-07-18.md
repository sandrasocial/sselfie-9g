# SUITE Wave 1 release stabilization

Status: approved by Sandra on 2026-07-18

Branch: `codex/suite-wave1-release-stabilization`

Baseline: `origin/main` at `5cec1b0f8b471c226afa2af0da8ff7e2fec3cea2`

## Goal

Make the current Create and Calendar journeys dependable enough for a measured 90-day member test.
Every confirmed control must perform the action its label promises, preserve the member's work, and
recover clearly from loading and failure states. This is a stabilization release, not the larger
Calendar, shared-chat, Story Studio, flexible-grid, or Learn Coach redesign.

## Protected boundary

`docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md` remains in force. This task may change UI,
routing, persistence plumbing, deterministic state decisions, labels, and tests. It must not change
prompt text or assembly, image/chat model routing or parameters, Vault retrieval/style selection,
or memory injected into a model. Stop and escalate if a fix requires a protected change.

`gpt-image-2` remains the only default image engine. The legacy Trained model may never be selected
implicitly. Existing legacy users may opt into it only through Account.

## Workstream A: Create reliability

1. Preserve the server-confirmed primary selfie while identity references hydrate, fail, or refresh.
2. New, Inspiration, Another direction, and Tell Maya what you need must not show first-selfie
   onboarding to a returning member who already has a usable identity reference.
3. Starting a new Maya task clears the creative conversation without erasing saved identity.
4. Creative history rows and thumbnails reopen non-current work; Close closes; errors are visible.
5. A busy Maya surface must visibly disable or defer actions instead of silently dropping them.
6. For You must not be a dead control. Saved Looks opens Gallery directly in Favorites.
7. Favorites can be toggled from the result card, fullscreen preview, and Gallery with consistent
   accessible selected state and rollback on API failure.
8. New this week reflects the newest published collection rather than a legacy calendar rotation.
9. Hero and alternate recommendations are visually distinct.
10. Add a quiet direct entry to the existing member-readable Maya memory surface.

## Workstream B: Calendar reliability

1. Replace obsolete Quick Guide claims and old-tab instructions with the current Grid + Maya flow.
   Preserve the approved editorial guide treatment and use short, plain UX language.
2. Include the current feed's saved visual-direction fields in the deterministic Calendar request
   context without modifying protected prompt assembly.
3. Replace the static "Post N is planned" loop with a tested slot-state next-action resolver.
4. Remove duplicated direction/context confirmations while keeping review for destructive changes.
5. Show accessible per-slot queued, generating, ready, failed, and retry states; bulk progress must
   not hide which post is being worked on.
6. Tapping a post opens its detail surface predictably; selection for Maya remains explicit.
7. Preserve single-post, selected-post, and bulk image/caption actions and their credit protections.
8. The Calendar UI must not offer or default to the legacy Trained model.

## Workstream C: independent regression QA

Build a control inventory and behavior coverage for:

- new member, returning member, empty data, partial data, and completed data;
- identity hydration success, delay, and failure;
- Create history, New, Inspiration, favorites, Saved Looks, and memory entry;
- Calendar guide, direction save, state-aware suggestions, post open, single/bulk actions, and retry;
- desktop and mobile interaction contracts, keyboard operation, focus, labels, and 44px touch targets;
- no unexpected console errors, failed API responses, or silent promise rejections in audited flows;
- reload persistence and double-submit/concurrent-operation protection;
- current image-engine routing and legacy-model opt-in boundaries.

Bug fixes require a failing behavioral test or documented deterministic reproduction before the
patch. Source-string assertions alone do not count as interaction coverage.

## Explicitly out of scope

- shared Create/Calendar conversation architecture;
- canonical memory-store redesign or new memory injection;
- concept-card generation inside Calendar;
- inspiration-derived prompts or creative-pipeline changes;
- Story Sequences and generated highlight covers;
- variable 9/12+ grid data-contract changes;
- Learn Coach or knowledge retrieval;
- a new monthly research automation;
- pricing, checkout, entitlement, or outward marketing changes.

## Local release gate

Run targeted tests and lint first, then:

```bash
pnpm type-check:ci
pnpm verify:repo
pnpm exec vitest run
git diff --check
```

The Maya freeze regression must stay green. Review the final diff for accidental protected-file
changes and for unrelated modifications before merge.

## Production gate

1. Merge only after the local gate passes.
2. Push `main` and wait for the single Vercel auto-deployment to become Ready.
3. Run the authenticated production journey with a clean QA user on desktop and mobile.
4. Confirm zero unexpected failed API responses and uncaught console errors in the audited flows.
5. Confirm Create identity continuity, new chat, favorites, and history after reload.
6. Confirm Calendar guide, visual direction, post open, single/bulk actions, per-slot states, retry,
   and reload persistence.
7. Record residual limitations honestly; do not call an untested flow complete.
