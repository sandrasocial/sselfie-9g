import { randomInt } from "crypto"
import { put } from "@vercel/blob"
import { checkCredits, CREDIT_COSTS, deductCredits, getUserCredits } from "@/lib/credits"
import { getDbClient } from "@/lib/db/client"
import { logTtfiCompletionOnFirstGallerySave } from "@/lib/analytics/ttfi"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { hookMayaGeneration } from "@/lib/quality/hooks"
import { getReplicateClient } from "@/lib/replicate-client"
import {
  buildClassicModeReplicateInput,
  ensureGenderInPrompt,
  ensureTriggerWordPrefix,
  extractReplicateVersionId,
  type QualitySettings,
} from "@/lib/replicate-helpers"

type UserModelData = {
  triggerWord: string
  gender: string | null
  ethnicity: string | null
  replicateVersionId: string | null
  replicateModelId: string | null
  userLoraScale: number | null
  loraWeightsUrl: string
}

type LoraDecision = {
  manualExtraLoraScale: number | undefined
  hasUserSetRealism: boolean
  shouldDisableExtraLora: boolean
}

export type TrainedModelGenerationInput = {
  userId: string | number
  conceptTitle: string
  conceptDescription?: string
  conceptPrompt: string
  category?: string
  referenceImageUrl?: string | string[] | null
  addTextOverlay?: boolean
  textOverlayConfig?: unknown
  isHighlight?: boolean
  customSettings?: Record<string, unknown>
  enhancedAuthenticity?: boolean
  source?: string
}

export type TrainedModelGenerationResult = {
  generationId: number
  predictionId: string
  finalPrompt: string
  creditsDeducted: number
  newBalance: number
}

export type TrainedModelGenerationCheckResult =
  | { status: "succeeded"; imageUrl: string; aiImageId?: number | null }
  | { status: "failed"; error: string }
  | { status: string }

export class TrainedModelGenerationError extends Error {
  status: number
  payload: Record<string, unknown>

  constructor(message: string, status = 500, payload: Record<string, unknown> = {}) {
    super(message)
    this.name = "TrainedModelGenerationError"
    this.status = status
    this.payload = payload
  }
}

function resolveUserGender(gender: string | null): string {
  if (!gender) return "person"
  const normalized = gender.toLowerCase().trim()
  if (normalized === "woman" || normalized === "female") return "woman"
  if (normalized === "man" || normalized === "male") return "man"
  return "person"
}

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
  }

  prompt +=
    ", realistic natural skin texture, visible pores, natural facial asymmetry," +
    " real camera photo, true facial structure, not waxy, not plastic skin," +
    " not airbrushed, not beauty-filtered, not CGI"

  return prompt
}

function readNumberSetting(settings: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = settings?.[key]
  return typeof value === "number" ? value : undefined
}

function readStringSetting(settings: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = settings?.[key]
  return typeof value === "string" ? value : undefined
}

function resolveLoraDecision(
  customSettings: Record<string, unknown> | undefined,
  enhancedAuthenticity: boolean,
  finalPrompt: string,
): LoraDecision {
  const manualExtraLoraScale =
    customSettings?.extraLoraScale === undefined
      ? readNumberSetting(customSettings, "realismStrength")
      : readNumberSetting(customSettings, "extraLoraScale")
  const hasUserSetRealism = manualExtraLoraScale !== undefined
  const hasAuthenticKeywords =
    /authentic\s+iphone|amateur\s+cellphone|raw\s+iphone|candid\s+photo|film\s+grain|muted\s+colors/i.test(
      finalPrompt,
    )
  const shouldDisableExtraLora =
    !hasUserSetRealism && (enhancedAuthenticity || hasAuthenticKeywords)

  return { manualExtraLoraScale, hasUserSetRealism, shouldDisableExtraLora }
}

function buildQualitySettings(
  presetSettings: QualitySettings,
  customSettings: Record<string, unknown> | undefined,
  userLoraScale: number | null,
  lora: LoraDecision,
) {
  const loraScale =
    customSettings?.styleStrength === undefined
      ? (userLoraScale ?? presetSettings.lora_scale)
      : (readNumberSetting(customSettings, "styleStrength") ?? userLoraScale ?? presetSettings.lora_scale)
  const baseExtraLoraScale = lora.hasUserSetRealism
    ? lora.manualExtraLoraScale
    : presetSettings.extra_lora_scale
  const extraLoraScale = lora.shouldDisableExtraLora ? 0 : baseExtraLoraScale

  return {
    ...presetSettings,
    aspect_ratio: readStringSetting(customSettings, "aspectRatio") ?? presetSettings.aspect_ratio,
    lora_scale: loraScale,
    guidance_scale: readNumberSetting(customSettings, "promptAccuracy") ?? presetSettings.guidance_scale,
    extra_lora: readStringSetting(customSettings, "extraLora") ?? presetSettings.extra_lora,
    extra_lora_scale: extraLoraScale,
    num_inference_steps: presetSettings.num_inference_steps,
  }
}

function appV3TrainedModelPreset(presetSettings: QualitySettings): QualitySettings {
  return {
    ...presetSettings,
    guidance_scale: 2.2,
    lora_scale: 0.9,
    extra_lora_scale: Math.min(presetSettings.extra_lora_scale ?? 0.08, 0.08),
    num_inference_steps: Math.min(presetSettings.num_inference_steps, 40),
  }
}

async function loadUserModel(userId: string | number): Promise<UserModelData | null> {
  const sql = getDbClient()
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
    WHERE u.id = ${userId}
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

function normalizeGenerationId(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    throw new TrainedModelGenerationError("Invalid generation id", 400, {
      error: "Invalid generation id",
    })
  }
  return parsed
}

function getPredictionOutputUrl(output: unknown): string | null {
  if (Array.isArray(output)) return typeof output[0] === "string" ? output[0] : null
  return typeof output === "string" ? output : null
}

export async function startTrainedModelGeneration(
  input: TrainedModelGenerationInput,
): Promise<TrainedModelGenerationResult> {
  const userId = String(input.userId)
  const conceptTitle = input.conceptTitle || "Maya custom model image"
  const conceptPrompt = input.conceptPrompt?.trim()

  if (!conceptPrompt) {
    throw new TrainedModelGenerationError("Missing concept prompt", 400, {
      error: "Missing concept prompt",
    })
  }

  const hasEnoughCredits = await checkCredits(userId, CREDIT_COSTS.IMAGE)
  if (!hasEnoughCredits) {
    const currentBalance = await getUserCredits(userId)
    throw new TrainedModelGenerationError("Insufficient credits", 402, {
      error: "Insufficient credits",
      code: "insufficient_credits",
      action: "open_credits_topup",
      required: CREDIT_COSTS.IMAGE,
      current: currentBalance,
      message: `Image generation requires ${CREDIT_COSTS.IMAGE} credit. You currently have ${currentBalance} credits. Please purchase more credits or upgrade your plan.`,
    })
  }

  const model = await loadUserModel(input.userId)
  if (!model) {
    throw new TrainedModelGenerationError("No trained model found", 409, {
      error: "No trained model found. Please complete training first.",
      code: "training_required",
      action: "open_training_upload",
      message: "Train your model to use Custom Model mode.",
    })
  }

  if (!model.replicateVersionId) {
    throw new TrainedModelGenerationError("Model version not found", 400, {
      error: "Model version not found. Please retrain your model.",
    })
  }

  if (!model.loraWeightsUrl) {
    throw new TrainedModelGenerationError("Model weights not found", 400, {
      error: "Model weights not found. Please retrain your model.",
    })
  }

  const userGender = resolveUserGender(model.gender)
  const finalPrompt = buildFinalPrompt(conceptPrompt, {
    triggerWord: model.triggerWord,
    userGender,
    ethnicity: model.ethnicity,
    isHighlight: input.isHighlight === true,
    enhancedAuthenticity: input.enhancedAuthenticity === true,
  })
  const rawPresetSettings =
    MAYA_QUALITY_PRESETS[input.category as keyof typeof MAYA_QUALITY_PRESETS] ||
    MAYA_QUALITY_PRESETS.default
  const presetSettings =
    input.source === "app-v3-custom-model" ? appV3TrainedModelPreset(rawPresetSettings) : rawPresetSettings
  const lora = resolveLoraDecision(input.customSettings, input.enhancedAuthenticity === true, finalPrompt)
  const qualitySettings = buildQualitySettings(
    presetSettings,
    input.customSettings,
    model.userLoraScale,
    lora,
  )
  const predictionInput = buildClassicModeReplicateInput({
    prompt: finalPrompt,
    qualitySettings,
    loraWeightsUrl: model.loraWeightsUrl,
    seed: readNumberSetting(input.customSettings, "seed") ?? randomInt(1_000_000),
    referenceImageUrl:
      input.source === "app-v3-custom-model" ? undefined : input.referenceImageUrl || undefined,
    extraLoraDisabled: lora.shouldDisableExtraLora,
  })

  const deductionResult = await deductCredits(
    userId,
    CREDIT_COSTS.IMAGE,
    "image",
    `Generated: ${conceptTitle}`,
  )
  if (!deductionResult.success) {
    throw new TrainedModelGenerationError("Could not deduct credits", 402, {
      error: "Could not deduct credits",
      code: "credit_deduction_failed",
      message: deductionResult.error ?? "Credit deduction failed. Please try again.",
    })
  }

  let prediction
  try {
    const replicate = getReplicateClient()
    prediction = await replicate.predictions.create({
      version: model.replicateVersionId,
      input: predictionInput,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new TrainedModelGenerationError("Failed to create Replicate prediction", 500, {
      error: message.includes("401") || message.includes("Unauthenticated")
        ? "Replicate authentication failed"
        : "Failed to generate image",
      details: message,
    })
  }

  const sql = getDbClient()
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
      ${input.userId},
      ${finalPrompt},
      ${input.conceptDescription || ""},
      ${input.category || "concept"},
      ${conceptTitle},
      ${JSON.stringify({
        prediction_id: prediction.id,
        status: "processing",
        text_overlay: input.addTextOverlay ? input.textOverlayConfig : null,
        source: input.source || "app-v3-custom-model",
      })},
      NOW()
    )
    RETURNING id
  `

  return {
    generationId: Number(insertResult[0].id),
    predictionId: prediction.id,
    finalPrompt,
    creditsDeducted: CREDIT_COSTS.IMAGE,
    newBalance: deductionResult.newBalance,
  }
}

export async function checkTrainedModelGeneration(input: {
  userId: string | number
  predictionId: string
  generationId: string | number
  source?: string
}): Promise<TrainedModelGenerationCheckResult> {
  const generationId = normalizeGenerationId(input.generationId)
  const prediction = await getReplicateClient().predictions.get(input.predictionId)

  if (prediction.status === "failed") {
    return {
      status: "failed",
      error: typeof prediction.error === "string" ? prediction.error : "Generation failed",
    }
  }

  if (prediction.status !== "succeeded" || !prediction.output) {
    return { status: prediction.status }
  }

  const outputUrl = getPredictionOutputUrl(prediction.output)
  if (!outputUrl) {
    throw new TrainedModelGenerationError("Generation completed without an image URL", 500, {
      error: "Generation completed without an image URL",
    })
  }

  const imageResponse = await fetch(outputUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`)
  }
  const imageBlob = await imageResponse.blob()

  if (imageBlob.size === 0) {
    throw new Error("Image blob is empty (0 bytes) - Replicate image may not be ready yet")
  }

  if (imageBlob.size < 1024) {
    console.warn("[app-v3-custom-model] Image blob is very small:", imageBlob.size, "bytes")
  }

  const blob = await put(`maya-generations/${generationId}.png`, imageBlob, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  })

  const sql = getDbClient()
  await sql`
    UPDATE generated_images
    SET
      image_urls = ${blob.url},
      selected_url = ${blob.url},
      saved = false
    WHERE id = ${generationId}
      AND user_id = ${input.userId}
  `

  const [generation] = await sql`
    SELECT user_id, prompt, description, category, subcategory
    FROM generated_images
    WHERE id = ${generationId}
      AND user_id = ${input.userId}
  `

  let aiImageId: number | null = null
  if (generation) {
    const [completedCountRow] = await sql`
      SELECT COUNT(*)::int AS count
      FROM ai_images
      WHERE user_id = ${generation.user_id}
        AND generation_status = 'completed'
    `
    const [existing] = await sql`
      SELECT id FROM ai_images WHERE prediction_id = ${input.predictionId}
    `

    if (!existing) {
      const inserted = await sql`
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
          ${generation.user_id},
          ${blob.url},
          ${generation.description || generation.subcategory || ""},
          ${generation.prompt || ""},
          ${input.predictionId},
          'completed',
          ${input.source || "app_v3_custom_model"},
          ${generation.category || "concept"},
          NOW()
        )
        RETURNING id
      `
      aiImageId = Number(inserted[0]?.id || 0) || null

      await logTtfiCompletionOnFirstGallerySave({
        userId: String(generation.user_id),
        source: "app_v3_custom_model_check",
        imageSource: input.source || "app_v3_custom_model",
        predictionId: input.predictionId,
        isFirstGalleryImage: Number(completedCountRow?.count || 0) === 0,
      })
    } else {
      aiImageId = Number(existing.id)
    }

    hookMayaGeneration({
      imageUrl: blob.url,
      prompt: generation.prompt || generation.description || generation.subcategory || "",
      userId: generation.user_id,
      generationId: String(generationId),
      predictionId: input.predictionId,
      category: generation.category,
    }).catch(() => {})
  }

  return {
    status: "succeeded",
    imageUrl: blob.url,
    aiImageId,
  }
}
