// SSELFIE Studio 3.0 — Carousel Design Systems (MAYA-REBUILD-16).
//
// A carousel is a mini editorial design system, not disconnected AI photos (QA doc §10 and
// Sandra's reference grids). Each system is a complete visual language for the WHOLE set:
// palette + grade, baked typography, decoration rules, and how each slide is treated. Customer
// slides follow the story: portraits, details, original uploads and statement cards.
//
// CAROUSEL-03: the image model is the designer. Finished slides bake type/callouts in the
// generated image; there is no local text-overlay renderer after generation.
// Doctrine: docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md — realism over perfection,
// recognizable over idealized, creative direction over deception.

export interface CarouselDesignSystem {
  id: string
  name: string
  /** When Maya should pick it (her decision guide + the concept card description). */
  whenToUse: string
  /** Injected into EVERY slide prompt so the set reads as one designed object. */
  setDna: string
  /** How an identity slide is composed in this system (input: selfie). */
  identityTreatment: string
  /**
   * MAYA-FIX-03 (flag-gated): the same visual world with every typography instruction removed.
   * Used when the words are composited as a real text layer after generation, so the image model
   * only builds the scene and leaves calm negative space for the layer.
   */
  textFreeSetDna: string
}

export const CAROUSEL_DESIGN_SYSTEMS: CarouselDesignSystem[] = [
  {
    id: "cutout-editorial",
    name: "Layered Editorial",
    whenToUse:
      "Instagram-native teaching and story carousels: layered photo-dump energy, film-frame crops, " +
      "and restrained handwritten notes. Personal, current, and still photographic.",
    setDna:
      "Design system: layered photographic editorial, like a tightly edited photo-dump or contact sheet. One muted palette across the whole set " +
      "(soft greys, warm neutrals, deep charcoal accents; or the look's own palette if given). Elegant serif display " +
      "headlines, some key words on small white label strips like cut paper. Hand-drawn accents in thin white or " +
      "charcoal ink: a small arrow, a loose circle around one phrase, a short underline, an occasional tiny star. " +
      "Use full-bleed photographs, film-frame crops, or two real photo panels with subtle film grain. Calm, premium, never " +
      "cluttered: at most two decorations per slide. No emojis, no clip-art, no gradients, no neon, no Canva-template look.",
    identityTreatment:
      "Photograph her fully inside the real scene with scene-matched light, reflected color, contact shadows, and natural depth. " +
      "She may appear in one full-bleed frame or in two photographic crops from the same moment, leaving calm space for the headline. " +
      "Never extract her silhouette, never add a white outline or subject drop shadow, and never make her look like a sticker, cutout, or pasted layer.",
    // Overlay mode: the app layer owns EVERY ink mark (strip, circle, arrow), positioned
    // exactly around the real words. A baked circle around nothing would fight the layer.
    textFreeSetDna:
      "Design system: layered photographic editorial, like a tightly edited photo-dump or contact sheet. One muted palette across the whole set " +
      "(soft greys, warm neutrals, deep charcoal accents; or the look's own palette if given). Use full-bleed photos or real film-frame crops with subtle grain. Calm, premium, never cluttered. " +
      "Absolutely NO hand-drawn marks of any kind: no arrows, no circles, no underlines, no ink accents, no label " +
      "strips, no stickers, no subject cutout, and no silhouette outline. No emojis, no clip-art, no gradients, no neon, " +
      "no Canva-template look.",
  },
  {
    id: "full-bleed-editorial",
    name: "Full-Bleed Editorial",
    whenToUse:
      "Cinematic and moody. Authority posts, brand-world moments, dark looks (Noir, Dark Balcony, Mysterious Vogue). " +
      "Feels like a fashion magazine spread.",
    setDna:
      "Design system: full-bleed editorial photography with restrained type. One cinematic grade across the whole set " +
      "(deep shadows, refined contrast, muted color). White or off-white serif headlines placed directly on the image " +
      "in the calmest area; a few key words may be italic. Thin rules or a small white box for emphasis at most. " +
      "No stickers, no doodles, no clutter, no emojis, no gradients. Quiet luxury.",
    identityTreatment:
      "A candid full-bleed editorial photograph of her, caught mid-moment, composed with generous negative space for " +
      "the headline. She is never centered and posing; the frame breathes.",
    textFreeSetDna:
      "Design system: full-bleed editorial photography. One cinematic grade across the whole set " +
      "(deep shadows, refined contrast, muted color). No stickers, no doodles, no clutter, no emojis, " +
      "no gradients. Quiet luxury.",
  },
  {
    id: "soft-minimal",
    name: "Soft Minimal",
    whenToUse:
      "Light, airy, clean-girl energy. How-to and checklist carousels for bright looks (Clean Girl, Coastal White). " +
      "Feels like a calm Scandinavian magazine.",
    setDna:
      "Design system: light luxury minimalism. Off-white, pearl, and oat backgrounds with one soft accent tone from the " +
      "look. Elegant serif headlines in near-black, clean small sans for supporting lines. Hairline dividers, generous " +
      "white space, tiny page-number details. Soft natural shadows only. No decorations beyond a single thin underline, " +
      "no emojis, no gradients, no clutter.",
    identityTreatment:
      "A bright, soft editorial photograph of her in natural window light, plenty of clean negative space (white wall, " +
      "linen, sky) where the headline sits. Calm and unposed.",
    textFreeSetDna:
      "Design system: light luxury minimalism. Off-white, pearl, and oat backgrounds with one soft accent tone from " +
      "the look. Generous white space and soft natural shadows only. No decorations, no emojis, no gradients, " +
      "no clutter.",
  },
]

export const DEFAULT_DESIGN_SYSTEM_ID = "full-bleed-editorial"

export function resolveDesignSystem(id?: string | null): CarouselDesignSystem {
  const key = (id ?? "").toLowerCase().trim()
  return (
    CAROUSEL_DESIGN_SYSTEMS.find(s => s.id === key) ??
    CAROUSEL_DESIGN_SYSTEMS.find(s => s.id === DEFAULT_DESIGN_SYSTEM_ID)!
  )
}

/** The carousel design guide injected into Maya's system prompt (carousel format only). */
export function getCarouselDesignGuide(): string {
  const systems = CAROUSEL_DESIGN_SYSTEMS.map(s => `- "${s.id}" (${s.name}): ${s.whenToUse}`).join(
    "\n"
  )
  return [
    "## CAROUSEL DESIGN SYSTEMS (a carousel is a mini editorial design system, not 5 template cards)",
    "",
    "Pick ONE design system per concept (set brief.graphic.designSystem) that fits her brand and the topic:",
    systems,
    "",
    "- Choose one strong direction by default. Offer alternatives only when requested.",
    "- The member's current brief and brand determine palette, type and mood. These systems are starting points, never a fixed SSELFIE look.",
    "- Choose the visual that explains each slide: portrait, real memory photo, detail, screenshot, diagram, or plain statement.",
    "- Use no_reference for details and non-person scenes. Use screenshot_preserve_exact or existing_generated_image with sourceAssets for real uploads. Never fabricate historical memories, testimonials or screenshots.",
    "- About me: beginning, turning point, present work and invitation. Offer optional older photos or memories without making uploading a required step.",
    "- Walkthrough: real screenshots, clear steps and close-ups. Education: examples and checklists. Behind the scenes: real process and detail shots. Offers: real products and verified proof.",
    "- Use layout notes for a checklist, messages for a short message, filmstrip for 1-3 real photos, statement for a plain backdrop, or photo for a lifestyle scene. Use these only when they help this story.",
    "- Each output may include items (up to six short lines) and sourceAssets (up to three uploaded URLs, with role photo, screenshot or product). Bind assets to the exact slide that needs them.",
    "- Keep the same palette and voice across the set. Vary scene, crop, scale and text placement. All slides do not need her face.",
    "- Text and real uploads are composited locally. Do not ask the image model to draw words, fake UI, testimonials or screenshot contents.",
  ].join("\n")
}
