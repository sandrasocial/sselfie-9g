// SSELFIE Studio 3.0 — Carousel Design Systems (MAYA-REBUILD-16).
//
// A carousel is a mini editorial design system, not five AI photos with text (QA doc §10 and
// Sandra's reference grids). Each system is a complete visual language for the WHOLE set:
// palette + grade, typography, decoration rules, and how each slide TYPE is treated. Slides
// come in three visual roles:
//   - "identity":  she appears (kept recognizable — the No-Fake doctrine). Max 1-2 per set.
//   - "detail":    a styled object shot from her world (coffee, desk, phone, notes). No people.
//   - "text-only": a designed typographic slide (lists, quotes, the CTA). No photo subject.
//
// Detail and text-only slides are generated WITHOUT the selfie attached (the route uses
// images.generate, not edit), so her face physically cannot drift on slides that don't need it.
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
  /** How a detail slide is composed (input: none — pure generation, no person). */
  detailTreatment: string
  /** How a text-only slide is composed (input: none). */
  textOnlyTreatment: string
}

export const CAROUSEL_DESIGN_SYSTEMS: CarouselDesignSystem[] = [
  {
    id: "cutout-editorial",
    name: "Cutout Editorial",
    whenToUse:
      "The default WOW. Instagram-native teaching and story carousels: collage energy, cutout stickers, " +
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
      "A real, tactile close-up photograph of the subject (no people, no faces): natural light, shallow depth of field, " +
      "true textures (ceramic, paper, fabric, glass, metal), slight imperfection so it reads like a phone photo from a " +
      "beautiful morning, not a stock image. The text sits in the calmest open area, with one handwritten accent pointing " +
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
      "A full-bleed cinematic still-life from her world (no people): one hero object, dramatic soft light, deep shadows, " +
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
      "A bright minimal still-life (no people): one or two objects on a clean light surface, soft daylight, true texture. " +
      "Text in the open space above or beside the objects.",
    textOnlyTreatment:
      "An off-white slide with the message set like a beautifully typeset magazine quote or checklist: serif headline, " +
      "small sans details, one hairline rule. Nothing else.",
  },
]

export const DEFAULT_DESIGN_SYSTEM_ID = "cutout-editorial"

export function resolveDesignSystem(id?: string | null): CarouselDesignSystem {
  const key = (id ?? "").toLowerCase().trim()
  return CAROUSEL_DESIGN_SYSTEMS.find((s) => s.id === key) ?? CAROUSEL_DESIGN_SYSTEMS[0]
}

/**
 * Default visual mix when Maya doesn't tag slides (back-compat + safety net).
 * Doctrine: 1-2 identity slides max. Hook carries her (the scroll-stopper), the CTA is
 * text-only, values alternate detail / text-only.
 */
export function defaultSlideVisual(role: "hook" | "value" | "cta", valueIndex: number): SlideVisual {
  if (role === "hook") return "identity"
  if (role === "cta") return "text-only"
  return valueIndex % 2 === 0 ? "detail" : "text-only"
}

/** The carousel design guide injected into Maya's system prompt (carousel format only). */
export function getCarouselDesignGuide(): string {
  const systems = CAROUSEL_DESIGN_SYSTEMS.map(
    (s) => `- "${s.id}" (${s.name}): ${s.whenToUse}`,
  ).join("\n")
  return [
    "## CAROUSEL DESIGN SYSTEMS (a carousel is a mini editorial design system, not 5 photos of her with text)",
    "",
    "Pick ONE design system per concept (set brief.graphic.designSystem) that fits her brand and the topic:",
    systems,
    "",
    "Slide mix rules (non-negotiable):",
    '- Tag every slide with "visual": "identity" | "detail" | "text-only".',
    "- MAX 2 identity slides per carousel (usually just the hook). She must stay clearly recognizable on them — never an idealized stranger.",
    '- Detail slides show HER world, no people: give each a concrete "detailSubject" (e.g. "cappuccino on a marble table beside her phone", "open notebook with a pen and reading glasses", "leather bag on a cafe chair"). Draw subjects from her brand and the chosen look.',
    "- Text-only slides carry lists, the big statement, or the CTA. The copy is the hero.",
    "- Write slide copy that teaches or tells a story worth saving. Short headline per slide; body lines only where they help.",
    "- The whole set shares one palette and one voice. Vary the slide types so the carousel feels designed, never repetitive.",
  ].join("\n")
}
