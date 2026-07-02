// SSELFIE Studio 3.0 - TEXT-STUDIO-01: bake the member's text design into her graphic.
//
// Hybrid two-source model: graphic formats generate a CLEAN text-free image (overlay mode) and
// the words live as an editable CSS layer. When she taps "Apply to photo", this route runs ONE
// openai.images.edit pass on the CLEAN base image, baking her exact words in the chosen overlay
// style (prompt built by lib/app-v3/text-bake.ts). The clean base is never overwritten, so
// "without text" stays a free client-side swap and a re-apply always starts from the clean
// source - never from a previous baked result (iterative passes degrade the photo).
//
// Auth, credits, refund-on-failure, and persistence mirror app/api/app-v3/maya/edit/route.ts.

import { type NextRequest, NextResponse } from "next/server"
import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { put } from "@vercel/blob"
import { getDbClient } from "@/lib/db/client"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS, refundCredits } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import { isOpenAIImageEnabled } from "@/lib/feature-flags"
import { conceptRequestSize } from "@/lib/app-v3/prompt-compiler"
import { isTextOverlayLayerEnabled, sanitizeTextOverlaySpec } from "@/lib/app-v3/text-overlay"
import { buildBakePrompt, sanitizeBakeStyleAdjustments } from "@/lib/app-v3/text-bake"

export const maxDuration = 300

const sql = getDbClient()
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"

// Matches the edit route (which matches qualityForFormat in generate): baking text never
// silently changes the image's quality tier.
type ImgQuality = "low" | "medium" | "high"
type OpenAIImageEditResponse = { data?: Array<{ b64_json?: string | null }> }
const QUALITY_OVERRIDE = process.env.APP_V3_IMAGE_QUALITY as ImgQuality | undefined
const BAKE_IMAGE_QUALITY: ImgQuality =
  QUALITY_OVERRIDE === "low" || QUALITY_OVERRIDE === "medium" || QUALITY_OVERRIDE === "high"
    ? QUALITY_OVERRIDE
    : "medium"

function toOpenAIEditSize(size: "1024x1024" | "1024x1792"): "1024x1024" | "1024x1536" {
  return size === "1024x1024" ? "1024x1024" : "1024x1536"
}

function isAllowedImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

async function loadImage(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Could not load the image to bake text onto")
  return Buffer.from(await res.arrayBuffer())
}

async function normalize(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { animated: false })
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer()
}

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (!rate.success) {
    return NextResponse.json({ error: "Rate limit exceeded", retryAfter: rate.retryAfter }, { status: 429 })
  }

  try {
    // Flag-off = this surface does not exist (the studio ships behind APP_V3_TEXT_OVERLAY_LAYER).
    if (!isTextOverlayLayerEnabled()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (!isOpenAIImageEnabled()) {
      return NextResponse.json({ error: "This feature is not currently enabled." }, { status: 403 })
    }

    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await request.json().catch(() => null)) as
      | { cleanImageUrl?: string; spec?: unknown; styleAdjustments?: unknown }
      | null
    // ALWAYS bake from the clean text-free base. The client never sends a baked result here.
    if (!body || !isAllowedImageUrl(body.cleanImageUrl)) {
      return NextResponse.json({ error: "A valid clean image is required" }, { status: 400 })
    }
    const spec = sanitizeTextOverlaySpec(body.spec)
    if (!spec) {
      return NextResponse.json({ error: "A valid text design is required" }, { status: 400 })
    }
    const cleanImageUrl = body.cleanImageUrl
    // MAYA-GUIDED-TEXT-01: optional freeform chat refinement ("all the text in red"). It is
    // sanitized (flattened, capped) and only ever steers the typography, never the photo.
    const styleAdjustments = sanitizeBakeStyleAdjustments(body.styleAdjustments)

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) return NextResponse.json({ error: "User not found in database" }, { status: 404 })

    // Members and active trials only (same lock as generate/edit).
    {
      const { isAdminEmail } = await import("@/lib/admin-feature-flags")
      if (!isAdminEmail(user.email)) {
        const { canGenerate } = await import("@/lib/trial/suite-trial")
        if (!(await canGenerate(String(neonUser.id)))) {
          return NextResponse.json(
            {
              error: "Photo-making is paused. Join the SUITE to keep creating.",
              code: "generation_locked",
              action: "open_membership_checkout",
            },
            { status: 403 },
          )
        }
      }
    }

    // Member pulse (behavior only, never money): she asked for a baked text render.
    import("@/lib/analytics/events")
      .then(({ logAnalyticsEvent }) =>
        logAnalyticsEvent({
          eventName: "suite_text_bake_requested",
          userId: String(neonUser.id),
          properties: { source: "app-v3-bake-text", format: spec.format, style: spec.style },
        }),
      )
      .catch(() => {})

    const logBakeFailure = (reason: string, detail: unknown) =>
      import("@/lib/analytics/events")
        .then(({ logAnalyticsEvent }) =>
          logAnalyticsEvent({
            eventName: "suite_text_bake_failed",
            userId: String(neonUser.id),
            properties: {
              source: "app-v3-bake-text",
              format: spec.format,
              style: spec.style,
              reason,
              detail: (detail instanceof Error ? detail.message : String(detail)).slice(0, 300),
            },
          }),
        )
        .catch(() => {})

    // Credits mirror the edit route exactly: a bake is one image render.
    const hasEnough = await checkCredits(neonUser.id, CREDIT_COSTS.IMAGE)
    if (!hasEnough) {
      const current = await getUserCredits(neonUser.id)
      return NextResponse.json(
        { error: "Insufficient credits", code: "insufficient_credits", action: "open_credits_topup", required: CREDIT_COSTS.IMAGE, current },
        { status: 402 },
      )
    }
    const deduction = await deductCredits(neonUser.id, CREDIT_COSTS.IMAGE, "image", `app-v3 text bake: ${spec.headline.slice(0, 50)}`)
    if (!deduction.success) {
      return NextResponse.json({ error: deduction.error ?? "Credit deduction failed.", code: "credit_deduction_failed" }, { status: 402 })
    }

    const refundRef = `app-v3-bake-text-fail-${neonUser.id}-${Date.now()}`
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error("[app-v3 bake-text] OPENAI_API_KEY is not set in this environment.")
      await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "OpenAI API key not configured", refundRef).catch(() => {})
      await logBakeFailure("openai_not_configured", "missing key")
      return NextResponse.json({ error: "This is temporarily unavailable. Please try again later.", code: "openai_not_configured" }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })
    const size = toOpenAIEditSize(conceptRequestSize(spec.format))
    const prompt = buildBakePrompt(spec, styleAdjustments ? { styleAdjustments } : undefined)

    // ONE pass on the clean base. No retries, no chained edits: research shows iterative
    // passes degrade the photo, and the CSS layer already covers the failure path.
    let imageBuffer: Buffer
    try {
      const sourceFile = await toFile(await normalize(await loadImage(cleanImageUrl)), "maya-bake-source.png", { type: "image/png" })
      const response = (await openai.images.edit({
        model: OPENAI_IMAGE_MODEL,
        image: sourceFile,
        prompt,
        n: 1,
        size,
        quality: BAKE_IMAGE_QUALITY,
        output_format: "png",
      } as Parameters<typeof openai.images.edit>[0])) as unknown as OpenAIImageEditResponse
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned from OpenAI")
      imageBuffer = Buffer.from(b64, "base64")
    } catch (bakeError) {
      await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "Text bake failed", refundRef).catch(() => {})
      console.error("[app-v3 bake-text] bake failed:", bakeError)
      await logBakeFailure("bake_failed", bakeError)
      return NextResponse.json(
        { error: "Couldn't bake the text in this time. Your text layer still works, so you can download that version or try again." },
        { status: 500 },
      )
    }

    let blob: { url: string }
    try {
      blob = await put(`maya-app-v3/${neonUser.id}/bake-${Date.now()}.png`, imageBuffer, { access: "public", contentType: "image/png" })
    } catch (blobError) {
      await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "Blob upload failed", refundRef).catch(() => {})
      console.error("[app-v3 bake-text] blob upload failed:", blobError)
      await logBakeFailure("blob_upload_failed", blobError)
      return NextResponse.json({ error: "Failed to save the image. Please try again." }, { status: 500 })
    }

    try {
      await sql`
        INSERT INTO ai_images (
          user_id, image_url, prompt, generated_prompt, prediction_id,
          generation_status, source, category, created_at
        ) VALUES (
          ${neonUser.id}, ${blob.url}, ${spec.headline}, ${prompt.slice(0, 2000)},
          ${"app-v3-bake-" + Date.now()}, 'completed', 'openai', 'text-bake', NOW()
        )
      `
    } catch (dbError) {
      console.error("[app-v3 bake-text] DB insert failed (image saved to Blob):", dbError)
    }

    return NextResponse.json({
      success: true,
      bakedUrl: blob.url,
      creditsDeducted: CREDIT_COSTS.IMAGE,
      newBalance: deduction.newBalance,
    })
  } catch (error) {
    console.error("[app-v3 bake-text] Unexpected error:", error)
    return NextResponse.json({ error: "Couldn't bake the text in. Please try again." }, { status: 500 })
  }
}
