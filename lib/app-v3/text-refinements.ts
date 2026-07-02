// SSELFIE Studio 3.0 - MAYA-GUIDED-TEXT-01: plain-chat text refinements.
//
// Sandra's call (2026-07-02): she wants to ask for text changes in chat ("make the fonts more
// minimalistic", "change the font color to red", "remove the text") instead of digging through
// the Text Studio. This module is the pure parser: the concierge runs every composer message
// through parseTextRefinement, and when the latest generated graphic is a valid target it
// handles the ask directly:
//
//   - "remove the text"          -> instant clean swap (the clean base is kept forever, no API call)
//   - "put the text back"        -> instant swap back (no API call)
//   - "change the words to ..."  -> re-bake from the CLEAN base with the new headline
//   - "try the cutout style"     -> re-bake from the CLEAN base in the other template
//   - "make the text red"        -> re-bake with a color adjustment line in the bake prompt
//   - "make the fonts thinner"   -> re-bake with a freeform typography adjustment line
//
// Anything that doesn't clearly target the text falls through to Maya (returns null), so
// normal photo requests are never hijacked. Every re-bake starts from the clean text-free
// base (never a previous baked result), matching the TEXT-STUDIO-01 architecture.

import { OVERLAY_STYLE_PRESETS, type OverlayStyleId } from "@/lib/app-v3/text-overlay"

export type TextRefinement =
  | { kind: "remove-text" }
  | { kind: "restore-text" }
  | { kind: "reword"; headline: string }
  | { kind: "switch-style"; style: OverlayStyleId }
  | { kind: "color"; color: string }
  | { kind: "adjust"; instruction: string }

/** Words that mean the message is about the on-image text, not the photo itself. */
const TEXT_TARGET = /\b(text|words?|font(?:s)?|typeface|lettering|typography|headline|caption|title|overlay)\b/i

/** Member color asks pass through to the bake prompt, so covers may use ANY color she names
 *  (member content is hers; the design tokens govern our UI chrome, not her covers). */
const COLOR_WORDS = [
  "red", "blue", "green", "white", "black", "cream", "ivory", "beige", "pink", "burgundy",
  "navy", "gold", "silver", "gray", "grey", "brown", "orange", "yellow", "purple", "lavender",
  "sage", "olive", "charcoal", "tan", "terracotta", "rust", "blush", "camel", "wine", "teal",
  "turquoise", "coral", "mint", "peach", "mauve", "taupe", "bone", "sand", "stone",
]
const COLOR_PATTERN = new RegExp(
  `\\b(?:(?:dark|light|deep|soft|pale|dusty|warm|cool|bright|muted)\\s+)?(${COLOR_WORDS.join("|")})\\b|(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)\\b`,
  "i"
)

/** Style names/aliases she might say -> the template id. Checked before the color/adjust paths. */
const STYLE_ALIASES: { pattern: RegExp; style: OverlayStyleId }[] = [
  { pattern: /\bcut\s?-?out\b|\bcollage\b|\bsticker\b/i, style: "cutout-editorial" },
  { pattern: /\blower\s?-?third\b|\bunderlined?\s+word\b/i, style: "lower-third-accent" },
  { pattern: /\btop\s?-?(?:band|minimal)\b/i, style: "top-band-minimal" },
  { pattern: /\bstatement\b|\bquote\b/i, style: "quote-statement" },
  { pattern: /\bseries\s?-?cover\b|\bseries\s+(?:style|look|title)\b/i, style: "series-cover" },
  {
    pattern: /\beditorial\s?-?(?:cover|serif)\b|\bmagazine\s+(?:cover|look|style)\b/i,
    style: "editorial-serif-center",
  },
]

/** Adjectives that read as a typography adjustment when aimed at the fonts/lettering. */
const FONT_ADJUSTMENT =
  /\b(minimal(?:ist(?:ic)?)?|thinner|thin|lighter|bolder|bold|bigger|larger|smaller|softer|cleaner|simpler|more\s+(?:minimal(?:ist(?:ic)?)?|elegant|delicate|modern|classic|editorial|refined|subtle)|less\s+\w+|serif|sans[\s-]?serif|italic|handwritten|uppercase|lowercase)\b/i

/** Cap + flatten a member phrase before it rides inside a bake prompt. */
export function sanitizeStyleAdjustments(value: string): string {
  return value
    .replace(/["\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200)
}

/**
 * Parse a composer message into a text refinement, or null when it should go to Maya.
 * Conservative on purpose: the message must clearly target the on-image text (or name a
 * template style) before we intercept it.
 */
export function parseTextRefinement(message: string): TextRefinement | null {
  const text = message.trim()
  if (!text || text.length > 300) return null
  const lower = text.toLowerCase()

  // "change the words to ..." / "change the text to say ..." / "make it say ..."
  const reword =
    /(?:change|update|swap|rewrite)\s+the\s+(?:words?|text|headline|title)\s+to(?:\s+say)?\s+(.+)/i.exec(
      text
    ) ?? /\bmake\s+it\s+say\s+(.+)/i.exec(text)
  if (reword?.[1]) {
    const headline = reword[1].replace(/^["']|["'.!]+$/g, "").trim()
    if (headline) return { kind: "reword", headline: headline.slice(0, 120) }
  }

  // Remove / restore: instant clean swaps, zero API calls.
  if (
    /\b(?:remove|take\s+(?:off|away|out)|delete|drop|hide|lose)\b[^.]*\b(?:text|words?|headline|title|overlay)\b/i.test(
      lower
    ) ||
    /\bwithout\s+(?:the\s+)?(?:text|words)\b/i.test(lower) ||
    /\bno\s+text\b/i.test(lower)
  ) {
    return { kind: "remove-text" }
  }
  if (
    /\b(?:put|bring|add)\b[^.]*\b(?:text|words?)\b[^.]*\bback\b/i.test(lower) ||
    /\bwith\s+(?:the\s+)?text\s+again\b/i.test(lower) ||
    /\bshow\s+the\s+text\b/i.test(lower)
  ) {
    return { kind: "restore-text" }
  }

  // Template switch by name: "try the cutout style", "make it the magazine cover look".
  const wantsStyle = /\b(?:style|look|template|design)\b/i.test(lower) || TEXT_TARGET.test(lower)
  if (wantsStyle) {
    for (const alias of STYLE_ALIASES) {
      if (alias.pattern.test(lower)) return { kind: "switch-style", style: alias.style }
    }
  }

  // From here on the message must clearly be about the text layer.
  if (!TEXT_TARGET.test(lower)) return null

  // Color: "make the text red", "change the font color to #B23A2E".
  const colorMatch = COLOR_PATTERN.exec(text)
  if (colorMatch && /\b(?:colou?r|make|change|turn|set)\b/i.test(lower)) {
    const color = (colorMatch[2] ?? colorMatch[0]).trim()
    return { kind: "color", color: sanitizeStyleAdjustments(color) }
  }

  // "make the fonts more minimalistic" and friends: a freeform typography adjustment.
  if (FONT_ADJUSTMENT.test(lower)) {
    return { kind: "adjust", instruction: sanitizeStyleAdjustments(text) }
  }

  return null
}

/** Human line for the bake prompt when she asked for a color. */
export function colorAdjustmentLine(color: string): string {
  return (
    `Set ALL the overlay text in ${sanitizeStyleAdjustments(color)}: headline and supporting ` +
    "line both use that color, keeping the same layout and design. If legibility needs it, a " +
    "subtle darkening behind the text area is allowed, never a colored box."
  )
}

/** Human line for the bake prompt when she asked for a typography feel. */
export function typographyAdjustmentLine(instruction: string): string {
  return (
    `Member typography request (apply it to the text treatment only, never the photo): ` +
    `"${sanitizeStyleAdjustments(instruction)}". Keep the same words and the same overall layout.`
  )
}

/** True when the id belongs to a real overlay style preset. */
export function isOverlayStyleId(value: string): value is OverlayStyleId {
  return OVERLAY_STYLE_PRESETS.some(preset => preset.id === value)
}
