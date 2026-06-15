// SSELFIE Studio 3.0 — prompt compiler.
// Turns {aesthetic, output format, editorial intent} into OpenAI prompt(s). One prompt for
// a single image; one prompt per slide for a carousel. Generated images stay text-free:
// the app composites editable typography afterward. Pure + unit-testable.

import type { GraphicTextSpec, OutputFormat } from "@/components/app-v3/types"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"
import {
  IDENTITY_ANCHOR,
  REALISM_TOKENS,
  ACCESSORIES_NOTE,
  AVOID_LIST,
  PORTRAIT_QUALITY,
  CAROUSEL_QUALITY,
  cameraForText,
  lightingForText,
} from "@/lib/app-v3/maya/ingredients"
import {
  getAestheticRecipe,
  recipeToPromptBlock,
} from "@/lib/app-v3/maya/ingredients/aesthetic-recipes"
import { getVaultSignatureDna } from "@/lib/app-v3/maya/vault-styles"
import { resolveOverlayStyle } from "@/lib/app-v3/maya/overlay-styles"
import {
  resolveDesignSystem,
  defaultSlideVisual,
  type CarouselDesignSystem,
  type SlideVisual,
} from "@/lib/app-v3/maya/carousel-design-systems"

// Replaces the old posed "ELEVATION" line. The Vault look is candid and on-location, not a stiff
// studio pose, which was the #1 reason /app output read as fake. Keep the elevation (skin, light,
// styling) but flip the posing to a real caught moment.
const CANDID_EDITORIAL =
  "Make this a candid, caught-in-the-moment editorial photograph, like a real on-location shoot: " +
  "natural movement and a relaxed, unposed moment (walking, sitting, reaching for a coffee, glancing " +
  "away), never a stiff studio pose or a forced smile straight at the camera. Flattering light, " +
  "refined healthy skin, tasteful natural makeup, great hair, elegant on-brand styling. Elevate her " +
  "while keeping her clearly recognizable as the same person."
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

export const MAX_CAROUSEL_SLIDES = 6

const BRAND_PHOTO_STYLE =
  "Editorial brand photograph. Keep the person's face and likeness from the reference image accurate and natural. " +
  "Soft, flattering light, refined styling, calm composition, premium magazine quality. Natural skin texture, not plastic. " +
  "No added text, no logos, no graphic overlays."

const BRAND_GRAPHIC_STYLE =
  "Premium light-editorial image in the SSELFIE style: calm, spacious, high-end magazine feel. " +
  "Neutral palette, generous negative space, refined composition. No emojis, no clip-art, no gradients, no clutter. " +
  "Do not render text, letters, words, typography, logos, captions, UI, or graphic overlays."

function clean(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}

// ─── MAYA-REBUILD-07 / MAYA-FIX-03: Vault-aligned prompt engine ─────────────────
// Two systems:
//
//   SYSTEM A — Photos (Pinterest Photoshoot Lab): a text-only prompt, selfie is the ONLY
//   image input. Structure: role -> identity lock -> scene -> outfit -> hair -> accessories ->
//   pose -> composition -> mood -> color grading -> image quality -> avoid list.
//
//   SYSTEM B — Carousel / Reel cover / Story: NEVER bake text into the pixels. Generate clean,
//   text-safe editorial imagery only; the React layer composites editable typography and export
//   flattens it locally. The Vault connects as TEXT DNA only (aesthetic-recipes); the example
//   image is never fed to generation, which prevents the model copying the inspiration person's face.

export interface CompileConceptOptions {
  brandKit?: BrandKit | null
  /** Front-door aesthetic id, used to inject the vision-extracted look (color grade, lighting, film). */
  aestheticId?: string | null
}

/** Deprecated compatibility type: text is now always composited by the app layer. */
export type TextRenderMode = "two_pass" | "one_pass"

/**
 * A single OpenAI call. The input image source:
 * - "selfie": attach the user's selfie(s) (identity) — new-photo generation (images.edit).
 * - "prev": legacy only; text overlays no longer call OpenAI.
 * - "base": legacy only; text overlays no longer call OpenAI.
 * - "none": NO image input — pure generation (images.generate). Used for carousel detail and
 *   text-only slides so her face physically cannot appear or drift on slides without her.
 */
export interface PromptPass {
  prompt: string
  input: "selfie" | "prev" | "base" | "none"
}

/** One final image. Text for graphics is composited later by the app layer. */
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

/** Per-role text-safe composition (System B): where the photo leaves space for app typography. */
interface RoleLayout {
  /** Negative-space direction baked into the clean photo so the app text layer has room. */
  space: string
  /** Legacy UI placement note; never sent as a text-rendering instruction. */
  place: string
}
const HOOK_LAYOUT: RoleLayout = {
  space: "Leave clean negative space across the top third for a future editorial title layer.",
  place: "top third",
}
const CTA_LAYOUT: RoleLayout = {
  space:
    "Keep a calm, uncluttered area in the lower third or center for a future call-to-action layer.",
  place: "center or lower third",
}
const VALUE_LAYOUTS: RoleLayout[] = [
  {
    space:
      "She stands off to one side in a wider three-quarter shot, leaving clean negative space on the opposite side.",
    place: "side negative space",
  },
  {
    space:
      "A candid mid-moment, medium crop, eyes off-camera, with calm open space across the top.",
    place: "top third",
  },
  {
    space:
      "A quieter seated or leaning moment at a softer angle, with open space in the lower third.",
    place: "lower third",
  },
  {
    space:
      "A profile or over-the-shoulder angle, she sits smaller in the frame, with generous open space.",
    place: "largest open area",
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
 * room for the editable app text layer, and forbids the model rendering any text itself.
 */
function compilePhotoPrompt(
  brief: CreativeBrief,
  format: OutputFormat,
  opts?: CompileConceptOptions,
  safeSpace?: string
): string {
  const positioning = `${brief.outfit} ${brief.setting} ${brief.mood}`
  const camera = clean(brief.cameraSpec) || cameraForText(positioning)
  const lighting = clean(brief.lighting) || lightingForText(positioning)
  const quality = format === "carousel" ? CAROUSEL_QUALITY : PORTRAIT_QUALITY

  const composition = safeSpace
    ? `Composition: shot on ${camera}. ${safeSpace} Do not render any text, letters, typography, logos, captions, UI, borders, frames, or graphic overlays in this image; the app adds editable type afterward.`
    : `Composition: shot on ${camera}, fill the frame edge to edge with the final photo, no border, mockup, phone screen, or app UI.`

  // Ground the photo in the chosen Vault collection's real DNA (auto-derived, stays in sync).
  const signature = getVaultSignatureDna(opts?.aestheticId)

  return [
    "Create an ultra-realistic editorial brand photograph of the same woman.",
    IDENTITY_ANCHOR,
    signature || "",
    clean(brief.setting) ? `Scene: ${clean(brief.setting)}.` : "",
    clean(brief.outfit) ? `Outfit: ${clean(brief.outfit)}.` : "",
    "Hair: keep her natural hair color and texture from the reference photo.",
    ACCESSORIES_NOTE,
    clean(brief.pose) ? `Pose: ${clean(brief.pose)}.` : "",
    composition,
    clean(brief.mood) ? `Mood: ${clean(brief.mood)}.` : "",
    gradeLine(opts),
    `Lighting: ${lighting}.`,
    CANDID_EDITORIAL,
    REALISM_TOKENS + ".",
    quality,
    AVOID_LIST,
  ]
    .filter(Boolean)
    .join("\n")
}

/** Legacy compatibility: build a text-free base image for surfaces that used to request overlays. */
function compileOverlayPrompt(
  text: { heading: string; body?: string },
  layout: RoleLayout,
  role: "hook" | "value" | "cta",
  format: OutputFormat,
  opts?: CompileConceptOptions
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
    `Create a clean editorial image base for this ${surface}.`,
    "Preserve the original image feel exactly: do not change her identity, face, body, outfit, pose, lighting, background, colors, or composition.",
    `The future app text layer is ${role === "cta" ? "a call-to-action" : "a short editorial line"} with this message: "${heading}".${body ? ` Supporting idea: "${body}".` : ""}`,
    `Leave the cleanest open area around the ${layout.place} readable and calm. Do not cover her face, eyes, phone, hands, or strongest outfit details.`,
    "Do not render any text, letters, typography, logos, captions, UI, borders, frames, or graphic overlays.",
    paletteLine(opts?.brandKit),
  ]
    .filter(Boolean)
    .join("\n")
}

// ─── MAYA-REBUILD-16: carousel design systems (per-slide visual roles) ─────────
// A carousel is a mini editorial design system (QA §10 + Sandra's reference grids): 1-2
// identity slides max, detail slides from her world (no people), and text-first slides —
// all sharing one design system's palette, type, and decoration language.

const TEXT_FREE_IMAGE =
  "Do not render any text, letters, typography, logos, captions, UI, borders, frames, or graphic overlays."

const NO_PEOPLE =
  "No people, no faces, no bodies, no hands, no human figures or silhouettes anywhere in the image."

/** Identity slide (input: selfie) — she appears, with clean space for an app text layer. */
function compileCarouselIdentityPrompt(
  brief: CreativeBrief,
  system: CarouselDesignSystem,
  text: { heading: string; body?: string },
  layout: RoleLayout,
  role: "hook" | "value" | "cta",
  opts?: CompileConceptOptions
): string {
  const positioning = `${brief.outfit} ${brief.setting} ${brief.mood}`
  const lighting = clean(brief.lighting) || lightingForText(positioning)
  const signature = getVaultSignatureDna(opts?.aestheticId)
  const heading = clean(text.heading)
  const body = clean(text.body)
  return [
    "Create an editorial brand image for an Instagram carousel slide (4:5) featuring the same woman.",
    IDENTITY_ANCHOR,
    signature || "",
    clean(brief.setting) ? `Scene: ${clean(brief.setting)}.` : "",
    clean(brief.outfit) ? `Outfit: ${clean(brief.outfit)}.` : "",
    "Hair: keep her natural hair color and texture from the reference photo.",
    ACCESSORIES_NOTE,
    clean(brief.pose) ? `Pose: ${clean(brief.pose)}.` : "",
    // SUITE-UX-02: her moment should match the slide's copy, not just the set's scenery.
    `This slide's message: "${heading}". Her expression, gesture and the captured moment should match that message.`,
    `Leave text-safe composition for the app layer: ${layout.space}`,
    system.identityTreatment,
    system.setDna,
    clean(brief.mood) ? `Mood: ${clean(brief.mood)}.` : "",
    gradeLine(opts),
    `Lighting: ${lighting}.`,
    CANDID_EDITORIAL,
    REALISM_TOKENS + ".",
    paletteLine(opts?.brandKit),
    `Future app text role: ${role}. Supporting idea: "${body || heading}".`,
    TEXT_FREE_IMAGE + " Keep her face and eyes clear of busy background detail.",
    CAROUSEL_QUALITY,
    AVOID_LIST,
  ]
    .filter(Boolean)
    .join("\n")
}

/** Detail slide (input: none — pure generation): an object shot from her world, never a person. */
function compileCarouselDetailPrompt(
  brief: CreativeBrief,
  system: CarouselDesignSystem,
  text: { heading: string; body?: string },
  subject: string | undefined,
  opts?: CompileConceptOptions
): string {
  const heading = clean(text.heading)
  const body = clean(text.body)
  const resolvedSubject =
    clean(subject) ||
    `a beautiful real-life detail that belongs to this scene (a coffee cup, a notebook and pen, a phone on the table, fabric, or an interior corner): ${clean(brief.setting)}`
  return [
    "Create a premium editorial DETAIL photograph for an Instagram carousel slide (4:5).",
    NO_PEOPLE,
    // SUITE-UX-02: the image must express the slide's message, not just the set's scenery —
    // this line is what keeps the photograph and the copy telling the same story.
    `This slide's message: "${heading}".${body ? ` Supporting line: "${body}".` : ""} Compose and style the photograph so it visually expresses that message.`,
    `Subject: ${resolvedSubject}.`,
    `It belongs to the same world as the rest of the set: ${clean(brief.setting)}. Mood: ${clean(brief.mood)}.`,
    system.detailTreatment,
    system.setDna,
    gradeLine(opts),
    paletteLine(opts?.brandKit),
    `Leave calm negative space for the app text layer. Future app text role: value. Headline idea: "${heading}".${body ? ` Supporting idea: "${body}".` : ""}`,
    TEXT_FREE_IMAGE,
    "Real textures and believable light, like a beautiful phone photo, never stock-photo gloss or CGI.",
    CAROUSEL_QUALITY,
  ]
    .filter(Boolean)
    .join("\n")
}

/** Text-led slide (input: none): a clean editorial background; copy is composited by the app. */
function compileCarouselTextPrompt(
  brief: CreativeBrief,
  system: CarouselDesignSystem,
  text: { heading: string; body?: string },
  role: "hook" | "value" | "cta",
  opts?: CompileConceptOptions
): string {
  const heading = clean(text.heading)
  const body = clean(text.body)
  return [
    "Create a clean premium editorial background for an Instagram carousel slide (4:5).",
    NO_PEOPLE,
    `The future app text layer carries this ${role} message: "${heading}".${body ? ` Supporting idea: "${body}".` : ""}`,
    system.textOnlyTreatment,
    system.setDna,
    paletteLine(opts?.brandKit),
    "Generous quiet negative space, calm spacing, premium print texture, image-led rather than template-led.",
    TEXT_FREE_IMAGE,
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Compile a brief into the list of image JOBS the generate route runs.
 * - photo: one pass (selfie -> editorial photo).
 * - carousel: a designed SET — per slide, one pass routed by its visual role
 *   (identity -> selfie edit; detail / text-only -> pure generation, no selfie attached).
 * - reel-cover / story-slide: one clean text-safe photo; app layer composites typography.
 * Carousels stay cohesive (one design system + grade) while each slide varies its visual role.
 */
export function compileConceptJobs(
  brief: CreativeBrief,
  format: OutputFormat,
  opts?: CompileConceptOptions,
  _mode: TextRenderMode = "two_pass"
): ImageJob[] {
  if (format === "photo") {
    return [
      {
        label: "photo",
        passes: [{ prompt: compilePhotoPrompt(brief, format, opts), input: "selfie" }],
      },
    ]
  }

  // Graphic formats: build the slide list (carousel = many; cover/story = one).
  const g = brief.graphic
  const rawSlides =
    format === "carousel"
      ? (g?.slides ?? []).filter(s => clean(s.heading)).slice(0, MAX_CAROUSEL_SLIDES)
      : [
          {
            heading: clean(g?.headline) || clean(brief.outfit) || "Slide 1",
            body: clean(g?.subline),
            role: g?.role,
          },
        ]
  const slides =
    rawSlides.length > 0
      ? rawSlides
      : [{ heading: clean(g?.headline) || "Slide 1" } as (typeof rawSlides)[number]]
  const total = slides.length

  // ── Carousel: a designed set with per-slide visual roles (MAYA-REBUILD-16). ──
  if (format === "carousel") {
    const system = resolveDesignSystem(g?.designSystem)
    let valueIdx = 0
    let identityCount = 0
    return slides.map((slide, i) => {
      const role = resolveRole(slide.role, i, total)
      const layout =
        role === "hook"
          ? HOOK_LAYOUT
          : role === "cta"
            ? CTA_LAYOUT
            : VALUE_LAYOUTS[valueIdx % VALUE_LAYOUTS.length]
      const valueIndex = role === "value" ? valueIdx++ : 0
      // Maya tags the visual; untagged slides get the photoshoot-first default mix. Keep a
      // sanity cap so long carousels still have room for proof/details without going faceless.
      let visual: SlideVisual =
        (slide as { visual?: SlideVisual }).visual ?? defaultSlideVisual(role, valueIndex)
      if (visual === "identity") {
        identityCount += 1
        if (identityCount > 2) visual = "detail"
      }
      const text = { heading: clean(slide.heading), body: clean(slide.body) }
      const label = `slide ${i + 1}/${total} (${role} · ${visual})`

      if (visual === "identity") {
        return {
          label,
          passes: [
            {
              prompt: compileCarouselIdentityPrompt(brief, system, text, layout, role, opts),
              input: "selfie" as const,
            },
          ],
        }
      }
      if (visual === "detail") {
        const subject = (slide as { detailSubject?: string }).detailSubject
        return {
          label,
          passes: [
            {
              prompt: compileCarouselDetailPrompt(brief, system, text, subject, opts),
              input: "none" as const,
            },
          ],
        }
      }
      return {
        label,
        passes: [
          {
            prompt: compileCarouselTextPrompt(brief, system, text, role, opts),
            input: "none" as const,
          },
        ],
      }
    })
  }

  // ── Reel cover / Story slide: single clean image with text-safe space. ──
  let valueIdx = 0
  return slides.map((slide, i) => {
    const role = resolveRole(slide.role, i, total)
    const layout =
      role === "hook"
        ? HOOK_LAYOUT
        : role === "cta"
          ? CTA_LAYOUT
          : VALUE_LAYOUTS[valueIdx++ % VALUE_LAYOUTS.length]
    const label = format

    return {
      label,
      passes: [
        { prompt: compilePhotoPrompt(brief, format, opts, layout.space), input: "selfie" as const },
      ],
    }
  })
}

/** Layout for an overlay placed on a user-provided image (we don't control its composition). */
const OVERLAY_ONLY_LAYOUT: RoleLayout = {
  space: "",
  place:
    "Place the text in the cleanest open area of the photo (the calm negative space, typically the " +
    "top third or lower third), where it does not cover the main subject's face, eyes, hands, or key details.",
}

/**
 * MODE C legacy helper. Text overlays are composited client-side now; callers should not send this
 * job to OpenAI. Kept only so older imports/tests fail softly while the route returns 410.
 */
export function compileOverlayOnlyJob(
  text: { heading: string; body?: string },
  format: OutputFormat,
  overlayStyleId?: string | null,
  opts?: CompileConceptOptions,
  role: "hook" | "value" | "cta" = "hook"
): ImageJob {
  const style = resolveOverlayStyle(overlayStyleId)
  const graphicFormat: OutputFormat = format === "photo" ? "story-slide" : format
  return {
    label: `clean base (${style.id})`,
    passes: [
      {
        prompt: compileOverlayPrompt(text, OVERLAY_ONLY_LAYOUT, role, graphicFormat, opts),
        input: "base",
      },
    ],
  }
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
  // MEASURED 2026-06-10: 2K at high quality takes ~526s per image — past the 300s function
  // ceiling, so 2K must ship as an async "HD export" job, never a synchronous default.
  // (high @ 1024-class: ~191s, fits. medium: ~82s.) Env overrides remain for experiments.
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
        `${BRAND_GRAPHIC_STYLE} Leave readable negative space for a future app text layer. Headline idea: "${headline}".` +
        (subline ? ` Supporting idea: "${subline}".` : "") +
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
          `${base}${cohesion} Leave readable negative space for the app text layer. Heading idea: "${clean(slide.heading)}".` +
          (slide.body ? ` Body idea: "${clean(slide.body)}".` : "")
        )
      })
      // Square keeps text safe from cropping (per product decision); covers stay vertical-friendly via layout.
      return { prompts, size: "1024x1024" }
    }
  }
}
