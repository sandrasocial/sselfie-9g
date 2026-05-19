/**
 * OpenAI Quick Photo — Phase 1
 *
 * Synchronous image generation via DALL-E 3. No Replicate, no polling,
 * no reconciliation cron. Images appear in gallery immediately.
 *
 * Gated by FEATURE_OPENAI_IMAGE_ENABLED=true.
 * Use for untrained users who would otherwise hit 409 from /generate-image.
 *
 * Protected systems (DO NOT TOUCH): auth, Stripe, Gallery persistence,
 * credits schema, Feed Planner, existing Replicate routes.
 */

import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { put } from "@vercel/blob"
import { getDbClient } from "@/lib/db/client"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS, refundCredits } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import { isOpenAIImageEnabled } from "@/lib/feature-flags"

export const maxDuration = 60

const sql = getDbClient()

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
    } = body as {
      prompt: string
      conceptTitle?: string
      chatId?: string
      quality?: "standard" | "hd"
      size?: "1024x1024" | "1792x1024" | "1024x1792"
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
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

    // ── Generate image via DALL-E 3 ────────────────────────────────────────
    let imageBuffer: Buffer
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt.trim(),
        n: 1,
        size: size ?? "1024x1024",
        quality: quality ?? "standard",
        response_format: "b64_json",
      })

      const b64 = response.data?.[0]?.b64_json
      if (!b64) {
        throw new Error("No image data returned from OpenAI")
      }
      imageBuffer = Buffer.from(b64, "base64")
    } catch (openaiError) {
      // Refund credits — user should not be charged for a failed generation
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
    // This is the URL that gets stored and served — never the raw OpenAI response.
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
      // DB insert failed but image is already in Blob — log for manual recovery, don't refund
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
