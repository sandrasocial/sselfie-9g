// SSELFIE Studio 3.0 - MAYA-FIX-03: composited text-overlay layer (flag-gated).
//
// Image models treat type as pixels, so baked-in headlines garble letters, drift out of
// Instagram safe zones, and can't be edited without a full regenerate. Behind the
// APP_V3_TEXT_OVERLAY_LAYER flag, graphic formats (reel-cover, story-slide, carousel,
// story-sequence) generate a CLEAN text-free image and the words arrive as a real layer:
// brand serif, token colors, correct contrast, IG safe zones, editable in one tap, and
// flattened into the final PNG only at download time.
//
// The overlay is NOT one flat look. Sandra's retired template library (five named styles
// with when-to-use logic) is ported here as real layer presets: each preset owns its full
// design - type scale, weight, alignment, position default, scrim treatment, tracking,
// and accents (hand-drawn underline, cut-paper strip, loose circle, curved arrow). Maya
// picks the starting style from the slide's role, design system, and emotion; the member
// can switch styles and text size instantly in the editor.
//
// This module is pure and shared by:
// - the prompt compiler (attaches a TextOverlaySpec per image job),
// - the generate route (returns specs alongside image URLs),
// - the client layer/editor components (render + edit),
// - the canvas export path (computeOverlayLayout drives the flattened render),
// - Maya's persona (getOverlayStyleGuide teaches her the styles by name).
//
// Accent geometry is emitted as SVG path strings so the on-screen layer (<path d>) and the
// canvas export (Path2D) draw the exact same ink. Everything is deterministic: the same
// spec + canvas size always yields the same layout.
//
// Design contract: docs/SSELFIE_DESIGN_SYSTEM.md. Tokens only - no gold, no gradients on
// text, serif display + clean sans. Fonts here mirror app/globals.css (--font-display).

import type { OutputFormat } from "@/components/app-v3/types"

// ─── Flag ───────────────────────────────────────────────────────────────────────

/** Server-side rollout flag. Default OFF: the baked-text pipeline stays live until QA. */
export function isTextOverlayLayerEnabled(): boolean {
  const value = (process.env.APP_V3_TEXT_OVERLAY_LAYER || "").trim().toLowerCase()
  return value === "1" || value === "true" || value === "on"
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export type OverlayFormat = "reel-cover" | "story-slide" | "story-sequence" | "carousel"
export type OverlayPosition = "top" | "center" | "bottom"
export type OverlaySize = "s" | "m" | "l"
export type OverlayStyleId =
  | "editorial-serif-center"
  | "lower-third-accent"
  | "top-band-minimal"
  | "quote-statement"
  | "series-cover"
  | "cutout-editorial"

/** The editable text layer for ONE image. Stored with the generation result, never in pixels. */
export interface TextOverlaySpec {
  headline: string
  subline?: string
  position: OverlayPosition
  style: OverlayStyleId
  format: OverlayFormat
  /** Member text-size control (S/M/L multiplier on the preset scale). Missing = "m". */
  size?: OverlaySize
}

/** How the layer guarantees contrast behind the words (never raw text on a busy photo). */
export type OverlayScrimKind =
  /** Positional floor/ceiling fade reaching well past the text (the classic cover look). */
  | "floor"
  /** A soft local darkening only where the text block sits. */
  | "band"
  /** No scrim. Only for styles whose guidance says to pick calm negative space. */
  | "none"

export type OverlayAlign = "center" | "left"

/** What a *marked* phrase means in the headline, per style. */
export type OverlayHeadlineMark = "none" | "underline-italic" | "strip"
/** What a *marked* phrase means in the subline, per style. */
export type OverlaySublineMark = "none" | "circle"

export interface OverlayStylePreset {
  id: OverlayStyleId
  name: string
  /** One short member-facing line on the style card in the editor. */
  hint: string
  /** Guidance Maya uses to pick the right style for this slide (getOverlayStyleGuide). */
  when: string
  align: OverlayAlign
  headlineColor: string
  sublineColor: string
  scrim: OverlayScrimKind
  /** Scrim fill (token). Fade alpha is applied at render time. */
  scrimColor: string
  /** Peak scrim opacity. */
  scrimAlpha: number
  /** Headline size as a fraction of canvas WIDTH (before the member size multiplier). */
  headlineFrac: number
  headlineWeight: number
  headlineLineHeight: number
  /** Headline letter-spacing in em (0 = natural serif set). */
  headlineTrackingEm: number
  sublineFrac: number
  sublineLineHeight: number
  sublineTrackingEm: number
  /** Uppercase tracking treatment for the subline (editorial label look). */
  sublineUppercase: boolean
  /** Vertical gap between headline block and subline, as a fraction of width. */
  gapFrac: number
  /** Thin hairline rule between headline and subline (only when a subline exists). */
  hairline: boolean
  /** How a *marked* headline phrase renders. */
  headlineMark: OverlayHeadlineMark
  /** How a *marked* subline phrase renders. */
  sublineMark: OverlaySublineMark
  /** Cut-paper label fill + its dark text (strip mark only). */
  stripColor?: string
  stripTextColor?: string
  /** Draw the small hand-drawn curved arrow from the subline toward the subject. */
  arrow: boolean
  /** Preferred starting position. When absent the slide's narrative role decides. */
  defaultPosition?: OverlayPosition
  /** Fixed position so a series stays recognizable in the grid (position control locks). */
  lockedPosition?: OverlayPosition
}

// ─── Design tokens (docs/SSELFIE_DESIGN_SYSTEM.md - the only colors allowed here) ──

export const OVERLAY_TOKENS = {
  obsidian: "#0A0A0A",
  porcelain: "#FFFFFF",
  pearl: "#F5F5F5",
  smoke: "#666666",
} as const

export const OVERLAY_DISPLAY_FONT = "'Cormorant Garamond', serif"
export const OVERLAY_SANS_FONT = "'Inter', sans-serif"

/** Editor input limits: magazine cover line, not a paragraph (markers get a little room). */
export const OVERLAY_HEADLINE_MAX = 60
export const OVERLAY_SUBLINE_MAX = 80
/** Hard caps for stored specs (sanitizer), tolerant of Maya-written longer lines. */
const HEADLINE_HARD_MAX = 120
const SUBLINE_HARD_MAX = 160

/** Member text-size control: multiplier applied to the preset's type scale. */
export const OVERLAY_SIZE_MULTIPLIERS: Record<OverlaySize, number> = {
  s: 0.85,
  m: 1,
  l: 1.18,
}

// ─── Style presets (Sandra's five named overlay styles + her cutout reference look) ──

export const OVERLAY_STYLE_PRESETS: OverlayStylePreset[] = [
  {
    id: "editorial-serif-center",
    name: "Editorial Cover",
    hint: "Big serif headline. The magazine cover look.",
    when:
      "The default cover. Authority and educational posts, list hooks ('5 ways I...'), most brands. " +
      "The clean magazine-cover look: large confident serif headline, floor fade, small uppercase label.",
    align: "center",
    headlineColor: OVERLAY_TOKENS.porcelain,
    sublineColor: OVERLAY_TOKENS.pearl,
    scrim: "floor",
    scrimColor: OVERLAY_TOKENS.obsidian,
    scrimAlpha: 0.72,
    headlineFrac: 0.1,
    headlineWeight: 600,
    headlineLineHeight: 1.08,
    headlineTrackingEm: 0,
    sublineFrac: 0.03,
    sublineLineHeight: 1.45,
    sublineTrackingEm: 0.16,
    sublineUppercase: true,
    gapFrac: 0.026,
    hairline: true,
    headlineMark: "none",
    sublineMark: "none",
    arrow: false,
  },
  {
    id: "lower-third-accent",
    name: "Lower Third",
    hint: "Left block sitting low. One word underlined by hand.",
    when:
      "Emotional or personal-story posts, vulnerable or 'rebuild' moments, honest statements. " +
      "A left-aligned serif block sitting low in the frame, with ONE key word emphasized: wrap that " +
      "word in *asterisks* in graphic.headline and it renders italic with a subtle hand-drawn underline.",
    align: "left",
    headlineColor: OVERLAY_TOKENS.porcelain,
    sublineColor: OVERLAY_TOKENS.pearl,
    scrim: "band",
    scrimColor: OVERLAY_TOKENS.obsidian,
    scrimAlpha: 0.45,
    headlineFrac: 0.085,
    headlineWeight: 500,
    headlineLineHeight: 1.14,
    headlineTrackingEm: 0,
    sublineFrac: 0.028,
    sublineLineHeight: 1.45,
    sublineTrackingEm: 0.08,
    sublineUppercase: false,
    gapFrac: 0.02,
    hairline: false,
    headlineMark: "underline-italic",
    sublineMark: "none",
    arrow: false,
    defaultPosition: "bottom",
  },
  {
    id: "top-band-minimal",
    name: "Top Minimal",
    hint: "One short quiet line across the top.",
    when:
      "Clean-girl, minimalist, fresh or wellness brands. A short quiet headline across the top with " +
      "generous tracking and lots of negative space. No scrim: pick it when the image top is calm.",
    align: "center",
    headlineColor: OVERLAY_TOKENS.porcelain,
    sublineColor: OVERLAY_TOKENS.pearl,
    scrim: "none",
    scrimColor: OVERLAY_TOKENS.obsidian,
    scrimAlpha: 0,
    headlineFrac: 0.06,
    headlineWeight: 500,
    headlineLineHeight: 1.2,
    headlineTrackingEm: 0.14,
    sublineFrac: 0.026,
    sublineLineHeight: 1.45,
    sublineTrackingEm: 0.2,
    sublineUppercase: true,
    gapFrac: 0.018,
    hairline: false,
    headlineMark: "none",
    sublineMark: "none",
    arrow: false,
    defaultPosition: "top",
  },
  {
    id: "quote-statement",
    name: "Statement",
    hint: "A calm centered statement over a soft band.",
    when:
      "Story slides and bold single statements, especially over a darker or busier photo. A short " +
      "centered serif statement with a subtle darkening only where the text sits.",
    align: "center",
    headlineColor: OVERLAY_TOKENS.porcelain,
    sublineColor: OVERLAY_TOKENS.pearl,
    scrim: "band",
    scrimColor: OVERLAY_TOKENS.obsidian,
    scrimAlpha: 0.72,
    headlineFrac: 0.088,
    headlineWeight: 500,
    headlineLineHeight: 1.2,
    headlineTrackingEm: 0,
    sublineFrac: 0.028,
    sublineLineHeight: 1.45,
    sublineTrackingEm: 0.16,
    sublineUppercase: true,
    gapFrac: 0.024,
    hairline: false,
    headlineMark: "none",
    sublineMark: "none",
    arrow: false,
    defaultPosition: "center",
  },
  {
    id: "series-cover",
    name: "Series Cover",
    hint: "Big repeatable title plus a small label like PART 3.",
    when:
      "A repeatable Reel or series cover (a recurring branded series). A bold serif series title with " +
      "a small uppercase sans label beneath it (e.g. 'PART 3'), fixed at center so the series is " +
      "recognizable in the grid. Put the label in the subline.",
    align: "center",
    headlineColor: OVERLAY_TOKENS.porcelain,
    sublineColor: OVERLAY_TOKENS.pearl,
    scrim: "floor",
    scrimColor: OVERLAY_TOKENS.obsidian,
    scrimAlpha: 0.6,
    headlineFrac: 0.11,
    headlineWeight: 600,
    headlineLineHeight: 1.05,
    headlineTrackingEm: 0,
    sublineFrac: 0.024,
    sublineLineHeight: 1.45,
    sublineTrackingEm: 0.3,
    sublineUppercase: true,
    gapFrac: 0.03,
    hairline: false,
    headlineMark: "none",
    sublineMark: "none",
    arrow: false,
    lockedPosition: "center",
  },
  {
    // Sandra's reference look (the Cutout Editorial carousel system): a large 3-line cream
    // serif headline at the top, ONE marked phrase on a cut-paper label strip (dark text on
    // a pearl strip), a sentence-case sans subline with the final marked words circled in a
    // loose hand-drawn ellipse, and a small curved arrow pointing toward the subject. The
    // sticker-cutout subject itself lives in the IMAGE (identityTreatment), never here.
    id: "cutout-editorial",
    name: "Cutout Editorial",
    hint: "One line on a cut-paper strip, a circled word, an arrow.",
    when:
      "Collage carousels and saved-from-Pinterest teaching covers (the Cutout Editorial design " +
      "system). Large cream serif headline at the top; wrap the ONE key phrase in *asterisks* in " +
      "graphic.headline to put it on a cut-paper label strip. In graphic.subline, wrap the final " +
      "one or two words in *asterisks* to circle them in hand-drawn ink; a small curved arrow " +
      "points from the subline toward the subject.",
    align: "left",
    headlineColor: OVERLAY_TOKENS.porcelain,
    sublineColor: OVERLAY_TOKENS.porcelain,
    scrim: "none",
    scrimColor: OVERLAY_TOKENS.obsidian,
    scrimAlpha: 0,
    headlineFrac: 0.105,
    headlineWeight: 500,
    headlineLineHeight: 1.06,
    headlineTrackingEm: 0,
    sublineFrac: 0.028,
    sublineLineHeight: 1.4,
    sublineTrackingEm: 0.02,
    sublineUppercase: false,
    gapFrac: 0.03,
    hairline: false,
    headlineMark: "strip",
    sublineMark: "circle",
    stripColor: OVERLAY_TOKENS.pearl,
    stripTextColor: OVERLAY_TOKENS.obsidian,
    arrow: true,
    defaultPosition: "top",
  },
]

/** Old MAYA-FIX-03 style ids (stored in draft snapshots) -> the new named styles. */
const LEGACY_STYLE_MAP: Record<string, OverlayStyleId> = {
  "editorial-cover": "editorial-serif-center",
  "soft-minimal": "top-band-minimal",
  "full-bleed-editorial": "quote-statement",
}

export function resolveOverlayStyle(id?: string | null): OverlayStylePreset {
  const key = (id ?? "").toLowerCase().trim()
  const mapped = LEGACY_STYLE_MAP[key] ?? key
  return OVERLAY_STYLE_PRESETS.find(p => p.id === mapped) ?? OVERLAY_STYLE_PRESETS[0]
}

// ─── Instagram safe zones (fractions of the canvas) ────────────────────────────
// 9:16 story/reel: ~310px clear top AND bottom on a 1080x1920 canvas (UI chrome).
// 4:5 feed: generous margins so nothing kisses the crop.

export interface OverlaySafeZone {
  top: number
  bottom: number
  side: number
}

export function isVerticalOverlayFormat(format: OverlayFormat): boolean {
  return format !== "carousel"
}

export function safeZoneFor(format: OverlayFormat): OverlaySafeZone {
  return isVerticalOverlayFormat(format)
    ? { top: 310 / 1920, bottom: 310 / 1920, side: 0.075 }
    : { top: 0.075, bottom: 0.09, side: 0.08 }
}

// ─── Type scale (fractions of canvas WIDTH, shared by CSS layer + canvas export) ──

export interface OverlayTypeScale {
  headlineFrac: number
  headlineLineHeight: number
  sublineFrac: number
  sublineLineHeight: number
  /** Vertical gap between headline block and subline, as a fraction of width. */
  gapFrac: number
}

/** Carousels are near-square, so type reads slightly smaller; nudge it up to match covers. */
const CAROUSEL_SCALE_BOOST = 1.06

/** The preset scale resolved for a spec: style base x member size x format factor. */
export function typeScaleFor(
  spec: Pick<TextOverlaySpec, "format" | "style" | "size">
): OverlayTypeScale {
  const preset = resolveOverlayStyle(spec.style)
  const multiplier =
    OVERLAY_SIZE_MULTIPLIERS[spec.size ?? "m"] *
    (isVerticalOverlayFormat(spec.format) ? 1 : CAROUSEL_SCALE_BOOST)
  return {
    headlineFrac: preset.headlineFrac * multiplier,
    headlineLineHeight: preset.headlineLineHeight,
    sublineFrac: preset.sublineFrac * multiplier,
    sublineLineHeight: preset.sublineLineHeight,
    gapFrac: preset.gapFrac * multiplier,
  }
}

// ─── Emphasis markers (*phrase* -> the preset's accent: underline, strip, or circle) ──

export interface OverlayTextSegmentSource {
  text: string
  emphasized: boolean
}

/**
 * Parse *marked* spans out of a headline or subline. Markers are content-level (they stay in
 * the stored spec) and each style interprets them in its own design language; styles without
 * a mark treatment show the same words plain, so switching styles never loses text.
 */
export function parseOverlayEmphasis(text: string): OverlayTextSegmentSource[] {
  const segments: OverlayTextSegmentSource[] = []
  const pattern = /\*([^*]+)\*/g
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index), emphasized: false })
    if (match[1]) segments.push({ text: match[1], emphasized: true })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), emphasized: false })
  return segments.filter(segment => segment.text.length > 0)
}

/** The text with markers stripped (for previews, alt text, and styles without accents). */
export function stripOverlayEmphasis(text: string): string {
  return parseOverlayEmphasis(text)
    .map(segment => segment.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
}

// ─── Tap-to-highlight (the editor's word chips; members never type an asterisk) ──

export interface OverlayMarkableWord {
  text: string
  marked: boolean
}

/** The headline/subline as tappable words, marker characters stripped. */
export function getOverlayMarkableWords(text: string): OverlayMarkableWord[] {
  const words: OverlayMarkableWord[] = []
  for (const segment of parseOverlayEmphasis(text)) {
    for (const word of segment.text.split(/\s+/).filter(Boolean)) {
      words.push({ text: word, marked: segment.emphasized })
    }
  }
  return words
}

/**
 * Toggle one word in/out of the marked phrase and return the text in the stored *asterisk*
 * format (specs and the export pipeline stay unchanged). The mark always stays ONE contiguous
 * phrase: tapping a word next to the phrase extends it, tapping a word away from it moves the
 * mark there, and untapping an inner word keeps the longer remaining side.
 */
export function toggleMarkedWord(text: string, wordIndex: number): string {
  const words = getOverlayMarkableWords(text)
  if (wordIndex < 0 || wordIndex >= words.length) return text
  words[wordIndex] = { ...words[wordIndex], marked: !words[wordIndex].marked }

  // Collect contiguous marked runs, then keep exactly one.
  const runs: { start: number; end: number }[] = []
  for (let i = 0; i < words.length; i++) {
    if (!words[i].marked) continue
    const last = runs[runs.length - 1]
    if (last && last.end === i - 1) last.end = i
    else runs.push({ start: i, end: i })
  }
  let keep: { start: number; end: number } | null = null
  if (runs.length === 1) keep = runs[0]
  else if (runs.length > 1) {
    keep =
      runs.find(run => wordIndex >= run.start && wordIndex <= run.end) ??
      runs.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a))
  }

  return words
    .map((word, index) => {
      if (!keep || index < keep.start || index > keep.end) return word.text
      const open = index === keep.start ? "*" : ""
      const close = index === keep.end ? "*" : ""
      return `${open}${word.text}${close}`
    })
    .join(" ")
}

// ─── Spec builders ──────────────────────────────────────────────────────────────

export function overlayFormatFromOutput(format: OutputFormat): OverlayFormat | null {
  return format === "reel-cover" ||
    format === "story-slide" ||
    format === "story-sequence" ||
    format === "carousel"
    ? format
    : null
}

/** Carousel design system id -> the overlay style that matches its visual world. */
const DESIGN_SYSTEM_STYLE_MAP: Record<string, OverlayStyleId> = {
  "cutout-editorial": "cutout-editorial",
  "soft-minimal": "top-band-minimal",
  "full-bleed-editorial": "quote-statement",
}

/** Emotion keywords -> starting style, for single covers/slides. Conservative on purpose. */
const EMOTION_STYLE_RULES: { pattern: RegExp; style: OverlayStyleId }[] = [
  {
    pattern: /(personal|story|vulnerab|honest|raw|intimate|emotional|rebuild|journey|behind the scenes)/,
    style: "lower-third-accent",
  },
  { pattern: /(minimal|airy|serene|wellness|clean girl|weightless|spacious)/, style: "top-band-minimal" },
  { pattern: /(bold|statement|dramatic|moody|fierce|powerful|noir)/, style: "quote-statement" },
]

/** A subline like "Part 3", "Episode 12", or "Vol. 2" marks a repeatable series cover. */
const SERIES_LABEL_PATTERN = /\b(part|episode|ep|day|vol|volume|no)\.?\s*\d+\b/i

export interface MakeOverlaySpecInput {
  heading: string
  body?: string
  role: "hook" | "value" | "cta"
  format: OverlayFormat
  /** Carousel design system id (lib/app-v3/maya/carousel-design-systems). */
  designSystem?: string | null
  /** Maya's explicit style pick (brief.graphic.overlayStyle). Wins when present. */
  overlayStyle?: string | null
  /** The concept's emotional register (brief.mood) - a cheap starting-style signal. */
  emotion?: string | null
}

/**
 * Pick the starting overlay style for one slide. Priority: Maya's explicit pick, then a
 * series-label subline, then the carousel design system, then the concept's emotion,
 * defaulting to the editorial magazine cover. The member can switch styles after.
 */
export function pickOverlayStyle(
  input: Pick<MakeOverlaySpecInput, "format" | "designSystem" | "overlayStyle" | "emotion" | "body">
): OverlayStyleId {
  const explicit = (input.overlayStyle ?? "").toLowerCase().trim()
  if (explicit) {
    const mapped = LEGACY_STYLE_MAP[explicit] ?? explicit
    const preset = OVERLAY_STYLE_PRESETS.find(p => p.id === mapped)
    if (preset) return preset.id
  }
  if (input.format === "carousel" || input.format === "story-sequence") {
    const key = (input.designSystem ?? "").toLowerCase().trim()
    return DESIGN_SYSTEM_STYLE_MAP[key] ?? "cutout-editorial"
  }
  if (SERIES_LABEL_PATTERN.test(input.body ?? "")) return "series-cover"
  const emotion = (input.emotion ?? "").toLowerCase()
  if (emotion) {
    for (const rule of EMOTION_STYLE_RULES) {
      if (rule.pattern.test(emotion)) return rule.style
    }
  }
  return "editorial-serif-center"
}

/**
 * Build the default layer spec for one slide. The preset owns the position when it declares
 * one (lower-third sits low, top-band and cutout sit high, series covers lock center);
 * otherwise the slide's narrative role decides (hook leads at the top, values settle low
 * like a floor-fade cover, CTA sits center), always inside the format's safe zone. The
 * member can move/edit it after generation.
 */
export function makeTextOverlaySpec(input: MakeOverlaySpecInput): TextOverlaySpec {
  const headline = input.heading.replace(/\s+/g, " ").trim().slice(0, HEADLINE_HARD_MAX)
  const subline = (input.body ?? "").replace(/\s+/g, " ").trim().slice(0, SUBLINE_HARD_MAX)
  const style = pickOverlayStyle(input)
  const preset = resolveOverlayStyle(style)
  const rolePosition: OverlayPosition =
    input.role === "hook" ? "top" : input.role === "cta" ? "center" : "bottom"
  return {
    headline,
    subline: subline || undefined,
    position: preset.lockedPosition ?? preset.defaultPosition ?? rolePosition,
    style,
    format: input.format,
  }
}

/** Validate an untrusted spec (draft snapshots, API payloads). Returns null when unusable. */
export function sanitizeTextOverlaySpec(value: unknown): TextOverlaySpec | null {
  if (!value || typeof value !== "object") return null
  const spec = value as Record<string, unknown>
  if (typeof spec.headline !== "string") return null
  const headline = spec.headline.replace(/\s+/g, " ").trim().slice(0, HEADLINE_HARD_MAX)
  if (!headline) return null
  const format = spec.format as OverlayFormat
  if (
    format !== "reel-cover" &&
    format !== "story-slide" &&
    format !== "story-sequence" &&
    format !== "carousel"
  ) {
    return null
  }
  const position = spec.position as OverlayPosition
  const subline =
    typeof spec.subline === "string"
      ? spec.subline.replace(/\s+/g, " ").trim().slice(0, SUBLINE_HARD_MAX)
      : ""
  const preset = resolveOverlayStyle(typeof spec.style === "string" ? spec.style : null)
  const size = spec.size as OverlaySize
  return {
    headline,
    subline: subline || undefined,
    position:
      preset.lockedPosition ??
      (position === "top" || position === "center" || position === "bottom" ? position : "bottom"),
    style: preset.id,
    format,
    ...(size === "s" || size === "m" || size === "l" ? { size } : {}),
  }
}

// ─── Maya persona guide (adapted from the retired overlay-styles library) ───────

/** The style picker guide injected into Maya's system prompt for graphic formats. */
export function getOverlayStyleGuide(): string {
  const list = OVERLAY_STYLE_PRESETS.map(p => `- ${p.id} (${p.name}): ${p.when}`).join("\n")
  return [
    "## TEXT OVERLAY STYLES (pick one per concept; set it on brief.graphic.overlayStyle)",
    "",
    "The words are composited as a real editable layer after generation, so the overlay design is",
    "yours to direct. It must fit HER brand and the post's emotion, never one flat look:",
    "",
    list,
    "",
    "Rules: a polished founder or coach usually wants editorial-serif-center; a raw personal story",
    "wants lower-third-accent; a minimalist or wellness brand wants top-band-minimal; a bold line",
    "over a moody photo wants quote-statement; a recurring branded series wants series-cover with",
    "the part label in graphic.subline; a collage teaching cover wants cutout-editorial. When",
    "unsure, use editorial-serif-center.",
    "",
    "The *asterisk* marker is the accent control: in lower-third-accent it italicizes and hand-",
    "underlines the ONE key word; in cutout-editorial it puts the marked headline phrase on a",
    "cut-paper strip and circles the marked subline words. Use at most one marked phrase per line.",
    "",
    "If she asks for a different text look by feel ('make it more minimal', 'something more",
    "personal', 'bigger, like a magazine'), honor it by name: more minimal means top-band-minimal,",
    "more personal or handwritten means lower-third-accent, bolder or more editorial means",
    "editorial-serif-center or series-cover. She can also switch styles and text size herself on",
    "the finished image, so never regenerate just to change the text design.",
  ].join("\n")
}

// ─── Layout engine (pure; drives BOTH the on-screen layer and the canvas export) ──

/** Measures rendered text width in px for a given canvas font string. */
export type OverlayMeasure = (text: string, font: string) => number

export interface OverlayLineSegment {
  text: string
  /** Left edge of this segment (canvas textAlign "left"). */
  x: number
  width: number
  italic: boolean
  emphasized: boolean
  color: string
  /** Cut-paper label strip behind this segment (cutout style, marked phrase only). */
  strip?: { x: number; y: number; width: number; height: number; color: string }
}

/**
 * Hand-drawn ink accents. `d` is an SVG path string in canvas coordinates, so the CSS layer
 * (<path d>) and the flattened export (Path2D) draw the exact same mark.
 */
export interface OverlayAccent {
  kind: "underline" | "circle" | "arrow"
  d: string
  thickness: number
  color: string
}

export interface OverlayLine {
  /** The full line text (markers stripped), for tests and alt text. */
  text: string
  /** Ordered segments with absolute x positions (single segment when nothing is marked). */
  segments: OverlayLineSegment[]
  /** Left edge of the line. */
  x: number
  width: number
  /** Top edge (canvas textBaseline "top"). */
  y: number
  fontPx: number
  fontFamily: string
  fontWeight: number
  /** Letter-spacing in em (the export applies it when the browser supports it). */
  trackingEm: number
  color: string
  uppercase: boolean
  kind: "headline" | "subline"
}

export interface OverlayScrim {
  x: number
  y: number
  width: number
  height: number
  color: string
  alpha: number
  /**
   * Fade direction. "down" fades from transparent (top edge) into the peak alpha (bottom) -
   * the classic floor fade. "band" peaks in the middle and fades at both edges.
   */
  fade: "down" | "up" | "band"
}

/** Thin hairline rule between headline and subline (editorial-serif-center). */
export interface OverlayRule {
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface OverlayLayout {
  width: number
  height: number
  align: OverlayAlign
  scrim: OverlayScrim | null
  rule: OverlayRule | null
  lines: OverlayLine[]
  accents: OverlayAccent[]
}

export function overlayCanvasFont(weight: number, px: number, family: string, italic = false): string {
  return `${italic ? "italic " : ""}${weight} ${px}px ${family}`
}

/** Greedy word wrap. Never returns an empty list for non-empty text. */
export function wrapOverlayText(
  text: string,
  maxWidth: number,
  font: string,
  measure: OverlayMeasure
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (current && measure(candidate, font) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

interface MarkedWord {
  text: string
  emphasized: boolean
}

function markedWords(text: string, marksEnabled: boolean): MarkedWord[] {
  const source = marksEnabled
    ? parseOverlayEmphasis(text)
    : [{ text: stripOverlayEmphasis(text), emphasized: false }]
  const words: MarkedWord[] = []
  for (const segment of source) {
    for (const word of segment.text.split(/\s+/).filter(Boolean)) {
      words.push({ text: word, emphasized: marksEnabled && segment.emphasized })
    }
  }
  return words
}

/** Greedy wrap over mark-aware words (wrapping measures the plain joined text). */
function wrapMarkedWords(
  words: MarkedWord[],
  maxWidth: number,
  font: string,
  measure: OverlayMeasure
): MarkedWord[][] {
  if (words.length === 0) return []
  const lines: MarkedWord[][] = []
  let current: MarkedWord[] = []
  for (const word of words) {
    const candidate = [...current, word].map(w => w.text).join(" ")
    if (current.length > 0 && measure(candidate, font) > maxWidth) {
      lines.push(current)
      current = [word]
    } else {
      current.push(word)
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

/** Approximate tracked width: measured width plus the per-gap letter spacing. */
function trackedWidth(
  text: string,
  font: string,
  trackingEm: number,
  fontPx: number,
  measure: OverlayMeasure
): number {
  const base = measure(text, font)
  return trackingEm > 0 ? base + trackingEm * fontPx * Math.max(0, text.length - 1) : base
}

const px = (value: number) => Math.round(value * 10) / 10

/** A soft underline with a slight hand-drawn dip (same ink as the text). */
function underlinePath(x: number, y: number, width: number, fontPx: number): string {
  const dip = fontPx * 0.08
  return `M ${px(x)} ${px(y)} Q ${px(x + width * 0.45)} ${px(y - dip)} ${px(x + width)} ${px(y + dip * 0.35)}`
}

/** A loose, imperfect hand-drawn ellipse (two uneven cubic sweeps, slightly open loop). */
function handDrawnEllipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return [
    `M ${px(cx - rx)} ${px(cy - ry * 0.2)}`,
    `C ${px(cx - rx * 0.9)} ${px(cy - ry * 1.15)}, ${px(cx + rx * 0.7)} ${px(cy - ry * 1.05)}, ${px(cx + rx)} ${px(cy - ry * 0.1)}`,
    `C ${px(cx + rx * 1.08)} ${px(cy + ry * 0.75)}, ${px(cx + rx * 0.15)} ${px(cy + ry * 1.12)}, ${px(cx - rx * 0.75)} ${px(cy + ry * 0.85)}`,
    `C ${px(cx - rx * 1.12)} ${px(cy + ry * 0.55)}, ${px(cx - rx * 1.02)} ${px(cy + ry * 0.1)}, ${px(cx - rx * 0.85)} ${px(cy - ry * 0.35)}`,
  ].join(" ")
}

/** A short curved arrow from (sx, sy) toward (tx, ty), with an open hand-drawn head. */
function curvedArrowPath(sx: number, sy: number, tx: number, ty: number, maxLength: number): string {
  const dx = tx - sx
  const dy = ty - sy
  const dist = Math.hypot(dx, dy) || 1
  const length = Math.min(dist * 0.32, maxLength)
  const ex = sx + (dx / dist) * length
  const ey = sy + (dy / dist) * length
  // Control point pushed perpendicular for the lazy hand-drawn curve.
  const mx = (sx + ex) / 2 - (dy / dist) * length * 0.3
  const my = (sy + ey) / 2 + (dx / dist) * length * 0.3
  // Head: two flicks angled off the end tangent.
  const t = Math.atan2(ey - my, ex - mx)
  const head = length * 0.28
  const h1x = ex - head * Math.cos(t - 0.5)
  const h1y = ey - head * Math.sin(t - 0.5)
  const h2x = ex - head * Math.cos(t + 0.5)
  const h2y = ey - head * Math.sin(t + 0.5)
  return `M ${px(sx)} ${px(sy)} Q ${px(mx)} ${px(my)} ${px(ex)} ${px(ey)} M ${px(h1x)} ${px(h1y)} L ${px(ex)} ${px(ey)} L ${px(h2x)} ${px(h2y)}`
}

/**
 * Compute the full layout for a canvas of the given size. All geometry stays inside the
 * format's IG safe zone; the block is centered or left-aligned per the preset. The same
 * layout drives the on-screen layer and the flattened export, so they always match.
 */
export function computeOverlayLayout(
  spec: TextOverlaySpec,
  width: number,
  height: number,
  measure: OverlayMeasure
): OverlayLayout {
  const preset = resolveOverlayStyle(spec.style)
  const safe = safeZoneFor(spec.format)
  const scale = typeScaleFor(spec)
  const maxTextWidth = width * (1 - 2 * safe.side)
  const safeLeft = width * safe.side

  const headlinePx = Math.round(width * scale.headlineFrac)
  const sublinePx = Math.round(width * scale.sublineFrac)
  const headlineFont = overlayCanvasFont(preset.headlineWeight, headlinePx, OVERLAY_DISPLAY_FONT)
  const sublineFont = overlayCanvasFont(400, sublinePx, OVERLAY_SANS_FONT)

  // Wrap with tracking-aware widths so generously tracked styles never overflow the safe zone.
  const headlineWrapMeasure: OverlayMeasure = (text, font) =>
    trackedWidth(text, font, preset.headlineTrackingEm, headlinePx, measure)
  const sublineWrapMeasure: OverlayMeasure = (text, font) =>
    trackedWidth(text, font, preset.sublineTrackingEm, sublinePx, measure)

  const headlineWords = markedWords(spec.headline, preset.headlineMark !== "none")
  const headlineLines = wrapMarkedWords(headlineWords, maxTextWidth, headlineFont, headlineWrapMeasure)
  const sublineSource = preset.sublineUppercase ? (spec.subline ?? "").toUpperCase() : spec.subline ?? ""
  const sublineWords = markedWords(sublineSource, preset.sublineMark !== "none")
  const sublineLines = wrapMarkedWords(sublineWords, maxTextWidth, sublineFont, sublineWrapMeasure)

  const headlineLineH = headlinePx * scale.headlineLineHeight
  const sublineLineH = sublinePx * scale.sublineLineHeight
  const gap = sublineLines.length > 0 ? width * scale.gapFrac : 0
  const showRule = preset.hairline && sublineLines.length > 0
  const ruleGap = showRule ? gap : 0
  const blockHeight =
    headlineLines.length * headlineLineH + gap + ruleGap + sublineLines.length * sublineLineH

  const minY = height * safe.top
  const maxY = height * (1 - safe.bottom) - blockHeight
  let y0: number
  if (spec.position === "top") y0 = minY
  else if (spec.position === "center") y0 = (height - blockHeight) / 2
  else y0 = maxY
  y0 = Math.min(Math.max(y0, minY), Math.max(maxY, minY))

  const lines: OverlayLine[] = []
  const accents: OverlayAccent[] = []
  let cursor = y0

  for (const lineOfWords of headlineLines) {
    const line = buildRichLine({
      words: lineOfWords,
      y: cursor,
      fontPx: headlinePx,
      fontFamily: OVERLAY_DISPLAY_FONT,
      fontWeight: preset.headlineWeight,
      trackingEm: preset.headlineTrackingEm,
      color: preset.headlineColor,
      uppercase: false,
      kind: "headline",
      mark: preset.headlineMark,
      preset,
      safeLeft,
      maxTextWidth,
      canvasWidth: width,
      measure,
      accents,
    })
    lines.push(line)
    cursor += headlineLineH
  }

  let rule: OverlayRule | null = null
  if (showRule) {
    const ruleH = Math.max(1, Math.round(width * 0.0012))
    const ruleWidth = Math.min(width * 0.14, maxTextWidth)
    rule = {
      x: preset.align === "left" ? safeLeft : width / 2 - ruleWidth / 2,
      y: cursor + gap - ruleH / 2,
      width: ruleWidth,
      height: ruleH,
      color: preset.sublineColor,
    }
    cursor += ruleGap
  }
  cursor += gap

  for (const lineOfWords of sublineLines) {
    const line = buildRichLine({
      words: lineOfWords,
      y: cursor,
      fontPx: sublinePx,
      fontFamily: OVERLAY_SANS_FONT,
      fontWeight: 400,
      trackingEm: preset.sublineTrackingEm,
      color: preset.sublineColor,
      uppercase: preset.sublineUppercase,
      kind: "subline",
      mark: preset.sublineMark,
      preset,
      safeLeft,
      maxTextWidth,
      canvasWidth: width,
      measure,
      accents,
    })
    lines.push(line)
    cursor += sublineLineH
  }

  // The small hand-drawn arrow: starts near the subline block, points toward the subject
  // (frame center), away from whichever side the block sits on.
  if (preset.arrow && sublineLines.length > 0) {
    const lastSubline = lines[lines.length - 1]
    const blockCenterY = y0 + blockHeight / 2
    const sx = lastSubline.x + lastSubline.width * 0.85
    const sy = lastSubline.y + lastSubline.fontPx * 1.6
    const tx = width * 0.5
    const ty = blockCenterY < height / 2 ? height * 0.58 : height * 0.42
    accents.push({
      kind: "arrow",
      d: curvedArrowPath(sx, sy, tx, ty, width * 0.16),
      thickness: Math.max(2, width * 0.0022),
      color: preset.sublineColor,
    })
  }

  return {
    width,
    height,
    align: preset.align,
    scrim: buildScrim(spec, preset, width, height, y0, blockHeight),
    rule,
    lines,
    accents,
  }
}

function buildRichLine(input: {
  words: MarkedWord[]
  y: number
  fontPx: number
  fontFamily: string
  fontWeight: number
  trackingEm: number
  color: string
  uppercase: boolean
  kind: "headline" | "subline"
  mark: OverlayHeadlineMark | OverlaySublineMark
  preset: OverlayStylePreset
  safeLeft: number
  maxTextWidth: number
  canvasWidth: number
  measure: OverlayMeasure
  accents: OverlayAccent[]
}): OverlayLine {
  const { words, y, fontPx, fontFamily, fontWeight, trackingEm, color, uppercase, kind, mark, preset } =
    input
  const font = overlayCanvasFont(fontWeight, fontPx, fontFamily)
  const italicFont = overlayCanvasFont(fontWeight, fontPx, fontFamily, true)
  const spaceWidth = Math.max(input.measure(" ", font), fontPx * 0.24)

  // Group consecutive same-mark words into segments.
  const grouped: MarkedWord[] = []
  for (const word of words) {
    const last = grouped[grouped.length - 1]
    if (last && last.emphasized === word.emphasized) last.text += ` ${word.text}`
    else grouped.push({ ...word })
  }

  const italicWhenMarked = mark === "underline-italic"
  const measured = grouped.map(segment => ({
    ...segment,
    width: trackedWidth(
      segment.text,
      segment.emphasized && italicWhenMarked ? italicFont : font,
      trackingEm,
      fontPx,
      input.measure
    ),
  }))
  const lineWidth =
    measured.reduce((sum, s) => sum + s.width, 0) + spaceWidth * Math.max(0, measured.length - 1)
  const x0 =
    preset.align === "left"
      ? input.safeLeft
      : input.canvasWidth / 2 - Math.min(lineWidth, input.maxTextWidth) / 2

  const segments: OverlayLineSegment[] = []
  let sx = x0
  for (const segment of measured) {
    const onStrip = segment.emphasized && mark === "strip"
    segments.push({
      text: segment.text,
      x: sx,
      width: segment.width,
      italic: segment.emphasized && italicWhenMarked,
      emphasized: segment.emphasized,
      color: onStrip ? (preset.stripTextColor ?? color) : color,
      strip: onStrip
        ? {
            x: sx - fontPx * 0.35,
            y: y - fontPx * 0.08,
            width: segment.width + fontPx * 0.7,
            height: fontPx * 1.22,
            color: preset.stripColor ?? OVERLAY_TOKENS.pearl,
          }
        : undefined,
    })
    if (segment.emphasized && mark === "underline-italic") {
      input.accents.push({
        kind: "underline",
        d: underlinePath(sx, y + fontPx * 1.02, segment.width, fontPx),
        thickness: Math.max(2, fontPx * 0.045),
        color,
      })
    }
    if (segment.emphasized && mark === "circle") {
      input.accents.push({
        kind: "circle",
        d: handDrawnEllipsePath(
          sx + segment.width / 2,
          y + fontPx * 0.55,
          segment.width / 2 + fontPx * 0.6,
          fontPx * 0.9
        ),
        thickness: Math.max(2, input.canvasWidth * 0.0022),
        color,
      })
    }
    sx += segment.width + spaceWidth
  }

  return {
    text: grouped.map(s => s.text).join(" "),
    segments,
    x: x0,
    width: lineWidth,
    y,
    fontPx,
    fontFamily,
    fontWeight,
    trackingEm,
    color,
    uppercase,
    kind,
  }
}

function buildScrim(
  spec: TextOverlaySpec,
  preset: OverlayStylePreset,
  width: number,
  height: number,
  blockY: number,
  blockHeight: number
): OverlayScrim | null {
  if (preset.scrim === "none") return null
  // Local band: a subtle darkening only where the text block sits (quote/lower-third).
  if (preset.scrim === "band") {
    const lead = height * 0.1
    const y = Math.max(0, blockY - lead)
    return {
      x: 0,
      y,
      width,
      height: Math.min(height - y, blockHeight + lead * 2),
      color: preset.scrimColor,
      alpha: preset.scrimAlpha,
      fade: "band",
    }
  }
  // Floor fade: a soft gradient reaching well past the text so the photo is never hard-cut.
  const lead = height * 0.12
  if (spec.position === "bottom") {
    const y = Math.max(0, blockY - lead)
    return {
      x: 0,
      y,
      width,
      height: height - y,
      color: preset.scrimColor,
      alpha: preset.scrimAlpha,
      fade: "down",
    }
  }
  if (spec.position === "top") {
    const bottom = Math.min(height, blockY + blockHeight + lead)
    return {
      x: 0,
      y: 0,
      width,
      height: bottom,
      color: preset.scrimColor,
      alpha: preset.scrimAlpha,
      fade: "up",
    }
  }
  return {
    x: 0,
    y: Math.max(0, blockY - lead),
    width,
    height: Math.min(height, blockHeight + lead * 2),
    color: preset.scrimColor,
    alpha: preset.scrimAlpha,
    fade: "band",
  }
}

/** The nominal layout canvas per format (the CSS layer scales it with container units). */
export function overlayNominalCanvas(format: OverlayFormat): { width: number; height: number } {
  return isVerticalOverlayFormat(format)
    ? { width: 1080, height: 1920 }
    : { width: 1080, height: 1080 }
}
