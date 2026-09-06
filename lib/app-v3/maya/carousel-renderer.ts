import sharp from "sharp"
import OpenAI, { toFile } from "openai"
import type { CreativePlanOutput } from "./creative-plan"
import type { TextOverlaySpec } from "@/lib/app-v3/text-overlay"
import { isContentPolicyError, sanitizePromptForImageSafety } from "@/lib/ai/image-safety"

export const CAROUSEL_WIDTH = 1080
export const CAROUSEL_HEIGHT = 1350
export function isCarouselAssetUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    const u = new URL(value)
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}
async function load(url: string): Promise<Buffer> {
  if (!isCarouselAssetUrl(url)) throw new Error("Invalid carousel source image")
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error("Could not load carousel source image")
  return Buffer.from(await response.arrayBuffer())
}
const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Pango wraps real glyphs. Oversized copy fails instead of being clipped or silently shortened. */
async function textLayer(text: string, width: number, font: string, color: string) {
  return sharp({
    text: {
      text: `<span foreground="${escape(color)}">${escape(text.replace(/\*/g, ""))}</span>`,
      font,
      width,
      rgba: true,
      dpi: 72,
      wrap: "word-char",
      spacing: 12,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
}
export async function composeCarouselText(base: Buffer, spec: TextOverlaySpec): Promise<Buffer> {
  const size = spec.size === "l" ? 76 : spec.size === "s" ? 52 : 64
  const card = spec.layout === "notes" || spec.layout === "messages"
  const color = /^#[\da-f]{6}$/i.test(spec.color ?? "") ? spec.color! : card ? "#202020" : "#ffffff"
  const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
  const darkInk = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] < 128
  const family = spec.style === "top-band-minimal" ? "sans" : "serif"
  const title = await textLayer(spec.headline, 900, `${family} ${size}`, color)
  const bodyText = [spec.subline, ...(spec.items ?? []).map(x => `• ${x}`)]
    .filter(Boolean)
    .join("\n")
  const body = bodyText ? await textLayer(bodyText, 900, "sans 36", color) : null
  const blockHeight = title.info.height + (body ? body.info.height + 30 : 0)
  if (blockHeight > (spec.preserveAssets ? 360 : 1050))
    throw new Error("This slide has too much copy. Shorten it or split it into two slides.")
  const top = spec.preserveAssets
    ? 1250 - blockHeight
    : spec.position === "top"
      ? 100
      : spec.position === "center"
        ? Math.round((1350 - blockHeight) / 2)
        : 1250 - blockHeight
  const panel = Buffer.from(
    `<svg width="1080" height="1350"><rect x="50" y="${top - 35}" width="980" height="${blockHeight + 70}" rx="${card ? 36 : 8}" fill="${darkInk ? "#ffffff" : "#000000"}" fill-opacity="${card ? 0.96 : 0.66}"/></svg>`
  )
  const layers: sharp.OverlayOptions[] = [{ input: panel }, { input: title.data, left: 90, top }]
  if (body) layers.push({ input: body.data, left: 90, top: top + title.info.height + 30 })
  return sharp(base)
    .resize(1080, 1350, { fit: "contain", background: "#eeeae4" })
    .composite(layers)
    .png()
    .toBuffer()
}

export function carouselScenePrompt(
  output: CreativePlanOutput,
  visualDirection: string,
  identityCount: number
): string {
  return [
    "Create one 4:5 carousel photographic or visual background. No text, lettering, labels, or invented screenshots.",
    `Member's chosen design direction: ${visualDirection}`,
    `Slide visual: ${output.visualConcept}. ${output.imagePromptDirection ?? ""}`,
    `Leave clear breathing room at ${output.textSafeArea ?? "bottom"} for locally composed text.`,
    identityCount
      ? `All ${identityCount} attached images show the same member. Use every angle to preserve her real face, age, skin texture, hair and proportions. Do not beautify or borrow the selfie background.`
      : "This slide does not need the member's face. Follow the planned detail, object, diagram or backdrop. Do not invent a person or documentary memory.",
    "Keep this composition specific to this slide. Do not default to a laptop portrait. Real uploaded photos and screenshots are placed separately without AI edits.",
  ].join("\n")
}
export async function renderCarouselBackground(args: {
  output: CreativePlanOutput
  visualDirection: string
  identityUrls: string[]
  quality: "low" | "medium" | "high"
  likeness?: string
}): Promise<{ buffer: Buffer; prompt: string }> {
  const { output } = args
  const assets = output.sourceAssets ?? []
  const exact =
    output.referenceImageStrategy === "screenshot_preserve_exact" ||
    output.referenceImageStrategy === "existing_generated_image"
  if (exact && !assets.length)
    throw new Error("This slide needs its original photo or screenshot attached")
  let buffer: Buffer
  let prompt = "Original source preserved with local composition"
  if (exact || output.layout === "statement") {
    buffer = await sharp({
      create: { width: 1080, height: 1350, channels: 3, background: "#eeeae4" },
    })
      .png()
      .toBuffer()
  } else {
    const identity = ["selfie_identity_anchor", "selfie_plus_body_reference"].includes(
      output.referenceImageStrategy
    )
      ? args.identityUrls
      : []
    prompt =
      carouselScenePrompt(output, args.visualDirection, identity.length) +
      (identity.length && args.likeness ? `\n${args.likeness}` : "")
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const files = await Promise.all(
      identity.map(async (url, i) =>
        toFile(
          await sharp(await load(url))
            .rotate()
            .png()
            .toBuffer(),
          `identity-${i}.png`,
          { type: "image/png" }
        )
      )
    )
    const input = {
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      prompt,
      n: 1 as const,
      size: "1024x1536" as const,
      quality: args.quality,
      output_format: "png" as const,
    }
    const run = (p: string) =>
      files.length
        ? client.images.edit({ ...input, prompt: p, image: files })
        : client.images.generate({ ...input, prompt: p })
    let response
    try {
      response = await run(prompt)
    } catch (e) {
      if (!isContentPolicyError(e)) throw e
      prompt = sanitizePromptForImageSafety(prompt)
      response = await run(prompt)
    }
    if (!response.data?.[0]?.b64_json) throw new Error("No carousel image returned")
    buffer = await sharp(Buffer.from(response.data[0].b64_json, "base64"))
      .resize(1080, 1350, { fit: "cover" })
      .png()
      .toBuffer()
  }
  if (assets.length) {
    const count = Math.min(assets.length, 3)
    const width = count === 1 ? 900 : Math.floor(900 / count) - 16
    const layers = await Promise.all(
      assets.slice(0, count).map(async (asset, i) => ({
        input: await sharp(await load(asset.url))
          .rotate()
          .resize(width, 720, { fit: "contain", background: "#eeeae4" })
          .png()
          .toBuffer(),
        left: 90 + i * (width + 16),
        top: 80,
      }))
    )
    buffer = await sharp(buffer).composite(layers).png().toBuffer()
  }
  return { buffer, prompt }
}
