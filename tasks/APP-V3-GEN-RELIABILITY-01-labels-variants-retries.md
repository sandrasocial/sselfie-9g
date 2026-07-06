# APP-V3-GEN-RELIABILITY-01 — gallery labels, variant linkage, generation robustness

*Spec by Claude (Fable), 2026-07-06, from Sandra's live QA + the gpt-image-2 research
(`docs/research/GPT_IMAGE_2_INTEGRATION_RESEARCH_2026-07-06.md`). The quick wins already
shipped on 2026-07-06 (branch codex/maya-qa-fixes-20260706): real format written to
`ai_images.category` from generate + bake routes, category-first gallery classification,
image-load retry on generated tiles, gallery-insert retry + admin error surfacing,
hero-anchor crop-variation instruction, streaming inspiration fix, aspect-claim fixes,
`APP_V3_BAKE_TEXT_QUALITY` lever, bake typography sizing rules. This spec is the rest.*

## 1. Gallery labels, phase 2 (needs a small migration)

- Add `ai_images.title TEXT NULL` + `ai_images.variant_of INTEGER NULL REFERENCES ai_images(id)`.
- Generate route: persist `body.conceptTitle` (already arrives in the request; today it only feeds the credit-ledger memo) into `title`.
- Bake route: set `variant_of` = the clean original's ai_images id (client knows it from the generate response) and reuse the original's `title`.
- Edit route (`app/api/app-v3/maya/edit/route.ts:329-338`): client passes the source image's format + title; write real format into `category` (today hardcoded `'edit'` → everything edited shows as "Photo") and set `variant_of`.
- Gallery UI: tile label prefers `title` (fallback: current format word); lightbox shows title. Baked/edited variants group with or badge against their parent instead of appearing as unrelated tiles.
- Auto-bake results from the generate route are currently returned to the chat but never inserted into `ai_images` at all (only the clean render is persisted) — decide: persist baked variants as rows (with `variant_of`) so they survive outside the chat thread. Recommended: yes.

## 2. Photoshoot ordering + waste

- Persist the hero shot first in `imageUrls` (today `pickPhotoshootHeroJobIndex` can anchor a middle index; Sandra's mental model is "first image is the anchor").
- Multi-slide graphics upload the hero buffer twice (`graphic-hero-*.png` ephemeral + persistBuffers final, `generate/route.ts:1149-1162`); pass the in-memory buffer to slides 2..N like the photoshoot path does, or clean up the ephemeral blob.

## 3. Generation robustness (research P5/P7/P8)

- **P8**: one transient-error retry (5xx/ECONNRESET/timeout — NOT content-policy, which has its own retry) with short backoff inside `runEdit`; keep total time inside `maxDuration`. Today one flaky call kills and refunds a whole 5-slide set.
- **P5**: minimum-resolution guard on selfie upload (~512px short side after EXIF rotation) in `app/api/app-v3/upload-selfie/route.ts` — **needs Sandra-approved copy** for the warm rejection message (suggest her best-results recipe: main selfie + full body + side profile).
- **P7**: soft cap baked headline length (~10 words per text element, split or trim in `makeTextOverlaySpec`) — A/B, community-sourced threshold.
- **P3 (A/B first)**: label attached images by index + role in the generate-route photo prompts (the edit route and slide-redesign already do this; `IDENTITY_ANCHOR` is still singular "the attached reference photo" while up to 6 refs attach). Run a likeness A/B before rollout.

## 4. Env decisions for Sandra (no code)

| Env | Effect | Cost |
|---|---|---|
| `APP_V3_BAKE_TEXT_QUALITY=high` | crisp baked typography matching the six style previews | ~$0.21 vs ~$0.05 per baked slide, ~191s vs ~82s (watch 170s auto-bake budget on 5-slide sequences) |
| `APP_V3_PORTRAIT_SIZE=1024x1824` | true story-shaped canvas (no IG crop surprises) | ~19% more output pixels; staging smoke first |

## Out of scope

Style-director UX (tasks/MAYA-STYLE-DIRECTOR-01), admin Shoot Studio, any Stripe/checkout code.

## Verification per slice

Targeted vitest + `pnpm type-check:ci` + `pnpm verify:repo`; for §1 a migration file under `db/migrations/` (next number) + backfill note; Sandra taps through gallery + a full shoot on mobile before merge.
