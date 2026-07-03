// SSELFIE Studio 3.0 — prompt compiler.
// Turns {aesthetic, output format, editorial intent} into OpenAI prompt(s). One prompt for
// a single image; one prompt per slide for a carousel. CAROUSEL-03: graphic formats return
// finished, image-model-designed slides with text baked into the pixels. Pure + unit-testable.

import type { OutputFormat } from "@/components/app-v3/types"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"
import type { CarouselSlide, ShootShotRole } from "@/lib/content-kit/types"
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
import {
  resolveDesignSystem,
  type CarouselDesignSystem,
} from "@/lib/app-v3/maya/carousel-design-systems"
import {
  buildDefaultCreativePlanValidationRules,
  inferCreativeUseCase,
  isFiveStylesRequest,
  isShortCreativeRequest,
  isVaultRelatedRequest,
  validateCreativePlan,
  type CreativePlan,
  type CreativePlanOutput,
  type CreativeUseCase,
  type VaultStyleReference,
} from "@/lib/app-v3/maya/creative-plan"
import {
  SSELFIE_ENVIRONMENT_INTEGRATION,
  SSELFIE_GRAPHIC_STYLE_PROMPT,
  SSELFIE_NEUTRAL_PALETTE,
  SSELFIE_PHOTO_STYLE_PROMPT,
} from "@/lib/app-v3/maya/visual-rules"
import {
  isTextOverlayLayerEnabled,
  makeTextOverlaySpec,
  type TextOverlaySpec,
} from "@/lib/app-v3/text-overlay"

// Replaces the old posed "ELEVATION" line. The Vault look is candid and on-location, not a stiff
// studio pose, which was the #1 reason /app output read as fake. Keep the elevation (skin, light,
// styling) but flip the posing to a real caught moment.
const CANDID_EDITORIAL =
  "Make this a candid, caught-in-the-moment editorial photograph, like a real on-location shoot: " +
  "natural movement and a relaxed, unposed moment (walking, sitting, reaching for a coffee, glancing " +
  "away), never a stiff studio pose or a forced smile straight at the camera. Flattering light, " +
  "refined healthy skin, tasteful natural makeup, great hair, elegant on-brand styling. Frame her " +
  "at her best while keeping her clearly recognizable as the same person."
import type { BrandKit } from "@/lib/app-v3/maya/concept-types"

/** DALL-E-style request size the OpenAI route accepts (it maps these to gpt-image sizes). */
export type RequestSize = "1024x1024" | "1024x1792"

export const MAX_CAROUSEL_SLIDES = 9

const BRAND_GRAPHIC_STYLE = SSELFIE_GRAPHIC_STYLE_PROMPT

function clean(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}

type CarouselSlidePlanLike = NonNullable<NonNullable<CreativeBrief["graphic"]>["slides"]>[number]

function normalizeUseCase(value: string | undefined, topic: string): CreativeUseCase {
  switch (value) {
    case "single_editorial":
    case "full_photoshoot":
    case "educational":
    case "tutorial":
    case "sales":
    case "behind_the_scenes":
    case "opinion":
    case "trust":
    case "vault_product":
    case "soft_cta":
    case "motion":
      return value
    case "behind-the-scenes":
      return "behind_the_scenes"
    case "product-vault":
      return "vault_product"
    case "story":
      return "educational"
    default:
      return inferCreativeUseCase(topic, "carousel")
  }
}

function vaultStyleReferencesFromBrief(brief: CreativeBrief): VaultStyleReference[] {
  const planRefs = brief.graphic?.creativePlan?.vaultStyleReferences ?? []
  const legacyRefs = brief.graphic?.relevantVaultStyles ?? []

  const normalizedPlanRefs = planRefs.map(style => ({
    name: clean(style.name),
    mood: clean(style.mood),
    promptSnippet: clean(style.promptSnippet),
    referenceImageUrl: style.referenceImageUrl ?? null,
    reason: clean(style.reason),
  }))
  const normalizedLegacyRefs = legacyRefs.map(style => ({
    name: clean(style.name),
    mood: clean(style.mood),
    promptSnippet: clean(style.reason),
    referenceImageUrl: null,
    reason: clean(style.reason),
  }))

  return [...normalizedPlanRefs, ...normalizedLegacyRefs].filter(style => style.name)
}

function carouselTopicFromBrief(brief: CreativeBrief, fallbackTitle?: string): string {
  return (
    clean(brief.graphic?.creativePlan?.userIntent) ||
    clean(brief.graphic?.carouselTitle) ||
    clean(fallbackTitle) ||
    clean(brief.graphic?.headline) ||
    clean(brief.graphic?.slides?.[0]?.heading) ||
    `${clean(brief.outfit)} ${clean(brief.setting)}`.trim()
  )
}

const STRUCTURAL_HEADING_LABELS = new Set([
  "hook",
  "the hook",
  "opening",
  "the opening",
  "opener",
  "setup",
  "the setup",
  "context",
  "the context",
  "tension",
  "the tension",
  "doubt",
  "the doubt",
  "problem",
  "the problem",
  "truth",
  "the truth",
  "shift",
  "the shift",
  "turning point",
  "the turning point",
  "realization",
  "the realization",
  "reveal",
  "the reveal",
  "desire",
  "the desire",
  "invitation",
  "the invitation",
  "cta",
  "the cta",
  "soft cta",
  "the soft cta",
  "call to action",
  "the call to action",
  "question",
  "the question",
  "poll",
  "the poll",
  "close",
  "the close",
  "closing",
  "the closing",
  "ending",
  "the ending",
  "outro",
  "the outro",
])

function normalizedStructuralLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s:.\-–—_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isPureStructuralHeading(value: string): boolean {
  const normalized = normalizedStructuralLabel(value)
  if (!normalized) return true
  if (/^(slide|beat|frame)\s*\d+$/.test(normalized)) return true
  return STRUCTURAL_HEADING_LABELS.has(normalized)
}

/** Maya's internal beat labels must never reach a baked slide (live 2026-07-03: a paying
 *  member's story sequence rendered "Slide 1: The Hook" as the actual on-image headline).
 *  The persona now forbids planning language in titles; this is the mechanical backstop. */
export function stripStructuralHeading(value: string): string {
  let text = clean(value)
  if (!text) return ""
  text = text.replace(/^(?:slide|beat|frame)\s*\d+\s*[:.\-–—]?\s*/i, "").trim()
  const prefixed = text.match(
    /^(?:the\s+)?(hook|opening|opener|setup|context|tension|doubt|problem|truth|shift|turning point|realization|reveal|desire|invitation|cta|soft cta|call to action|question|poll|close|closing|ending|outro)\s*[:.\-–—]\s*(.+)$/i
  )
  if (prefixed?.[2]) text = prefixed[2].trim()
  return isPureStructuralHeading(text) ? "" : text
}

function fallbackStoryHeading(
  brief: CreativeBrief,
  conceptTitle: string | undefined,
  index: number,
  total: number
): string {
  const topic =
    stripStructuralHeading(clean(brief.graphic?.creativePlan?.userIntent)) ||
    stripStructuralHeading(clean(brief.graphic?.headline)) ||
    stripStructuralHeading(clean(conceptTitle))
  if (index === 0 && topic) return topic.slice(0, 120)
  if (total > 1 && index === total - 1) return "If this is you, start here"
  const fallbackLines = [
    "I did not know where this would lead",
    "I was still figuring it out",
    "Something started to shift",
    "I kept going anyway",
    "This is where I started again",
  ]
  return fallbackLines[index % fallbackLines.length]
}

function safeGraphicHeading(
  brief: CreativeBrief,
  format: OutputFormat,
  conceptTitle: string | undefined,
  index: number,
  total: number,
  ...candidates: Array<string | undefined>
): string {
  for (const candidate of candidates) {
    const safe = stripStructuralHeading(clean(candidate))
    if (safe) return safe
  }
  if (format === "story-sequence" || format === "story-slide") {
    return fallbackStoryHeading(brief, conceptTitle, index, total)
  }
  return `Slide ${index + 1}`
}

function outputFromSlide(slide: CarouselSlidePlanLike, index: number): CreativePlanOutput {
  const title =
    stripStructuralHeading(clean(slide.heading)) ||
    stripStructuralHeading(clean(slide.body)) ||
    stripStructuralHeading(clean(slide.purpose)) ||
    `Slide ${index + 1}`
  const visualConcept = clean(slide.visualConcept) || title
  const imagePromptDirection =
    clean(slide.imagePromptDirection) ||
    clean(slide.imagePrompt) ||
    clean(slide.visualConcept) ||
    title

  return {
    title,
    purpose:
      clean(slide.purpose) || (index === 0 ? "open the carousel" : "continue the carousel story"),
    visualConcept,
    imagePromptDirection,
    textSafeArea: slide.textSafeArea,
    referenceImageStrategy: slide.referenceImageStrategy ?? "selfie_identity_anchor",
    reasonThisMatchesUserIntent:
      clean(slide.reasonThisMatchesUserIntent) ||
      clean(slide.visualReason) ||
      `This visual supports the slide message: ${title}`,
  }
}

function outputAsSlide(output: CreativePlanOutput, index: number): CarouselSlidePlanLike {
  return {
    heading: stripStructuralHeading(clean(output.title)) || `Slide ${index + 1}`,
    purpose: clean(output.purpose),
    visualConcept: clean(output.visualConcept),
    imagePrompt: clean(output.imagePromptDirection),
    imagePromptDirection: clean(output.imagePromptDirection),
    referenceImageStrategy: output.referenceImageStrategy,
    textSafeArea: output.textSafeArea,
    visualReason: clean(output.reasonThisMatchesUserIntent),
    reasonThisMatchesUserIntent: clean(output.reasonThisMatchesUserIntent),
  }
}

function effectiveCarouselSlides(
  brief: CreativeBrief,
  conceptTitle?: string
): CarouselSlidePlanLike[] {
  const g = brief.graphic
  const rawSlides = (g?.slides ?? []).filter(s => clean(s.heading))
  const suppliedOutputs = g?.creativePlan?.outputs ?? []
  if (suppliedOutputs.length > rawSlides.length) {
    return suppliedOutputs.map((output, index) => ({
      ...outputAsSlide(output, index),
      ...(rawSlides[index] ?? {}),
    }))
  }
  if (rawSlides.length > 0) return rawSlides
  if (suppliedOutputs.length > 0) return suppliedOutputs.map(outputAsSlide)
  const fallback = clean(g?.headline) || clean(conceptTitle)
  return fallback ? [{ heading: fallback }] : []
}

export interface CustomerCreativePlanOptions {
  /**
   * STORY-GENERATION fix (2026-07-03): a story sequence must validate as a story sequence,
   * not as a teaching carousel. The old hard-coded "carousel" mode applied carousel-only
   * editorial rules (6+ educational slides, varied backgrounds) to 3/5/7-beat one-world
   * story plans and silently 400'd them. The route passes its format here.
   */
  mode?: "carousel" | "story_sequence"
}

export function buildCustomerCarouselCreativePlan(
  brief: CreativeBrief,
  conceptTitle?: string,
  opts?: CustomerCreativePlanOptions
): CreativePlan {
  const g = brief.graphic
  const topic = carouselTopicFromBrief(brief, conceptTitle)
  const supplied = g?.creativePlan
  const useCase = normalizeUseCase(supplied?.useCase ?? g?.contentType, topic)
  const effectiveSlides = effectiveCarouselSlides(brief, conceptTitle)
  const suppliedOutputs = supplied?.outputs?.length
    ? supplied.outputs
    : effectiveSlides.map((slide, index) => outputFromSlide(slide, index))
  // Graceful backfill: Maya's quick emotional story beats sometimes skip imagePromptDirection
  // (optional in the tool schema). The renderer falls back to visualConcept anyway, so a
  // missing direction must never hard-fail the plan - fill it the same way.
  const outputs = suppliedOutputs.map((output, index) => {
    const title =
      stripStructuralHeading(clean(output.title)) ||
      (opts?.mode === "story_sequence"
        ? fallbackStoryHeading(brief, conceptTitle, index, suppliedOutputs.length)
        : clean(output.title) || `Slide ${index + 1}`)
    return {
      ...output,
      title,
      imagePromptDirection:
        clean(output.imagePromptDirection) || clean(output.visualConcept) || title,
    }
  })
  const vaultStyleReferences = supplied?.vaultStyleReferences?.length
    ? supplied.vaultStyleReferences
    : vaultStyleReferencesFromBrief(brief)
  const outputCount = supplied?.outputCount ?? g?.slideCount ?? outputs.length

  return {
    mode: opts?.mode ?? "carousel",
    userIntent: supplied?.userIntent ? clean(supplied.userIntent) : topic,
    useCase,
    audienceEmotion:
      clean(supplied?.audienceEmotion) || "This feels clear, useful, and possible for me.",
    contentGoal:
      clean(supplied?.contentGoal) ||
      clean(g?.desiredOutcome) ||
      "teach one clear idea and drive a next action",
    visualDirection:
      clean(supplied?.visualDirection) ||
      clean(g?.designDirection) ||
      "luxury editorial SSELFIE carousel",
    vaultStyleReferences,
    inspirationInterpretation: supplied?.inspirationInterpretation,
    referenceHandling: supplied?.referenceHandling ?? {
      identityStrategy: "selfie_identity_anchor",
      inspirationStrategy: "inspiration_style_only",
      notes:
        "Use the user's selfie for identity preservation. Inspiration can guide styling, lighting, color grade, mood, and accessories without overriding the topic.",
    },
    outputCount,
    outputs,
    validationRules: supplied?.validationRules?.length
      ? supplied.validationRules
      : buildDefaultCreativePlanValidationRules({
          mode: opts?.mode ?? "carousel",
          useCase,
          userIntent: supplied?.userIntent ? clean(supplied.userIntent) : topic,
        }),
  }
}

export function validateCustomerCarouselBrief(
  brief: CreativeBrief,
  conceptTitle?: string,
  opts?: CustomerCreativePlanOptions
): string[] {
  const plan = buildCustomerCarouselCreativePlan(brief, conceptTitle, opts)
  const result = validateCreativePlan(plan)
  const errors = [...result.errors]
  const slides = effectiveCarouselSlides(brief, conceptTitle)

  if (plan.outputCount !== slides.length) {
    errors.push(
      `carousel has ${slides.length} slides, but creativePlan.outputCount is ${plan.outputCount}`
    )
  }

  if (
    plan.mode === "carousel" &&
    (plan.useCase === "educational" ||
      plan.useCase === "tutorial" ||
      plan.useCase === "vault_product") &&
    !isShortCreativeRequest(plan.userIntent) &&
    slides.length < 6
  ) {
    errors.push(`educational carousel needs at least 6 slides, got ${slides.length}`)
  }

  if (isFiveStylesRequest(plan.userIntent)) {
    const styleOutputCount = plan.outputs.filter(output =>
      /\b(style|prompt|look|vault)\b/i.test(
        [output.title, output.purpose, output.visualConcept, output.imagePromptDirection].join(" ")
      )
    ).length
    if (styleOutputCount < 5)
      errors.push("five-style carousel must include five distinct style outputs")
  }

  if (
    isVaultRelatedRequest(plan.userIntent, plan.vaultStyleReferences) &&
    plan.vaultStyleReferences.length === 0
  ) {
    errors.push("Vault-related carousel is missing Vault style context")
  }

  return Array.from(new Set(errors))
}

function slideCreativePlan(slide: CarouselSlidePlanLike, output?: CreativePlanOutput): string {
  return [
    "Slide-specific creative plan:",
    output?.purpose || slide.purpose ? `Purpose: ${clean(output?.purpose ?? slide.purpose)}` : "",
    output?.visualConcept || slide.visualConcept
      ? `Visual concept: ${clean(output?.visualConcept ?? slide.visualConcept)}`
      : "",
    output?.imagePromptDirection || slide.imagePromptDirection || slide.imagePrompt
      ? `Image prompt direction: ${clean(output?.imagePromptDirection ?? slide.imagePromptDirection ?? slide.imagePrompt)}`
      : "",
    output?.referenceImageStrategy || slide.referenceImageStrategy
      ? `Reference strategy: ${clean(output?.referenceImageStrategy ?? slide.referenceImageStrategy)}`
      : "",
    output?.textSafeArea || slide.textSafeArea
      ? `Text-safe area: ${clean(output?.textSafeArea ?? slide.textSafeArea)}`
      : "",
    output?.reasonThisMatchesUserIntent || slide.reasonThisMatchesUserIntent || slide.visualReason
      ? `Why this visual fits: ${clean(output?.reasonThisMatchesUserIntent ?? slide.reasonThisMatchesUserIntent ?? slide.visualReason)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n")
}

// ─── MAYA-REBUILD-07 / MAYA-FIX-03: Vault-aligned prompt engine ─────────────────
// Two systems:
//
//   SYSTEM A — Photos (Pinterest Photoshoot Lab): a text-only prompt, selfie is the ONLY
//   image input. Structure: role -> identity lock -> scene -> outfit -> hair -> accessories ->
//   pose -> composition -> mood -> color grading -> image quality -> avoid list.
//
//   SYSTEM B — Carousel / Reel cover / Story: gpt-image-2 is the designer. It renders the final
//   editorial slide, including the exact short text/callouts, in one image-to-image pass. There is
//   no React text-overlay layer after generation.

export interface CompileConceptOptions {
  brandKit?: BrandKit | null
  /** Front-door aesthetic id, used to inject the vision-extracted look (color grade, lighting, film). */
  aestheticId?: string | null
}

/** Deprecated compatibility type; ignored. Graphic text is now baked by the image model. */
export type TextRenderMode = "two_pass" | "one_pass"

/**
 * A single OpenAI call. The input image source:
 * - "selfie": attach the user's selfie(s) (identity) — new-photo generation (images.edit).
 * - "prev": prior generated pass.
 * - "base": legacy only; retired local text overlays no longer call OpenAI.
 */
export interface PromptPass {
  prompt: string
  input: "selfie" | "prev" | "base"
}

/** One final image. Graphic text/callouts are baked into the returned image. */
export interface ImageJob {
  label: string
  passes: PromptPass[]
  textOverlaySpec?: TextOverlaySpec
}

/** The brand palette line shared by every graphic slide (brand kit if present, else Quiet Luxury). */
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

function shotRoleInstruction(role?: ShootShotRole): string {
  switch (role) {
    case "establishing-full-body":
      return "Shot role: establishing full-body. Show the complete outfit, full body, location context, natural proportions, and enough environment to establish the shoot world."
    case "movement-lifestyle-action":
      return "Shot role: movement/lifestyle action. Capture a candid mid-action moment, natural motion, hands doing something believable, not a static pose."
    case "seated-hero":
      return "Shot role: seated hero. A strong seated or leaning hero frame with face clear, outfit visible, and calm confident posture."
    case "profile":
      return "Shot role: profile. Use a true side profile or three-quarter profile angle. Face shape remains recognizable, not front-facing."
    case "close-portrait":
      return "Shot role: close portrait. Crop tighter around face and upper torso, natural skin texture, clear eyes, no plastic retouching."
    case "cover-safe-hero":
      return "Shot role: cover-safe hero. Leave clean negative space for text while keeping face, outfit, and mood strong."
    case "true-detail":
      return "Shot role: true detail. Do NOT show the full face or full body. Focus on hands, fabric, jewelry, coffee, phone, table texture, bag, shoes, or an outfit detail from the same shoot world. It should feel like a real photoshoot cutaway."
    default:
      return ""
  }
}

/** Per-role composition guidance for where the model should integrate slide typography. */
interface RoleLayout {
  /** Negative-space direction baked into the finished slide so text stays legible. */
  space: string
  /** Placement note for the model-rendered text. */
  place: string
}
const HOOK_LAYOUT: RoleLayout = {
  space: "Place the editorial title in clean negative space across the top third.",
  place: "top third",
}
const CTA_LAYOUT: RoleLayout = {
  space: "Place the call-to-action in a calm, uncluttered area in the lower third or center.",
  place: "center or lower third",
}
const VALUE_LAYOUTS: RoleLayout[] = [
  {
    space:
      "She stands off to one side in a wider three-quarter shot, with the message integrated on the opposite side.",
    place: "side negative space",
  },
  {
    space:
      "A candid mid-moment, medium crop, eyes off-camera, with the message integrated across the top.",
    place: "top third",
  },
  {
    space:
      "A quieter seated or leaning moment at a softer angle, with the message integrated in the lower third.",
    place: "lower third",
  },
  {
    space:
      "A profile or over-the-shoulder angle, she sits smaller in the frame, with the message in the largest open area.",
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
 * room for model-rendered graphic text in the final slide.
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
    ? `Composition: shot on ${camera}. ${safeSpace}`
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
    shotRoleInstruction(brief.shotRole),
    clean(brief.pose) ? `Pose: ${clean(brief.pose)}.` : "",
    composition,
    clean(brief.mood) ? `Mood: ${clean(brief.mood)}.` : "",
    gradeLine(opts),
    SSELFIE_PHOTO_STYLE_PROMPT,
    `Lighting: ${lighting}.`,
    SSELFIE_ENVIRONMENT_INTEGRATION,
    CANDID_EDITORIAL,
    REALISM_TOKENS + ".",
    quality,
    AVOID_LIST,
  ]
    .filter(Boolean)
    .join("\n")
}

/** Finished one-slide graphic (Reel cover / Story) with text baked by the image model. */
function compileSingleGraphicPrompt(
  brief: CreativeBrief,
  format: OutputFormat,
  text: { heading: string; body?: string },
  layout: RoleLayout,
  role: "hook" | "value" | "cta",
  textOverlayLayer: boolean,
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
    `Create a finished ${surface} featuring the same woman from the reference image.`,
    IDENTITY_ANCHOR,
    clean(brief.setting) ? `Scene: ${clean(brief.setting)}.` : "",
    clean(brief.outfit) ? `Outfit: ${clean(brief.outfit)}.` : "",
    "Keep her natural hair color, skin texture, age, and body proportions from the reference photo.",
    clean(brief.pose) ? `Pose: ${clean(brief.pose)}.` : "",
    textOverlayLayer
      ? `Leave clean, low-contrast negative space around the ${layout.place} for an app-composited typography layer. Do not render any text, words, letters, captions, labels, logos, or placeholder glyphs.`
      : `Render this exact ${role === "cta" ? "call-to-action" : "editorial headline"} inside the image: "${heading}".`,
    !textOverlayLayer && body ? `Render this exact supporting line too: "${body}".` : "",
    `Composition: ${layout.space} Keep her face, eyes, phone, hands, and strongest outfit details clear.`,
    BRAND_GRAPHIC_STYLE,
    paletteLine(opts?.brandKit),
    SSELFIE_NEUTRAL_PALETTE,
    gradeLine(opts),
    textOverlayLayer
      ? "No readable text anywhere in the image. The app will add typography later."
      : "Render all text spelled exactly as written. No extra words, no placeholder text, no random letters, no logos.",
    REALISM_TOKENS + ".",
    AVOID_LIST,
  ]
    .filter(Boolean)
    .join("\n")
}

// ─── MAYA-REBUILD-16 / CAROUSEL-03-FIX: carousel design systems ────────────────
// A carousel is a mini editorial design system (QA §10 + Sandra's reference grids):
// every customer slide is a real image of her/reference with baked typography.

/** Identity slide (input: selfie) — she appears, with text baked into the finished slide. */
function compileCarouselIdentityPrompt(
  brief: CreativeBrief,
  system: CarouselDesignSystem,
  text: { heading: string; body?: string },
  layout: RoleLayout,
  role: "hook" | "value" | "cta",
  slidePlan: string,
  textOverlayLayer: boolean,
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
    slidePlan,
    textOverlayLayer
      ? "Leave clean, low-contrast negative space for the slide headline. Do not render any text, words, letters, captions, labels, logos, or placeholder glyphs."
      : `Render this exact headline inside the image: "${heading}".`,
    !textOverlayLayer && body ? `Render this exact supporting line too: "${body}".` : "",
    textOverlayLayer
      ? `Text-safe composition: ${layout.space}`
      : `Typography placement: ${layout.space}`,
    system.identityTreatment,
    textOverlayLayer ? system.textFreeSetDna : system.setDna,
    BRAND_GRAPHIC_STYLE,
    clean(brief.mood) ? `Mood: ${clean(brief.mood)}.` : "",
    gradeLine(opts),
    `Lighting: ${lighting}.`,
    CANDID_EDITORIAL,
    REALISM_TOKENS + ".",
    paletteLine(opts?.brandKit),
    textOverlayLayer
      ? `Internal slide role (do not render): ${role}. Keep her face and eyes clear of busy background detail. No readable text anywhere in the image; the app will add typography later.`
      : `Internal slide role (do not render): ${role}. Render only the headline and supporting line text spelled exactly as written. No extra words, no placeholder text, no random letters, no labels, no logos. Keep her face and eyes clear of busy background detail.`,
    CAROUSEL_QUALITY,
    AVOID_LIST,
  ]
    .filter(Boolean)
    .join("\n")
}

function slideKindForRole(
  role: "hook" | "value" | "cta",
  index: number,
  total: number
): CarouselSlide["kind"] {
  if (role === "hook" || index === 0) return "hook"
  if (role === "cta" || index === total - 1) return "cta"
  return "photo"
}

export function buildGraphicRedesignSlides(
  brief: CreativeBrief,
  format: OutputFormat,
  conceptTitle?: string
): CarouselSlide[] {
  const g = brief.graphic

  if (format === "carousel" || format === "story-sequence") {
    const rawSlides = effectiveCarouselSlides(brief, conceptTitle).slice(0, MAX_CAROUSEL_SLIDES)
    const slides =
      rawSlides.length > 0
        ? rawSlides
        : [{ heading: clean(g?.headline) || clean(conceptTitle) || "Slide 1" }]
    const plan = buildCustomerCarouselCreativePlan(brief, conceptTitle)

    return slides.map((slide, index) => {
      const role = resolveRole(slide.role, index, slides.length)
      const planOutput = plan.outputs[index]
      return {
        kind: slideKindForRole(role, index, slides.length),
        title:
          format === "story-sequence"
            ? safeGraphicHeading(
                brief,
                format,
                conceptTitle,
                index,
                slides.length,
                slide.heading,
                planOutput?.title,
                slide.body
              )
            : safeGraphicHeading(
                brief,
                format,
                conceptTitle,
                index,
                slides.length,
                slide.heading,
                planOutput?.title,
                slide.body,
                planOutput?.purpose,
                slide.purpose,
                planOutput?.visualConcept
              ),
        body: clean(slide.body),
        purpose: clean(slide.purpose) || clean(planOutput?.purpose),
        visualConcept: clean(slide.visualConcept) || clean(planOutput?.visualConcept),
        imagePromptDirection:
          clean(slide.imagePromptDirection) ||
          clean(slide.imagePrompt) ||
          clean(planOutput?.imagePromptDirection),
        referenceImageStrategy:
          clean(slide.referenceImageStrategy) || clean(planOutput?.referenceImageStrategy),
        visualReason:
          clean(slide.reasonThisMatchesUserIntent) ||
          clean(slide.visualReason) ||
          clean(planOutput?.reasonThisMatchesUserIntent),
        textSafeArea: clean(slide.textSafeArea) || clean(planOutput?.textSafeArea),
      }
    })
  }

  const planOutput = g?.creativePlan?.outputs?.[0]
  const title =
    safeGraphicHeading(
      brief,
      format,
      conceptTitle,
      0,
      1,
      g?.headline,
      planOutput?.title,
      g?.subline,
      conceptTitle
    ) || (format === "reel-cover" ? "Reel cover" : "Story slide")
  const role = resolveRole(g?.role, 0, 1)
  return [
    {
      kind: role === "cta" ? "cta" : "photo",
      title,
      body: clean(g?.subline),
      purpose:
        clean(planOutput?.purpose) ||
        (format === "reel-cover" ? "make the reel topic instantly clear" : "create one story beat"),
      visualConcept: clean(planOutput?.visualConcept) || clean(brief.pose) || title,
      imagePromptDirection:
        clean(planOutput?.imagePromptDirection) ||
        [brief.setting, brief.outfit, brief.pose, brief.mood].map(clean).filter(Boolean).join(". "),
      referenceImageStrategy: clean(planOutput?.referenceImageStrategy) || "selfie identity anchor",
      visualReason:
        clean(planOutput?.reasonThisMatchesUserIntent) ||
        "The image keeps the user present while the baked text carries the message.",
      textSafeArea: clean(planOutput?.textSafeArea) || "keep headline away from face and UI edges",
    },
  ]
}

/**
 * Compile a brief into the list of image JOBS the generate route runs.
 * - photo: one pass (selfie -> editorial photo).
 * - carousel: a designed SET. Each slide returns a finished PNG with type/callouts baked in.
 * - reel-cover / story-slide: one finished graphic image with type baked in.
 * Carousels stay cohesive (one design system + grade) while each slide varies its visual role.
 */
export function compileConceptJobs(
  brief: CreativeBrief,
  format: OutputFormat,
  opts?: CompileConceptOptions,
  _mode: TextRenderMode = "two_pass"
): ImageJob[] {
  if (format === "photo" || format === "photoshoot") {
    return [
      {
        label: "photo",
        passes: [{ prompt: compilePhotoPrompt(brief, format, opts), input: "selfie" }],
      },
    ]
  }

  if (format === "video") {
    return [
      {
        label: "video",
        passes: [
          {
            prompt:
              clean(brief.graphic?.motionPrompt) ||
              clean(brief.graphic?.creativePlan?.outputs?.[0]?.videoPromptDirection) ||
              "subtle natural movement, gentle camera push-in, preserve identity",
            input: "selfie",
          },
        ],
      },
    ]
  }

  // Graphic formats: build the slide list (carousel = many; cover/story = one).
  const g = brief.graphic
  const textOverlayLayer = isTextOverlayLayerEnabled()
  const rawSlides =
    format === "carousel"
      ? effectiveCarouselSlides(brief).slice(0, MAX_CAROUSEL_SLIDES)
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
    const creativePlan = buildCustomerCarouselCreativePlan(brief)
    let valueIdx = 0
    return slides.map((slide, i) => {
      const role = resolveRole(slide.role, i, total)
      const layout =
        role === "hook"
          ? HOOK_LAYOUT
          : role === "cta"
            ? CTA_LAYOUT
            : VALUE_LAYOUTS[valueIdx % VALUE_LAYOUTS.length]
      if (role === "value") valueIdx++
      const text = { heading: clean(slide.heading), body: clean(slide.body) }
      const label = `slide ${i + 1}/${total} (${role} · identity)`
      const plan = slideCreativePlan(slide as CarouselSlidePlanLike, creativePlan.outputs[i])

      return {
        label,
        textOverlaySpec: textOverlayLayer
          ? makeTextOverlaySpec({
              heading: text.heading,
              body: text.body,
              role,
              format: "carousel",
              designSystem: g?.designSystem,
              overlayStyle: g?.overlayStyle,
              emotion: brief.mood,
            })
          : undefined,
        passes: [
          {
            prompt: compileCarouselIdentityPrompt(
              brief,
              system,
              text,
              layout,
              role,
              plan,
              textOverlayLayer,
              opts
            ),
            input: "selfie" as const,
          },
        ],
      }
    })
  }

  // ── Reel cover / Story slide: single finished image with baked typography. ──
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
    const text = { heading: clean(slide.heading), body: clean(slide.body) }

    return {
      label,
      textOverlaySpec: textOverlayLayer
        ? makeTextOverlaySpec({
            heading: text.heading,
            body: text.body,
            role,
            format:
              format === "reel-cover" || format === "story-slide" || format === "story-sequence"
                ? format
                : "carousel",
            designSystem: g?.designSystem,
            overlayStyle: g?.overlayStyle,
            emotion: brief.mood,
          })
        : undefined,
      passes: [
        {
          prompt: compileSingleGraphicPrompt(
            brief,
            format,
            text,
            layout,
            role,
            textOverlayLayer,
            opts
          ),
          input: "selfie" as const,
        },
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
  // MEASURED 2026-06-10: 2K at high quality takes ~526s per image — past the 300s function
  // ceiling, so 2K must ship as an async "HD export" job, never a synchronous default.
  // (high @ 1024-class: ~191s, fits. medium: ~82s.) Env overrides remain for experiments.
  if (format === "carousel") return process.env.APP_V3_CAROUSEL_SIZE || "1024x1280"
  return process.env.APP_V3_PORTRAIT_SIZE || "1024x1536"
}
