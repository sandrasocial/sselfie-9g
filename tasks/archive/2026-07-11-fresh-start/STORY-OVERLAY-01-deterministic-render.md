# STORY-OVERLAY-01 — Deterministic local Story overlay render

**Owner:** Claude (spec) → Codex (implementation)
**Status:** Ready to build
**Decision date:** 2026-06-21
**Scope:** Admin Content Story Sequence only. Do NOT touch carousels, reel-covers, or suite Maya.

---

## The decision (Claude, after reading the code + Sandra's locked overlay doc)

**Q1 — Stop using OpenAI image edit for Story text overlays? YES.**
**Q3 — Deterministic local render over the original selected photo, or model-baked with stricter references? DETERMINISTIC LOCAL RENDER.**

Reasons (non-negotiable):
1. Image models *regenerate* the photo. That breaks Sandra's most sacred Story rule ("preserve the original photo exactly") and defeats the entire point of the new exact-background selection + reordering feature she just got.
2. Image models garble text and cannot honor exact typography, hierarchy, or placement. No amount of "stricter style references" fixes this — it is the wrong tool for deterministic text.
3. **The local renderer already exists and is good:** `app/api/admin/content-kit/story/[id]/[slide]/route.tsx` renders 1080×1920 via `next/og` (Satori) with her real fonts (Cormorant Garamond, Inter, Caveat), keyword/lead/support line sizes, hand-drawn accents (`KeywordCircle`, `Squiggle`, `Arrow`), and screenshot/proof overlay assets. It is exact-brand because it is code.

The current pipeline bakes each slide through `redesignContentSlide` (OpenAI) and stamps `headlineRender: "baked"`, which makes the renderer's existing `baked` branch dump the generated PNG and skip all of the above. **That bypass is the bug.** Switch stories to `headlineRender: "composited"` and let the renderer do its job over the real selected photo.

**Keep** `buildContentSlideRedesignPrompt` + the `"story-sequence"` redesign category in `slide-redesign-generator.ts` — it is reused as the reel-cover style-reference fallback (suite). We are only stopping *story-generator* from calling it.

---

## Q2 — The SSELFIE Story overlay design system (locked, cool-mono)

Canvas: **1080 × 1920** (9:16). Render at 1× (IG compresses to 1080 wide anyway); optional 2× supersample for crispness is a nice-to-have, not required.

### Palette — COOL MONOCHROME ONLY (overrides the cream/beige in the old doc)
Per Sandra's locked visual brand + the `sselfie-stories` skill override:
- Light text on photo: seasalt `#FFFFFF`, silver `rgba(255,255,255,0.88)`
- Dark text on light slide: night/obsidian `#0A0A0A`
- Support / meta: smoke `#666666` (on light), silver (on photo)
- Scrim: night `#0A0A0A` at low alpha only
- Light (no-photo) slide background: pearl `#F5F5F5`
- **NEVER** cream, beige, warm gray, gold, or any color accent.

### Typography (fonts already loaded in the route)
| Role | Font | Size | Weight | Notes |
|------|------|------|--------|-------|
| Lead (emotional statement) | Cormorant Garamond | 72–84px | 600 | line-height 1.12, max-width 880, ≤2 lines, ≤12 words/line |
| Support (context, labels, CTA support) | Inter | 34–40px | 400 / 600 | line-height 1.5, max-width 820 |
| Keyword (CTA only) | Cormorant Garamond | **auto-fit 130–168px** | 600 | letterspacing 8; must auto-shrink so PROMPT / KIT / VAULT / PRESETS / START all fit within 1080-128px and inside the circle |
| Eyebrow / wordmark (SSELFIE) | Inter | 26px | 600 | uppercase, letterspacing 7 |
| Handwritten note | Caveat | 48–54px | 500 | rotate −3deg |

### Safe zones (THIS IS A REAL BUG TODAY)
Instagram Story UI overlaps the frame. The current renderer puts the footer + text at `bottom: 110` → ~y1810, which lands **inside IG's reply bar**. Fix:
- Top safe margin: **220px** (avatar, name, timestamp, close button).
- Bottom safe margin: **320px** (reply bar, reactions). The lowest rendered element must have its baseline at **y ≤ 1600**.
- Side margins: **64–80px**.
- All critical text + the CTA keyword must live in the band **y 220 → 1600**.

### Placement rules (composition-aware)
- **Default: text in the LOWER third** (her photos are portraits with the face upper-center). Anchor the text block bottom-up from the bottom safe margin.
- New optional field `slide.textZone?: "top" | "bottom"` (default `"bottom"`). `"top"` is for photos whose subject sits low / empty space is up top.
- **Never** place the text block over the vertical center band (y ≈ 600–1150) where the face usually is.
- v2 (follow-up, not this ticket): auto-pick `textZone` from `ai_images.text_overlay_areas` when the background is a gallery image that has it.

### Contrast panel rules (replace the full-height gradient)
The current full-height `0.32 → 0.86` gradient darkens the face. Replace with a **zone-local scrim** behind the active text only:
- Bottom zone: `linear-gradient(180deg, transparent 0%, transparent 52%, rgba(10,10,10,0.72) 100%)` — only the lower ~48% darkens.
- Top zone: mirrored on the top ~40%.
- Wordmark strip: a tiny top scrim `rgba(10,10,10, 0→0.28)` confined to the top 180px ONLY, so "SSELFIE" reads without darkening the face.
- Optional `slide.textPanel?: boolean`: when the photo behind the text is busy, draw a semi-opaque rounded rect `rgba(10,10,10,0.32)` behind the text block (Satori has no blur; use opacity). Off by default.
- No-photo slides: solid pearl background, ink text, no scrim.

### Handwritten note
1 per slide max, only on 3–5 slides per sequence (generator already controls this). Caveat, −3deg, placed directly under the text block, silver on photo / stone on light.

### Accents / doodles (chic, minimal, purposeful — never over the face)
- `Squiggle` underline: ONLY under `emphasis: true` lead lines. Max 1–2 per slide.
- `KeywordCircle`: ONLY around the CTA keyword.
- `Arrow`: ONLY on the CTA slide, pointing toward "DM me:".
- Stroke color follows palette (seasalt on photo, night on light). No doodle ever crosses the face/eyes/hands.

### CTA slide format (locked)
Centered. Exactly:
1. lead — desire question (serif 72)
2. support — "DM me:" (sans)
3. keyword — ONE word, giant serif + `KeywordCircle` (the **single biggest element** on the slide)
4. support — reassurance ("and I'll send them over.")
5. `Arrow` toward "DM me:"
6. note — "I'll send it" (Caveat)

Never change Sandra's keyword.

### Mobile readability
- Honor the min sizes above; keyword must be legible from across a room.
- ≤ 3 text lines per non-CTA slide; readable in ~2 seconds.
- Contrast: light text only over a scrim ≥ 0.6 behind it, or ink on a light slide.

---

## Q4 — Implementation spec for Codex

### 1. `lib/content-kit/story-generator.ts`
- **Replace `redesignStorySlides`** with a deterministic `compositeStorySlides` builder. For each slide:
  - `imageUrl = orderedBackgrounds[index % orderedBackgrounds.length]` (respect the admin-selected order already plumbed via `input.imageUrls`).
  - `headlineRender: "composited"`.
  - Preserve `slide.lines`, `slide.note`, `slide.role` untouched.
  - Carry `slide.textZone` if present (default unset → renderer treats as bottom).
- **Remove the OpenAI calls for stories**: delete the `pickContentStyleReference("story-sequence")` + `redesignContentSlide(...)` calls from the story path. Keep the imports only if still used; otherwise drop them. (Do NOT delete the functions from `slide-redesign-generator.ts` — reel-cover fallback depends on them.)
- **Route screenshots/proof to `overlayAssets`, not the background pool.** Today `overlayUrls` are dumped into `referenceUrls` and lost. Instead: attach selected proof images as `slide.overlayAssets = [{ url, placement: "middle-right" }]` on the slides the admin assigned them to (or, v1-simple: attach the first proof image to the `proof` role slide). Keep `isAllowedImageUrl` filtering.
- Keep the `content_story_sequences` schema + insert logic as-is.
- No image generation, no credits, no OpenAI key needed for stories anymore.

### 2. `app/api/admin/content-kit/story/[id]/[slide]/route.tsx`
- Keep the `headlineRender === "baked"` branch ONLY for backward compatibility with old stored sequences. New sequences are `"composited"` and flow through the full renderer.
- Apply the **safe zones**: lift the bottom text block + footer so the lowest baseline is `y ≤ 1600` (bottom margin 320). Lift the top wordmark within the top safe margin.
- Replace the full-height gradient with the **zone-local scrim** (see design system). Add the confined top wordmark scrim.
- Add **`textZone`** support: render the text block + scrim at top or bottom per `slide.textZone` (default bottom).
- Add optional **`textPanel`** rounded-rect behind text.
- Make the **keyword auto-fit** (shrink font + circle width to fit the word within side margins).
- Keep `OverlayAssets` (screenshot/proof) exactly as-is.
- Use only cool-mono tokens (it already does; confirm no warm values introduced).

### 3. `lib/content-kit/types.ts`
- `StorySlide`: add `textZone?: "top" | "bottom"` and `textPanel?: boolean`. (`headlineRender: "composited"` already exists.)

### 4. `components/admin/content-story-client.tsx`
- **Keep** background selection, removal, drag/drop + `< >` reordering intact (do not regress 7e6fe131 / 8a250dbe).
- Default new sequences to the composited renderer preview (the `/api/admin/content-kit/story/[id]/[slide]` PNG), not a baked image.
- Optional (nice-to-have): a per-slide top/bottom text-zone toggle that sets `slide.textZone`. If omitted in v1, default bottom everywhere.

### 5. Tests
- `tests/app-v3-maya-june11-restoration.test.ts` line ~175 ("keeps admin story sequence graphics overlay-only"): **leave as-is** — it tests `buildContentSlideRedesignPrompt`, which still exists for the reel-cover fallback.
- `tests/content-tools-shoot-first.test.ts`: keep the background-selection/reorder source assertions. **Add** assertions that:
  - `story-generator.ts` sets `headlineRender: "composited"` and no longer calls `redesignContentSlide` / `pickContentStyleReference` in the story path.
  - story slides keep `imageUrl` from the selected backgrounds and preserve `lines`/`note`.
- Add a renderer test (source-presence is fine, matching repo style) asserting the route honors `textZone`, the bottom safe margin (no element below y1600), and the zone-local scrim (no full-height face gradient).
- `pnpm vitest run tests/content-tools-shoot-first.test.ts tests/app-v3-maya-june11-restoration.test.ts` must pass.

### Acceptance
- Generating a story produces slides whose backgrounds are the admin-selected photos in the chosen order, pixel-perfect (never regenerated), with crisp serif/sans/handwritten overlays, accents, IG-safe placement, cool-mono only.
- Screenshot/proof slides still composite the proof image.
- No OpenAI call in the story generation path.
- Old baked sequences still render (back-compat branch).

### Out of scope (note for Sandra)
- v2 auto-placement from `ai_images.text_overlay_areas`.
- Animated/video stories (Remotion).
- Any change to carousels, reel-covers, or suite Maya.
