// SSELFIE Studio 3.0 — app-v3 Maya concept generation (synchronous, MAYA-REBUILD-03).
//
// Stage 2 finalize + render. Fired when the user clicks a concept card. Compiles the chosen
// CreativeBrief into a production prompt in Nano Banana order, then calls gpt-image via the
// EDIT endpoint with the user's selfie attached — this is the identity anchor mechanism
// (non-negotiable, per spec). Synchronous: one round-trip, no polling. Persists to the
// gallery (ai_images) exactly like the live OpenAI route.
//
// Reuses the protected credit + blob + gallery plumbing. Does NOT touch legacy routes.

import { type NextRequest, NextResponse } from "next/server"
import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { put } from "@vercel/blob"
import { getDbClient } from "@/lib/db/client"
import {
  checkCredits,
  deductCredits,
  getUserCredits,
  CREDIT_COSTS,
  refundCredits,
} from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import { isOpenAIImageEnabled } from "@/lib/feature-flags"
import { compileConceptPrompt, conceptRequestSize } from "@/lib/app-v3/prompt-compiler"
import type { CreativeBrief, MayaGenerateConceptRequest } from "@/lib/app-v3/maya/concept-types"
import type { OutputFormat } from "@/components/app-v3/types"

// gpt-image edit calls (1024x1536, medium quality, reference selfie attached) routinely
// run 60-120s. 60s was killing them with a 504. Match the Pro image route's 300s ceiling.
export const maxDuration = 300

const sql = getDbClient()
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const VALID_FORMATS: OutputFormat[] = ["photo", "reel-cover", "carousel", "story-slide"]

/** Map our RequestSize to the gpt-image edit size param. */
function toOpenAIEditSize(size: "1024x1024" | "1024x1792"): "1024x1024" | "1024x1536" {
  return size === "1024x1024" ? "1024x1024" : "1024x1536"
}

/** Only public Vercel Blob https URLs (or data: images) are accepted as the identity ref. */
function isAllowedReferenceUrl(value: string): boolean {
  if (/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value)) return true
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

async function readReferenceImage(value: string): Promise<Buffer> {
  const dataUrlMatch = value.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,(.+)$/i)
  if (dataUrlMatch?.[1]) {
    const buffer = Buffer.from(dataUrlMatch[1], "base64")
    if (buffer.byteLength > 12 * 1024 * 1024) throw new Error("Reference image is too large")
    return buffer
  }
  const res = await fetch(value)
  if (!res.ok) throw new Error("Could not load reference selfie")
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.startsWith("image/")) throw new Error("Reference URL did not return an image")
  return Buffer.from(await res.arrayBuffer())
}

/** Normalize to a PNG the edit endpoint accepts (flatten alpha, cap dimensions, fix EXIF). */
async function normalizeReferenceForOpenAI(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { animated: false })
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer()
}

function isValidBrief(brief: unknown): brief is CreativeBrief {
  if (!brief || typeof brief !== "object") return false
  const b = brief as Record<string, unknown>
  return (
    typeof b.outfit === "string" &&
    typeof b.setting === "string" &&
    typeof b.mood === "string" &&
    typeof b.pose === "string" &&
    typeof b.cameraSpec === "string" &&
    typeof b.lighting === "string"
  )
}

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (!rate.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rate.retryAfter },
      { status: 429 },
    )
  }

  try {
    if (!isOpenAIImageEnabled()) {
      return NextResponse.json({ error: "This feature is not currently enabled." }, { status: 403 })
    }

    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as MayaGenerateConceptRequest | null
    if (!body || !isValidBrief(body.brief)) {
      return NextResponse.json({ error: "A complete concept brief is required" }, { status: 400 })
    }

    const format: OutputFormat =
      body.format && VALID_FORMATS.includes(body.format) ? body.format : "photo"

    const referenceSelfieUrl = body.referenceSelfieUrl
    if (typeof referenceSelfieUrl !== "string" || !isAllowedReferenceUrl(referenceSelfieUrl)) {
      // The selfie IS the identity anchor — we never text-only generate on this route.
      return NextResponse.json(
        { error: "A reference selfie is required to keep your likeness." },
        { status: 400 },
      )
    }

    // Front face first, then any optional angles (side profile, full body). Dedup + cap at 4
    // so identity/body fidelity improves without bloating the edit request.
    const referenceUrls = Array.from(
      new Set(
        [referenceSelfieUrl, ...(Array.isArray(body.referenceSelfieUrls) ? body.referenceSelfieUrls : [])].filter(
          isAllowedReferenceUrl,
        ),
      ),
    ).slice(0, 4)

    // Compile the brief into a production prompt (Nano Banana order, identity anchor first),
    // injecting the vision-extracted look for the chosen aesthetic.
    const prompt = compileConceptPrompt(body.brief, format, { aestheticId: body.aestheticId })
    const size = toOpenAIEditSize(conceptRequestSize(format))

    // ── Neon user ──
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    // ── Credits: check → deduct (refund on any downstream failure) ──
    const hasEnough = await checkCredits(neonUser.id, CREDIT_COSTS.IMAGE)
    if (!hasEnough) {
      const current = await getUserCredits(neonUser.id)
      return NextResponse.json(
        {
          error: "Insufficient credits",
          code: "insufficient_credits",
          action: "open_credits_topup",
          required: CREDIT_COSTS.IMAGE,
          current,
        },
        { status: 402 },
      )
    }

    const label = body.conceptTitle || body.brief.outfit.slice(0, 60)
    const deduction = await deductCredits(
      neonUser.id,
      CREDIT_COSTS.IMAGE,
      "image",
      `app-v3 concept: ${label}`,
    )
    if (!deduction.success) {
      return NextResponse.json(
        { error: deduction.error ?? "Credit deduction failed. Please try again.", code: "credit_deduction_failed" },
        { status: 402 },
      )
    }

    const refundRef = `app-v3-fail-${neonUser.id}-${Date.now()}`
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "OpenAI API key not configured", refundRef).catch(() => {})
      return NextResponse.json(
        { error: "Image generation is temporarily unavailable. Please try again later." },
        { status: 500 },
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    // ── Identity-anchored generation via the EDIT endpoint (selfie attached) ──
    let imageBuffer: Buffer
    try {
      const refFiles = await Promise.all(
        referenceUrls.map(async (url, i) => {
          const buf = await normalizeReferenceForOpenAI(await readReferenceImage(url))
          return toFile(buf, `maya-reference-${i}.png`, { type: "image/png" })
        }),
      )

      const editInput: Record<string, unknown> = {
        model: OPENAI_IMAGE_MODEL,
        // gpt-image accepts an array of reference images; a single file also works.
        image: refFiles.length === 1 ? refFiles[0] : refFiles,
        prompt,
        n: 1,
        size,
        quality: "medium",
        output_format: "png",
      }
      // Higher identity fidelity on models that support it (not gpt-image-2).
      if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

      const response = await openai.images.edit(editInput as any)
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned from OpenAI")
      imageBuffer = Buffer.from(b64, "base64")
    } catch (openaiError) {
      await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "OpenAI generation failed", refundRef).catch(() => {})
      const message = openaiError instanceof Error ? openaiError.message : String(openaiError)
      const isContentPolicy =
        message.includes("content_policy") ||
        message.includes("safety") ||
        message.includes("violates") ||
        message.includes("rejected")
      if (isContentPolicy) {
        return NextResponse.json(
          { error: "This photo direction isn't available. Try a different concept.", code: "content_policy" },
          { status: 400 },
        )
      }
      console.error("[app-v3 generate] Generation failed:", openaiError)
      return NextResponse.json({ error: "Failed to generate image. Please try again." }, { status: 500 })
    }

    // ── Persist to Vercel Blob ──
    let blob: { url: string }
    try {
      blob = await put(`maya-app-v3/${neonUser.id}/${Date.now()}.png`, imageBuffer, {
        access: "public",
        contentType: "image/png",
      })
    } catch (blobError) {
      await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "Blob upload failed", refundRef).catch(() => {})
      console.error("[app-v3 generate] Blob upload failed:", blobError)
      return NextResponse.json({ error: "Failed to save image. Please try again." }, { status: 500 })
    }

    // ── Save to gallery (ai_images, completed) — same query the gallery already reads ──
    let aiImageId: number | null = null
    try {
      const inserted = await sql`
        INSERT INTO ai_images (
          user_id, image_url, prompt, generated_prompt, prediction_id,
          generation_status, source, category, created_at
        ) VALUES (
          ${neonUser.id}, ${blob.url}, ${prompt}, ${prompt},
          ${"app-v3-" + Date.now()}, 'completed', 'openai', 'concept', NOW()
        ) RETURNING id
      `
      aiImageId = inserted[0]?.id ?? null
    } catch (dbError) {
      console.error("[app-v3 generate] DB insert failed (image saved to Blob):", dbError)
      return NextResponse.json({
        success: true,
        imageUrl: blob.url,
        aiImageId: null,
        promptUsed: prompt,
        creditsDeducted: CREDIT_COSTS.IMAGE,
        newBalance: deduction.newBalance,
        warning: "Image generated but gallery save was delayed.",
      })
    }

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      aiImageId,
      promptUsed: prompt,
      creditsDeducted: CREDIT_COSTS.IMAGE,
      newBalance: deduction.newBalance,
    })
  } catch (error) {
    console.error("[app-v3 generate] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to generate image. Please try again." }, { status: 500 })
  }
}
