// SSELFIE Studio 3.0 — Carousel Design Systems (MAYA-REBUILD-16).
//
// A carousel is a mini editorial design system, not disconnected AI photos (QA doc §10 and
// Sandra's reference grids). Each system is a complete visual language for the WHOLE set:
// palette + grade, baked typography, decoration rules, and how each slide TYPE is treated. Slides
// come in three visual roles:
//   - "identity":  she appears (kept recognizable — the No-Fake doctrine). Default for most slides.
//   - "detail":    a styled close-up, object, screenshot, hand, reflection, or scene moment. Use only on purpose.
//   - "text-only": a designed typographic slide, optionally with her as a subtle photo element.
//
// CAROUSEL-03: the image model is the designer. Finished slides bake type/callouts in the
// generated image; there is no local text-overlay renderer after generation.
// Doctrine: docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md — realism over perfection,
// recognizable over idealized, creative direction over deception.

export type SlideVisual = "identity" | "detail" | "text-only"

export interface CarouselDesignSystem {
  id: string
  name: string
  /** When Maya should pick it (her decision guide + the concept card description). */
  whenToUse: string
  /** Injected into EVERY slide prompt so the set reads as one designed object. */
  setDna: string
  /** How an identity slide is composed in this system (input: selfie). */
  identityTreatment: string
  /** How a detail slide is composed. */
  detailTreatment: string
  /** How a text-first slide is composed. */
  textOnlyTreatment: string
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
    detailTreatment:
      "A real, tactile close-up photograph of the subject: natural light, shallow depth of field, " +
      "true textures (ceramic, paper, fabric, glass, metal), slight imperfection so it reads like a phone photo from a " +
      "beautiful morning, not a stock image. Include her hands, reflection, profile, or outfit detail when it keeps the slide personal. The text sits in the calmest open area, with one handwritten accent pointing " +
      "to or circling the key phrase.",
    textOnlyTreatment:
      "A designed typographic slide on a textured paper or soft plaster background in the set's palette. The message is " +
      "the hero: large serif statement or a short list with small hand-drawn checkmarks or dashes. One handwritten " +
      "annotation maximum. Generous margins, lots of calm space.",
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
    detailTreatment:
      "A full-bleed cinematic detail from her world: one hero object, her hand, reflection, profile, or outfit crop when useful, dramatic soft light, deep shadows, " +
      "the set's grade. Text overlaid in the darkest or calmest region, perfectly legible.",
    textOnlyTreatment:
      "A near-black or deep-toned slide with a single large serif statement (or short list) in off-white. One thin rule " +
      "or small italic supporting line. Gallery-wall minimal.",
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
    detailTreatment:
      "A bright minimal detail: one or two objects, her hands, a profile crop, or a clean light surface, soft daylight, true texture. " +
      "Text in the open space above or beside the objects.",
    textOnlyTreatment:
      "An off-white slide with the message set like a beautifully typeset magazine quote or checklist: serif headline, " +
      "small sans details, one hairline rule. Nothing else.",
  },
]

export const DEFAULT_DESIGN_SYSTEM_ID = "cutout-editorial"

export function resolveDesignSystem(id?: string | null): CarouselDesignSystem {
  const key = (id ?? "").toLowerCase().trim()
  return CAROUSEL_DESIGN_SYSTEMS.find(s => s.id === key) ?? CAROUSEL_DESIGN_SYSTEMS[0]
}

/**
 * Default visual mix when Maya doesn't tag slides (back-compat + safety net).
 * Doctrine: carousels should feel like part of the user's photoshoot, not disconnected
 * still-life slides. Identity is the default; detail/text-only happen only when Maya
 * deliberately tags them.
 */
export function defaultSlideVisual(
  role: "hook" | "value" | "cta",
  _valueIndex: number
): SlideVisual {
  return role === "value" || role === "hook" || role === "cta" ? "identity" : "detail"
}

/** The carousel design guide injected into Maya's system prompt (carousel format only). */
export function getCarouselDesignGuide(): string {
  const systems = CAROUSEL_DESIGN_SYSTEMS.map(s => `- "${s.id}" (${s.name}): ${s.whenToUse}`).join(
    "\n"
  )
  return [
    "## CAROUSEL DESIGN SYSTEMS (a carousel is a mini editorial design system, not 5 photos of her with text)",
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
    '- Tag every slide with "visual": "identity" | "detail" | "text-only".',
    "- PHOTOSHOOT-FIRST DEFAULT: the carousel should feel like a continuation of the user's photoshoot. Use identity slides by default for hook, value, and CTA slides so the person stays present and recognizable.",
    "- Detail slides are optional, not default. Use them only when a screenshot, object, phone, product, texture, hand, reflection, or crop genuinely explains the point better than another full person-in-scene image.",
    "- Text-only slides (when used) carry lists, the big statement, or the CTA. The copy is the hero, but the slide can still include her as a subtle cutout or photo element if it fits.",
    "- Keep identity slides natural and recognizable — never an idealized stranger. Vary crop, pose, and text placement so it does not feel repetitive.",
    '- When you deliberately choose a detail slide, give it a concrete "detailSubject" that VISUALIZES that slide\'s message, not just the scene (the slide "stop using flash" -> a phone face-down by a window with soft daylight).',
    "- Write slide copy that teaches or tells a story worth saving. Short headline per slide; body lines only where they help.",
    "- The whole set shares one palette and one voice. Vary the slide compositions so the carousel feels designed, never repetitive.",
  ].join("\n")
}
