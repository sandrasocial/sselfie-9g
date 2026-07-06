# gpt-image-2 Best Practices Research + SSELFIE Integration Audit

*Research date: 2026-07-06. Produced for Sandra's live-QA follow-up ("research best use cases for the ChatGPT image model 2"). Every web claim is cited; claims marked "worth an A/B" are community-supported, not official.*

## Verdict up front

The SSELFIE integration is strong: not sending `input_fidelity` to gpt-image-2 (it's automatic), member selfie first in the reference array, anchor-don't-chain photoshoot sets, re-attaching the real selfie on every edit, and exact-quoted bake text all match OpenAI's official guidance. The gaps found were prompt-precision issues, two of which were fixed on 2026-07-06 (streaming-path inspiration drop; 9:16-vs-2:3 aspect contradictions). The rest are ranked below for Codex/Sandra.

## PART 1 — Web research

### 1.1 Official API surface (`images.edit`, model snapshot `gpt-image-2-2026-04-21`)

| Param | gpt-image-2 | Notes |
|---|---|---|
| `quality` | `low` / `medium` / `high` / `auto` | token-based pricing per tier |
| `size` | any resolution: edges ≤ 3840px, both multiples of 16, aspect ≤ 3:1, 655,360–8,294,400 px | reliability boundary ~2560×1440; replaces gpt-image-1's fixed sizes |
| `background` | `opaque` / `automatic` | transparent NOT supported (was on gpt-image-1) |
| `moderation` | `auto` (default) / `low` | |
| `output_format` | png / jpeg / webp (+ `output_compression`) | |
| `input_fidelity` | **not applicable** — refs processed at high fidelity automatically | on gpt-image-1: low/high knob |
| `image` | multiple refs, up to 16 for edits; no documented weighting — control via prompt labeling | mask applies to first image |

Key 2026 changes vs gpt-image-1: arbitrary sizes, auto high input fidelity, no transparency, better instruction-following/text, token pricing.
Sources: https://developers.openai.com/api/docs/guides/image-generation · https://developers.openai.com/api/docs/models/gpt-image-2 · https://fal.ai/learn/tools/prompting-gpt-image-2

### 1.2 Identity preservation (official prompting guide)

- **Lock-and-change structure**: explicit lock ("Do not change her face, facial features, skin tone, body shape... Preserve her exact likeness"), then a narrow change scope, then a realism anchor.
- **Label every input image by index and role** ("Image 1: ... apply Image 2's style to Image 1") — the official mechanism for multiple refs.
- **Restate invariants on every iteration** — the primary anti-drift tool.
- gpt-image-1-era note (unverified for -2): only the FIRST image gets extra texture richness → primary face ref first.
- Failure modes (community, directional): reference role confusion → identity bleed; changing identity + scene carriers in one prompt → drift; **chained edits drift** — always re-anchor to the original real photo, never generation N as sole identity source for N+1; low-res/cropped refs degrade likeness (no official statement — worth an A/B).
Sources: https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide · https://developers.openai.com/cookbook/examples/generate_images_with_high_input_fidelity

### 1.3 Text rendering

Official: literal text in quotes + "EXACT, verbatim"; `medium`/`high` quality for small or dense text; spell stubborn words letter-by-letter; specify font style/size/color/placement; iterate small. Community/benchmarks: ~99% char accuracy on short English strings; **≤10 words per text element is the reliable zone** (predecessor-model research + vendor claims — worth an A/B, not fact). No official story-format text guidance; keep prompt aspect claims consistent with the actual `size` param.

### 1.4 Multi-image consistency for sets

Official pattern: **anchor, don't chain** — every image from original refs + restated anchor details; a previous render may ride along as a labeled STYLE reference only. Pose variation comes from per-shot text, not from the anchor image. (SSELFIE's photoshoot pipeline already does exactly this.)

### 1.5 Cost / latency / moderation

- 1024×1024: low ≈ $0.006, medium ≈ $0.053, high ≈ $0.211/image; portrait sizes cost more; Batch API −50%. Repo's own measurements are the operative latency truth: medium ~82s, high ~191s per edit call.
- Official quality guidance: high = "dense text, detailed infographics, close-up portraits, identity-sensitive edits".
- Moderation: `moderation_blocked` comes from a front-end classifier before the model runs; false-positive triggers include clothing/body terms + photorealism combinations; `moderation: "low"` documented; sanitize-and-retry is the standard mitigation (repo already does both).
Sources: https://developers.openai.com/api/docs/pricing · https://help.apiyi.com/en/gpt-image-2-moderation-blocked-error-prompt-optimization-en.html

## PART 2 — Repo integration facts (verified 2026-07-06)

- `app/api/app-v3/maya/generate/route.ts`: model env `OPENAI_IMAGE_MODEL` (default gpt-image-2); refs = front selfie FIRST + identity angles, deduped, capped at 4, inspiration appended last; sharp-normalized (EXIF, ≤1536px, PNG). `input_fidelity: "high"` only when model ≠ gpt-image-2 (correct). `moderation: "low"` + content-policy sanitize-retry. Sizes: carousel 1024×1280 (true 4:5), everything else 1024×1536 (2:3) via `APP_V3_PORTRAIT_SIZE`. Quality: medium for all member formats (Sandra's 2026-06-22 cost lock), `APP_V3_IMAGE_QUALITY` override; since 2026-07-06 the text-bake leg has its own `APP_V3_BAKE_TEXT_QUALITY` lever.
- Photoshoot sets: hero from real selfies only; shots 2..N get `[...selfies, heroFile]` in-memory (no URL round-trip) — anchor-don't-chain, correct.
- Multi-slide graphics: slide 1 uploaded to Blob, slides 2+ fetch it as style anchor; hero render REPLACES the member's own inspiration image for slides 2+ (design decision to revisit if member-intent vs set-cohesion ever conflicts).
- Edit route: edited source first, real selfie LAST with explicit "last attached image" labeling — the house's best-practice example.
- `lib/content-kit/slide-redesign-generator.ts` labels refs FIRST/SECOND/THIRD — matches official guidance best.
- Upload route: MIME + 12MB checks only; **no minimum-resolution guard**.

## PART 3 — Ranked remaining gaps (P1/P2 fixed 2026-07-06)

| # | Change | Where | Status / risk |
|---|---|---|---|
| P1 | Streaming path attached `selfieFiles` (dropping inspiration) while JSON path used `selfieAndInspirationFiles` | generate/route.ts streaming branch | ✅ FIXED 2026-07-06 |
| P2 | Prompts claimed 9:16 while rendering 2:3; carousel prompts claimed Story format | ingredients.ts `PORTRAIT_QUALITY`, slide-redesign-generator.ts | ✅ FIXED 2026-07-06 |
| P3 | Label attached images by index + role in generate-route photo prompts (IDENTITY_ANCHOR is singular; up to 6 refs attached unlabeled) | generate/route.ts ref assembly + `withPhotoshootCohesionInstruction`, ingredients.ts | A/B against current likeness before rollout — Codex spec |
| P4 | True story canvas: `APP_V3_PORTRAIT_SIZE=1024x1824` (multiple of 16? 1824=16×114 ✓) for real 9:16-ish stories | env only | Sandra decision: ~19% more output px ⇒ more cost/latency; staging smoke first |
| P5 | Minimum-resolution guard on selfie upload (~512px short side) with a warm message | upload-selfie/route.ts | needs Sandra copy approval |
| P6 | `APP_V3_BAKE_TEXT_QUALITY=high` for the bake leg (env lever shipped 2026-07-06, default medium) | Vercel env | Sandra decision: ~$0.21 vs ~$0.05 per baked slide, ~191s vs ~82s — watch the 170s auto-bake budget on 5-slide sequences |
| P7 | Soft cap headline length (~≤10 words per element) before baking | text-overlay.ts `makeTextOverlaySpec` or persona | worth an A/B |
| P8 | One transient-error (5xx/network) retry around `runEdit` — today one flaky call fails a whole 5-slide set | generate/route.ts | Codex spec; keep inside maxDuration |

**Deliberate non-changes (don't "fix"):** no `input_fidelity` on gpt-image-2; `moderation: low` + sanitize-retry; selfie-first ref order; edit route re-anchoring; never bake from a baked result.
