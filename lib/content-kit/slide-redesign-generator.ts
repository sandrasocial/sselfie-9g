import "server-only"

import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { put } from "@vercel/blob"
import { sql } from "@/lib/db/client"
import type { CarouselSlide } from "@/lib/content-kit/types"
import { SSELFIE_INSPIRATION_SET_VARIATION } from "@/lib/app-v3/maya/visual-rules"
import { isContentPolicyError, sanitizePromptForImageSafety } from "@/lib/ai/image-safety"
import { AVOID_LIST, ELEVATION, REALISM_TOKENS } from "@/lib/app-v3/maya/ingredients"

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const CAROUSEL_SIZE = process.env.APP_V3_CAROUSEL_SIZE || "1024x1280"
const STORY_SIZE = process.env.APP_V3_PORTRAIT_SIZE || "1024x1536"
const INTERNAL_VISIBLE_LABELS = new Set([
  "hook",
  "value",
  "cta",
  "reel cover",
  "reel-cover",
  "story",
  "story slide",
  "photo",
])

export type StyleReferenceCategory =
  | "tutorial"
  | "photoshoot-carousel"
  | "story-sequence"
  | "reel-cover"
export type RedesignReferenceMode = "preserve-frame" | "identity-scene"
export type SlideTextMode = "baked" | "clean-background"

type StyleReference = {
  imageUrl: string
  label: string | null
}

async function readImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not read reference image: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function toPng(url: string): Promise<Buffer> {
  return sharp(await readImage(url))
    .rotate()
    .png()
    .toBuffer()
}

export async function pickContentStyleReference(
  category: StyleReferenceCategory,
  fallbackCategory?: StyleReferenceCategory
): Promise<StyleReference | null> {
  const rows = (await sql`
    SELECT image_url, label
    FROM content_style_references
    WHERE category = ${category}
    ORDER BY random()
    LIMIT 1
  `) as Array<{ image_url: string; label: string | null }>

  const row = rows[0]
  if (!row && fallbackCategory) return pickContentStyleReference(fallbackCategory)
  return row ? { imageUrl: row.image_url, label: row.label } : null
}

function slideText(slide: CarouselSlide): string {
  const eyebrow = slide.eyebrow?.trim()
  const shouldRenderEyebrow =
    eyebrow && !INTERNAL_VISIBLE_LABELS.has(eyebrow.toLowerCase().replace(/\s+/g, " "))
  const parts = [
    shouldRenderEyebrow ? `Small label: "${eyebrow}"` : "",
    slide.title ? `Main headline: "${slide.title}"` : "",
    slide.body ? `Supporting line: "${slide.body}"` : "",
    slide.items?.length ? `List items: ${slide.items.map(item => `"${item}"`).join(", ")}` : "",
    slide.kind === "step" && slide.stepNumber
      ? `Step number: "${String(slide.stepNumber).padStart(2, "0")}"`
      : "",
  ]
  return parts.filter(Boolean).join("\n")
}

function slidePlan(slide: CarouselSlide): string {
  const parts = [
    slide.purpose ? `Slide purpose: ${slide.purpose}` : "",
    slide.visualConcept ? `Visual concept: ${slide.visualConcept}` : "",
    slide.imagePromptDirection ? `Image direction: ${slide.imagePromptDirection}` : "",
    slide.referenceImageStrategy ? `Reference strategy: ${slide.referenceImageStrategy}` : "",
    slide.visualReason ? `Why this visual matches: ${slide.visualReason}` : "",
    slide.textSafeArea ? `Text-safe area: ${slide.textSafeArea}` : "",
  ]
  return parts.filter(Boolean).join("\n")
}

export function buildContentSlideRedesignPrompt({
  slide,
  category,
  topic,
  styleLabel,
  referenceMode,
  hasInspirationReference,
  textMode = "baked",
  slideIndex,
  totalSlides,
}: {
  slide: CarouselSlide
  category: StyleReferenceCategory
  topic: string
  styleLabel?: string | null
  referenceMode?: RedesignReferenceMode
  hasInspirationReference?: boolean
  textMode?: SlideTextMode
  /** Position in a multi-slide set (0-based). Used for story-sequence beat framing. */
  slideIndex?: number
  totalSlides?: number
}) {
  const cleanBackground = textMode === "clean-background"
  // 2026-07-06 audit fix: "identity-scene" is the only mode that actually BUILDS a new scene
  // (preserve-frame/story-sequence/tutorial modes preserve an existing photo untouched) - so
  // this is the one mode that was missing the quality/lighting/makeup anchors every from-scratch
  // photo prompt gets elsewhere in the app (photo, photoshoot). Scoped here, not applied globally,
  // so it never contradicts a "preserve exactly" instruction.
  const isNewScene = referenceMode === "identity-scene"
  const preserveFirstReference =
    referenceMode === "preserve-frame" ||
    (category === "story-sequence" && referenceMode !== "identity-scene")
  const identityScenePolish = isNewScene
    ? `Lighting: natural, directional, editorial light - soft window light or golden-hour warmth. Avoid flat on-camera flash or harsh overhead light.\n${ELEVATION}\n${REALISM_TOKENS}.\n${AVOID_LIST}`
    : ""
  // Reel-cover has one job a carousel/story slide doesn't: hold space for a headline overlay.
  const reelCoverShotFraming =
    category === "reel-cover" && isNewScene
      ? "Shot: frame her as the cover-safe hero. Confident, anchoring presence, clear of clutter, with clean negative space reserved at the top or center for a headline overlay."
      : ""
  // Beat-position framing for a generated (not preserved-photo) story-sequence slide: without
  // this, every identity-scene slide in the set defaults to the same shot distance and mood.
  const storyBeatFraming =
    category === "story-sequence" && isNewScene && typeof slideIndex === "number" && typeof totalSlides === "number" && totalSlides > 1
      ? slideIndex === 0
        ? `This is the opening frame of a ${totalSlides}-slide story sequence: establish the moment with a slightly wider, settling-in framing.`
        : slideIndex === totalSlides - 1
          ? `This is the closing frame of the sequence: warmer, closer, more intimate framing than the opening.`
          : `This is a middle frame (${slideIndex + 1} of ${totalSlides}) in the sequence: keep pace and energy consistent with the frames around it.`
      : ""
  const tutorialGrounding =
    referenceMode === "identity-scene"
      ? "The FIRST reference image is the identity reference. Preserve the person's face, age, skin texture, hair, body proportions and recognizable energy. Do not copy a plain selfie background unless the slide explicitly asks for it. Build a new slide-specific editorial scene from the visual concept and image direction."
      : category === "story-sequence"
      ? "The FIRST reference image is the exact story background photo. Preserve the original photo exactly. Do not change the person's identity, face, body, outfit, pose, lighting, background, colors, composition, skin texture, or natural details. Do not retouch, beautify, smooth skin, reshape the body, alter the face, change the outfit, change the room, or make the image look AI-generated. This is an overlay-only design: only add text, small labels, simple arrows, subtle borders, minimal editorial layout details, or light hand-drawn accents."
      : category === "tutorial"
        ? "The FIRST reference image is the real reel frame. Preserve its meaning exactly: if it is a phone camera screenshot, keep the UI values, controls, settings labels, sliders and visual instruction truthful. You may restage it as a phone screen inside an editorial scene, but do not invent different settings or change the teaching point."
        : referenceMode === "preserve-frame"
          ? "The FIRST reference image is the EXACT background photo for this slide. Keep it as the background, unchanged: do not replace it, regenerate it, restage it, recolor it, crop it differently, or swap in a different scene, person, outfit, or location. Preserve its subject, composition, colors, lighting and mood exactly. Add only the editorial text, highlight boxes, and hand-drawn accents on top, placed in the photo's clean negative space, never covering the face or main subject."
          : "The FIRST reference image is the visual base. Preserve the important subject, identity cues, mood and meaning while redesigning the slide."
  const inspirationGrounding = hasInspirationReference
    ? `The THIRD reference image is the inspiration image. Keep the same visual world from that reference while this slide's pose, angle, crop, or text-safe area may vary. For carousel, reel-cover, and story-sequence graphics, poses and angles can vary by slide role, but the image must keep the same visual world: wardrobe energy, material texture, lighting direction, shadow language, color grade, mood, background simplicity, lens feel, and editorial styling. If the slide plan conflicts with the inspiration reference, the inspiration reference wins for visual world and visible props.\n${SSELFIE_INSPIRATION_SET_VARIATION}`
    : ""
  const styleReferenceGuidance = cleanBackground
    ? "Use the SECOND reference image for the premium editorial visual world only: restrained cool monochrome palette, generous negative space, calm Scandinavian spacing, subtle film grain, soft shadows, and tasteful minimal accents. Do NOT copy or render any typography from the reference image."
    : category === "story-sequence"
      ? isNewScene
        ? "Use the SECOND reference image for typography, spacing, hierarchy, and neutral editorial overlay taste only. Do not use it to override the person's identity or the slide-specific scene."
        : "Use the SECOND reference image for typography, spacing, hierarchy, and neutral editorial overlay taste only. Do not use it to alter the first photo."
      : "Match the SECOND reference image's style as closely as possible: premium editorial quiet-luxury magazine design, elegant high-contrast serif headlines with tasteful italics for emphasis, clean sans-serif supporting text, a restrained cool monochrome palette (charcoal, smoke gray, cream white, near-black), generous negative space, calm Scandinavian spacing, and the same kind of subtle hand-drawn accents, highlight boxes behind key phrases, and small handwritten notes shown in that reference. Integrate the text into the scene, never pasted on a card. Never a white lesson card, never a flat Canva template, no emojis, no gradients, no neon, no bright red or green callouts."
  const firstReferenceRule = preserveFirstReference
    ? cleanBackground
      ? "Preserve the FIRST reference photo exactly as the background. Do not regenerate, replace, restage, recolor, crop, or change its scene, person, outfit, lighting, or composition."
      : "Preserve the FIRST reference photo exactly as the background. Do not regenerate, replace, restage, recolor, crop, or change its scene, person, outfit, lighting, or composition. Only add the text and accents on top."
    : isNewScene
      ? "Use the FIRST reference image for identity only: keep the same recognizable person while creating a new editorial scene for this slide."
      : "Keep the original reference frame recognizable and useful."

  return `Create one finished SSELFIE editorial slide.

Content type: ${category}
Topic: ${topic}
Internal slide kind (do not render): ${slide.kind}
Style anchor: ${styleLabel || "approved SSELFIE reference"}

${tutorialGrounding}

${identityScenePolish}

${reelCoverShotFraming}

${storyBeatFraming}

${styleReferenceGuidance}

${inspirationGrounding}

${cleanBackground ? "Create a clean text-free background image. Leave the planned text-safe area calm and low-contrast for an app-composited typography layer, but render NO readable words, letters, captions, labels, numbers, UI text, logos, or placeholder type." : `Render the slide text inside the image, integrated into the scene:\n${slideText(slide)}`}

Slide-specific creative plan:
${slidePlan(slide) || (referenceMode === "preserve-frame" ? "Keep the provided photo as the background exactly. The headline and supporting text carry the message; do not generate or substitute a new scene to illustrate the copy." : "Use the slide title/body as the creative direction, and make the image meaning match the copy.")}

Rules:
- ${cleanBackground ? "Do not render any text at all. No words, letters, numbers, captions, labels, fake UI text, logos, watermarks, or placeholder glyphs." : 'Render only the text listed under "Render the slide text inside the image" and spell it exactly as written.'}
- Do not render internal labels such as hook, value, cta, reel cover, story, slide kind, or content type.
- No extra words, placeholder letters, random UI labels, logos, emoji, green checks, neon, bright red, chunky social captions, or black-outlined text.
- ${firstReferenceRule}
- ${category === "story-sequence" ? "Place the text in clean negative space. Do not cover the face, eyes, phone, hands, or strongest visual details. If text needs more contrast, add only a very subtle transparent dark or cream overlay behind the text area, not over the face or main subject." : "If a tutorial needs emphasis, use scale, spacing, thin rules, underlines, or neutral contrast instead of colored warning callouts."}
- Keep the slide full-bleed and finished. No separate card, no border, no post mockup.
- Create the final slide in high resolution 2K quality, vertical 9:16 Instagram Story format, crisp and clean${cleanBackground ? ", with a calm empty text zone." : ", with readable text."}`
}

export async function redesignContentSlide({
  referenceUrl,
  styleReferenceUrl,
  styleLabel,
  category,
  topic,
  slide,
  referenceMode,
  inspirationReferenceUrl,
  quality,
  textMode,
}: {
  referenceUrl: string
  styleReferenceUrl: string
  inspirationReferenceUrl?: string
  styleLabel?: string | null
  category: StyleReferenceCategory
  topic: string
  slide: CarouselSlide
  referenceMode?: RedesignReferenceMode
  quality?: "low" | "medium" | "high"
  textMode?: SlideTextMode
}): Promise<string> {
  const { buffer } = await redesignContentSlideToBuffer({
    referenceUrl,
    styleReferenceUrl,
    inspirationReferenceUrl,
    quality,
    textMode,
    styleLabel,
    category,
    topic,
    slide,
    referenceMode,
  })

  const blob = await put(
    `content-kit/styled-slides/${Date.now()}-${Math.floor(Math.random() * 1e6)}.png`,
    buffer,
    {
      access: "public",
      contentType: "image/png",
    }
  )
  return blob.url
}

export async function redesignContentSlideToBuffer({
  referenceUrl,
  styleReferenceUrl,
  styleLabel,
  category,
  topic,
  slide,
  referenceMode,
  inspirationReferenceUrl,
  quality = "high",
  size,
  textMode = "baked",
  extraIdentityInstruction,
  slideIndex,
  totalSlides,
}: {
  referenceUrl: string
  styleReferenceUrl: string
  inspirationReferenceUrl?: string
  styleLabel?: string | null
  category: StyleReferenceCategory
  topic: string
  slide: CarouselSlide
  referenceMode?: RedesignReferenceMode
  // Suite passes "medium" for cost control; admin content defaults to "high".
  quality?: "low" | "medium" | "high"
  // Override the output size (e.g. a 9:16 story sequence reusing the carousel pipeline).
  size?: string
  textMode?: SlideTextMode
  // LIKENESS-MEMORY-01: the member's stored accuracy corrections, appended after the
  // built prompt so /app slides honor them too. Admin content-kit callers leave this unset.
  extraIdentityInstruction?: string
  /** Position in a multi-slide set (0-based). Used for story-sequence beat framing. */
  slideIndex?: number
  totalSlides?: number
}): Promise<{ buffer: Buffer; prompt: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")

  const openai = new OpenAI({ apiKey })
  const files = [
    await toFile(await toPng(referenceUrl), "identity-reference.png", { type: "image/png" }),
    await toFile(await toPng(styleReferenceUrl), "style-anchor.png", { type: "image/png" }),
    ...(inspirationReferenceUrl
      ? [
          await toFile(await toPng(inspirationReferenceUrl), "inspiration-reference.png", {
            type: "image/png",
          }),
        ]
      : []),
  ]
  const editInput: Record<string, unknown> = {
    model: OPENAI_IMAGE_MODEL,
    image: files,
    prompt: [
      buildContentSlideRedesignPrompt({
        slide,
        category,
        topic,
        styleLabel,
        referenceMode,
        hasInspirationReference: Boolean(inspirationReferenceUrl),
        textMode,
        slideIndex,
        totalSlides,
      }),
      extraIdentityInstruction?.trim() || "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    n: 1,
    size: size ?? (category === "story-sequence" ? STORY_SIZE : CAROUSEL_SIZE),
    quality,
    output_format: "png",
    // See lib/ai/image-safety.ts - less-restrictive-but-still-safe filtering for our own
    // always-tasteful editorial prompts.
    moderation: "low",
  }
  if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

  // 2026-07-05 fix: this call previously had NO moderation retry at all - a content-policy
  // rejection here (the path behind story-sequence/carousel/reel-cover slides) went straight to
  // the caller's generic "even after I softened it" message even though no softening had ever
  // been attempted. Real incident: two story-sequence rejections (safety_violations=[sexual])
  // on otherwise-tasteful personal-story content, with the softening claim false both times.
  let response
  let finalPrompt = String(editInput.prompt)
  try {
    response = await openai.images.edit(editInput as any)
  } catch (firstError) {
    if (!isContentPolicyError(firstError)) throw firstError
    finalPrompt = sanitizePromptForImageSafety(finalPrompt)
    try {
      response = await openai.images.edit({ ...editInput, prompt: finalPrompt } as any)
    } catch (secondError) {
      // Both attempts were rejected. Prior to this, the raw OpenAI error (no prompt text) was
      // all the analytics event downstream could log - undiagnosable without guessing. Prepend
      // a truncated copy of what we actually sent so a repeat incident is traceable.
      const detail = secondError instanceof Error ? secondError.message : String(secondError)
      throw new Error(
        `${detail} | softened prompt sent: ${finalPrompt.slice(0, 400)}`
      )
    }
  }
  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error("No image data returned from OpenAI")

  return {
    buffer: Buffer.from(b64, "base64"),
    prompt: finalPrompt,
  }
}
