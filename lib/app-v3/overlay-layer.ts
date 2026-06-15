// SSELFIE Studio 3.0 - editable text layer contract.
// Images stay clean. This metadata tells the app where/how to composite typography.

import type { OutputFormat } from "@/components/app-v3/types"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"
import { MAX_CAROUSEL_SLIDES } from "@/lib/app-v3/prompt-compiler"

export type TextLayerRole = "hook" | "value" | "cta"

export interface TextLayerSpec {
  headline: string
  subline?: string
  styleId: string
  role: TextLayerRole
  format: OutputFormat
  designSystem?: string
  slideIndex?: number
  slideCount?: number
}

function clean(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}

function resolveRole(role: string | undefined, i: number, total: number): TextLayerRole {
  if (role === "hook" || role === "value" || role === "cta") return role
  if (i === 0) return "hook"
  if (i === total - 1 && total > 1) return "cta"
  return "value"
}

export function isGraphicFormat(format: OutputFormat): boolean {
  return format === "carousel" || format === "reel-cover" || format === "story-slide"
}

export function fallbackTextLayerSpec(
  format: OutputFormat,
  overrides?: Partial<TextLayerSpec>
): TextLayerSpec {
  return {
    headline: overrides?.headline ?? "",
    subline: overrides?.subline,
    styleId: overrides?.styleId ?? "editorial-serif-center",
    role: overrides?.role ?? "hook",
    format,
    designSystem: overrides?.designSystem,
    slideIndex: overrides?.slideIndex,
    slideCount: overrides?.slideCount,
  }
}

export function buildTextLayerSpecs(brief: CreativeBrief, format: OutputFormat): TextLayerSpec[] {
  if (!isGraphicFormat(format)) return []

  const graphic = brief.graphic
  const styleId = clean(graphic?.overlayStyle) || "editorial-serif-center"
  const designSystem = clean(graphic?.designSystem) || undefined

  if (format === "carousel") {
    const slides = (graphic?.slides ?? [])
      .filter(slide => clean(slide.heading))
      .slice(0, MAX_CAROUSEL_SLIDES)

    const safeSlides =
      slides.length > 0
        ? slides
        : [
            {
              heading: clean(graphic?.headline) || "Slide 1",
              body: clean(graphic?.subline),
              role: graphic?.role,
            },
          ]
    const total = safeSlides.length

    return safeSlides.map((slide, i) => ({
      headline: clean(slide.heading),
      subline: clean(slide.body) || undefined,
      styleId,
      role: resolveRole(slide.role, i, total),
      format,
      designSystem,
      slideIndex: i,
      slideCount: total,
    }))
  }

  return [
    {
      headline: clean(graphic?.headline) || clean(brief.outfit) || "Your headline here",
      subline: clean(graphic?.subline) || undefined,
      styleId,
      role: resolveRole(graphic?.role, 0, 1),
      format,
      designSystem,
      slideIndex: 0,
      slideCount: 1,
    },
  ]
}
