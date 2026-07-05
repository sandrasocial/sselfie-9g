/**
 * OpenAI Quick Photo - Phase 1
 *
 * Synchronous image generation via OpenAI's GPT image model. No Replicate, no polling,
 * no reconciliation cron. Images appear in gallery immediately.
 *
 * Default Maya image path in Phase H. Set FEATURE_OPENAI_IMAGE_ENABLED=false
 * for instant rollback to the older provider paths.
 *
 * Protected systems (DO NOT TOUCH): auth, Stripe, Gallery persistence,
 * credits schema, Feed Planner, existing Replicate routes.
 */

import { type NextRequest, NextResponse } from "next/server"
import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { put } from "@vercel/blob"
import { getDbClient } from "@/lib/db/client"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS, refundCredits } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import { isMayaImageContinuationEnabled, isOpenAIImageEnabled } from "@/lib/feature-flags"

export const maxDuration = 60

const sql = getDbClient()
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"

function resolveOpenAIImageSize(
  requestedSize?: "1024x1024" | "1792x1024" | "1024x1792",
): "1024x1024" | "1536x1024" | "1024x1536" {
  if (requestedSize === "1792x1024") return "1536x1024"
  if (requestedSize === "1024x1024") return "1024x1024"
  return "1024x1536"
}

function resolveOpenAIImageQuality(
  requestedQuality?: "standard" | "hd",
): "medium" | "high" {
  return requestedQuality === "hd" ? "high" : "medium"
}

function isAllowedMayaReferenceImageUrl(value: string): boolean {
  if (/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value)) {
    return true
  }

  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

function resolveReferenceImageFileName(contentType: string): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "maya-reference.jpg"
  if (contentType.includes("webp")) return "maya-reference.webp"
  return "maya-reference.png"
}

async function normalizeReferenceImageForOpenAI(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { animated: false })
    .rotate()
    .resize({
      width: 1536,
      height: 1536,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer()
}

async function readReferenceImage(value: string): Promise<{ buffer: Buffer; contentType: string }> {
  const dataUrlMatch = value.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i)
  if (dataUrlMatch?.[1] && dataUrlMatch?.[2]) {
    const buffer = Buffer.from(dataUrlMatch[2], "base64")
    if (buffer.byteLength > 10 * 1024 * 1024) {
      throw new Error("Reference image is too large")
    }
    return {
      buffer,
      contentType: dataUrlMatch[1].replace("image/jpg", "image/jpeg"),
    }
  }

  const referenceResponse = await fetch(value)
  if (!referenceResponse.ok) {
    throw new Error("Could not load reference image for refinement")
  }

  const contentType = referenceResponse.headers.get("content-type") || "image/png"
  if (!contentType.startsWith("image/")) {
    throw new Error("Reference URL did not return an image")
  }

  const buffer = Buffer.from(await referenceResponse.arrayBuffer())
  return { buffer, contentType }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Rate limit ─────────────────────────────────────────────────────────
  const rateLimitResult = await rateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: "Too many image generation requests. Please wait a moment before trying again.",
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 },
    )
  }

  try {
    // ── Feature flag guard ─────────────────────────────────────────────────
    if (!isOpenAIImageEnabled()) {
      return NextResponse.json(
        { error: "This feature is not currently enabled." },
        { status: 403 },
      )
    }

    // ── Auth ──────────────────────────────────────────────────────────────
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await request.json()
    const {
      prompt,
      conceptTitle,
      chatId,
      quality,
      size,
      referenceImageUrl,
    } = body as {
      prompt: string
      conceptTitle?: string
      chatId?: string
      quality?: "standard" | "hd"
      size?: "1024x1024" | "1792x1024" | "1024x1792"
      referenceImageUrl?: string
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    const hasReferenceImageUrl = typeof referenceImageUrl === "string" && referenceImageUrl.trim().length > 0
    const canUseReferenceEdit = hasReferenceImageUrl && isMayaImageContinuationEnabled()
    if (
      canUseReferenceEdit &&
      typeof referenceImageUrl === "string" &&
      !isAllowedMayaReferenceImageUrl(referenceImageUrl)
    ) {
      return NextResponse.json(
        { error: "This reference image is not available for refinement." },
        { status: 400 },
      )
    }

    // ── Neon user ─────────────────────────────────────────────────────────
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    // ── Credit check ───────────────────────────────────────────────────────
    const hasEnoughCredits = await checkCredits(neonUser.id, CREDIT_COSTS.IMAGE)
    if (!hasEnoughCredits) {
      const currentBalance = await getUserCredits(neonUser.id)
      return NextResponse.json(
        {
          error: "Insufficient credits",
          code: "insufficient_credits",
          action: "open_credits_topup",
          required: CREDIT_COSTS.IMAGE,
          current: currentBalance,
          message: `Image generation requires ${CREDIT_COSTS.IMAGE} credit. You currently have ${currentBalance} credits. Please purchase more credits or upgrade your plan.`,
        },
        { status: 402 },
      )
    }

    // ── Deduct credits BEFORE calling OpenAI ──────────────────────────────
    // Same pattern as /generate-image: deduct first, refund on failure.
    const label = conceptTitle || prompt.slice(0, 60)
    const deductionResult = await deductCredits(
      neonUser.id,
      CREDIT_COSTS.IMAGE,
      "image",
      `OpenAI Quick Photo: ${label}`,
    )
    if (!deductionResult.success) {
      console.error("[openai-image] Failed to deduct credits:", deductionResult.error)
      return NextResponse.json(
        {
          error: "Could not deduct credits",
          code: "credit_deduction_failed",
          message: deductionResult.error ?? "Credit deduction failed. Please try again.",
        },
        { status: 402 },
      )
    }

    // ── OpenAI API key check ───────────────────────────────────────────────
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      await refundCredits(
        neonUser.id,
        CREDIT_COSTS.IMAGE,
        "OpenAI API key not configured",
        `openai-config-${Date.now()}`,
      ).catch(() => {})
      console.error("[openai-image] OPENAI_API_KEY is not set")
      return NextResponse.json(
        { error: "Image generation is temporarily unavailable. Please try again later." },
        { status: 500 },
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })
    const refundRef = `openai-fail-${neonUser.id}-${Date.now()}`

    const useReferenceEdit =
      canUseReferenceEdit &&
      typeof referenceImageUrl === "string" &&
      isAllowedMayaReferenceImageUrl(referenceImageUrl)

    // ── Generate or refine image ───────────────────────────────────────────
    let imageBuffer: Buffer
    try {
      let b64: string | undefined

      if (useReferenceEdit) {
        const { buffer: referenceBuffer } = await readReferenceImage(referenceImageUrl)
        const normalizedReferenceBuffer = await normalizeReferenceImageForOpenAI(referenceBuffer)
        const referenceFile = await toFile(normalizedReferenceBuffer, resolveReferenceImageFileName("image/png"), {
          type: "image/png",
        })

        const editInput: Record<string, unknown> = {
          model: OPENAI_IMAGE_MODEL as any,
          image: referenceFile,
          prompt: prompt.trim(),
          n: 1,
          size: "1024x1536",
          quality: "medium",
          output_format: "png",
          moderation: "low",
        }

        if (OPENAI_IMAGE_MODEL !== "gpt-image-2") {
          editInput.input_fidelity = "high"
        }

        const response = await openai.images.edit(editInput as any)

        b64 = response.data?.[0]?.b64_json
      } else {
        const response = await openai.images.generate({
          model: OPENAI_IMAGE_MODEL as any,
          prompt: prompt.trim(),
          n: 1,
          size: resolveOpenAIImageSize(size),
          quality: resolveOpenAIImageQuality(quality),
          output_format: "png",
          moderation: "low",
        })

        b64 = response.data?.[0]?.b64_json
      }

      if (!b64) {
        throw new Error("No image data returned from OpenAI")
      }
      imageBuffer = Buffer.from(b64, "base64")
    } catch (openaiError) {
      // Refund credits - user should not be charged for a failed generation
      await refundCredits(
        neonUser.id,
        CREDIT_COSTS.IMAGE,
        "OpenAI generation failed",
        refundRef,
      ).catch(() => {})

      console.error("[openai-image] Generation failed:", openaiError)
      const message = openaiError instanceof Error ? openaiError.message : String(openaiError)

      // Surface a friendly content-policy message without leaking provider details
      const isContentPolicy =
        message.includes("content_policy") ||
        message.includes("safety") ||
        message.includes("violates") ||
        message.includes("rejected")

      if (isContentPolicy) {
        return NextResponse.json(
          {
            error: "This photo direction isn't available. Try a different description.",
            code: "content_policy",
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        { error: "Failed to generate image. Please try again." },
        { status: 500 },
      )
    }

    // ── Upload to Vercel Blob (permanent storage) ──────────────────────────
    // OpenAI base64 is converted to a permanent Blob URL.
    // This is the URL that gets stored and served - never the raw OpenAI response.
    let blob: { url: string }
    try {
      const timestamp = Date.now()
      blob = await put(
        `maya-openai/${neonUser.id}/${timestamp}.png`,
        imageBuffer,
        { access: "public", contentType: "image/png" },
      )
    } catch (blobError) {
      await refundCredits(
        neonUser.id,
        CREDIT_COSTS.IMAGE,
        "Blob upload failed after OpenAI generation",
        refundRef,
      ).catch(() => {})
      console.error("[openai-image] Vercel Blob upload failed:", blobError)
      return NextResponse.json(
        { error: "Failed to save image. Please try again." },
        { status: 500 },
      )
    }

    // ── Save directly to ai_images with generation_status='completed' ──────
    // No generated_images intermediary. No reconciliation cron needed.
    // Gallery will show this image immediately (same query: generation_status='completed').
    let aiImageId: number
    try {
      const insertResult = await sql`
        INSERT INTO ai_images (
          user_id,
          image_url,
          prompt,
          generated_prompt,
          prediction_id,
          generation_status,
          source,
          category,
          created_at
        ) VALUES (
          ${neonUser.id},
          ${blob.url},
          ${prompt.trim()},
          ${prompt.trim()},
          ${"openai-" + Date.now()},
          'completed',
          'openai',
          'concept',
          NOW()
        )
        RETURNING id
      `
      aiImageId = insertResult[0].id
    } catch (dbError) {
      // DB insert failed but image is already in Blob - log for manual recovery, don't refund
      console.error("[openai-image] DB insert failed (image saved to Blob):", {
        blobUrl: blob.url,
        userId: neonUser.id,
        error: dbError,
      })
      // Return success with the blob URL even if DB save failed.
      // The image is accessible; gallery visibility will be delayed but not lost.
      return NextResponse.json({
        success: true,
        imageUrl: blob.url,
        aiImageId: null,
        creditsDeducted: CREDIT_COSTS.IMAGE,
        newBalance: deductionResult.newBalance,
        warning: "Image generated but gallery save failed. Contact support if image is missing.",
      })
    }

    console.log("[openai-image] ✅ Generated and saved to gallery:", {
      aiImageId,
      userId: neonUser.id,
      chatId: chatId || null,
    })

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      aiImageId,
      creditsDeducted: CREDIT_COSTS.IMAGE,
      newBalance: deductionResult.newBalance,
    })
  } catch (error) {
    console.error("[openai-image] Unexpected error:", error)
    return NextResponse.json(
      { error: "Failed to generate image. Please try again." },
      { status: 500 },
    )
  }
}
