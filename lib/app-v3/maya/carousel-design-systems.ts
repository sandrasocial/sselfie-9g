// SSELFIE Studio 3.0 — Carousel Design Systems (MAYA-REBUILD-16).
//
// A carousel is a mini editorial design system, not disconnected AI photos (QA doc §10 and
// Sandra's reference grids). Each system is a complete visual language for the WHOLE set:
// palette + grade, baked typography, decoration rules, and how each slide is treated. Customer
// slides are always real-image redesigns: the person appears, or a tutorial screenshot/reference
// is preserved. There are no faceless object-only or text-only cards.
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
    name: "Cutout Editorial",
    whenToUse:
      "Instagram-native teaching and story carousels: collage energy, cutout stickers, " +
      "handwritten notes. Feels saved-from-Pinterest, personal, and current.",
    setDna:
      "Design system: editorial collage, like a curated moodboard page. One muted palette across the whole set " +
      "(soft greys, warm neutrals, deep charcoal accents; or the look's own palette if given). Elegant serif display " +
      "headlines, some key words on small white label strips like cut paper. Hand-drawn accents in thin white or " +
      "charcoal ink: a small arrow, a loose circle around one phrase, a short underline, an occasional tiny star. " +
      "Subtle film grain, soft shadows under cutout elements so the collage feels physical. Calm, premium, never " +
      "cluttered: at most two decorations per slide. No emojis, no clip-art, no gradients, no neon, no Canva-template look.",
    identityTreatment:
      "Compose her as a CUTOUT STICKER: cut her out cleanly along her silhouette with a thin solid white outline " +
      "(sticker style) and place her over a softly blurred or flat editorial background from the scene. She is " +
      "medium-small in the frame (about one third), leaving generous space for the headline and one handwritten accent. " +
      "A soft drop shadow under the cutout makes it feel pasted on.",
    textFreeSetDna:
      "Design system: editorial collage, like a curated moodboard page. One muted palette across the whole set " +
      "(soft greys, warm neutrals, deep charcoal accents; or the look's own palette if given). Hand-drawn accents in " +
      "thin white or charcoal ink at most: a small arrow, a loose circle, a short underline. Subtle film grain, soft " +
      "shadows under cutout elements so the collage feels physical. Calm, premium, never cluttered: at most two " +
      "decorations per slide. No emojis, no clip-art, no gradients, no neon, no Canva-template look.",
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

export const DEFAULT_DESIGN_SYSTEM_ID = "cutout-editorial"

export function resolveDesignSystem(id?: string | null): CarouselDesignSystem {
  const key = (id ?? "").toLowerCase().trim()
  return CAROUSEL_DESIGN_SYSTEMS.find(s => s.id === key) ?? CAROUSEL_DESIGN_SYSTEMS[0]
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
    "Design system VARIATION (non-negotiable):",
    "- ALWAYS set brief.graphic.designSystem explicitly on every carousel concept. Never leave it blank.",
    "- Your 3 concepts must NOT all use the same design system: give at least two different systems across the set, so she sees genuinely different directions, not one style three times.",
    "- Match system to topic and look: moody or authority -> full-bleed-editorial; teaching or collage energy -> cutout-editorial; light, bright, checklist -> soft-minimal.",
    "- If she asks for a specific style, or repeats one she loved, honor that instead.",
    "",
    "Slide mix rules (non-negotiable):",
    '- Every customer carousel slide is a real-image redesign: the person appears, recognizable and natural, with text baked into the finished image.',
    "- Do not create object-only, screenshot-only, or typography-only cards for customer carousels. If a slide is a hook, list, big statement, or CTA, it still uses a real photo moment of her.",
    "- PHOTOSHOOT-FIRST DEFAULT: the carousel should feel like a continuation of the user's photoshoot, so the person stays present and recognizable.",
    "- Vary crop, pose, background, scale, and text placement so the set does not feel repetitive.",
    "- Write slide copy that teaches or tells a story worth saving. Short headline per slide; body lines only where they help.",
    "- The whole set shares one palette and one voice. Vary the slide compositions so the carousel feels designed, never repetitive.",
  ].join("\n")
}
