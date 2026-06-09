// SSELFIE Studio 3.0 — prompt compiler.
// Turns {aesthetic, output format, on-image text} into OpenAI prompt(s). One prompt for
// a single image; one prompt per slide for a carousel. Bakes in the design system so the
// model's NATIVE text rendering stays editorial and legible. Pure + unit-testable.

import type { GraphicTextSpec, OutputFormat } from "@/components/app-v3/types"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"
import {
  IDENTITY_ANCHOR,
  REALISM_TOKENS,
  ELEVATION,
  QUIET_LUXURY_FALLBACK,
  cameraForText,
  lightingForText,
} from "@/lib/app-v3/maya/ingredients"
import { getAestheticRecipe, recipeToPromptBlock } from "@/lib/app-v3/maya/ingredients/aesthetic-recipes"
import type { BrandKit } from "@/lib/app-v3/maya/concept-types"

/** DALL-E-style request size the OpenAI route accepts (it maps these to gpt-image sizes). */
export type RequestSize = "1024x1024" | "1024x1792"

export interface CompileInput {
  aestheticIntent: string
  aestheticName: string
  outputFormat: OutputFormat
  userText?: string
  graphicText?: GraphicTextSpec | null
  /** True when refining a previous image (conversational edit). */
  isEdit?: boolean
}

export interface CompiledPrompt {
  prompts: string[]
  size: RequestSize
}

export const MAX_CAROUSEL_SLIDES = 5

const BRAND_PHOTO_STYLE =
  "Editorial brand photograph. Keep the person's face and likeness from the reference image accurate and natural. " +
  "Soft, flattering light, refined styling, calm composition, premium magazine quality. Natural skin texture, not plastic. " +
  "No added text, no logos, no graphic overlays."

const BRAND_GRAPHIC_STYLE =
  "Premium light-editorial design in the SSELFIE style: calm, spacious, high-end magazine feel. " +
  "Use an elegant serif for headlines and a clean sans for body. Neutral palette (off-white, soft greys, near-black text). " +
  "No emojis, no clip-art, no gradients, no clutter. Render all text crisply and perfectly legible, spelled exactly as given, " +
  "with generous margins so nothing is cropped by app UI."

function clean(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}

// ─── MAYA-REBUILD-03: concept compiler (Nano Banana order) ──────────────────────
// Stage 2 of the two-stage pipeline. Takes the LLM-authored CreativeBrief and lays its
// ingredients down in the order gpt-image responds to best (it is instruction-following
// like Nano Banana, NOT tag-based like Flux):
//
//   1. Identity Anchor (first line, always)
//   2. Outfit / Brand
//   3. Setting / Mood / Pose
//   4. Camera + Lighting + Realism tokens
//   (+ on-image graphic layer for non-photo formats)
//
// Pure + unit-testable. compileMayaPrompt (above) is untouched and still serves the
// legacy form path; this is the new concept path used by /api/app-v3/maya/generate.

function buildGraphicLayer(
  brief: CreativeBrief,
  format: Exclude<OutputFormat, "photo">,
  brandKit?: BrandKit | null,
): string {
  const palette =
    brandKit?.colors?.length || brandKit?.fonts?.length
      ? `Use the brand kit — colors: ${(brandKit.colors ?? []).join(", ") || "as provided"}; ` +
        `type: ${(brandKit.fonts ?? []).join(", ") || "elegant serif headline, clean sans body"}.`
      : `Use the Quiet Luxury palette so it reads high-end: ${QUIET_LUXURY_FALLBACK.colors.join(", ")}; ` +
        `${QUIET_LUXURY_FALLBACK.fonts.join(" and ")}; ${QUIET_LUXURY_FALLBACK.vibe}.`

  const base =
    "Premium light-editorial SSELFIE layout: calm, spacious, magazine-quality. " +
    palette +
    " Render all text crisply and perfectly legible, spelled exactly as given, with generous safe-zone margins " +
    "so nothing is cropped by app UI. No emojis, no clip-art, no gradients, no clutter."

  const g = brief.graphic
  if (format === "carousel") {
    const slides = (g?.slides ?? []).filter((s) => clean(s.heading))
    const safe = slides.length > 0 ? slides : [{ heading: clean(g?.headline) || "Slide 1" }]
    const lines = safe
      .map((s, i) => {
        const role = s.role ? ` [${s.role}]` : i === 0 ? " [hook]" : ""
        return `Slide ${i + 1}${role}: heading "${clean(s.heading)}"${s.body ? `, body "${clean(s.body)}"` : ""}`
      })
      .join("; ")
    return `${base} Cohesive ${safe.length}-slide carousel, same palette and type across every slide. ${lines}.`
  }

  // reel-cover / story-slide
  const headline = clean(g?.headline) || "Your headline here"
  const subline = clean(g?.subline)
  return `${base} ${format === "reel-cover" ? "Vertical Reel cover" : "Vertical Story slide"}. ` +
    `Headline (prominent): "${headline}".${subline ? ` Supporting line: "${subline}".` : ""}`
}

export interface CompileConceptOptions {
  brandKit?: BrandKit | null
  /** Front-door aesthetic id, used to inject the vision-extracted look (color grade, lighting, film). */
  aestheticId?: string | null
}

/**
 * Compile ONE Maya concept brief into a production gpt-image prompt in Nano Banana order.
 * The returned prompt always opens with the identity anchor and (for photos) ends with the
 * realism tokens. Camera + lighting fall back to the positioning-matched ingredient library
 * if Maya's brief left them thin.
 */
export function compileConceptPrompt(
  brief: CreativeBrief,
  format: OutputFormat,
  opts?: CompileConceptOptions,
): string {
  const positioningText = `${brief.outfit} ${brief.setting} ${brief.mood}`
  const camera = clean(brief.cameraSpec) || cameraForText(positioningText)
  const lighting = clean(brief.lighting) || lightingForText(positioningText)
  // Vision-extracted look for the chosen collection (authoritative grade/lighting/film).
  const recipe = getAestheticRecipe(opts?.aestheticId)

  const layers: string[] = []

  // 1. IDENTITY ANCHOR — first, strong, unambiguous.
  layers.push(IDENTITY_ANCHOR)

  // 2. OUTFIT / BRAND — exact names.
  layers.push(clean(brief.outfit))

  // 3. SETTING / MOOD / POSE.
  layers.push(
    [clean(brief.setting), clean(brief.mood), clean(brief.pose)].filter(Boolean).join(". ") + ".",
  )

  // 4. CAMERA + LIGHTING + REALISM.
  layers.push(`Shot on ${camera}.`)
  layers.push(`Lighting: ${lighting}.`)

  if (format === "photo") {
    layers.push(REALISM_TOKENS + ".")
    layers.push(ELEVATION) // best, most confident version of her — not a tired selfie
    // Authoritative look from the Vault thumbnail DNA — locks the grade so it isn't guessed.
    if (recipe) layers.push(recipeToPromptBlock(recipe))
    layers.push(
      "Fill the frame edge to edge with the final photo — no white border, mat, mockup, phone screen, or app UI.",
    )
  } else {
    layers.push(buildGraphicLayer(brief, format, opts?.brandKit))
    // Person-featuring graphics still grade the photo behind the text (carousels are text-led).
    if (recipe && format !== "carousel") {
      layers.push(`The photo of the person uses this grade — ${recipeToPromptBlock(recipe)}`)
    }
  }

  return layers.filter(Boolean).join("\n")
}

/**
 * Compile a brief into ONE prompt per image. Photos/covers/stories return a single prompt;
 * a carousel returns one prompt PER slide (capped at MAX_CAROUSEL_SLIDES), each a cohesive
 * photo of the person in the look with that slide's text rendered. The generate route loops
 * these (1 credit per image, per Sandra's decision).
 */
export function compileConceptPrompts(
  brief: CreativeBrief,
  format: OutputFormat,
  opts?: CompileConceptOptions,
): string[] {
  if (format !== "carousel") return [compileConceptPrompt(brief, format, opts)]

  const recipe = getAestheticRecipe(opts?.aestheticId)
  const positioning = `${brief.outfit} ${brief.setting} ${brief.mood}`
  const camera = clean(brief.cameraSpec) || cameraForText(positioning)
  const lighting = clean(brief.lighting) || lightingForText(positioning)

  const slides = (brief.graphic?.slides ?? []).filter((s) => clean(s.heading)).slice(0, MAX_CAROUSEL_SLIDES)
  const safe = slides.length > 0 ? slides : [{ heading: clean(brief.graphic?.headline) || "Slide 1" }]
  const total = safe.length

  const bk = opts?.brandKit
  const palette =
    bk?.colors?.length || bk?.fonts?.length
      ? `Use the brand kit — colors: ${(bk.colors ?? []).join(", ") || "as provided"}; type: ${(bk.fonts ?? []).join(", ") || "elegant serif headline, clean sans body"}.`
      : `Use the Quiet Luxury palette so it reads high-end: ${QUIET_LUXURY_FALLBACK.colors.join(", ")}; ${QUIET_LUXURY_FALLBACK.fonts.join(" and ")}; ${QUIET_LUXURY_FALLBACK.vibe}.`

  return safe.map((slide, i) => {
    const layers: string[] = [
      IDENTITY_ANCHOR,
      clean(brief.outfit),
      [clean(brief.setting), clean(brief.mood), clean(brief.pose)].filter(Boolean).join(". ") + ".",
      `Shot on ${camera}.`,
      `Lighting: ${lighting}.`,
      ELEVATION,
    ]
    if (recipe) layers.push(recipeToPromptBlock(recipe))
    layers.push(
      `This is slide ${i + 1} of ${total} in one cohesive Instagram carousel. Keep the SAME palette, type treatment, and overall look across every slide so they read as one set. ` +
        `${palette} Render this text crisply and perfectly legible, spelled exactly as given, with generous safe-zone margins so nothing is cropped: ` +
        `heading "${clean(slide.heading)}"${slide.body ? `, body "${clean(slide.body)}"` : ""}. ` +
        "No emojis, no clip-art, no gradients, no clutter.",
    )
    return layers.filter(Boolean).join("\n")
  })
}

/** Vertical for photos/covers/stories, square for carousels (keeps text safe from cropping). */
export function conceptRequestSize(format: OutputFormat): RequestSize {
  return format === "carousel" ? "1024x1024" : "1024x1792"
}

export function compileMayaPrompt(input: CompileInput): CompiledPrompt {
  const { aestheticIntent, outputFormat, userText, graphicText } = input
  const extra = clean(userText)
  const editPrefix = input.isEdit
    ? "Refine the attached image. Keep the same person, likeness, framing, and overall look. Apply only this change: "
    : ""

  switch (outputFormat) {
    case "photo": {
      const prompt = editPrefix
        ? `${editPrefix}${extra}. ${BRAND_PHOTO_STYLE}`
        : `${aestheticIntent} ${BRAND_PHOTO_STYLE}${extra ? ` Extra direction: ${extra}.` : ""}`
      return { prompts: [prompt], size: "1024x1792" }
    }

    case "reel-cover":
    case "story-slide": {
      const headline = clean(graphicText?.headline) || extra || "Your headline here"
      const subline = clean(graphicText?.subline)
      const prompt =
        `${aestheticIntent} A vertical ${outputFormat === "reel-cover" ? "Reel cover" : "Story slide"} featuring the person from the reference image. ` +
        `${BRAND_GRAPHIC_STYLE} Render this headline prominently: "${headline}".` +
        (subline ? ` Smaller supporting line: "${subline}".` : "") +
        (input.isEdit && extra ? ` Apply this change: ${extra}.` : "")
      return { prompts: [prompt], size: "1024x1792" }
    }

    case "carousel": {
      const slides = (graphicText?.slides ?? []).slice(0, MAX_CAROUSEL_SLIDES)
      const safeSlides = slides.length > 0 ? slides : [{ heading: clean(extra) || "Slide 1" }]
      const cohesion =
        `Part of a cohesive ${safeSlides.length}-slide carousel. Keep the SAME palette, type treatment, and ${input.aestheticName} aesthetic across every slide so they read as one set. ` +
        BRAND_GRAPHIC_STYLE
      const prompts = safeSlides.map((slide, i) => {
        const isCover = i === 0
        const base = isCover
          ? `${aestheticIntent} Carousel COVER slide featuring the person from the reference image. `
          : `Carousel slide ${i + 1} of ${safeSlides.length} (text-led, no person needed unless natural). `
        return (
          `${base}${cohesion} Heading: "${clean(slide.heading)}".` +
          (slide.body ? ` Body: "${clean(slide.body)}".` : "")
        )
      })
      // Square keeps text safe from cropping (per product decision); covers stay vertical-friendly via layout.
      return { prompts, size: "1024x1024" }
    }
  }
}
