# Maya one-step first photo

**Status:** Shipped 2026-07-13
**Surface:** Live member app `/app` → **Start with one selfie** → Maya

## Reported problem

The first-selfie card opened an undecided Maya session. After uploading one selfie, the member had
to choose format, style, shot, recreation mode, shoot type, shot count, generation source, and
optional reference images while the composer offered another competing entryway.

## Locked correction

- Treat **Start with one selfie** as an explicit photo request.
- Hand off to `Maya decides`, not a blank visual world.
- Wait for **Continue with Maya** before requesting the first concept.
- Show one calm first-photo state, then one recommended concept.
- Hide format, style, shot director, generation source, extra angles, Change, and the composer until
  the first result.
- Do not silently restore an old inspiration image into a fresh session.
- Preserve advanced tools for intentional post-value use and for explicit non-first-photo paths.

## Verification contract

- First-selfie handoff regression in `tests/maya-invisible-ai-first-result.test.ts`.
- Existing Maya first UX, style, shot, director, inspiration, and live-bug suites remain green.
- Desktop and 390 × 844 browser review must show one **Add my selfie** action and no pre-result
  advanced controls or console errors.
