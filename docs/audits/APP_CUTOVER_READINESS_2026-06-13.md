# APP-CUTOVER-01 Readiness Check

Date: 2026-06-13
Branch: `codex/app-cutover-readiness`

## Verdict

App v3 is ready as the member front door from the code and env checks completed here. The remaining work is operational: Sandra approval on the member note, send the note, and watch week-one usage.

Confidence: 0.86. The main weakness is that this pass did not use a real non-admin member browser session, so final phone QA should still be done by Sandra or a test member account.

## Verified

- `/app` access gate uses `APP_V3_MEMBERS_ENABLED=true` for non-admin members and trials.
- No-access users still redirect to `/studio`, which preserves rollback/legacy access.
- Limited access users can open the shell but generation remains locked server-side.
- `app/api/app-v3/maya/generate/route.ts` and `app/api/app-v3/maya/edit/route.ts` both have auth, OpenAI feature flag checks, 20/min rate limits, `maxDuration = 300`, credit deduction, and refund paths.
- `/api/app-v3/gallery` reads completed `ai_images` rows for the user and is not filtered to app-v3-only sources.
- Production Vercel env contains encrypted `APP_V3_MEMBERS_ENABLED`, `OPENAI_IMAGE_MODEL`, and `OPENAI_API_KEY`.
- Member lifecycle links updated away from legacy `/studio` for the active member cutover paths:
  - membership welcome
  - credit top-up welcome
  - monthly credit renewal
  - dormant member re-engagement
  - monthly usage recap
  - payment recovery

## Read-only Data Check

Source: Neon tables `subscriptions` and `ai_images`, read-only query run locally with `.env.local`.

```json
{
  "activeLiveSuiteMembers": 8,
  "galleryUsersWithImages": 148,
  "galleryImagesTotal": 11832,
  "galleryImagesLast30Days": 430
}
```

## Code Changes From This Pass

- Added `/app?view=account|photos|content|library` deep-link support.
- Payment recovery emails now point to `/app?view=account...`, so members land where billing lives.
- Member/credit lifecycle emails now point to `/app`.
- Free-user, old welcome sequence, referral, and public funnel `/studio` links were intentionally left unchanged. They need a separate legacy email-map decision, not a broad replacement.

## Tests

- `pnpm vitest run tests/app-cutover-readiness.test.ts tests/email-audit-remediation.test.ts`

## Remaining Operational Steps

1. Sandra opens `/app` on mobile as a real member or test member and checks: upload selfie, generate, Photos, Library, Account, billing portal.
2. Sandra approves the member email draft.
3. Send the member note to the active Suite members.
4. Watch week-one metrics: generation success, credit spend, replies, and payment recovery clicks.
