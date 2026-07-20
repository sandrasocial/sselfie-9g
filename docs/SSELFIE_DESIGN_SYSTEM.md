# SSELFIE Design System

Last updated: 2026-05-21

This is the official design authority for SSELFIE product UI, public pages, lifecycle emails, and future Codex implementation work.

If another design document conflicts with this file, this file wins.

## Approved Direction

SSELFIE is a light luxury editorial visual transformation brand.

The product should feel:

- Light luxury editorial
- Premium but simple
- Feminine but not girly
- Minimal and visual-first
- Warm, calm, and spacious
- Built around real selfie transformation
- Human before technical

SSELFIE should not feel like:

- A dark SaaS product
- A colorful dashboard
- An AI architecture showcase
- A generic creator operating system
- Old SELFIE AI visual language
- Coaching-funnel template design

## Visual Principles

1. Use light, editorial surfaces first.
2. Let images carry the emotional transformation.
3. Keep one clear outcome per screen or email.
4. Use generous spacing and quiet hierarchy.
5. Use deep graphite or luxury black for contrast and CTAs, not as the default mood.
6. Keep UI calm, minimal, and readable.
7. Avoid icons and emojis unless Sandra explicitly approves a specific use.
8. Avoid colorful SaaS palettes, gradients, pink, green, purple, and decorative UI noise.
9. Dark editorial overlays are allowed on full-bleed images when they make white typography readable and the image feel cinematic.
10. Do not use dark-first email templates.
11. Do not reuse old SELFIE AI design guidance as current SSELFIE guidance.

## Color Direction

Approved base:

- Seasalt `#F8FAFA`
- White `#FFFFFF`
- Silver `#C5C6C8`
- Gray `#818283`
- Davy's Gray `#4F5052`
- Raisin Black `#282728`
- Night `#0D0E10`

Use Night/Raisin Black carefully. It can be a button, headline contrast, thin frame, premium accent, or image overlay. It should not become the dominant page background or make the product feel heavy/dark by default.

Approved exception: full-bleed image heroes may use Night/Raisin Black gradient overlays when the photo remains visible and the section reads as cinematic editorial imagery, not a dark SaaS/product shell. The page should continue into Seasalt, white, or cool smoke sections below the hero.

Approved tutorial annotation token: content-kit tutorial carousels may use neutral charcoal `#3A3A3A` for screenshot callouts, hand-drawn circles, arrows, and before/after labels. This token is only for tutorial carousel annotations and must not become a general UI or email accent.

Avoid:

- Black-background product UI
- Warm beige/cream drift
- Pink brand systems
- Green accents
- Purple AI palettes
- Bright SaaS colors
- Gold accents unless Sandra explicitly approves a specific use
- Heavy black email shells
- Random gradients

## Typography

### Product And Web

Headlines:

- Cormorant Garamond
- Or another approved editorial serif
- Light to regular weight
- Spacious, feminine, editorial

Body and UI:

- Neue Einstellung when available
- Or another approved clean sans
- Inter may remain in existing product UI until a planned typography pass replaces it safely

### Email Fallbacks

Serif:

- Georgia
- Times New Roman
- serif

Sans:

- Arial
- Helvetica
- sans-serif

Rules:

- Headlines may be large and editorial.
- Body copy must stay readable on mobile.
- Uppercase labels are allowed for small eyebrow text and CTAs.
- Do not use decorative font experiments.
- Do not use tiny low-contrast body text.

## Image Direction

Images are the strongest proof in SSELFIE.

Use:

- Sandra's own images
- Real selfie examples
- AI photoshoot examples
- Before and after transformation where relevant
- Clean, high-end, editorial crops
- Image-led layouts

Avoid:

- Stock photos
- Generic AI illustrations
- Fake-looking lifestyle imagery
- Dark blurry atmosphere with no visible transformation
- Image-only emails

Every meaningful email image needs alt text.

## Email Design Direction

Future SSELFIE emails should use a light editorial template.

Approved email structure:

1. Warm off-white outer background.
2. Soft white central container.
3. Optional single hero image when it adds proof or emotional context.
4. Small uppercase eyebrow label.
5. Large serif headline.
6. Readable sans body copy.
7. Minimal black or graphite CTA.
8. Simple `Sandra x` signoff when appropriate.
9. Compliant footer and unsubscribe.
10. Mobile-first spacing.

Rules:

- Text must still work if images do not load.
- No image-only emails.
- No dark-first templates.
- No colorful buttons.
- No icons.
- No emojis.
- No generic SaaS cards.
- Use one primary CTA.
- Keep body copy short and readable.
- Use visual proof only when it helps the message.

Current note:

- `lib/email/templates/stone-email.ts` is the main active shared email shell. As of 2026-07-06 (EMAIL-02) it follows this file: Seasalt outer, white card, serif headline, Gray eyebrows, Night CTA, cool separators. The vault `lib/email/editorial-email.ts` shell uses the same cool palette. The earlier warm-cream palette is retired (cool-monochrome lock).

## Public Page Direction

Public pages should feel:

- Editorial
- Image-led
- Conversion-focused
- Spacious
- Feminine and premium
- Simple enough to understand fast

Use:

- One dominant promise per section
- Real imagery
- Clear offer details
- Minimal black CTAs
- Warm off-white and soft white rhythm

Avoid:

- Abstract AI language
- SaaS feature grids
- Over-explaining
- Dark landing-page mood as default
- Decorative icon rows

## App UI Direction

The app should feel calm and useful, not like a control center.

Maya is the emotional center of the product.

App screens should:

- Reduce visible decisions
- Hide AI/provider complexity
- Use human labels
- Keep advanced systems available but quiet
- Preserve stable infrastructure underneath
- Prioritize outcome-first flows

## Current Active Styling Files

These files currently control active styling and should not be archived:

- `app/globals.css`
- `tailwind.config.ts`
- `lib/design-tokens.ts`
- `components/theme-provider.tsx`
- `lib/maya/pro/design-system.ts`
- Active UI components under `components/sselfie/**`
- Active email templates under `lib/email/templates/**`

## Current Brand Docs

Active:

- `docs/SSELFIE_DESIGN_SYSTEM.md`
- `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
- `docs/brand/source/2026-06-27/`
- `docs/brand/SANDRA_VOICE_OS_2026-07-16.md`
- Live UI and current code for implementation truth

Legacy reference:

- `docs/archive/legacy-design-systems/DESIGN_SYSTEM_2026-05-02.md`

## Implementation Rules

1. Audit before changing visible design.
2. Do not redesign multiple systems in one batch.
3. Do not mix backend rewrites with UX cleanup.
4. Preserve stable infrastructure.
5. Prefer small diffs.
6. Use existing components and tokens first.
7. Do not introduce new colors, fonts, or visual systems without Sandra approval.
8. Test mobile and desktop for visible surface changes.
9. Email redesigns must include unsubscribe/footer compliance.
10. If a legacy file conflicts with this document, follow this document.
