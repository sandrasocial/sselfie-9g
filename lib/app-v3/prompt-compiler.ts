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
  ACCESSORIES_NOTE,
  AVOID_LIST,
  PORTRAIT_QUALITY,
  CAROUSEL_QUALITY,
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

// ─── MAYA-REBUILD-07: Vault-aligned prompt engine ───────────────────────────────
// Two proven systems, both 100% gpt-image-2 (no programmatic overlay, no canvas):
//
//   SYSTEM A — Photos (Pinterest Photoshoot Lab): a text-only prompt, selfie is the ONLY
//   image input. Structure: role -> identity lock -> scene -> outfit -> hair -> accessories ->
//   pose -> composition -> mood -> color grading -> image quality -> avoid list.
//
//   SYSTEM B — Carousel / Reel cover / Story (Carousel + Reel Cover system): NEVER bake text
//   blind. Generate the clean editorial PHOTO first (System A, text-safe space, no text), then
//   a SECOND "preserve the original exactly, add overlay only" edit pass lets gpt-image-2 render
//   the type. The Vault connects as TEXT DNA only (aesthetic-recipes); the example image is
//   never fed to generation, which prevents the model copying the inspiration person's face.

export interface CompileConceptOptions {
  brandKit?: BrandKit | null
  /** Front-door aesthetic id, used to inject the vision-extracted look (color grade, lighting, film). */
  aestheticId?: string | null
}

/** How on-image text is produced: a clean photo + an overlay edit pass, or baked in one pass. */
export type TextRenderMode = "two_pass" | "one_pass"

/** A single OpenAI edit call. useSelfie = attach the user's selfie(s); false = edit the prior pass output. */
export interface PromptPass {
  prompt: string
  useSelfie: boolean
}

/** One final image. Photos have one pass; two-pass graphics have [clean photo, text overlay]. */
export interface ImageJob {
  label: string
  passes: PromptPass[]
}

/** The brand palette line shared by every overlay (brand kit if present, else Quiet Luxury). */
function paletteLine(brandKit?: BrandKit | null): string {
  if (brandKit?.colors?.length || brandKit?.fonts?.length) {
    return (
      `Use the brand kit. Colors: ${(brandKit.colors ?? []).join(", ") || "as provided"}. ` +
      `Type: ${(brandKit.fonts ?? []).join(", ") || "elegant serif headline, clean sans body"}.`
    )
  }
  return (
    "Use only black, white, charcoal, cream, warm gray, and soft neutral tones. " +
    "Elegant serif for the headline, clean sans-serif for supporting text."
  )
}

/** Color grading line for the chosen Vault look (vision recipe), or a calm editorial fallback. */
function gradeLine(opts?: CompileConceptOptions): string {
  const recipe = getAestheticRecipe(opts?.aestheticId)
  if (recipe) return recipeToPromptBlock(recipe)
  return (
    "Color grading: refined neutral editorial palette, true-to-life skin, soft natural contrast, " +
    "gentle film grain, no heavy filter."
  )
}

/** Per-role text-safe composition (System B): where the photo leaves space + where text lands. */
interface RoleLayout {
  /** Negative-space direction baked into the clean photo so the overlay has room. */
  space: string
  /** Matching placement instruction for the overlay pass. */
  place: string
}
const HOOK_LAYOUT: RoleLayout = {
  space: "Leave clean negative space across the top third for a bold headline.",
  place: "Place the headline large and bold across the top third.",
}
const CTA_LAYOUT: RoleLayout = {
  space: "Keep a calm, uncluttered area (lower third or center) for a call-to-action.",
  place: "Place the call-to-action centered, prominent, and inviting, the largest text element.",
}
const VALUE_LAYOUTS: RoleLayout[] = [
  {
    space: "She stands off to one side (wider three-quarter shot), leaving clean negative space on the opposite side.",
    place: "Place the text in the clean negative space to one side.",
  },
  {
    space: "A candid mid-moment, medium crop, eyes off-camera, with calm open space across the top.",
    place: "Place the text in a calm band across the top third.",
  },
  {
    space: "A quieter seated or leaning moment at a softer angle, with open space in the lower third.",
    place: "Place the text resting in the lower third.",
  },
  {
    space: "A profile or over-the-shoulder angle, she sits smaller in the frame, with generous open space.",
    place: "Let the text dominate the open space.",
  },
]

function resolveRole(role: string | undefined, i: number, total: number): "hook" | "value" | "cta" {
  if (role === "hook" || role === "value" || role === "cta") return role
  if (i === 0) return "hook"
  if (i === total - 1 && total > 1) return "cta"
  return "value"
}

/**
 * SYSTEM A — compile ONE editorial photo prompt (text-only, selfie is the only image input).
 * Order follows Sandra's proven 12-part structure. `safeSpace` (optional) makes the photo leave
 * room for a text overlay added in a later pass, and forbids the model rendering any text itself.
 */
function compilePhotoPrompt(
  brief: CreativeBrief,
  format: OutputFormat,
  opts?: CompileConceptOptions,
  safeSpace?: string,
): string {
  const positioning = `${brief.outfit} ${brief.setting} ${brief.mood}`
  const camera = clean(brief.cameraSpec) || cameraForText(positioning)
  const lighting = clean(brief.lighting) || lightingForText(positioning)
  const quality = format === "carousel" ? CAROUSEL_QUALITY : PORTRAIT_QUALITY

  const composition = safeSpace
    ? `Composition: shot on ${camera}. ${safeSpace} Do not render any text, letters, or graphics in this image; text is added in a later step.`
    : `Composition: shot on ${camera}, fill the frame edge to edge with the final photo, no border, mockup, phone screen, or app UI.`

  return [
    "Create an ultra-realistic editorial brand photograph of the same woman.",
    IDENTITY_ANCHOR,
    clean(brief.setting) ? `Scene: ${clean(brief.setting)}.` : "",
    clean(brief.outfit) ? `Outfit: ${clean(brief.outfit)}.` : "",
    "Hair: keep her natural hair color and texture from the reference photo.",
    ACCESSORIES_NOTE,
    clean(brief.pose) ? `Pose: ${clean(brief.pose)}.` : "",
    composition,
    clean(brief.mood) ? `Mood: ${clean(brief.mood)}.` : "",
    gradeLine(opts),
    `Lighting: ${lighting}.`,
    ELEVATION,
    REALISM_TOKENS + ".",
    quality,
    AVOID_LIST,
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * SYSTEM B — compile the overlay edit pass. The input image is the clean photo from pass 1.
 * Preserve the photo exactly; add only a luxury-editorial text overlay (gpt-image-2 renders it).
 */
function compileOverlayPrompt(
  text: { heading: string; body?: string },
  layout: RoleLayout,
  role: "hook" | "value" | "cta",
  format: OutputFormat,
  opts?: CompileConceptOptions,
): string {
  const heading = clean(text.heading)
  const body = clean(text.body)
  const surface =
    format === "carousel"
      ? "Instagram carousel slide (4:5)"
      : format === "reel-cover"
        ? "Instagram Reel cover (9:16)"
        : "Instagram Story slide (9:16)"

  return [
    `Add a text overlay to this ${surface}. ` +
      "Preserve the original image exactly: do not change her identity, face, body, outfit, pose, lighting, background, colors, or composition. Add the overlay only.",
    "Design a clean luxury editorial overlay in the SSELFIE style: minimal, polished, feminine, high-end, image-led. " +
      "No loud colors, no childish stickers, no clip-art, no gradients, no clutter, no Canva-template look, no heavy icons.",
    paletteLine(opts?.brandKit),
    role === "cta"
      ? `${layout.place} Call-to-action text: "${heading}".${body ? ` Smaller supporting line: "${body}".` : ""}`
      : `${layout.place} Headline: "${heading}".${body ? ` Smaller supporting line: "${body}".` : ""}`,
    "Render the text crisply and perfectly legible, spelled exactly as given, with generous safe-zone margins. " +
      "Do not cover her face, eyes, phone, hands, or strongest outfit details. Keep it easy to read in the Instagram grid.",
  ]
    .filter(Boolean)
    .join("\n")
}

/** One-pass fallback (System B compressed): clean photo + text in a single edit call. */
function compileBakedGraphicPrompt(
  brief: CreativeBrief,
  text: { heading: string; body?: string },
  layout: RoleLayout,
  role: "hook" | "value" | "cta",
  format: OutputFormat,
  opts?: CompileConceptOptions,
): string {
  const photo = compilePhotoPrompt(brief, format, opts, layout.space)
  const heading = clean(text.heading)
  const body = clean(text.body)
  return [
    photo.replace("Do not render any text, letters, or graphics in this image; text is added in a later step.", ""),
    "Then add a clean luxury editorial text overlay in the SSELFIE style (minimal, polished, neutral tones, elegant serif headline, clean sans support).",
    paletteLine(opts?.brandKit),
    role === "cta"
      ? `${layout.place} Call-to-action: "${heading}".${body ? ` Supporting line: "${body}".` : ""}`
      : `${layout.place} Headline: "${heading}".${body ? ` Supporting line: "${body}".` : ""}`,
    "Render the text crisply and legible, spelled exactly as given, with generous margins. Do not cover her face, eyes, phone, or hands.",
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Compile a brief into the list of image JOBS the generate route runs.
 * - photo: one pass (selfie -> editorial photo).
 * - reel-cover / story-slide / carousel: per slide, two passes in two_pass mode
 *   (selfie -> clean photo, then photo -> text overlay), or one baked pass in one_pass mode.
 * Carousels stay cohesive (same outfit + grade) while each slide varies its composition.
 */
export function compileConceptJobs(
  brief: CreativeBrief,
  format: OutputFormat,
  opts?: CompileConceptOptions,
  mode: TextRenderMode = "two_pass",
): ImageJob[] {
  if (format === "photo") {
    return [{ label: "photo", passes: [{ prompt: compilePhotoPrompt(brief, format, opts), useSelfie: true }] }]
  }

  // Graphic formats: build the slide list (carousel = many; cover/story = one).
  const g = brief.graphic
  const rawSlides =
    format === "carousel"
      ? (g?.slides ?? []).filter((s) => clean(s.heading)).slice(0, MAX_CAROUSEL_SLIDES)
      : [{ heading: clean(g?.headline) || clean(brief.outfit) || "Slide 1", body: clean(g?.subline), role: g?.role }]
  const slides = rawSlides.length > 0 ? rawSlides : [{ heading: clean(g?.headline) || "Slide 1" } as (typeof rawSlides)[number]]
  const total = slides.length

  let valueIdx = 0
  return slides.map((slide, i) => {
    const role = resolveRole(slide.role, i, total)
    const layout = role === "hook" ? HOOK_LAYOUT : role === "cta" ? CTA_LAYOUT : VALUE_LAYOUTS[valueIdx++ % VALUE_LAYOUTS.length]
    const text = { heading: clean(slide.heading), body: clean(slide.body) }
    const label = format === "carousel" ? `slide ${i + 1}/${total} (${role})` : format

    if (mode === "one_pass") {
      return { label, passes: [{ prompt: compileBakedGraphicPrompt(brief, text, layout, role, format, opts), useSelfie: true }] }
    }
    // two_pass: clean photo (selfie), then overlay edit (prior output).
    return {
      label,
      passes: [
        { prompt: compilePhotoPrompt(brief, format, opts, layout.space), useSelfie: true },
        { prompt: compileOverlayPrompt(text, layout, role, format, opts), useSelfie: false },
      ],
    }
  })
}

/** Vertical for photos/covers/stories, square for carousels (keeps text safe from cropping). */
export function conceptRequestSize(format: OutputFormat): RequestSize {
  return format === "carousel" ? "1024x1024" : "1024x1792"
}

/**
 * The exact gpt-image-2 output size per format. 4:5 for carousels (Instagram carousel), a tall
 * portrait for photos / Reel covers / Story slides. gpt-image-2 accepts any size that is a
 * multiple of 16 with aspect <= 3:1; these are safe, on-format defaults. Env overrides let us
 * push to true 9:16 / 2K once confirmed in staging without a code change.
 */
export function conceptOpenAISize(format: OutputFormat): string {
  if (format === "carousel") return process.env.APP_V3_CAROUSEL_SIZE || "1024x1280"
  return process.env.APP_V3_PORTRAIT_SIZE || "1024x1536"
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
