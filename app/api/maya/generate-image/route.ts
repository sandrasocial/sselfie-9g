// CLASSIC MODE - DO NOT MODIFY FOR PRO REFACTOR
// This route is for Classic mode (Flux) generation only
// Studio Pro uses /api/maya/generate-studio-pro

import { randomInt } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db/client"
import { getReplicateClient } from "@/lib/replicate-client"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import {
  extractReplicateVersionId,
  ensureTriggerWordPrefix,
  ensureGenderInPrompt,
  buildClassicModeReplicateInput,
  type QualitySettings,
} from "@/lib/replicate-helpers"
import { logger } from "@/lib/logger"

const sql = getDbClient()

// ─── Types ───────────────────────────────────────────────────────────────────

type UserModelData = {
  triggerWord: string
  gender: string | null
  ethnicity: string | null
  replicateVersionId: string | null
  replicateModelId: string | null
  userLoraScale: number | null
  loraWeightsUrl: string | null
}

type LoraDecision = {
  manualExtraLoraScale: number | undefined
  hasUserSetRealism: boolean
  shouldDisableExtraLora: boolean
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Normalise a raw DB gender string to a prompt-ready gender term. */
function resolveUserGender(gender: string | null): string {
  if (!gender) return "person"
  const g = gender.toLowerCase().trim()
  if (g === "woman" || g === "female") return "woman"
  if (g === "man" || g === "male") return "man"
  return "person"
}

/**
 * Apply trigger-word prefix, gender, highlight, and authenticity modifiers
 * to a raw concept prompt.
 */
function buildFinalPrompt(
  conceptPrompt: string,
  opts: {
    triggerWord: string
    userGender: string
    ethnicity: string | null
    isHighlight: boolean
    enhancedAuthenticity: boolean
  },
): string {
  let prompt = conceptPrompt.trim()
  prompt = ensureTriggerWordPrefix(prompt, opts.triggerWord)
  prompt = ensureGenderInPrompt(prompt, opts.triggerWord, opts.userGender, opts.ethnicity)
  if (opts.isHighlight) {
    prompt +=
      ", professional Instagram story highlight aesthetic, elegant and minimalistic design," +
      " soft lighting, high-end editorial quality, perfect for text overlay," +
      " circular crop friendly, trending Instagram aesthetic 2025"
  }
  if (opts.enhancedAuthenticity) {
    prompt +=
      ", muted colors, iPhone quality, film grain, authentic cellphone photo aesthetic," +
      " natural skin texture with visible pores, amateur cellphone quality," +
      " visible sensor noise, heavy HDR glow, blown-out highlights, crushed shadows," +
      " authentic moment, unfiltered, real life texture"
    console.log("[v0] ✅ Enhanced Authenticity: Added authentic iPhone aesthetic keywords to prompt")
  }
  return prompt
}

/**
 * Decide whether to disable the super-realism extra LoRA and resolve the
 * manual scale value.
 *
 * Priority: user's explicit realismStrength always beats toggle/keyword
 * detection — so if the user has set a value we honour it even when the
 * authenticity toggle is on.
 */
function resolveLoraDecision(
  customSettings: Record<string, any> | undefined,
  enhancedAuthenticity: boolean,
  finalPrompt: string,
): LoraDecision {
  const manualExtraLoraScale =
    customSettings?.extraLoraScale === undefined
      ? customSettings?.realismStrength
      : customSettings.extraLoraScale

  const hasUserSetRealism = manualExtraLoraScale !== undefined
  const hasAuthenticKeywords =
    /authentic\s+iphone|amateur\s+cellphone|raw\s+iphone|candid\s+photo|film\s+grain|muted\s+colors/i.test(
      finalPrompt,
    )
  const shouldDisableExtraLora =
    !hasUserSetRealism && (enhancedAuthenticity || hasAuthenticKeywords)

  return { manualExtraLoraScale, hasUserSetRealism, shouldDisableExtraLora }
}

/** Merge preset quality settings with user overrides, applying LoRA priority rules. */
function buildQualitySettings(
  presetSettings: Record<string, any>,
  customSettings: Record<string, any> | undefined,
  userLoraScale: number | null,
  lora: LoraDecision,
): QualitySettings {
  const baseSettings = presetSettings as QualitySettings
  const { shouldDisableExtraLora, hasUserSetRealism, manualExtraLoraScale } = lora

  // Priority: manual styleStrength → DB lora_scale → preset default
  const loraScale =
    customSettings?.styleStrength === undefined
      ? (userLoraScale ?? baseSettings.lora_scale)
      : customSettings.styleStrength

  // Priority: explicit realism → preset default (then disabled if toggle is on)
  const baseExtraLoraScale = hasUserSetRealism ? manualExtraLoraScale : baseSettings.extra_lora_scale
  const extraLoraScale = shouldDisableExtraLora ? 0 : baseExtraLoraScale

  return {
    ...baseSettings,
    aspect_ratio: customSettings?.aspectRatio ?? baseSettings.aspect_ratio,
    lora_scale: loraScale,
    guidance_scale: customSettings?.promptAccuracy ?? baseSettings.guidance_scale,
    extra_lora: customSettings?.extraLora ?? baseSettings.extra_lora,
    extra_lora_scale: extraLoraScale,
    num_inference_steps: baseSettings.num_inference_steps,
  }
}

/** Load the most-recent completed model for a user. Returns null if none found. */
async function loadUserModel(neonUserId: string | number): Promise<UserModelData | null> {
  const rows = await sql`
    SELECT
      u.gender,
      u.ethnicity,
      um.trigger_word,
      um.replicate_version_id,
      um.replicate_model_id,
      um.lora_scale,
      um.lora_weights_url
    FROM users u
    LEFT JOIN user_models um ON u.id = um.user_id
    WHERE u.id = ${neonUserId}
    AND um.training_status = 'completed'
    AND (um.is_test = false OR um.is_test IS NULL)
    ORDER BY um.created_at DESC
    LIMIT 1
  `
  if (rows.length === 0) return null
  const row = rows[0]
  return {
    triggerWord: row.trigger_word || "person",
    gender: row.gender,
    ethnicity: row.ethnicity,
    replicateVersionId: extractReplicateVersionId(row.replicate_version_id),
    replicateModelId: row.replicate_model_id,
    userLoraScale: row.lora_scale,
    loraWeightsUrl: row.lora_weights_url,
  }
}

/** Format a caught error into a 500 JSON response, detecting Replicate 401s. */
function handleGenerationError(error: unknown): NextResponse {
  console.error("[v0] Error generating image:", error)
  if (error instanceof Error) {
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Error stack:", error.stack)
  }
  const message = error instanceof Error ? error.message : "Unknown error"
  const is401 = message.includes("401") || message.includes("Unauthenticated")
  return NextResponse.json(
    {
      error: is401 ? "Replicate authentication failed" : "Failed to generate image",
      details: is401
        ? "Your REPLICATE_API_TOKEN is invalid or expired. Please update it in the Vars section. Get a new token from https://replicate.com/account/api-tokens"
        : message,
    },
    { status: 500 },
  )
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, { maxRequests: 30, windowMs: 60000 })
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
    // ── Auth ──────────────────────────────────────────────────────────────
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      conceptTitle,
      conceptDescription,
      conceptPrompt,
      category,
      chatId,
      referenceImageUrl,
      addTextOverlay,
      textOverlayConfig,
      isHighlight,
      customSettings,
      enhancedAuthenticity,
    } = body

    // ── User + credit guard ────────────────────────────────────────────────
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

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

    // ── Model data ─────────────────────────────────────────────────────────
    const model = await loadUserModel(neonUser.id)
    if (!model) {
      return NextResponse.json(
        {
          error: "No trained model found. Please complete training first.",
          code: "training_required",
          action: "open_training_upload",
          message: "Train your model to use Custom Model mode.",
        },
        { status: 409 },
      )
    }
    if (!model.replicateVersionId) {
      console.error("[v0] ❌ CRITICAL: replicate_version_id is missing!")
      return NextResponse.json(
        { error: "Model version not found. Please retrain your model." },
        { status: 400 },
      )
    }
    if (!model.loraWeightsUrl) {
      console.error("[v0] ❌ CRITICAL: lora_weights_url is missing!")
      return NextResponse.json(
        { error: "Model weights not found. Please retrain your model." },
        { status: 400 },
      )
    }

    // ── Prompt construction ────────────────────────────────────────────────
    const userGender = resolveUserGender(model.gender)
    const finalPrompt = buildFinalPrompt(conceptPrompt, {
      triggerWord: model.triggerWord,
      userGender,
      ethnicity: model.ethnicity,
      isHighlight,
      enhancedAuthenticity: enhancedAuthenticity === true,
    })

    console.log("[v0] Prompt ready:", {
      conceptTitle,
      category,
      promptLength: finalPrompt.length,
      hasReferenceImage: !!referenceImageUrl,
      enhancedAuthenticity,
    })

    // ── Quality settings ───────────────────────────────────────────────────
    const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
    const presetSettings =
      MAYA_QUALITY_PRESETS[category as keyof typeof MAYA_QUALITY_PRESETS] ||
      MAYA_QUALITY_PRESETS.default
    const lora = resolveLoraDecision(customSettings, enhancedAuthenticity === true, finalPrompt)
    const qualitySettings = buildQualitySettings(
      presetSettings,
      customSettings,
      model.userLoraScale,
      lora,
    )

    console.log("[v0] Super-Realism LoRA:", {
      shouldDisable: lora.shouldDisableExtraLora,
      hasUserSetRealism: lora.hasUserSetRealism,
      finalScale: qualitySettings.extra_lora_scale,
    })

    // ── Replicate submission ───────────────────────────────────────────────
    let replicate
    try {
      replicate = getReplicateClient()
    } catch (err) {
      console.error("[v0] Failed to initialize Replicate client:", err)
      return NextResponse.json(
        {
          error: "Replicate API configuration error",
          details:
            err instanceof Error
              ? err.message
              : "Please check your REPLICATE_API_TOKEN in the Vars section. Get a valid token from https://replicate.com/account/api-tokens",
        },
        { status: 500 },
      )
    }

    const seed = customSettings?.seed ?? randomInt(1_000_000)
    const predictionInput = buildClassicModeReplicateInput({
      prompt: finalPrompt,
      qualitySettings,
      loraWeightsUrl: model.loraWeightsUrl,
      seed,
      referenceImageUrl,
      extraLoraDisabled: lora.shouldDisableExtraLora,
    })

    // ── Deduct credits BEFORE submitting to Replicate ─────────────────────
    // Must happen first: once a prediction is created, the API cost is incurred.
    const deductionResult = await deductCredits(
      neonUser.id,
      CREDIT_COSTS.IMAGE,
      "image",
      `Generated: ${conceptTitle}`,
    )
    if (!deductionResult.success) {
      console.error("[v0] [CREDITS] Failed to deduct credits before generation:", deductionResult.error)
      return NextResponse.json(
        {
          error: "Could not deduct credits",
          code: "credit_deduction_failed",
          message: deductionResult.error ?? "Credit deduction failed. Please try again.",
        },
        { status: 402 },
      )
    }

    const prediction = await replicate.predictions.create({
      version: model.replicateVersionId,
      input: predictionInput,
    })

    const insertResult = await sql`
      INSERT INTO generated_images (
        user_id,
        prompt,
        description,
        category,
        subcategory,
        image_urls,
        created_at
      ) VALUES (
        ${neonUser.id},
        ${finalPrompt},
        ${conceptDescription},
        ${category},
        ${conceptTitle},
        ${JSON.stringify({
          prediction_id: prediction.id,
          status: "processing",
          text_overlay: addTextOverlay ? textOverlayConfig : null,
        })},
        NOW()
      )
      RETURNING id
    `
    const generationId = insertResult[0].id

    // ── Referral trigger (non-blocking) ────────────────────────────────────
    try {
      const { triggerReferralEmailIfNeeded } = await import(
        "@/lib/referrals/trigger-referral-email"
      )
      triggerReferralEmailIfNeeded(neonUser.id).catch((err) => {
        console.error("[v0] Error triggering referral email (non-critical):", err)
      })
    } catch (err) {
      logger.error("Referral trigger import failed (non-critical)", err as Error, {
        route: "/api/maya/generate-image",
        userId: neonUser.id,
      })
    }

    return NextResponse.json({
      success: true,
      generationId,
      predictionId: prediction.id,
      status: "processing",
      textOverlay: addTextOverlay ? textOverlayConfig : null,
      creditsDeducted: CREDIT_COSTS.IMAGE,
      newBalance: deductionResult.newBalance,
    })
  } catch (error) {
    return handleGenerationError(error)
  }
}
