# CONTENT-CAROUSEL-02-FIX - Harden new-world generation inputs

OWNER: Codex (Sandra approves merge)

Status: spec ready. Post-review follow-up to CONTENT-CAROUSEL-02 (commit 4e85f111, live). Small,
high-value. Source: review 2026-06-15.

## Why
New-world cover/result generation currently passes the reel **cover** frame
(`content_reel_references` where `kind='cover'`) into gpt-image-2 as a `styleReferences` input
(`lib/content-kit/carousel-generator.ts` ~`generateTutorialSceneImages`, filtered only by
`isAllowedImageUrl`, which checks blob host, not content). Two problems:

1. **Safety is label-enforced, not code-enforced.** The screenshot-safe invariant ("no
   `content_reel_references` image reaches gpt-image-2") holds only because covers happen to be
   photos and settings screenshots happen to be `kind='scene'`. If any tutorial reel's cover/
   thumbnail is ever a settings-screenshot or title-card, a real screenshot would be sent into
   `images.edit`. Nothing in code prevents it.
2. **Quality: ghost text + old world.** Sandra's covers have baked text ("SELFIE tutorial",
   "full body SELFIE") and the original location baked in. Using the old cover as a style
   reference for a NEW world drags that text and the old scene into the generated image, fighting
   the "same method, new fantasy" goal.

## Fix
- **Generate new-world cover/result from admin selfies + the world prompt ONLY.** Remove reel
  references (covers included) from the `styleReferences` / generation inputs in
  `generateTutorialSceneImages`. Identity = `listAdminSelfies()`; scene/outfit/lighting = the
  world preset/custom prompt. The shoot engine's identity-lock already keeps her face.
- **Code-enforce the invariant:** assert/filter so no `content_reel_references` URL (use the
  existing `isScreenshotReferenceUrl` matcher, which already matches `/content-kit/reel-references/`)
  can ever be passed into `generateShotImage` / `images.edit`. Belt and suspenders.
- Keep reel references exactly where they belong: composited overlay/screenshot slides and the
  before-after BEFORE image. Unchanged.
- Update the comment at `carousel-generator.ts:~415-416` so it states an enforced guarantee, not
  an assumption.

## Test
- Flip the CONTENT-CAROUSEL-02 behavioral test: assert that NO `/content-kit/reel-references/`
  URL appears in any `generateShotImage` argument (today it asserts the cover IS passed — change
  that). Keep asserting screenshots land in `overlayAssets` and cover/result carry generated
  `imageUrl`s.

## Acceptance
- New-world cover/result generated from selfies + world prompt; no reel-reference image reaches
  gpt-image-2 (proven by test). No ghost text from old covers.
- Screenshot-safe invariant now code-enforced, not label-dependent.
- Existing carousel tests stay green; `tsc --project tsconfig.ci.json`, `npm run build`,
  `verify-repo-invariants.mjs` pass.

## Note
If a pose/composition reference is ever wanted (to echo the original framing), use a clean,
text-free source — never the baked-text cover. Out of scope unless Sandra asks.
