# CONTENT-CAROUSEL-04 - Unify customer Maya onto the redesign engine + style anchors

OWNER: Codex (Sandra approves merge)

Status: ready. Gap found in live verification 2026-06-15 (real outputs generated across surfaces).

## The gap
CAROUSEL-03's redesign engine (`lib/content-kit/slide-redesign-generator.ts`) + the style anchors
(`content_style_references`) produce on-point, on-brand slides across admin tutorial, carousel,
reel cover, and story — verified with real generations, including a non-tutorial brand topic.
**But the customer-facing Maya (App v3) does NOT use that engine.** `app/api/app-v3/maya/generate`
builds graphic slides via `compileConceptJobs` (`lib/app-v3/prompt-compiler.ts`) = the member's
selfie + a TEXT prompt only, with NO style anchor and NO image-to-image redesign from an approved
reference. So actual member output will not match Sandra's approved style the way the admin path
does. CAROUSEL-03 said "applies to customer Maya too" but the implementation only switched admin.

## Fix — make customer Maya use the same path as admin
- Route customer graphic generation (carousel / reel-cover / story) through the redesign engine:
  reference = the member's selfie (or uploaded image) + a category-matched anchor from
  `content_style_references` (photoshoot-carousel / story-sequence; reel-cover uses a cover-style
  anchor at 9:16). Output = finished styled slide, same as admin.
- Replace the `compileConceptJobs` graphic text-prompt path for carousel/reel-cover/story. Keep
  the plain `photo` format as-is (no text, just the brand photo).
- Apply the faceless-slide removal here too (CONTENT-CAROUSEL-03-FIX): no `detail`/`text-only`/
  `NO_PEOPLE` slides — every slide is the member redesigned (or their real reference), text baked
  by the model.
- Members don't have reel-reference frames; their reference is their selfie/upload. The engine
  generates the editorial scene (brand/photoshoot) — that's correct for members (generated scenes
  are the product for photoshoot/brand content; only tutorials must preserve a real frame).
- Identity-lock: keep the member recognizable (no drift, realistic skin) — same guards.

## Verification target (what "on point" looks like)
Match the four approved verification outputs (admin tutorial slide, user carousel, reel cover,
story) — all produced by the redesign engine + anchors. Member output should look like those, with
the member's own face.

## Acceptance
- Customer Maya carousel/reel-cover/story go through the redesign engine + category style anchors;
  output matches Sandra's approved style. Plain photos unchanged.
- No faceless slides, no text-overlay generator, no white cards. Identity preserved. Nothing
  auto-posts. "elevate/elevated" absent. Build/tests/invariants green.

## Note
Pairs with CONTENT-CAROUSEL-03-FIX (faceless-slide removal). Together they make the user-facing
suite match the admin/approved quality.
