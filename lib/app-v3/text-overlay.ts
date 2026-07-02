// SSELFIE Studio 3.0 - MAYA-FIX-03: composited text-overlay layer (flag-gated).
//
// Image models treat type as pixels, so baked-in headlines garble letters, drift out of
// Instagram safe zones, and can't be edited without a full regenerate. Behind the
// APP_V3_TEXT_OVERLAY_LAYER flag, graphic formats (reel-cover, story-slide, carousel,
// story-sequence) generate a CLEAN text-free image and the words arrive as a real layer:
// brand serif, token colors, correct contrast, IG safe zones, editable in one tap, and
// flattened into the final PNG only at download time.
//
// This module is pure and shared by:
// - the prompt compiler (attaches a TextOverlaySpec per image job),
// - the generate route (returns specs alongside image URLs),
// - the client layer/editor components (render + edit),
// - the canvas export path (computeOverlayLayout drives the flattened render).
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
export type OverlayStyleId =
  | "editorial-cover"
  | "full-bleed-editorial"
  | "soft-minimal"
  | "cutout-editorial"

/** The editable text layer for ONE image. Stored with the generation result, never in pixels. */
export interface TextOverlaySpec {
  headline: string
  subline?: string
  position: OverlayPosition
  style: OverlayStyleId
  format: OverlayFormat
}

/** How the layer guarantees contrast behind the words (never raw text on a busy photo). */
export type OverlayBackdrop = "fade" | "panel" | "strip"

export interface OverlayStylePreset {
  id: OverlayStyleId
  name: string
  headlineColor: string
  sublineColor: string
  backdrop: OverlayBackdrop
  /** Backdrop fill (token). Fade/panel alpha is applied at render time. */
  backdropColor: string
  /** Peak backdrop opacity. Fade peaks at 0.72 so porcelain body copy clears 4.5:1 anywhere. */
  backdropAlpha: number
  /** Uppercase tracking treatment for the subline (editorial label look). */
  sublineUppercase: boolean
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

/** Editor input limits (spec D): magazine cover line, not a paragraph. */
export const OVERLAY_HEADLINE_MAX = 50
export const OVERLAY_SUBLINE_MAX = 80
/** Hard caps for stored specs (sanitizer), tolerant of Maya-written longer lines. */
const HEADLINE_HARD_MAX = 120
const SUBLINE_HARD_MAX = 160

// ─── Style presets (the old prompt-string "worlds" as real layer styles) ───────

export const OVERLAY_STYLE_PRESETS: OverlayStylePreset[] = [
  {
    id: "editorial-cover",
    name: "Editorial Cover",
    headlineColor: OVERLAY_TOKENS.porcelain,
    sublineColor: OVERLAY_TOKENS.pearl,
    backdrop: "fade",
    backdropColor: OVERLAY_TOKENS.obsidian,
    backdropAlpha: 0.72,
    sublineUppercase: true,
  },
  {
    id: "full-bleed-editorial",
    name: "Full-Bleed Editorial",
    headlineColor: OVERLAY_TOKENS.porcelain,
    sublineColor: OVERLAY_TOKENS.pearl,
    backdrop: "fade",
    backdropColor: OVERLAY_TOKENS.obsidian,
    backdropAlpha: 0.72,
    sublineUppercase: false,
  },
  {
    id: "soft-minimal",
    name: "Soft Minimal",
    headlineColor: OVERLAY_TOKENS.obsidian,
    sublineColor: OVERLAY_TOKENS.smoke,
    backdrop: "panel",
    backdropColor: OVERLAY_TOKENS.porcelain,
    backdropAlpha: 0.88,
    sublineUppercase: false,
  },
  {
    id: "cutout-editorial",
    name: "Cutout Editorial",
    headlineColor: OVERLAY_TOKENS.obsidian,
    sublineColor: OVERLAY_TOKENS.obsidian,
    backdrop: "strip",
    backdropColor: OVERLAY_TOKENS.porcelain,
    backdropAlpha: 1,
    sublineUppercase: true,
  },
]

export function resolveOverlayStyle(id?: string | null): OverlayStylePreset {
  const key = (id ?? "").toLowerCase().trim()
  return OVERLAY_STYLE_PRESETS.find(p => p.id === key) ?? OVERLAY_STYLE_PRESETS[0]
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

export function typeScaleFor(format: OverlayFormat): OverlayTypeScale {
  return isVerticalOverlayFormat(format)
    ? { headlineFrac: 0.072, headlineLineHeight: 1.15, sublineFrac: 0.03, sublineLineHeight: 1.45, gapFrac: 0.022 }
    : { headlineFrac: 0.078, headlineLineHeight: 1.15, sublineFrac: 0.033, sublineLineHeight: 1.45, gapFrac: 0.024 }
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

const CAROUSEL_STYLE_IDS = new Set<OverlayStyleId>([
  "cutout-editorial",
  "full-bleed-editorial",
  "soft-minimal",
])

export interface MakeOverlaySpecInput {
  heading: string
  body?: string
  role: "hook" | "value" | "cta"
  format: OverlayFormat
  /** Carousel design system id (lib/app-v3/maya/carousel-design-systems). */
  designSystem?: string | null
}

/**
 * Build the default layer spec for one slide. Position follows the slide's narrative role
 * (hook leads at the top, values settle low like a floor-fade cover, CTA sits center),
 * always inside the format's safe zone. The user can move/edit it after generation.
 */
export function makeTextOverlaySpec(input: MakeOverlaySpecInput): TextOverlaySpec {
  const headline = input.heading.replace(/\s+/g, " ").trim().slice(0, HEADLINE_HARD_MAX)
  const subline = (input.body ?? "").replace(/\s+/g, " ").trim().slice(0, SUBLINE_HARD_MAX)
  const style: OverlayStyleId =
    input.format === "carousel" || input.format === "story-sequence"
      ? CAROUSEL_STYLE_IDS.has((input.designSystem ?? "") as OverlayStyleId)
        ? (input.designSystem as OverlayStyleId)
        : "cutout-editorial"
      : "editorial-cover"
  const position: OverlayPosition =
    input.role === "hook" ? "top" : input.role === "cta" ? "center" : "bottom"
  return {
    headline,
    subline: subline || undefined,
    position,
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
  return {
    headline,
    subline: subline || undefined,
    position: position === "top" || position === "center" || position === "bottom" ? position : "bottom",
    style: resolveOverlayStyle(typeof spec.style === "string" ? spec.style : null).id,
    format,
  }
}

// ─── Layout engine (pure; drives the flattened canvas export) ──────────────────

/** Measures rendered text width in px for a given canvas font string. */
export type OverlayMeasure = (text: string, font: string) => number

export interface OverlayLine {
  text: string
  /** Top edge (canvas textBaseline "top"). */
  y: number
  fontPx: number
  fontFamily: string
  fontWeight: number
  color: string
  uppercase: boolean
  kind: "headline" | "subline"
  /** Per-line label strip behind the text (cutout style). */
  strip?: { x: number; y: number; width: number; height: number; color: string }
}

export interface OverlayScrim {
  kind: "fade" | "panel"
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
  fade: "down" | "up" | "band" | "none"
  /** Panel corner radius in px (rounded product UI stays). */
  radius: number
}

export interface OverlayLayout {
  width: number
  height: number
  scrim: OverlayScrim | null
  lines: OverlayLine[]
}

export function overlayCanvasFont(weight: number, px: number, family: string): string {
  return `${weight} ${px}px ${family}`
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

/**
 * Compute the full flattened layout for a canvas of the given size. All geometry stays
 * inside the format's IG safe zone; the text block is centered horizontally.
 */
export function computeOverlayLayout(
  spec: TextOverlaySpec,
  width: number,
  height: number,
  measure: OverlayMeasure
): OverlayLayout {
  const preset = resolveOverlayStyle(spec.style)
  const safe = safeZoneFor(spec.format)
  const scale = typeScaleFor(spec.format)
  const maxTextWidth = width * (1 - 2 * safe.side)

  const headlinePx = Math.round(width * scale.headlineFrac)
  const sublinePx = Math.round(width * scale.sublineFrac)
  const headlineFont = overlayCanvasFont(400, headlinePx, OVERLAY_DISPLAY_FONT)
  const sublineFont = overlayCanvasFont(400, sublinePx, OVERLAY_SANS_FONT)

  const sublineText = preset.sublineUppercase ? (spec.subline ?? "").toUpperCase() : spec.subline ?? ""
  const headlineLines = wrapOverlayText(spec.headline, maxTextWidth, headlineFont, measure)
  const sublineLines = sublineText ? wrapOverlayText(sublineText, maxTextWidth, sublineFont, measure) : []

  const headlineLineH = headlinePx * scale.headlineLineHeight
  const sublineLineH = sublinePx * scale.sublineLineHeight
  const gap = sublineLines.length > 0 ? width * scale.gapFrac : 0
  const blockHeight = headlineLines.length * headlineLineH + gap + sublineLines.length * sublineLineH

  const minY = height * safe.top
  const maxY = height * (1 - safe.bottom) - blockHeight
  let y0: number
  if (spec.position === "top") y0 = minY
  else if (spec.position === "center") y0 = (height - blockHeight) / 2
  else y0 = maxY
  y0 = Math.min(Math.max(y0, minY), Math.max(maxY, minY))

  const lines: OverlayLine[] = []
  let cursor = y0
  for (const text of headlineLines) {
    lines.push({
      text,
      y: cursor,
      fontPx: headlinePx,
      fontFamily: OVERLAY_DISPLAY_FONT,
      fontWeight: 400,
      color: preset.headlineColor,
      uppercase: false,
      kind: "headline",
      strip:
        preset.backdrop === "strip"
          ? stripRect(text, headlineFont, headlinePx, headlineLineH, cursor, width, preset, measure)
          : undefined,
    })
    cursor += headlineLineH
  }
  cursor += gap
  for (const text of sublineLines) {
    lines.push({
      text,
      y: cursor,
      fontPx: sublinePx,
      fontFamily: OVERLAY_SANS_FONT,
      fontWeight: 400,
      color: preset.sublineColor,
      uppercase: preset.sublineUppercase,
      kind: "subline",
      strip:
        preset.backdrop === "strip"
          ? stripRect(text, sublineFont, sublinePx, sublineLineH, cursor, width, preset, measure)
          : undefined,
    })
    cursor += sublineLineH
  }

  return {
    width,
    height,
    scrim: buildScrim(spec, preset, width, height, y0, blockHeight, maxTextWidth),
    lines,
  }
}

function stripRect(
  text: string,
  font: string,
  fontPx: number,
  lineHeight: number,
  y: number,
  canvasWidth: number,
  preset: OverlayStylePreset,
  measure: OverlayMeasure
): NonNullable<OverlayLine["strip"]> {
  const textWidth = measure(text, font)
  const padX = fontPx * 0.4
  const padY = fontPx * 0.16
  return {
    x: canvasWidth / 2 - textWidth / 2 - padX,
    y: y - padY,
    width: textWidth + padX * 2,
    height: lineHeight + padY * 2,
    color: preset.backdropColor,
  }
}

function buildScrim(
  spec: TextOverlaySpec,
  preset: OverlayStylePreset,
  width: number,
  height: number,
  blockY: number,
  blockHeight: number,
  maxTextWidth: number
): OverlayScrim | null {
  if (preset.backdrop === "strip") return null
  if (preset.backdrop === "panel") {
    const padX = width * 0.045
    const padY = width * 0.04
    return {
      kind: "panel",
      x: width / 2 - maxTextWidth / 2 - padX,
      y: blockY - padY,
      width: maxTextWidth + padX * 2,
      height: blockHeight + padY * 2,
      color: preset.backdropColor,
      alpha: preset.backdropAlpha,
      fade: "none",
      radius: Math.round(width * 0.012),
    }
  }
  // Floor fade: a soft gradient reaching well past the text so the photo is never hard-cut.
  const lead = height * 0.12
  if (spec.position === "bottom") {
    const y = Math.max(0, blockY - lead)
    return {
      kind: "fade",
      x: 0,
      y,
      width,
      height: height - y,
      color: preset.backdropColor,
      alpha: preset.backdropAlpha,
      fade: "down",
      radius: 0,
    }
  }
  if (spec.position === "top") {
    const bottom = Math.min(height, blockY + blockHeight + lead)
    return {
      kind: "fade",
      x: 0,
      y: 0,
      width,
      height: bottom,
      color: preset.backdropColor,
      alpha: preset.backdropAlpha,
      fade: "up",
      radius: 0,
    }
  }
  return {
    kind: "fade",
    x: 0,
    y: Math.max(0, blockY - lead),
    width,
    height: Math.min(height, blockHeight + lead * 2),
    color: preset.backdropColor,
    alpha: preset.backdropAlpha,
    fade: "band",
    radius: 0,
  }
}
