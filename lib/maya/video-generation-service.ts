import { put } from "@vercel/blob"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { isVideoGenerationEnabled } from "@/lib/app-v3/video-flag"
import {
  addCredits,
  checkCredits,
  CREDIT_COSTS,
  deductCredits,
  getUserCredits,
} from "@/lib/credits"
import { getDbClient } from "@/lib/db/client"
import { generatePrompt } from "@/lib/generation/prompt"
import { generateMotionPromptWithVisionFallbacks } from "@/lib/maya/motion-prompt-llm"
import { getMayaUserSnapshot } from "@/lib/maya/user-snapshot"
import {
  buildMayaMotionPromptInput,
  cleanGeneratedMotionPrompt,
  isMotionPromptReferenceImageUrl,
  resolveFluxPromptForMotion,
} from "@/lib/maya/video-motion-context"
import { getReplicateClient } from "@/lib/replicate-client"
import { buildLikenessPromptBlock, isLikenessMemoryEnabled } from "@/lib/app-v3/likeness-memory"
import { getMemory } from "@/lib/app-v3/maya/memory-store"

export type VideoGenerationInput = {
  userId: string | number
  imageUrl: unknown
  imageId?: string | number | null
  motionPrompt?: string | null
  imageDescription?: string | null
  category?: string | null
  source?: string
}

export type VideoGenerationResult = {
  videoId: number
  predictionId: string
  status: "processing"
  creditsDeducted: number
  newBalance: number
  motionPrompt: string
}

export type VideoGenerationCheckResult =
  | { status: "succeeded"; videoUrl: string; progress: 100 }
  | { status: "failed"; error: string }
  | { status: string; progress: number; message?: string }

export class VideoGenerationError extends Error {
  status: number
  payload: Record<string, unknown>

  constructor(message: string, status = 500, payload: Record<string, unknown> = {}) {
    super(message)
    this.name = "VideoGenerationError"
    this.status = status
    this.payload = payload
  }
}

const DEFAULT_VIDEO_MODEL = "kwaivgi/kling-v3-omni-video"

/**
 * Persistent, behavior-only failure log so video failure rates are visible
 * (analytics_events is the behavior table per the Admin Data Contract).
 * Never throws: losing a log line must not break the member-facing flow.
 */
async function logVideoGenerationFailure(input: {
  userId: string
  stage: "create_prediction" | "prediction_failed"
  errorMessage: string
  model?: string
  videoId?: number
  predictionId?: string
  refunded: boolean
  refundError?: string
}): Promise<void> {
  try {
    await logAnalyticsEvent({
      eventName: "suite_video_generation_failed",
      userId: input.userId,
      properties: {
        stage: input.stage,
        error: input.errorMessage.slice(0, 400),
        model: input.model ?? null,
        videoId: input.videoId ?? null,
        predictionId: input.predictionId ?? null,
        refunded: input.refunded,
        refundError: input.refundError ?? null,
      },
    })
  } catch (error) {
    console.error("[app-v3-video] Failed to log video failure event:", error)
  }
}

/**
 * Refund the animation credits for one failed video. Refund problems are logged
 * loudly (they used to be silently swallowed, which burned member credits).
 */
async function refundVideoCredits(
  userId: string,
  description: string
): Promise<{ refunded: boolean; refundError?: string }> {
  try {
    const refund = await addCredits(userId, CREDIT_COSTS.ANIMATION, "refund", description)
    if (!refund.success) {
      console.error("[app-v3-video] Credit refund FAILED:", { userId, description, error: refund.error })
      return { refunded: false, refundError: refund.error ?? "addCredits returned success=false" }
    }
    return { refunded: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[app-v3-video] Credit refund THREW:", { userId, description, error: message })
    return { refunded: false, refundError: message }
  }
}
const VIDEO_DURATION_SECONDS = 5
const VIDEO_NEGATIVE_PROMPT =
  "blurry, low quality, distorted face, warping, morphing, identity drift, unnatural motion, flickering, artifacts, extra limbs, duplicate person, extra characters, subtitles, text overlay, random letters, jittery edges, aggressive camera shake"

type VideoResolution = "480p" | "720p" | "1080p"

function videoModel(): string {
  return process.env.APP_V3_VIDEO_MODEL?.trim() || DEFAULT_VIDEO_MODEL
}

function isWan22(model: string): boolean {
  return model.includes("wan-2.2")
}

function isWan27I2V(model: string): boolean {
  return model.includes("wan-2.7-i2v")
}

function isSeedance20(model: string): boolean {
  return model.includes("seedance-2.0")
}

function isKlingV3Omni(model: string): boolean {
  return model.includes("kling-v3-omni-video")
}

function videoResolution(model: string): VideoResolution {
  const requested = process.env.APP_V3_VIDEO_RESOLUTION?.trim()
  if (requested === "480p" || requested === "720p" || requested === "1080p") {
    if (isWan22(model) && requested === "1080p") return "720p"
    if (!isWan22(model) && requested === "480p") return "720p"
    return requested
  }
  return "720p"
}

function klingModeForResolution(resolution: VideoResolution): "standard" | "pro" {
  return resolution === "1080p" ? "pro" : "standard"
}

function videoPromptExpansionEnabled(): boolean {
  const value = process.env.APP_V3_VIDEO_PROMPT_EXPANSION
  if (value === undefined || value === null || value.trim() === "") return false
  return ["1", "true", "yes"].includes(value.trim().toLowerCase())
}

function buildPredictionInput(input: { model: string; imageUrl: string; motionPrompt: string }) {
  const seed = Math.floor(Math.random() * 1_000_000)
  const resolution = videoResolution(input.model)
  if (isWan22(input.model)) {
    return {
      image: input.imageUrl,
      prompt: input.motionPrompt,
      resolution,
      go_fast: true,
      seed,
    }
  }

  if (isWan27I2V(input.model)) {
    return {
      first_frame: input.imageUrl,
      prompt: input.motionPrompt,
      duration: VIDEO_DURATION_SECONDS,
      resolution,
      negative_prompt: VIDEO_NEGATIVE_PROMPT,
      enable_prompt_expansion: videoPromptExpansionEnabled(),
      seed,
    }
  }

  if (isSeedance20(input.model)) {
    return {
      image: input.imageUrl,
      prompt: input.motionPrompt,
      duration: VIDEO_DURATION_SECONDS,
      resolution,
      aspect_ratio: "adaptive",
      generate_audio: false,
      seed,
    }
  }

  if (isKlingV3Omni(input.model)) {
    return {
      start_image: input.imageUrl,
      prompt: input.motionPrompt,
      mode: klingModeForResolution(resolution),
      duration: VIDEO_DURATION_SECONDS,
      generate_audio: false,
    }
  }

  return {
    image: input.imageUrl,
    prompt: input.motionPrompt,
    duration: VIDEO_DURATION_SECONDS,
    resolution,
    negative_prompt: VIDEO_NEGATIVE_PROMPT,
    enable_prompt_expansion: videoPromptExpansionEnabled(),
    seed,
  }
}

const MOTION_PROMPT_SYSTEM = `You are Maya, SSELFIE Studio's brand-safe motion director for image-to-video generation.

Your job is to write one motion prompt for the selected still image so the generated video stays recognizable, elegant, and physically believable.

Rules:
- Use what is visible in the image. Do not invent a new outfit, location, person, product, or camera setup.
- Keep movement subtle-to-moderate: natural blink, tiny expression shift, soft breathing, fabric or hair movement, gentle push-in, slow parallax, ambient movement.
- Preserve identity, face shape, skin tone, body proportions, outfit, composition, and scene.
- If the input names known likeness corrections for this member, honor them exactly - they take priority over anything the still image itself seems to show.
- Avoid subtitles, text overlays, aggressive camera shake, big body changes, extra people, face morphing, or scene changes.
- Output exactly one line with no markdown, bullets, headings, or quotes.`

function validateImageUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new VideoGenerationError("Missing image URL", 400, { error: "Missing image URL" })
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new VideoGenerationError("Missing image URL", 400, { error: "Missing image URL" })
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== "https:") throw new Error("not https")
    return trimmed
  } catch {
    throw new VideoGenerationError("Invalid image URL", 400, {
      error: "Video needs a public https image URL.",
    })
  }
}

function normalizeVideoId(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    throw new VideoGenerationError("Invalid video id", 400, { error: "Invalid video id" })
  }
  return parsed
}

function predictionOutputUrl(output: unknown): string | null {
  if (Array.isArray(output)) return typeof output[0] === "string" ? output[0] : null
  return typeof output === "string" ? output : null
}

function normalizeOptionalImageId(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number.parseInt(value, 10)
  return null
}

async function buildMotionPrompt(input: VideoGenerationInput): Promise<string> {
  const snapshot = await getMayaUserSnapshot(input.userId)
  const effectiveScene = resolveFluxPromptForMotion({
    fluxPrompt: input.motionPrompt,
    description: input.imageDescription,
    imageUrl: input.imageUrl,
  })
  if (effectiveScene && isMotionPromptReferenceImageUrl(input.imageUrl)) {
    // LIKENESS-MEMORY-01 (video, 2026-07-06): every other format (photo, carousel, story) already
    // rides her stored accuracy corrections; video never did. Same flag, same fetch, same block
    // builder as app-v3/generate route - fail-open so a lookup error never blocks the video.
    let likenessBlock = ""
    if (isLikenessMemoryEnabled()) {
      try {
        const memory = await getMemory(String(input.userId))
        if (memory.likenessNotes.length > 0) {
          likenessBlock = buildLikenessPromptBlock(memory.likenessNotes)
        }
      } catch (likenessError) {
        console.error("[app-v3-video] likeness notes skipped:", likenessError)
      }
    }
    const promptInput = buildMayaMotionPromptInput({
      fluxPrompt: effectiveScene,
      description: typeof input.imageDescription === "string" ? input.imageDescription : "",
      category: typeof input.category === "string" ? input.category : "",
      imageUrl: input.imageUrl,
      snapshot,
      likenessBlock,
    })
    const generatedPrompt = await generateMotionPromptWithVisionFallbacks(
      MOTION_PROMPT_SYSTEM,
      promptInput,
      input.imageUrl
    )
    return cleanGeneratedMotionPrompt(generatedPrompt)
  }

  const rawPreferenceNotes =
    snapshot.memoryData && typeof snapshot.memoryData === "object"
      ? (snapshot.memoryData as Record<string, unknown>).user_preference_notes
      : []
  const styleNotes = Array.isArray(rawPreferenceNotes)
    ? rawPreferenceNotes
        .map(note => (typeof note === "string" ? note.replace(/\s+/g, " ").trim() : ""))
        .filter(Boolean)
        .slice(0, 4)
    : []

  const authorityResult = await generatePrompt("video", "video-generation", {
    userId: String(input.userId),
    motionPrompt: input.motionPrompt,
    imageDescription: input.imageDescription,
    category: input.category || "",
    userRequest: input.imageDescription || input.motionPrompt || "",
    styleNotes,
    offerBriefPrefill: snapshot.offerBrief.prefill,
    recommendedSource: snapshot.generation.recommendedSource,
    uploadsTotal: snapshot.uploads.total,
  })

  return authorityResult.prompt
}

export async function startVideoGeneration(
  input: VideoGenerationInput
): Promise<VideoGenerationResult> {
  if (!isVideoGenerationEnabled()) {
    throw new VideoGenerationError("Video generation is disabled", 503, {
      error: "Video creation is paused right now. Photos still work.",
      code: "video_disabled",
    })
  }

  const userId = String(input.userId)
  const imageUrl = validateImageUrl(input.imageUrl)

  const hasEnoughCredits = await checkCredits(userId, CREDIT_COSTS.ANIMATION)
  if (!hasEnoughCredits) {
    const currentBalance = await getUserCredits(userId)
    throw new VideoGenerationError("Insufficient credits", 402, {
      error: "Insufficient credits",
      code: "insufficient_credits",
      action: "open_credits_topup",
      required: CREDIT_COSTS.ANIMATION,
      current: currentBalance,
      message: `Video generation requires ${CREDIT_COSTS.ANIMATION} credits.`,
    })
  }

  const label = input.imageId ? `Animated image: ${input.imageId}` : "Animated image"
  const deduction = await deductCredits(userId, CREDIT_COSTS.ANIMATION, "animation", label)
  if (!deduction.success) {
    throw new VideoGenerationError("Could not deduct credits", 402, {
      error: "Could not deduct credits",
      code: "credit_deduction_failed",
      message: deduction.error ?? "Credit deduction failed. Please try again.",
    })
  }

  let finalMotionPrompt: string
  try {
    finalMotionPrompt = await buildMotionPrompt(input)
  } catch (error) {
    console.warn("[app-v3-video] Prompt authority failed, using direct prompt:", error)
    finalMotionPrompt =
      input.motionPrompt?.trim() ||
      "subtle natural movement, gentle camera push-in, preserve identity, no subtitles"
  }

  const model = videoModel()
  const predictionInput = buildPredictionInput({ model, imageUrl, motionPrompt: finalMotionPrompt })

  let prediction
  try {
    prediction = await getReplicateClient().predictions.create({
      model,
      input: predictionInput,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const refund = await refundVideoCredits(
      userId,
      `Refund for failed app-v3 video generation: ${input.imageId || "image"}`
    )
    await logVideoGenerationFailure({
      userId,
      stage: "create_prediction",
      errorMessage: message,
      model,
      refunded: refund.refunded,
      refundError: refund.refundError,
    })
    throw new VideoGenerationError("Failed to create video prediction", 500, {
      error: "Failed to generate video",
      details: message,
    })
  }

  let inserted
  try {
    const sql = getDbClient()
    inserted = await sql`
      INSERT INTO generated_videos (
        user_id,
        image_id,
        image_source,
        motion_prompt,
        job_id,
        status,
        progress,
        created_at
      ) VALUES (
        ${input.userId},
        ${normalizeOptionalImageId(input.imageId)},
        ${imageUrl},
        ${finalMotionPrompt},
        ${prediction.id},
        'processing',
        0,
        NOW()
      )
      RETURNING id
    `
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const refund = await refundVideoCredits(
      userId,
      `Refund for unsaved app-v3 video generation: ${input.imageId || "image"}`
    )
    await logVideoGenerationFailure({
      userId,
      stage: "create_prediction",
      errorMessage: `DB save failed: ${message}`,
      model,
      predictionId: prediction.id,
      refunded: refund.refunded,
      refundError: refund.refundError,
    })
    throw new VideoGenerationError("Could not save video generation", 500, {
      error: "Could not save video generation",
      details: message,
    })
  }

  return {
    videoId: Number(inserted[0].id),
    predictionId: prediction.id,
    status: "processing",
    creditsDeducted: CREDIT_COSTS.ANIMATION,
    newBalance: deduction.newBalance,
    motionPrompt: finalMotionPrompt,
  }
}

export async function checkVideoGeneration(input: {
  userId: string | number
  predictionId: string
  videoId: string | number
}): Promise<VideoGenerationCheckResult> {
  const videoId = normalizeVideoId(input.videoId)
  const sql = getDbClient()

  const ownedRows = await sql`
    SELECT id, status, error_message
    FROM generated_videos
    WHERE id = ${videoId}
      AND user_id = ${input.userId}
      AND job_id = ${input.predictionId}
    LIMIT 1
  `
  if (ownedRows.length === 0) {
    throw new VideoGenerationError("Video not found", 404, { error: "Video not found" })
  }
  if (ownedRows[0]?.status === "failed") {
    return {
      status: "failed",
      error:
        typeof ownedRows[0]?.error_message === "string"
          ? ownedRows[0].error_message
          : "Video generation failed",
    }
  }

  let prediction
  try {
    prediction = await getReplicateClient().predictions.get(input.predictionId)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("Too Many Requests") || message.includes("429")) {
      return { status: "processing", progress: 50, message: "Rate limited, retrying..." }
    }
    throw error
  }

  if (prediction.status === "failed") {
    const errorMessage =
      typeof prediction.error === "string" ? prediction.error : "Video generation failed"
    // Atomically claim the failed transition so concurrent polls refund exactly once:
    // only the poll that flips the row away from 'failed' issues the refund.
    const claimed = await sql`
      UPDATE generated_videos
      SET status = 'failed', error_message = ${errorMessage}, updated_at = NOW()
      WHERE id = ${videoId}
        AND user_id = ${input.userId}
        AND status IS DISTINCT FROM 'failed'
      RETURNING id
    `
    if (claimed.length > 0) {
      const refund = await refundVideoCredits(
        String(input.userId),
        `Refund for failed app-v3 video prediction: ${videoId}`
      )
      await logVideoGenerationFailure({
        userId: String(input.userId),
        stage: "prediction_failed",
        errorMessage,
        videoId,
        predictionId: input.predictionId,
        refunded: refund.refunded,
        refundError: refund.refundError,
      })
    }
    return { status: "failed", error: errorMessage }
  }

  if (prediction.status !== "succeeded" || !prediction.output) {
    const progress =
      prediction.status === "starting" ? 10 : prediction.status === "processing" ? 50 : 0
    await sql`
      UPDATE generated_videos
      SET progress = ${progress}, updated_at = NOW()
      WHERE id = ${videoId}
        AND user_id = ${input.userId}
    `
    return { status: prediction.status, progress }
  }

  const outputUrl = predictionOutputUrl(prediction.output)
  if (!outputUrl) {
    throw new VideoGenerationError("Video completed without a URL", 500, {
      error: "Video completed without a URL",
    })
  }

  const videoResponse = await fetch(outputUrl)
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`)
  }
  const videoBlob = await videoResponse.blob()
  if (videoBlob.size === 0) throw new Error("Video blob is empty")

  const blob = await put(`maya-videos/${videoId}.mp4`, videoBlob, {
    access: "public",
    contentType: "video/mp4",
    addRandomSuffix: true,
  })

  await sql`
    UPDATE generated_videos
    SET
      status = 'completed',
      video_url = ${blob.url},
      progress = 100,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${videoId}
      AND user_id = ${input.userId}
  `

  return {
    status: "succeeded",
    videoUrl: blob.url,
    progress: 100,
  }
}
