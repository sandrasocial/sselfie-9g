# SSELFIE Design System

Status: current and governing

Approved by Sandra: 2026-08-26

Visual direction: **Bold Editorial Studio · Warm Champagne**

This is the sole visual-design authority for SSELFIE product UI, public marketing, lifecycle and
transactional email, checkout, learning material, Skool assets, and future implementation work.

If another design document, audit, generated prompt, screenshot, component, or archived file
conflicts with this file, this file wins. Sandra's later explicit approval can replace this direction,
but the approved change must be recorded here before it becomes the new default.

## Approved Visual Reference

The approved desktop and mobile direction is stored at:

`docs/brand/references/sselfie-editorial-neon-suite-direction-2026-08-26.png`

Use that image to understand visual character, contrast, hierarchy, photographic scale, rectangular
composition, controlled neon signature, and responsive relationship. It is not literal product
scope: generated faces, labels, navigation destinations, counts, and project names are
placeholders. Current product behavior, customer access, and verified information architecture
remain authoritative.

The Skool category covers and group cover approved on 2026-08-26 are the channel reference for the
warm editorial mood: ink-black and espresso grounds, soft ivory paper, champagne light, cinematic
photography, high-contrast serif type, and a limited handwritten glow. Suite translates that mood
into functional UI; it does not copy cover decoration into ordinary controls.

## Brand Character

SSELFIE is a bold, feminine editorial visual studio for selfies and AI selfies.

It should feel:

- Confident, modern, graphic, and premium
- Fashion-editorial without becoming cold or inaccessible
- Feminine through imagery, typography, confidence, and point of view
- Photo-first and transformation-led
- Clear enough to use immediately
- Human-led, with AI supporting the woman rather than becoming the visual hero

It must not feel:

- Soft, romantic, pastel, girly, or wellness-like
- Like a generic white-card SaaS dashboard
- Like a purple-gradient AI product
- Like a Canva template or coaching funnel
- Like generic beige luxury, gold-foil decoration, or a beauty salon
- Like an enterprise control center full of metrics and tiny controls

## Governing Method

The customer journey is:

`TAKE -> CREATE -> EDIT -> POST`

This method should organize navigation, page hierarchy, marketing explanation, learning material,
and visual storytelling where relevant. Do not add extra top-level stages that compete with it.

## Core Visual Principles

1. Make selfies and visual work the largest elements.
2. Use high contrast and decisive composition.
3. Prefer an editorial grid over rows of identical floating cards.
4. Use asymmetric layouts intentionally, while keeping controls predictable.
5. Use strong rectangular frames, thin rules, and precise alignment.
6. Use generous negative space around a small number of clear actions.
7. Keep Maya integrated as a creative partner or director, never a generic chatbot bubble.
8. Use one dominant message and one primary action per section.
9. Express femininity through art direction, not pink decoration.
10. Preserve usability, accessibility, real product behavior, and customer trust.

## Color System

### Core tokens

- Editorial Ink `#0D0E10` — navigation, mastheads, strong frames, headlines, primary contrast
- Carbon `#211E1B` — secondary dark surfaces and body contrast
- Espresso `#342A24` — primary actions and selected dark surfaces
- Soft Ivory `#F5F2ED` — primary editorial canvas; warm without reading yellow
- Paper `#FFFFFF` — readable content and email surfaces
- Muted Parchment `#E6DFD5` — quiet section separation with restrained warmth
- Taupe `#A89B8C` — rules, borders, and inactive controls
- Slate `#665E56` — secondary text
- Champagne `#D7B67E` — illuminated selection edges and signature light on dark surfaces
- Champagne Ink `#6E5639` — accessible warm accent text on light surfaces
- Error `#B42318` — destructive and error feedback only
- Success `#216E4E` — system success feedback only, not a brand accent

### Color rules

- Ink, espresso, soft ivory, white, and photography carry most of the system.
- Espresso carries action. Champagne marks selection and a small number of brand moments.
- Champagne may glow only against sufficiently dark surfaces. Use Champagne Ink for readable warm
  text on light surfaces.
- A page may be dark-first when it is an immersive photographic creation or editing workspace.
- Marketing and product may alternate ink and warm-ivory sections to create editorial rhythm.
- Emails remain primarily light for readability, with black mastheads or image panels allowed.
- Preserve natural skin tones. Do not force brand color grading onto faces.
- System feedback colors may appear only when their meaning is necessary.

### Prohibited color behavior

- No blush, dusty rose, pastel pink, or generic beige-and-gold luxury systems.
- No purple or blue AI gradients.
- No colored neon, rainbow feature coding, or decorative gradients.
- No champagne glow on body copy, form labels, ordinary buttons, error states, or dense surfaces.
- No more than one neon phrase and three tiny light points within one viewport.
- No new brand color without Sandra's explicit approval and an update to this document.
- Do not hardcode new colors inside components when a design token exists.

## Typography

### Implementation baseline

- Display and editorial headlines: `Cormorant Garamond`
- Product UI, body, labels, and buttons: `Manrope`
- Signature phrase on approved dark brand moments only: `Allura`
- Email serif fallback: Georgia, Times New Roman, serif
- Email sans fallback: Arial, Helvetica, sans-serif

Cormorant Garamond and Manrope remain the working UI families. Allura is a restricted signature
asset, not an interface typeface. Do not introduce another product or marketing family without an
approved typography specimen.

### Type behavior

- Use large editorial serif headlines with strong contrast and tight, deliberate line breaks.
- Use the serif selectively; interfaces still need clear sans-serif controls and body copy.
- Use uppercase sans labels for navigation, steps, metadata, eyebrows, and compact actions.
- Small labels may use wider tracking, but must remain readable.
- Body copy should be calm, direct, and comfortably sized.
- Use Allura only for the approved short neon signature, never for instructions, controls, body
  copy, navigation labels, email copy, or required information.
- Avoid other decorative scripts, faux handwriting, ultra-condensed sports fonts, and thin
  unreadable type.
- Do not make every heading serif; hierarchy depends on contrast between display and utility type.

## Shape, Grid, and Depth

- Default product radius: `6px`.
- Allowed range: `0-10px` for functional surfaces.
- Large image frames may use `0-8px`; full-bleed imagery may remain square.
- Pills are reserved for compact filters, status, and segmented controls—not general layout.
- Use one-pixel dividers and visible frames instead of placing every item on a shadowed card.
- Shadows should be restrained and used only to clarify elevation.
- Avoid glassmorphism, floating white-card grids, excessive blur, and ornamental depth.
- Desktop layouts may use strong vertical rails and asymmetric editorial columns.
- Mobile layouts should simplify the same hierarchy rather than becoming a different brand.

## Photography and Image Direction

Images are the strongest brand material.

Use:

- Sandra's approved imagery and identity references
- Real member selfies with permission
- Realistic AI-selfie results with recognizable identity
- Varied women, crops, outfits, light, and emotional energy
- Direct gaze, natural skin texture, fashion-aware styling, and confident composition
- Black-and-white photography when it adds contrast or story
- Contact-sheet arrangements, image numbering, film-strip rhythm, and editorial crops where useful

Avoid:

- Repeating one AI face across multiple tiles
- Generic stock women or plastic AI beauty imagery
- Soft-focus lifestyle photography with no clear visual outcome
- Decorative flowers, cosmetic motifs, uncontrolled sparkles, or feminine clichés
- Heavy filters that distort skin or identity
- Using unapproved customer imagery

Freeze and approve identity-sensitive photography before adding typography or layout around it.

## Iconography and Motion

- Use simple line icons with consistent stroke weight.
- Icons support labels; they should not replace unclear navigation language.
- Avoid decorative icon collections, emojis, 3D icons, and AI sparkle clutter.
- One small star-point may anchor an approved neon signature; it is not a reusable feature icon.
- Motion should clarify selection, progress, opening, and completion.
- Prefer quick fades, reveals, and directional transitions over bouncy motion.
- Respect reduced-motion preferences.

## Product UI: SSELFIE Suite

Suite should feel like a visual studio, not a dashboard.

- Keep `TAKE -> CREATE -> EDIT -> POST` visible and understandable.
- Desktop may use a black navigation rail with a high-contrast editorial canvas.
- Mobile should use a compact black masthead, photo-first content, and clear stage navigation.
- Use espresso for active paths and primary selected surfaces. Use champagne for the active rail,
  selected-image edge, focus support, and controlled illumination.
- The desktop navigation may carry one short neon signature in unused dark space. Mobile may carry
  one compact signature mark in the masthead. Neither may compete with the active task.
- Prioritize a few large photographic actions over many small feature cards.
- Use project/contact-sheet views for recent work where they improve recognition.
- Maya should appear as an integrated creative partner, focused workspace, or purposeful sheet.
- Keep providers, models, prompt architecture, billing mechanics, and internal complexity quiet.
- Preserve loading, empty, error, trial, limited-access, destructive, and generated-result states.
- Do not change access, billing, credits, entitlements, generation behavior, or customer data as part
  of a visual migration.

## Public Marketing

Marketing should use the same DNA without imitating an app screen.

- Use bold serif promises, large real imagery, ink/warm-ivory rhythm, and decisive composition.
- Lead with selfies and AI selfies, then show how editing and posting make them useful.
- Use photographic proof and transformation instead of generic feature icon grids.
- Use rectangular editorial sections, strong rules, espresso actions, and selective champagne
  light on dark brand moments.
- Keep offer details and CTAs easy to find.
- Avoid huge empty slogans without proof, generic SaaS mockups, repetitive card grids, and fake UI.

## Email

Email uses an email-safe expression of the same system.

- Use a light Paper or Chalk body for readability.
- A black masthead, thin black rule, or strong image block may establish the brand.
- Use one editorial headline, readable body copy, and one primary CTA.
- The primary CTA uses Editorial Ink or Espresso; champagne is not an email button background.
- Use one proof image when it materially improves the message.
- Keep text meaningful when images are blocked and provide useful alt text.
- Keep compliant footer and unsubscribe content intact.
- Do not build image-only emails, full dark shells, card dashboards, icon rows, or decorative banners.
- Test mobile width and representative email-client rendering before replacing a shared template.

`lib/email/templates/stone-email.ts` and `lib/email/editorial-email.ts` remain implementation
starting points, but their visible output must migrate toward this document when email redesign is
explicitly approved. This document does not authorize a send or a live template replacement.

## Checkout, Learning, Skool, and Social

- Checkout uses the most restrained version: high contrast, minimal distraction, clear money truth.
- Learning materials use bold section labels, strong image examples, and readable instructional type.
- Skool covers prioritize thumbnail readability, cinematic real proof, warm-ivory paper treatments,
  high-contrast serif headlines, and a limited champagne handwritten glow.
- Social graphics may use contact sheets, numbering, ink bands, crisp serif headlines, espresso
  blocks, and controlled champagne light while keeping the selfie visible.
- Torn paper, handwriting, and glow belong to editorial assets and occasional brand moments; they
  do not become product cards, buttons, form fields, or chat bubbles.
- Do not force identical layouts across formats; preserve the design language and hierarchy.

## Accessibility and Responsive Rules

- Meet WCAG AA contrast for body copy, controls, and essential labels.
- Do not use Slate or Silver for important small text on Chalk or Paper.
- Touch targets should be at least 44 by 44 CSS pixels.
- Keyboard focus must remain visible.
- Mobile layouts must be intentionally composed, not compressed desktop screens.
- Test at minimum one small phone, one large phone, one laptop, and one wide desktop.
- Preserve semantic structure, accessible dialogs, live regions, and destructive-action confirmation.

## Implementation Governance

### Single source of truth

Only this file governs current visual direction. The following are not current design instructions:

- Files under `docs/archive/**`
- Dated design and UX audits
- Generated image prompts and output folders
- Old screenshots and earlier prototypes
- Historical strategy documents
- Existing inconsistent UI merely because it is live

The pointer `docs/brand/DESIGN_SYSTEM.md`, the repository README, and the documentation index may
refer here, but must not define competing palettes or rules.

### Code rules

1. Define approved visual values as named tokens before broad migration. New work uses Espresso,
   Soft Ivory, Muted Parchment, Taupe, Champagne, and Champagne Ink; do not revive Oxblood as a brand
   accent.
2. Build shared Suite, marketing, and email primitives appropriate to each channel.
3. Do not combine a visual migration with backend, billing, entitlement, or generation rewrites.
4. Replace hardcoded legacy styling incrementally; do not add another override layer.
5. Do not introduce a new color, font, radius system, or component family without approval.
6. Keep real copy, state, navigation, and behavior separate from visual-reference placeholders.
7. Preserve unrelated customer-facing routes until their usage and entitlement dependencies are known.

### Required proof before broad rollout

Before applying this expression to a new channel, approve a representative proof for that channel.
The Suite desktop/mobile proof and Skool covers are approved. Public marketing and production email
still require their own responsive proof before broad migration:

1. One representative Suite screen on desktop and mobile
2. One representative public marketing section on desktop and mobile
3. One representative lifecycle or transactional email

After approval, migrate channel by channel. Do not treat one attractive screenshot as complete QA.

### Required verification

- Visual screenshots for critical desktop and mobile states
- Functional regression tests for changed Suite components
- Keyboard, focus, overflow, and responsive checks
- Loading, empty, error, modal, trial, limited-access, and completed-result checks
- Email preview and mobile render checks
- Review against the prohibited patterns in this document

## Authority and History

Current authority:

- `docs/SSELFIE_DESIGN_SYSTEM.md`
- Approved reference: `docs/brand/references/sselfie-editorial-neon-suite-direction-2026-08-26.png`

Historical references:

- `docs/brand/references/sselfie-bold-editorial-direction-2026-08-23.png`
- `docs/archive/legacy-design-systems/SSELFIE_DESIGN_SYSTEM_2026-08-09.md`
- `docs/archive/legacy-design-systems/DESIGN_SYSTEM_2026-05-02.md`

Historical files are retained for traceability only. They must never override this document.
