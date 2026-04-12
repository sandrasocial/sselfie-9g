# SELFIE-GUIDE-02: Phase B — Advanced Experience Features

**Status:** Planned  
**Depends on:** SELFIE-GUIDE-01 (Phase A) — complete as of 2026-04-12

---

## What Phase A delivered (reference)

- 5-email nurture sequence: Day 0, 3, 7, 14, 21 + completion email
- DB: 4 progress columns on `freebie_subscribers` (migration 55, runner `scripts/run-migration-55.ts`)
- Chapter-by-chapter progression: one chapter at a time with progress bar
- Before/after comparison slider in Part 4 (editing)
- 7-day challenge tracker with sequential unlock in Part 7
- Maya Moment interactive AI concept preview in Part 8
- `/api/selfie-guide/progress` — saves chapter index + challenge completion to DB
- `/api/selfie-guide/maya-preview` — Haiku-powered concept generator (text only)

---

## Phase B backlog

### B1. Personalized guide path (high value, low effort — 3-4 hours)

Before the guide loads, show a 2-question assessment:
- "What phone do you use?" — iPhone 15/16 / iPhone 13-14 / Android / Not sure
- "How often do you post selfies?" — Never / Sometimes / Regularly

Use answers to surface a "Your quick win" callout in each chapter with one specific tip tailored to their situation. Store in localStorage alongside guide progress.

Files to update:
- `components/freebie/selfie-guide-experience.tsx` — add onboarding screen before chapter 1
- `lib/selfie-guide/experience.ts` — add personalisation state to `GuideProgress`

### B2. Real before/after pair in Part 4

Currently using two separate guide photos as placeholders.

Action: Sandra to photograph and provide:
- A "raw" selfie: same lighting conditions as the guide's window-light example, before any editing
- The same photo after the 5-step Lightroom edit

Drop into `/public/images/selfie-guide/before-raw.jpg` and `/public/images/selfie-guide/after-edited.jpg`.

Then update the `BeforeAfterSlider` call in `selfie-guide-experience.tsx` to use these paths (search for `// TODO: Replace with real before/after pair`).

### B3. Completion analytics dashboard (medium effort)

Sandra wants to see how many people are completing the guide.

Add a simple admin query or a `/api/admin/guide-stats` route that returns:
- Total guide buyers
- `guide_opened` count
- Chapter drop-off funnel (how many reached chapter 1, 2, ... 8)
- `guide_completed_at` count
- `guide_challenge_completed_at` count
- Studio conversions from guide buyers (join with `subscriptions` on email)

### B4. Day 7 challenge completion → immediate Studio email

When `guide_challenge_completed_at` is first written (7-day challenge done), fire the Day 14 bridge email immediately instead of waiting for the 14-day timer. This captures the buyer at peak engagement.

Files to update:
- `app/api/selfie-guide/progress/route.ts` — detect `challengeComplete === true` and fire the Day 14 email

### B5. Selfie analysis (Phase C, significant effort)

Upload a selfie → AI gives feedback on lighting, angle, and editing needs using Claude's vision capability.

- New component: `components/selfie-guide/selfie-analyzer.tsx`
- New route: `/api/selfie-guide/analyze`
- Calls Claude with the image and the guide's evaluation criteria
- Returns structured feedback: lighting score, angle assessment, editing suggestions

---

## Running migration 55

```bash
pnpm tsx scripts/run-migration-55.ts
```

Verify on preview environment before running on production Neon DB.
