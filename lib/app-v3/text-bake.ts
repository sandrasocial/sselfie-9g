// SSELFIE Studio 3.0 - TEXT-STUDIO-01: baked-text prompt builders (hybrid two-source model).
//
// Sandra's live verdict (2026-07-02): the CSS layer previews instantly and edits for free, but
// the BAKED text designs are more interesting - gpt-image-2 now integrates type with texture,
// depth, and text-behind-subject at ~99% spelling accuracy. What killed baked text before was
// removal: taking the words off meant a full regenerate. The hybrid keeps both sources:
//
//   1. The CLEAN text-free image stays the source of truth (the overlay pipeline already
//      generates it). It is never overwritten.
//   2. "Apply to photo" runs ONE openai.images.edit pass on the CLEAN base with a prompt built
//      here, baking the member's exact words in the chosen overlay style. NEVER bake from a
//      previous baked result - iterative edit passes degrade the photo and the likeness.
//   3. "Without text" is a client-side swap back to the clean base. Zero API calls.
//   4. The CSS layer (lib/app-v3/text-overlay.ts) stays the live preview and the fallback
//      download path when a bake fails or she prefers the crisp layer look.
//
// Each OverlayStyleId gets a bake directive that speaks the same design language as its layer
// preset: the five retired gpt-image-2 typography directives (lib/app-v3/maya/overlay-styles.ts,
// removed at 80c48b9e) ported back as bake-prompt builders, plus Cutout Editorial derived from
// the carousel design-system DNA (lib/app-v3/maya/carousel-design-systems.ts).
//
// Doctrine: docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md - the bake adds a typography
// layer and must never touch her face or body. Every prompt carries that rule explicitly.

import {
  isVerticalOverlayFormat,
  parseOverlayEmphasis,
  resolveOverlayStyle,
  stripOverlayEmphasis,
  type OverlayStyleId,
  type TextOverlaySpec,
} from "@/lib/app-v3/text-overlay"

export interface BakeStyleDirective {
  /** Typography treatment sent to gpt-image-2 (ported from the retired overlay-styles library). */
  typography: string
  /** Accent treatment (hand-drawn marks etc.), or "none". */
  accents: string
}

/**
 * Per-style bake directives. The five named styles keep their retired MAYA-REBUILD-09 prompt
 * language; cutout-editorial speaks the Cutout Editorial carousel design-system DNA.
 */
export const BAKE_STYLE_DIRECTIVES: Record<OverlayStyleId, BakeStyleDirective> = {
  "editorial-serif-center": {
    typography:
      "Typography: a large high-contrast elegant serif headline (Cormorant style), generous margins " +
      "and calm spacing, centered like a magazine cover. The supporting line is small, uppercase, " +
      "letter-spaced clean sans. A single thin hairline rule between headline and supporting line is " +
      "allowed. A soft dark floor fade behind the text area is allowed for legibility, never a hard box.",
    accents: "none",
  },
  "lower-third-accent": {
    typography:
      "Typography: an elegant serif headline sitting low in the frame, left aligned, intimate and " +
      "honest, with ONE key word emphasized. The supporting line is small and quiet.",
    accents:
      "Accents (subtle, thin, hand-drawn in the same ink as the text, never childish): a soft underline " +
      "under the key word at most. No sparkles, no clip-art, no arrows on the face. At most two marks.",
  },
  "top-band-minimal": {
    typography:
      "Typography: one short refined serif headline set across the top of the frame with wide letter " +
      "spacing, very minimal, lots of negative space. The supporting line is tiny, uppercase, " +
      "letter-spaced clean sans. No rules, no boxes, no darkening, no accents.",
    accents: "none",
  },
  "quote-statement": {
    typography:
      "Typography: a short serif statement, calm and confident, centered. If the area behind the text " +
      "is busy, a very subtle darkening of just that area is allowed for legibility (never a colored " +
      "box, never a gradient banner).",
    accents: "none",
  },
  "series-cover": {
    typography:
      "Typography: a bold repeatable series title in elegant serif as the main element, with a small " +
      "uppercase letter-spaced sans label beneath it. Keep the placement centered and consistent so " +
      "the series stays recognizable in the grid.",
    accents: "Optional single subtle accent: a small imperfect hand-drawn circle around the label. Nothing else.",
  },
  "cutout-editorial": {
    typography:
      "Typography: editorial collage energy, like a curated moodboard page. A large cream serif display " +
      "headline near the top, left aligned, with a sentence-case clean sans supporting line. One key " +
      "phrase may sit on a small cut-paper label strip like a pasted sticker. Subtle film grain is " +
      "welcome. Calm, premium, never cluttered. No emojis, no clip-art, no gradients, no neon, no " +
      "Canva-template look.",
    accents:
      "Hand-drawn accents in thin white or charcoal ink, only where they help: a loose circle around " +
      "one phrase, a short underline, or one small curved arrow pointing from the supporting line " +
      "toward the subject. At most two decorations.",
  },
}

/** The first *marked* phrase in a headline or subline (what the style's accent applies to). */
export function bakeMarkedPhrase(text: string | undefined | null): string | null {
  if (!text) return null
  const marked = parseOverlayEmphasis(text).find(segment => segment.emphasized)
  const phrase = marked?.text.replace(/\s+/g, " ").trim()
  return phrase || null
}

/** The No-Fake identity rule every bake prompt carries. Exported so tests pin the exact line. */
export const BAKE_IDENTITY_RULE =
  "Keep the photo itself exactly as it is: same person, same face, same body, same skin, same pose, " +
  "same background, same light. Do not alter her face or body in any way. She stays completely " +
  "recognizable: still her."

/** IG safe-zone guidance per format. Exported so tests pin the exact lines. */
export const BAKE_SAFE_ZONE_VERTICAL =
  "Keep all text within the middle 65% vertical band of the frame, well clear of the very top and " +
  "very bottom where the Instagram interface sits, and inside comfortable side margins."
export const BAKE_SAFE_ZONE_FEED =
  "Keep all text well inside the frame with generous margins on every side, never touching an edge."

function positionGuidance(spec: TextOverlaySpec): string {
  if (spec.position === "top") return "Place the text block across the upper part of the frame."
  if (spec.position === "center") return "Place the text block centered in the frame."
  return "Place the text block in the lower third of the frame."
}

export interface BakePromptOptions {
  /**
   * MAYA-GUIDED-TEXT-01: an optional freeform member adjustment ("set all the text in red",
   * "lighter, more minimal typography"), pre-sanitized by lib/app-v3/text-refinements.ts.
   * It only ever steers the TYPE treatment; the identity rule still locks the photo.
   */
  styleAdjustments?: string
}

/** Flatten + cap an untrusted adjustments string before it rides inside the prompt. */
export function sanitizeBakeStyleAdjustments(value: unknown): string | null {
  if (typeof value !== "string") return null
  const clean = value
    .replace(/["\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300)
  return clean.length > 0 ? clean : null
}

/**
 * Build the ONE-pass gpt-image-2 bake prompt for a member's overlay spec. The input image is
 * always the CLEAN text-free base; the prompt adds the typography design and nothing else.
 */
export function buildBakePrompt(spec: TextOverlaySpec, options?: BakePromptOptions): string {
  const preset = resolveOverlayStyle(spec.style)
  const directive = BAKE_STYLE_DIRECTIVES[preset.id]
  const headline = stripOverlayEmphasis(spec.headline)
  const subline = spec.subline ? stripOverlayEmphasis(spec.subline) : ""
  const headlinePhrase = bakeMarkedPhrase(spec.headline)
  const sublinePhrase = bakeMarkedPhrase(spec.subline)

  const lines: string[] = [
    "Add a designed text overlay to the attached image, like a printed magazine layer over the photo.",
    BAKE_IDENTITY_RULE,
    `Render this headline text EXACTLY as written, letter for letter, correct spelling: "${headline}"`,
  ]
  if (subline) {
    lines.push(`Render this smaller supporting line EXACTLY, correct spelling: "${subline}"`)
  }
  lines.push(directive.typography)
  if (directive.accents !== "none") lines.push(directive.accents)

  // The member's tap-to-highlight marks translate into the style's own accent treatment.
  if (headlinePhrase && preset.headlineMark === "underline-italic") {
    lines.push(
      `Emphasize ONLY the phrase "${headlinePhrase}" inside the headline: set it in italic with one ` +
        "subtle thin hand-drawn underline beneath it, in the same ink as the text."
    )
  }
  if (headlinePhrase && preset.headlineMark === "strip") {
    lines.push(
      `Place ONLY the phrase "${headlinePhrase}" from the headline on the small light cut-paper label ` +
        "strip with near-black text. The rest of the headline stays plain cream serif."
    )
  }
  if (subline && sublinePhrase && preset.sublineMark === "circle") {
    lines.push(
      `Circle ONLY the words "${sublinePhrase}" in the supporting line with one loose, imperfect ` +
        "hand-drawn ellipse in thin ink."
    )
  }

  // Member chat refinements ("make the text red", "thinner fonts") ride here. They may name
  // colors beyond our UI tokens: her covers are her content, tokens govern our chrome only.
  const adjustments = sanitizeBakeStyleAdjustments(options?.styleAdjustments)
  if (adjustments) {
    lines.push(`Member style adjustment for the TEXT TREATMENT ONLY (never the photo): ${adjustments}`)
  }

  lines.push(positionGuidance(spec))
  lines.push(isVerticalOverlayFormat(spec.format) ? BAKE_SAFE_ZONE_VERTICAL : BAKE_SAFE_ZONE_FEED)
  lines.push(
    "Crisp clean letterforms with correct kerning, integrated into the image like real printed type. " +
      "No misspelled, warped, duplicated, or missing letters. No extra words, no watermarks, no logos, " +
      "no emojis."
  )
  return lines.join(" ")
}
