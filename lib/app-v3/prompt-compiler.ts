// SSELFIE Studio 3.0 — prompt compiler.
// Turns {aesthetic, output format, editorial intent} into OpenAI prompt(s). One prompt for
// a single image; one prompt per slide for a carousel. CAROUSEL-03: graphic formats return
// finished, image-model-designed slides with text baked into the pixels. Pure + unit-testable.

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
import {
  resolveDesignSystem,
  defaultSlideVisual,
  type CarouselDesignSystem,
  type SlideVisual,
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

export const MAX_CAROUSEL_SLIDES = 9

const BRAND_PHOTO_STYLE =
  "Editorial brand photograph. Keep the person's face and likeness from the reference image accurate and natural. " +
  "Soft, flattering light, refined styling, calm composition, premium magazine quality. Natural skin texture, not plastic. " +
  "No added text, no logos, no graphic overlays."

const BRAND_GRAPHIC_STYLE =
  "Premium SSELFIE editorial slide: calm, spacious, high-end magazine feel. Neutral palette, " +
  "generous negative space, refined composition, elegant serif display type, clean supporting type, " +
  "muted oxblood accents where useful. No emojis, no clip-art, no gradients, no clutter, no white lesson card."

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

function outputFromSlide(slide: CarouselSlidePlanLike, index: number): CreativePlanOutput {
  const title = clean(slide.heading) || `Slide ${index + 1}`
  const visualConcept = clean(slide.visualConcept) || clean(slide.detailSubject) || title
  const imagePromptDirection =
    clean(slide.imagePromptDirection) ||
    clean(slide.imagePrompt) ||
    clean(slide.visualConcept) ||
    clean(slide.detailSubject) ||
    title

  return {
    title,
    purpose: clean(slide.purpose) || (index === 0 ? "open the carousel" : "continue the carousel story"),
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

export function buildCustomerCarouselCreativePlan(
  brief: CreativeBrief,
  conceptTitle?: string
): CreativePlan {
  const g = brief.graphic
  const topic = carouselTopicFromBrief(brief, conceptTitle)
  const supplied = g?.creativePlan
  const useCase = normalizeUseCase(supplied?.useCase ?? g?.contentType, topic)
  const outputs =
    supplied && supplied.outputs.length === (g?.slides?.length ?? -1)
      ? supplied.outputs
      : (g?.slides ?? []).map((slide, index) => outputFromSlide(slide, index))
  const vaultStyleReferences = supplied?.vaultStyleReferences?.length
    ? supplied.vaultStyleReferences
    : vaultStyleReferencesFromBrief(brief)
  const outputCount = supplied?.outputCount ?? g?.slideCount ?? outputs.length

  return {
    mode: "carousel",
    userIntent: supplied?.userIntent ? clean(supplied.userIntent) : topic,
    useCase,
    audienceEmotion: clean(supplied?.audienceEmotion) || "This feels clear, useful, and possible for me.",
    contentGoal:
      clean(supplied?.contentGoal) || clean(g?.desiredOutcome) || "teach one clear idea and drive a next action",
    visualDirection:
      clean(supplied?.visualDirection) || clean(g?.designDirection) || "luxury editorial SSELFIE carousel",
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
    validationRules:
      supplied?.validationRules?.length
        ? supplied.validationRules
        : buildDefaultCreativePlanValidationRules({
            mode: "carousel",
            useCase,
            userIntent: supplied?.userIntent ? clean(supplied.userIntent) : topic,
          }),
  }
}

export function validateCustomerCarouselBrief(
  brief: CreativeBrief,
  conceptTitle?: string
): string[] {
  const plan = buildCustomerCarouselCreativePlan(brief, conceptTitle)
  const result = validateCreativePlan(plan)
  const errors = [...result.errors]

  if (plan.outputCount !== brief.graphic?.slides?.length) {
    errors.push(`carousel has ${brief.graphic?.slides?.length ?? 0} slides, but creativePlan.outputCount is ${plan.outputCount}`)
  }

  if (
    plan.mode === "carousel" &&
    (plan.useCase === "educational" || plan.useCase === "tutorial" || plan.useCase === "vault_product") &&
    !isShortCreativeRequest(plan.userIntent) &&
    (brief.graphic?.slides?.length ?? 0) < 6
  ) {
    errors.push(`educational carousel needs at least 6 slides, got ${brief.graphic?.slides?.length ?? 0}`)
  }

  if (isFiveStylesRequest(plan.userIntent)) {
    const styleOutputCount = plan.outputs.filter(output =>
      /\b(style|prompt|look|vault)\b/i.test(
        [output.title, output.purpose, output.visualConcept, output.imagePromptDirection].join(" ")
      )
    ).length
    if (styleOutputCount < 5) errors.push("five-style carousel must include five distinct style outputs")
  }

  if (isVaultRelatedRequest(plan.userIntent, plan.vaultStyleReferences) && plan.vaultStyleReferences.length === 0) {
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
 * - "none": NO image input — pure generation. Avoid for CAROUSEL-03 graphic slides unless a
 *   future workflow has no grounded reference at all.
 */
export interface PromptPass {
  prompt: string
  input: "selfie" | "prev" | "base" | "none"
}

/** One final image. Graphic text/callouts are baked into the returned image. */
export interface ImageJob {
  label: string
  passes: PromptPass[]
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

/** Finished one-slide graphic (Reel cover / Story) with text baked by the image model. */
function compileSingleGraphicPrompt(
  brief: CreativeBrief,
  format: OutputFormat,
  text: { heading: string; body?: string },
  layout: RoleLayout,
  role: "hook" | "value" | "cta",
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
    `Render this exact ${role === "cta" ? "call-to-action" : "editorial headline"} inside the image: "${heading}".`,
    body ? `Render this exact supporting line too: "${body}".` : "",
    `Text placement: ${layout.space} Keep it readable and calm around the ${layout.place}. Do not cover her face, eyes, phone, hands, or strongest outfit details.`,
    BRAND_GRAPHIC_STYLE,
    paletteLine(opts?.brandKit),
    gradeLine(opts),
    "Render all text spelled exactly as written. No extra words, no placeholder text, no random letters, no logos.",
    REALISM_TOKENS + ".",
    AVOID_LIST,
  ]
    .filter(Boolean)
    .join("\n")
}

// ─── MAYA-REBUILD-16: carousel design systems (per-slide visual roles) ─────────
// A carousel is a mini editorial design system (QA §10 + Sandra's reference grids):
// identity, detail, and text-first slides all share one palette, type system, and
// decoration language while staying grounded in the user's selfie.

/** Identity slide (input: selfie) — she appears, with text baked into the finished slide. */
function compileCarouselIdentityPrompt(
  brief: CreativeBrief,
  system: CarouselDesignSystem,
  text: { heading: string; body?: string },
  layout: RoleLayout,
  role: "hook" | "value" | "cta",
  slidePlan: string,
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
    `Render this exact headline inside the image: "${heading}".`,
    body ? `Render this exact supporting line too: "${body}".` : "",
    `Typography placement: ${layout.space}`,
    system.identityTreatment,
    system.setDna,
    clean(brief.mood) ? `Mood: ${clean(brief.mood)}.` : "",
    gradeLine(opts),
    `Lighting: ${lighting}.`,
    CANDID_EDITORIAL,
    REALISM_TOKENS + ".",
    paletteLine(opts?.brandKit),
    `Finished slide role: ${role}. Render all text spelled exactly as written. No extra words, no placeholder text, no random letters, no logos. Keep her face and eyes clear of busy background detail.`,
    CAROUSEL_QUALITY,
    AVOID_LIST,
  ]
    .filter(Boolean)
    .join("\n")
}

/** Detail slide: a finished object/world slide with text baked by the model. */
function compileCarouselDetailPrompt(
  brief: CreativeBrief,
  system: CarouselDesignSystem,
  text: { heading: string; body?: string },
  subject: string | undefined,
  slidePlan: string,
  opts?: CompileConceptOptions
): string {
  const heading = clean(text.heading)
  const body = clean(text.body)
  const resolvedSubject =
    clean(subject) ||
    `a beautiful real-life detail that belongs to this scene (a coffee cup, a notebook and pen, a phone on the table, fabric, or an interior corner): ${clean(brief.setting)}`
  return [
    "Create a finished premium editorial scene/detail slide for an Instagram carousel (4:5), using the same woman from the reference image when it feels natural to the slide.",
    IDENTITY_ANCHOR,
    // SUITE-UX-02: the image must express the slide's message, not just the set's scenery —
    // this line is what keeps the photograph and the copy telling the same story.
    `This slide's message: "${heading}".${body ? ` Supporting line: "${body}".` : ""} Compose and style the photograph so it visually expresses that message.`,
    `Subject: ${resolvedSubject}.`,
    `It belongs to the same world as the rest of the set: ${clean(brief.setting)}. Mood: ${clean(brief.mood)}.`,
    slidePlan,
    system.detailTreatment,
    system.setDna,
    gradeLine(opts),
    paletteLine(opts?.brandKit),
    `Render this exact headline inside the image: "${heading}".`,
    body ? `Render this exact supporting line too: "${body}".` : "",
    "Render all text spelled exactly as written. No extra words, no placeholder text, no random letters, no logos.",
    "Real textures and believable light, like a beautiful phone photo, never stock-photo gloss or CGI.",
    CAROUSEL_QUALITY,
  ]
    .filter(Boolean)
    .join("\n")
}

/** Text-led slide: the model designs the full typographic slide. */
function compileCarouselTextPrompt(
  brief: CreativeBrief,
  system: CarouselDesignSystem,
  text: { heading: string; body?: string },
  role: "hook" | "value" | "cta",
  slidePlan: string,
  opts?: CompileConceptOptions
): string {
  const heading = clean(text.heading)
  const body = clean(text.body)
  return [
    "Create a finished premium editorial typographic slide for an Instagram carousel (4:5). It may include the same woman from the reference image as a subtle editorial cutout, silhouette, or photo moment when that makes the slide feel more personal.",
    IDENTITY_ANCHOR,
    `Render this exact ${role} headline inside the image: "${heading}".`,
    body ? `Render this exact supporting line too: "${body}".` : "",
    slidePlan,
    system.textOnlyTreatment,
    system.setDna,
    paletteLine(opts?.brandKit),
    "Generous quiet spacing, premium print texture, editorial typography, no white lesson card.",
    "Render all text spelled exactly as written. No extra words, no placeholder text, no random letters, no logos.",
  ]
    .filter(Boolean)
    .join("\n")
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
      const valueIndex = role === "value" ? valueIdx++ : 0
      // Maya tags the visual; untagged slides get the photoshoot-first default mix.
      const visual: SlideVisual =
        (slide as { visual?: SlideVisual }).visual ?? defaultSlideVisual(role, valueIndex)
      const text = { heading: clean(slide.heading), body: clean(slide.body) }
      const label = `slide ${i + 1}/${total} (${role} · ${visual})`
      const plan = slideCreativePlan(slide as CarouselSlidePlanLike, creativePlan.outputs[i])

      if (visual === "identity") {
        return {
          label,
          passes: [
            {
              prompt: compileCarouselIdentityPrompt(brief, system, text, layout, role, plan, opts),
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
              prompt: compileCarouselDetailPrompt(brief, system, text, subject, plan, opts),
              input: "selfie" as const,
            },
          ],
        }
      }
      return {
        label,
        passes: [
          {
            prompt: compileCarouselTextPrompt(brief, system, text, role, plan, opts),
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

    return {
      label,
      passes: [
        {
          prompt: compileSingleGraphicPrompt(
            brief,
            format,
            { heading: clean(slide.heading), body: clean(slide.body) },
            layout,
            role,
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
        `${BRAND_GRAPHIC_STYLE} Render this exact headline inside the image: "${headline}".` +
        (subline ? ` Render this exact supporting line too: "${subline}".` : "") +
        " Render all text spelled exactly as written." +
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
          : `Carousel slide ${i + 1} of ${safeSlides.length}, designed around the person from the reference image when it feels natural. `
        return (
          `${base}${cohesion} Render this exact heading inside the image: "${clean(slide.heading)}".` +
          (slide.body ? ` Render this exact body line too: "${clean(slide.body)}".` : "") +
          " Render all text spelled exactly as written."
        )
      })
      // Square keeps text safe from cropping (per product decision); covers stay vertical-friendly via layout.
      return { prompts, size: "1024x1024" }
    }
  }
}
