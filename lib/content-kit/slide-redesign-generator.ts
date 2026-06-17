import "server-only"

import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { put } from "@vercel/blob"
import { sql } from "@/lib/db/client"
import type { CarouselSlide } from "@/lib/content-kit/types"

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const CAROUSEL_SIZE = process.env.APP_V3_CAROUSEL_SIZE || "1024x1280"
const STORY_SIZE = process.env.APP_V3_PORTRAIT_SIZE || "1024x1536"

export type StyleReferenceCategory = "tutorial" | "photoshoot-carousel" | "story-sequence"
export type RedesignReferenceMode = "preserve-frame" | "identity-scene"

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
  category: StyleReferenceCategory
): Promise<StyleReference | null> {
  const rows = (await sql`
    SELECT image_url, label
    FROM content_style_references
    WHERE category = ${category}
    ORDER BY random()
    LIMIT 1
  `) as Array<{ image_url: string; label: string | null }>

  const row = rows[0]
  return row ? { imageUrl: row.image_url, label: row.label } : null
}

function slideText(slide: CarouselSlide): string {
  const parts = [
    slide.eyebrow ? `Small label: "${slide.eyebrow}"` : "",
    slide.title ? `Main headline: "${slide.title}"` : "",
    slide.body ? `Supporting line: "${slide.body}"` : "",
    slide.items?.length ? `List items: ${slide.items.map(item => `"${item}"`).join(", ")}` : "",
    slide.stepNumber ? `Step number: "${String(slide.stepNumber).padStart(2, "0")}"` : "",
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

function promptForSlide({
  slide,
  category,
  topic,
  styleLabel,
  referenceMode,
}: {
  slide: CarouselSlide
  category: StyleReferenceCategory
  topic: string
  styleLabel?: string | null
  referenceMode?: RedesignReferenceMode
}) {
  const tutorialGrounding =
    category === "tutorial"
      ? "The FIRST reference image is the real reel frame. Preserve its meaning exactly: if it is a phone camera screenshot, keep the UI values, controls, settings labels, sliders and visual instruction truthful. You may restage it as a phone screen inside an editorial scene, but do not invent different settings or change the teaching point."
      : referenceMode === "identity-scene"
        ? "The FIRST reference image is the identity reference. Preserve the person's face, age, skin texture, hair, body proportions and recognizable energy. Do not copy a plain selfie background unless the slide explicitly asks for it. Build a new slide-specific editorial scene from the visual concept and image direction."
      : "The FIRST reference image is the visual base. Preserve the important subject, identity cues, mood and meaning while redesigning the slide."

  return `Create one finished SSELFIE editorial slide.

Content type: ${category}
Topic: ${topic}
Slide kind: ${slide.kind}
Style anchor: ${styleLabel || "approved SSELFIE reference"}

${tutorialGrounding}

Match the SECOND reference image's style: premium editorial, quiet luxury, elegant serif typography, clean supporting type, muted oxblood accent (#6E2A35), warm neutral palette, calm Scandinavian spacing. Never a white lesson card, never a flat Canva template.

Render the slide text inside the image, integrated into the scene:
${slideText(slide)}

Slide-specific creative plan:
${slidePlan(slide) || "Use the slide title/body as the creative direction, and make the image meaning match the copy."}

Rules:
- Render all text spelled exactly as written.
- No extra words, placeholder letters, random UI labels, logos, emoji, green checks, neon, bright red, chunky social captions, or black-outlined text.
- Keep the original reference frame recognizable and useful.
- Keep the slide full-bleed and finished. No separate card, no border, no post mockup.
- Use subtle burgundy callouts only where they clarify the tutorial.`
}

export async function redesignContentSlide({
  referenceUrl,
  styleReferenceUrl,
  styleLabel,
  category,
  topic,
  slide,
  referenceMode,
}: {
  referenceUrl: string
  styleReferenceUrl: string
  styleLabel?: string | null
  category: StyleReferenceCategory
  topic: string
  slide: CarouselSlide
  referenceMode?: RedesignReferenceMode
}): Promise<string> {
  const { buffer } = await redesignContentSlideToBuffer({
    referenceUrl,
    styleReferenceUrl,
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
}: {
  referenceUrl: string
  styleReferenceUrl: string
  styleLabel?: string | null
  category: StyleReferenceCategory
  topic: string
  slide: CarouselSlide
  referenceMode?: RedesignReferenceMode
}): Promise<{ buffer: Buffer; prompt: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")

  const openai = new OpenAI({ apiKey })
  const files = [
    await toFile(await toPng(referenceUrl), "reference-frame.png", { type: "image/png" }),
    await toFile(await toPng(styleReferenceUrl), "style-anchor.png", { type: "image/png" }),
  ]
  const editInput: Record<string, unknown> = {
    model: OPENAI_IMAGE_MODEL,
    image: files,
    prompt: promptForSlide({ slide, category, topic, styleLabel, referenceMode }),
    n: 1,
    size: category === "story-sequence" ? STORY_SIZE : CAROUSEL_SIZE,
    quality: "high",
    output_format: "png",
  }
  if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

  const response = await openai.images.edit(editInput as any)
  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error("No image data returned from OpenAI")

  return {
    buffer: Buffer.from(b64, "base64"),
    prompt: String(editInput.prompt),
  }
}
