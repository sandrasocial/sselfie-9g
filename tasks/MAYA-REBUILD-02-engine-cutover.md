# MAYA-REBUILD-02 · Studio 3.0 Engine — wire `generateMayaImage()` into `/app`

Status: Spec v2 (refined for the `/app` shell — supersedes the legacy-shell cutover plan below)
Owner: Codex (implement) · Claude (review)
Depends on: PR #49 (Studio 3.0 Phase 1 `/app` scaffold) merged.

## What changed since v1 (and why it's now lower risk)
v1 planned to convert the **legacy** Maya shell from async job-and-poll to sync OpenAI, which needed per-call-site adaptation + a LoRA fallback to protect the 7 members. **That is no longer the path.** Studio 3.0 lives on the isolated `/app` shell, which is:
- Greenfield and **OpenAI-only** (no async polling, no Replicate/Nano, no LoRA in this tree).
- **Admin-only** right now, so the 7 members on legacy `/studio` are not affected at all by this work.

Result: no async-to-sync surgery, no LoRA fallback, no member risk. We build the synchronous engine cleanly for `/app` and test it as the admin. The legacy shell stays exactly as-is until the eventual member migration (a separate, later phase — by then `/app` already has the engine).

## Goal
Make the Concierge's **Generate** button produce real images via the synchronous OpenAI engine, for both:
- **Pure photography** (one selfie → editorial brand photo in the chosen aesthetic), and
- **Native marketing graphics** (Reel cover, carousel, Story slide) where the OpenAI model renders legible on-image text and layout in a single call.

## Piece 1 — `generateMayaImage()` (client engine helper)
Location: `components/app-v3/generate-image-client.ts` (isolated tree; lib imports only).

```ts
import type { Aesthetic, OutputFormat } from "./types"

export interface MayaGenerateInput {
  aesthetic: Aesthetic
  outputFormat: OutputFormat            // photo | reel-cover | carousel | story-slide
  referenceSelfieUrl: string | null     // from user_avatar_images; null = server resolves
  userText?: string                      // free-text the user typed (the request / the edit)
  graphicText?: GraphicTextSpec | null   // for reel-cover/story-slide/carousel (below)
  refineFromImageUrl?: string | null     // set for conversational edits (prev image as reference)
}

export interface GraphicTextSpec {
  headline?: string
  subline?: string
  slides?: { heading: string; body?: string }[]  // carousel: one entry per slide
  cta?: string
}

export interface MayaGenerateResult {
  images: string[]        // 1 for photo/cover/slide; N for carousel
  engine: "openai"
  generationIds: number[] // gallery ids
}

export async function generateMayaImage(
  input: MayaGenerateInput,
  opts?: { onProgress?: (p: { state: "compiling" | "generating" | "saving" | "done"; index?: number; total?: number }) => void },
): Promise<MayaGenerateResult>
```

Behavior:
1. Compile the prompt(s) via the prompt compiler (Piece 2).
2. **Single image** (photo / reel-cover / story-slide): one POST to `/api/maya/generate-image-openai` with `{ prompt, referenceImageUrl, size }`. Resolve with `images: [url]`.
3. **Carousel**: one synchronous call PER slide (the model makes one image per call). Loop the compiled per-slide prompts, fire sequentially (or limited concurrency), report `onProgress({ index, total })`. Keep the reference selfie + aesthetic constant across slides for cohesion. Resolve with all slide URLs in order.
4. **Conversational edit**: when `refineFromImageUrl` is set, pass it as `referenceImageUrl` plus the edit instruction in the prompt ("keep everything, change the blazer to black"). One call per edit.
5. Persist every result to the gallery (Piece 4) and return gallery ids.

## Piece 2 — The prompt compiler (the new brain)
Location: `lib/app-v3/prompt-compiler.ts` (lib, reusable, unit-testable).

```ts
export function compileMayaPrompt(input: MayaGenerateInput): { prompts: string[]; size: ImageSize }
```
Rules by `outputFormat`:
- **photo** → editorial photo prompt = `aesthetic.intent` + the source-selfie reference instruction + `userText`. Size `1024x1792` (portrait). One prompt. NO on-image text.
- **reel-cover** → photo base (aesthetic) + explicit instruction to render the `graphicText.headline` (and subline) as clean, legible on-image typography in the brand style; reserve safe margins for Reels UI. Size `1024x1792`. One prompt.
- **story-slide** → like reel-cover, vertical, single slide. Size `1024x1792`.
- **carousel** → one prompt per `graphicText.slides[]` entry. Slide 1 = cover (selfie + headline); subsequent slides = the heading/body rendered as a cohesive branded slide. Keep aesthetic + palette + type treatment consistent across slides (pass the same style directives in each prompt). Size `1024x1792` (or `1024x1024` if square carousels are preferred — confirm with Sandra).

Compiler must bake in the SSELFIE design system for graphics: editorial serif feel, calm layout, no clutter, no emojis, legible text. The OpenAI model renders the text natively — the compiler's job is to instruct it precisely (exact words in quotes, hierarchy, placement, restraint).

## Piece 3 — Concierge wiring (`components/app-v3/maya-concierge.tsx`)
1. **Capture text for graphics.** When `outputFormat` is reel-cover/story-slide/carousel, the concierge asks Maya-style questions to fill `GraphicTextSpec` (e.g., "What should the cover say?", "Give me your 3 carousel points"). Store on the session (extend `ConciergeSession` with `graphicText`).
2. **Reference selfie upload.** Replace the stubbed upload button with a real uploader that writes to `user_avatar_images` (reuse the existing avatar upload endpoint) and calls `setReferenceSelfieUrl(url)`.
3. **The Generate button.** Replace the disabled stub with a live button that calls `generateMayaImage(session)` with `onProgress` driving a calm progress state. Render the returned image(s) inline in the concierge (single image, or a swipeable carousel strip).
4. **Conversational edits.** After a result, the user can type ("make my blazer black") → call `generateMayaImage({ ...session, refineFromImageUrl: lastImageUrl, userText })`. Each turn appends a new result.
5. **Save to gallery** happens server-side; surface a "saved to your gallery" confirmation.

## Piece 4 — Server (`app/api/maya/generate-image-openai/route.ts`)
1. If `referenceImageUrl` is absent, resolve the newest `user_avatar_images` row for the user (trusted blob URL, bypass the reference allowlist).
2. Return `422 { code: "no_reference_selfie" }` if there is no reference and none on file → concierge prompts upload (no LoRA fallback needed on `/app`).
3. Persist each generated image to the gallery store (`generated_images` / Blob) so it shows in the member/admin gallery; return the gallery id.
4. Keep one image per request (the client orchestrates carousels as N requests). Confirm/raise `maxDuration` for gpt-image latency.

## Testing (zero member risk)
- All testing happens as the **admin on `/app`**; the 7 members on legacy `/studio` are untouched throughout.
- Verify: photo generation likeness + quality; reel-cover text legibility; a 3-slide carousel stays visually cohesive; a conversational edit ("blazer black") preserves likeness; everything lands in the gallery.
- No feature flag gymnastics needed for members (they aren't on this shell). A `NEXT_PUBLIC_APP_V3_GENERATE_ENABLED` flag can still gate the Generate button during build if desired.

## Acceptance criteria
- Concierge Generate produces real images for photo, reel-cover, story-slide, and carousel.
- Native on-image text renders legibly and on-brand for the graphic formats.
- Conversational edits work (prev image as reference).
- Results persist to the gallery.
- Prompt compiler is unit-tested for each output format.
- New code is strict-typed; `tsc --noEmit` clean for `components/app-v3/` + `lib/app-v3/`.
- Legacy `/studio`, `/maya`, and the 7 members are untouched.

## Open decisions for Sandra
1. Carousel aspect ratio: portrait `1024x1792` or square `1024x1024`?
2. How many carousel slides should the concierge cap at (e.g., 3-7)?
3. Credit cost per image / per carousel on `/app` (reuse the existing credits model or flat per-generation?).

---

## (Archived) v1 — legacy-shell cutover, NO LONGER THE PATH
The original plan adapted the legacy `maya-prompts-tab` / `maya-concept-cards` / `welcome-first-generation-flow` call sites and added a LoRA fallback for members on the old shell. Superseded by the `/app` greenfield approach above. Keep only if a decision is made to retrofit the legacy shell (not currently planned).
