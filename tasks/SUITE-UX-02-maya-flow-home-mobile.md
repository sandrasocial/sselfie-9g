# SUITE-UX-02 — Maya flow, carousels, home overhaul, mobile (Sandra's 4-point review, 2026-06-12)

*Owner: Claude (Cowork). Source: Sandra's review after MAYA-ADMIN-01 slice 1 shipped.*

## 1. Home / front door overhaul (image-first homebase)

- Current product/access cards on home + customer base look generic, not image-first.
- Goal: a welcoming homebase per customer: what they own, what they can unlock (upsells),
  Kajabi-style library feel. Research how pros do it (Kajabi, Skool, Circle product walls).
- Product imagery system, two paths (build both, admin chooses per product):
  a) Admin upload slot per product (image stored on the product row, no deploy).
  b) Maya-generated mockup/detail images as card backgrounds.

## 2. Carousel engine audit (variation + image/copy match)

- Symptom A: no variation. Maya produces the same carousel style over and over.
- Symptom B: background images don't match the slide copy they sit under.
- Requirement: image backgrounds are the DEFAULT for every slide unless the user asks
  for something else.
- Audit the full path: persona carousel guidance -> emit_concepts slides spec ->
  prompt-compiler carousel jobs (design systems, overlay styles) -> generate route.
  Find where style gets pinned and where copy/image coupling breaks.

## 3. Maya flexibility in chat

- Inspiration upload must live IN the chat input (attach icon), not a buried slot.
- Text-overlay styles: show inline clickable examples (cards) the user picks from.
  Examples sourced from admin: Sandra uploads or Maya generates them (admin section).
- Flow must not get stuck: if the user asks for something different mid-flow (new format,
  new style, just advice), Maya follows the conversation instead of requiring the user
  to discover format chips. Chips become shortcuts, not gates.

## 4. Mobile optimization (mobile-first app)

- Full-screen image/carousel preview not mobile optimized.
- Large black space under the chat text input while typing (keyboard viewport bug,
  likely 100vh vs 100dvh / visualViewport handling).
- Sweep the concierge + previews for mobile correctness.

## Order of attack

1. ✅ Audit done 2026-06-12 (three parallel audits: carousel pipeline, mobile viewport,
   home/product-card data). Key findings:
   - Carousel sameness: `resolveDesignSystem()` silently falls back to cutout-editorial,
     whose guide literally called it "The default WOW"; designSystem optional in schema.
   - Copy/image mismatch: `compileCarouselDetailPrompt` built the image from brief.setting/
     mood only — the slide's heading/body never reached the image model.
   - Slide mix default made values alternate text-only and CTA always text-only.
   - Mobile: lightbox used max-h-[80vh] fixed sizing; iOS keyboard gap = visual viewport
     shrink not tracked (interactiveWidget meta is set but Safari ignores it).
   - Home cards: `academy_products`/overrides have NO image column at all; admin academy
     page already has thumbnail-upload patterns to copy (courses/drops).
2. ✅ SHIPPED 2026-06-12: carousel engine (variation rule: 3 concepts must span 2+ design
   systems, always-set designSystem, "default WOW" framing removed; slide message passed
   into detail AND identity image prompts; image-first slide default: hook=identity,
   value/CTA=detail, text-only only on request) + mobile (lightbox rebuilt flex/dvh/
   safe-area + swipe nav; edit-mode dvh; concierge drawer pins to visualViewport while
   keyboard is open) + inspiration attach button in the chat composer with preview chip.
2b. ✅ SHIPPED 2026-06-12 (Sandra's 5th point): adaptive concept count + Maya learns.
   - emit_concepts schema was `.length(3)` (hard lock). Now min 1 / max 9; persona sizes
     the set to the ask: default 3 directions; 1-2 for one specific photo; 6-9 for a full
     photoshoot as ONE cohesive world (same outfit/location/grade, varied shots: arrival,
     action, hero, detail, closer). Client renders any count (validated per-card).
   - New `remember` tool on the chat route: Maya silently appends lasting brand facts and
     style preferences/aversions to app_v3_memory mid-conversation (dedup + 2000-char cap,
     persona rule: never announce the save). This is the "learns how the user styles and
     adapts" layer: every future session starts already knowing.
3. ✅ SHIPPED 2026-06-12 — member insight loop. Six suite_* behavior events in the
   analytics contract (concepts emitted w/ count, clarify asked, image generated w/
   rerun+vibe+format, image downloaded, edit applied w/ instruction, memory note saved);
   logged server-side in app-v3 chat/generate/edit routes (fail-open), downloads client-side.
   Aggregated by lib/admin/member-pulse.ts (excludes admin user ids; download rate = loved,
   re-roll rate = friction; fresh app_v3_memory preference lines = what they want; recent
   edit asks = friction themes). Surfaced as a "Member pulse" collapsed section on
   /admin/content-brief and a section in the Monday content-brief email.
4. ✅ SHIPPED 2026-06-12 — conversational format switching. New set_format tool on the chat
   route; persona: chips are shortcuts not gates, call set_format (one short line, no
   emit_concepts that turn) when she asks for a different format. Client commits the switch
   from the tool part and the existing auto-pull fetches fresh directions with the right
   format guidance. Each part applies once; loading an old chat pre-seeds its parts so
   history never replays a switch.
5. ✅ SHIPPED 2026-06-12 — optional reference uploads persist (Sandra's report: side
   profile / full body / inspiration were lost on refresh while the face selfie survived).
   Migration 59 extends user_avatar_images.image_type with side-profile/full-body/
   inspiration (run on Neon 2026-06-12). Upload route takes a `slot` field and keeps ONE
   active image per optional slot (new upload replaces old); DELETE handler clears a slot.
   Reference-library returns `extras` (newest active per slot) and now excludes those types
   from the face list — also fixes a real bug where the newest upload of ANY slot could be
   restored as the member's face after refresh. Concierge restores all three alongside the
   selfie on open (never clobbering same-session state) and each slot has change (re-tap)
   + remove (×) controls; inspiration "Remove" clears the saved copy too.
6. Overlay style example cards (member chat) + admin example manager.
7. Home/front-door overhaul (design research -> build, image-first product cards:
   thumbnail_url on academy_product_overrides + admin Products tab w/ upload + Maya
   mockup generation; Kajabi-style owned/locked walls on /academy + /app Library).

## Hard rules

- Mobile-first. Member experience changes need no flag; admin-only bits stay gated.
- No-fake doctrine + voice rules in all copy. No em-dashes. Design tokens only.
- Nothing auto-posts. Sandra approves all admin-generated product imagery before use.
