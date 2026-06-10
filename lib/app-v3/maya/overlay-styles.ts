// SSELFIE Studio 3.0 — Text-overlay style library (MAYA-REBUILD-09).
//
// gpt-image-2 renders the text (System B: preserve the photo, add the overlay). Until now there
// was ONE flat overlay look, so covers/carousels read generic. This gives Maya a set of named,
// on-brand overlay STYLES she picks per the user's brand + memory + the post's emotion, encoded
// from Sandra's Carousel + Reel Cover system (elegant serif headline, clean sans labels, subtle
// hand-drawn accents only where they help, neutral tones, no Canva-template look).
//
// A style defines only HOW the text looks (typography + accents). WHERE the text sits is decided
// by the photo's role layout (hook/value/cta) so the text always lands in the clean negative space.

export interface OverlayStyle {
  id: string
  name: string
  /** Guidance Maya uses to pick the right style for this user + post. */
  when: string
  /** Typography directive sent to gpt-image-2. */
  typography: string
  /** Accent treatment (hand-drawn marks etc.), or "none". */
  accents: string
}

export const OVERLAY_STYLES: OverlayStyle[] = [
  {
    id: "editorial-serif-center",
    name: "Editorial Headline",
    when: "The default. Authority and educational posts, list hooks ('5 ways I...'), most brands. The clean magazine-cover look.",
    typography:
      "Typography: a large high-contrast elegant serif headline (Cormorant-style), generous margins and calm spacing. Any supporting line is small, uppercase, letter-spaced clean sans. A single thin hairline rule between headline and supporting line is allowed.",
    accents: "none",
  },
  {
    id: "lower-third-accent",
    name: "Lower Third with Accent",
    when: "Emotional or personal-story posts, vulnerable or 'rebuild' moments, honest statements. Feels intimate and handwritten.",
    typography:
      "Typography: an elegant serif headline sitting low in the frame, with ONE key word emphasized (bold or underlined). Supporting line small and quiet.",
    accents:
      "Accents (subtle, thin, hand-drawn in the same ink as the text, never childish): a soft underline under the key word, or one light imperfect circle around a phrase, and optionally a tiny handwritten-script note. At most two marks. No sparkles, no clip-art, no arrows on the face.",
  },
  {
    id: "top-band-minimal",
    name: "Top Minimal",
    when: "Clean-girl, minimalist, fresh or wellness brands. Quiet and spacious.",
    typography:
      "Typography: a short serif or refined clean headline set across the top, very minimal, with lots of negative space. No rules, no accents.",
    accents: "none",
  },
  {
    id: "quote-statement",
    name: "Quote / Statement",
    when: "Story slides and bold single statements, especially over a darker or busier photo.",
    typography:
      "Typography: a short serif statement, calm and confident. If the area behind the text is busy, a very subtle darkening of just that area is allowed for legibility (never a colored box, never a gradient banner).",
    accents: "none",
  },
  {
    id: "series-cover",
    name: "Series Cover",
    when: "A repeatable Reel or series cover (e.g. a recurring 'PROMPT MY SELFIE' series). Use only when she wants a branded, repeatable series look.",
    typography:
      "Typography: a bold repeatable series title in elegant serif as the main element, with a small uppercase sans label beneath it (e.g. a part number). Keep placement consistent so the series is recognizable in the grid.",
    accents: "Optional single subtle accent: a small imperfect circle around the label. Nothing else.",
  },
]

const DEFAULT_OVERLAY_STYLE = OVERLAY_STYLES[0]

/** Resolve a style by id (loose), falling back to the clean editorial default. */
export function resolveOverlayStyle(id?: string | null): OverlayStyle {
  if (!id) return DEFAULT_OVERLAY_STYLE
  const key = id.toLowerCase().trim()
  return OVERLAY_STYLES.find((s) => s.id === key || key.includes(s.id) || s.id.includes(key)) ?? DEFAULT_OVERLAY_STYLE
}

/** The style-specific lines (typography + accents) injected into the overlay prompt. */
export function styleTypographyLines(style: OverlayStyle): string[] {
  return [style.typography, style.accents && style.accents !== "none" ? style.accents : ""].filter(Boolean)
}

/** The picker guide injected into Maya's system prompt for graphic formats. */
export function getOverlayStyleGuide(): string {
  const list = OVERLAY_STYLES.map((s) => `- ${s.id} (${s.name}): ${s.when}`).join("\n")
  return [
    "## TEXT OVERLAY STYLES (pick one per concept; set it on graphic.overlayStyle)",
    "",
    "The text on covers, carousels, and stories must have a real, on-brand style, not one flat look.",
    "Choose the overlay style that fits HER brand, personal brand, and the post's emotion (use memory):",
    "",
    list,
    "",
    "Rules: a polished founder or coach usually wants editorial-serif-center; a raw personal story wants",
    "lower-third-accent; a minimalist or wellness brand wants top-band-minimal; a recurring reel series",
    "wants series-cover. When unsure, use editorial-serif-center. Set the chosen id on graphic.overlayStyle.",
  ].join("\n")
}
