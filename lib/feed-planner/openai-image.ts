// Feed Planner image engine (2026-07-07). The calendar grid now generates with the same
// flagship model as Maya chat: gpt-image-2 via OpenAI (env-switchable through
// OPENAI_IMAGE_MODEL, same contract as app-v3). Nano Banana Pro / Replicate Flux remain in
// the repo only for the legacy Classic (trained-model) opt-in and emergency rollback.

import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { normalizeInspirationImageUrl } from "@/lib/feed-planner/visual-direction"

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"

// Sandra's 2026-06-22 cost lock: images render at MEDIUM (~$0.05 vs ~$0.19 at high per
// portrait) unless APP_V3_IMAGE_QUALITY overrides - same dial as the chat engine. Without
// an explicit value OpenAI defaults to auto (usually high), silently 3-4x-ing image spend.
const IMAGE_QUALITY = ((): "low" | "medium" | "high" => {
  const q = process.env.APP_V3_IMAGE_QUALITY
  return q === "low" || q === "medium" || q === "high" ? q : "medium"
})()

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")
  return new OpenAI({ apiKey })
}

// Same normalization as the app-v3 chat route: members' avatar uploads can be HEIC-derived,
// EXIF-rotated, alpha, or oversized - OpenAI's edit endpoint 400s on those ("Invalid image
// file or mode"). Proven live 2026-07-07: Sandra's own reference set had one such file.
async function fetchAsFile(url: string, name: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch reference image (${res.status})`)
  const raw = Buffer.from(await res.arrayBuffer())
  const normalized = await sharp(raw, { animated: false })
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer()
  return toFile(normalized, name, { type: "image/png" })
}

function isTransientError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  if (typeof status === "number") return status >= 500 || status === 429
  const message = error instanceof Error ? error.message : String(error)
  return /ECONNRESET|ETIMEDOUT|ECONNREFUSED|fetch failed|socket hang up|network/i.test(message)
}

export interface FeedImageRequest {
  prompt: string
  /** Identity reference URLs (the member's avatar selfies). Empty for object scenes
   *  (flatlay/detail) - those generate without references so the model never paints the
   *  member into a product shot. */
  referenceUrls: string[]
  /** Optional style-world reference. It is appended after identity files and never used as identity. */
  inspirationUrl?: string | null
  /** gpt-image portrait canvas; the grid renders 4:5-ish tiles from it. */
  size?: "1024x1536" | "1024x1024"
}

/** Generate one feed image. Returns the PNG buffer (synchronous - no prediction polling). */
export async function generateFeedImageWithOpenAI(req: FeedImageRequest): Promise<Buffer> {
  const openai = getClient()
  const size = req.size ?? "1024x1536"

  const run = async (): Promise<Buffer> => {
    const safeInspirationUrl = normalizeInspirationImageUrl(req.inspirationUrl)
    if (req.referenceUrls.length > 0 || safeInspirationUrl) {
      // One unreadable reference must not kill the shot - generate with the ones that load.
      const settled = await Promise.allSettled(
        req.referenceUrls.slice(0, 5).map((url, i) => fetchAsFile(url, `identity-${i + 1}.png`))
      )
      const identityFiles = settled
        .filter(
          (s): s is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchAsFile>>> =>
            s.status === "fulfilled"
        )
        .map(s => s.value)
      const failed = settled.length - identityFiles.length
      if (failed > 0)
        console.warn(`[feed openai] ${failed} reference image(s) skipped (unreadable)`)
      if (req.referenceUrls.length > 0 && identityFiles.length === 0) {
        throw new Error("No readable identity reference images")
      }
      const inspirationFile = safeInspirationUrl
        ? await fetchAsFile(safeInspirationUrl, "calendar-inspiration.png")
        : null
      const files = inspirationFile ? [...identityFiles, inspirationFile] : identityFiles
      if (files.length === 0) throw new Error("No readable reference images")
      const input: Record<string, unknown> = {
        model: OPENAI_IMAGE_MODEL,
        image: files.length === 1 ? files[0] : files,
        prompt: req.prompt,
        n: 1,
        size,
        quality: IMAGE_QUALITY,
        output_format: "png",
        // Same rationale as app-v3: prompts are tasteful editorial fashion photography; the
        // "auto" default only produces false positives here.
        moderation: "low",
      }
      // gpt-image-2 processes every input at high fidelity automatically; older models need the flag.
      if (OPENAI_IMAGE_MODEL !== "gpt-image-2") input.input_fidelity = "high"
      const response = await openai.images.edit(input as any)
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned from OpenAI")
      return Buffer.from(b64, "base64")
    }

    // Object scene (flatlay/detail): plain text-to-image, no identity references.
    const response = await openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt: req.prompt,
      n: 1,
      size,
      quality: IMAGE_QUALITY,
      output_format: "png",
      moderation: "low",
    } as any)
    const b64 = response.data?.[0]?.b64_json
    if (!b64) throw new Error("No image data returned from OpenAI")
    return Buffer.from(b64, "base64")
  }

  try {
    return await run()
  } catch (error) {
    if (isTransientError(error)) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      return await run()
    }
    throw error
  }
}
