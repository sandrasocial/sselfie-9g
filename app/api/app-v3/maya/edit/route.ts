// SSELFIE Studio 3.0 - true Edit Mode (MAYA-REBUILD-05 Phase 4).
// Image-to-image refinement: the GENERATED image is the input, and one instruction is applied
// ("make my blazer black", "brighter", "change the background"), keeping everything else.
// Distinct from /generate (which uses the selfie). Synchronous, credit-metered, persists to
// the gallery. Isolated /app endpoint.

import { type NextRequest, NextResponse } from "next/server"
import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { del, put } from "@vercel/blob"
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
import { conceptRequestSize } from "@/lib/app-v3/prompt-compiler"
import { AVOID_LIST, ELEVATION } from "@/lib/app-v3/maya/ingredients"
import { SSELFIE_ENVIRONMENT_INTEGRATION } from "@/lib/app-v3/maya/visual-rules"
import {
  buildLikenessPromptBlock,
  classifyLikenessCorrection,
  isLikenessMemoryEnabled,
  VANITY_DRIFT_PATTERN,
} from "@/lib/app-v3/likeness-memory"
import { addLikenessNote, getMemory } from "@/lib/app-v3/maya/memory-store"
import {
  buildLikenessAcknowledgement,
  decideLikenessCapture,
} from "@/lib/app-v3/maya/likeness-capture-ux"
import { isContentPolicyError, sanitizePromptForImageSafety } from "@/lib/ai/image-safety"
import { logAdminError } from "@/lib/admin-error-log"
import type { OutputFormat } from "@/components/app-v3/types"
import { parseGalleryAssetId } from "@/lib/app-v3/gallery-assets"
import {
  CONVERSATIONAL_PHOTO_EDIT_CREDIT_COST,
  conversationalEditInstruction,
  conversationalEditNeedsCreditConfirmation,
  parseConversationalPhotoEditRequest,
  type ConversationalPhotoEditReceipt,
} from "@/lib/app-v3/maya/conversational-photo-edit"

export const maxDuration = 300

const sql = getDbClient()
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const VALID_FORMATS: OutputFormat[] = [
  "photo",
  "photoshoot",
  "reel-cover",
  "carousel",
  "story-slide",
  "story-sequence",
]

// Matches qualityForFormat in the generate route (MEASURED there): SUITE renders at MEDIUM with
// the same env override, so refining a photo never silently changes its quality tier.
type ImgQuality = "low" | "medium" | "high"
const QUALITY_OVERRIDE = process.env.APP_V3_IMAGE_QUALITY as ImgQuality | undefined
const EDIT_IMAGE_QUALITY: ImgQuality =
  QUALITY_OVERRIDE === "low" || QUALITY_OVERRIDE === "medium" || QUALITY_OVERRIDE === "high"
    ? QUALITY_OVERRIDE
    : "medium"

// MAYA-FIX-02: edits used to feed only the PRIOR generated image back in, so each pass drifted
// the face further from the member's real likeness. Re-attach her real selfie as an identity
// reference on every edit. Prefer the URL the client sends; fall back to her active selfie.
async function resolveIdentitySelfieUrl(
  neonUserId: string | number,
  bodyUrl: unknown
): Promise<string | null> {
  if (isAllowedImageUrl(bodyUrl)) return bodyUrl
  try {
    const rows = await sql`
      SELECT image_url FROM user_avatar_images
      WHERE user_id = ${String(neonUserId)} AND image_type = 'selfie' AND is_active = true
      ORDER BY uploaded_at DESC
      LIMIT 1
    `
    const url = rows[0]?.image_url
    return isAllowedImageUrl(url) ? url : null
  } catch {
    return null
  }
}

// Vanity-drift doctrine guard ("flawless", "make me slimmer/younger") now lives in
// lib/app-v3/likeness-memory.ts (VANITY_DRIFT_PATTERN), shared with the note classifier:
// her at her natural best, never a different face or body. AI should not erase you.

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

type OwnedCanonicalEditAsset = {
  id: number
  imageUrl: string
  title: string | null
  rootId: number
  format: OutputFormat
}

async function resolveOwnedCanonicalEditAsset(
  neonUserId: string | number,
  assetId: unknown
): Promise<OwnedCanonicalEditAsset | null> {
  const parsed = parseGalleryAssetId(assetId)
  if (!parsed || parsed.kind !== "ai") return null
  const rows = await sql`
    SELECT id, image_url, title, variant_of, category
    FROM ai_images
    WHERE id = ${parsed.numericId} AND user_id = ${neonUserId}
    LIMIT 1
  `
  const row = rows[0]
  if (!row || !isAllowedImageUrl(row.image_url)) return null
  const candidateFormat = row.category as OutputFormat
  return {
    id: Number(row.id),
    imageUrl: row.image_url,
    title: typeof row.title === "string" ? row.title : null,
    rootId: Number(row.variant_of || row.id),
    format: VALID_FORMATS.includes(candidateFormat) ? candidateFormat : "photo",
  }
}

async function loadImage(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Could not load the image to edit")
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

function buildEditPrompt(
  instruction: string,
  safer = false,
  hasIdentityReference = false,
  likenessBlock = ""
): string {
  const base =
    "Refine the first attached image. Keep the same person, likeness, framing, composition, background, " +
    "and overall look. Apply ONLY this change: "
  const identity = hasIdentityReference
    ? " The last attached image is her real reference selfie. Use it only to keep her face, facial " +
      "structure, skin tone, natural skin texture, body proportions, and age true to the real person. " +
      "Do not copy its pose, framing, lighting, or background."
    : ""
  const doctrine = VANITY_DRIFT_PATTERN.test(instruction)
    ? " Interpret that change as showing her at her natural best: keep her real facial structure, " +
      "body proportions, age, and natural skin texture. No beauty-filter smoothing, no face slimming, " +
      "no de-aging. Still clearly recognizable as the same woman."
    : ""
  // If the edit changes the scene or background, her lighting must follow it - re-lit by the
  // new environment, never carried over from the old frame (that's the pasted-in look).
  const tail = safer
    ? " Keep it tasteful, fully clothed, and modest."
    : ` Keep it natural and editorial. If this change alters the background, location, or time of day, re-light her to match the new scene. ${SSELFIE_ENVIRONMENT_INTEGRATION} ${ELEVATION} ${AVOID_LIST}`
  // LIKENESS-MEMORY-01: stored accuracy notes complement the real-selfie anchor above.
  const likeness = likenessBlock ? `\n\n${likenessBlock}` : ""
  // On the safer retry, actually scrub the member's own free-typed instruction text (previously
  // this only appended a modest tail - a risky word IN the instruction itself, e.g. "make it
  // lace", was never touched, so the retry could fail for the same reason as the first attempt).
  const cleanInstruction = safer
    ? sanitizePromptForImageSafety(instruction.trim()).replace(
        /\nKeep the styling modest, fully clothed, elegant, and tasteful\.$/,
        ""
      )
    : instruction.trim()
  return `${base}${cleanInstruction}.${identity}${doctrine}${tail}${likeness}`
}

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (!rate.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rate.retryAfter },
      { status: 429 }
    )
  }

  try {
    if (!isOpenAIImageEnabled()) {
      return NextResponse.json({ error: "This feature is not currently enabled." }, { status: 403 })
    }

    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await request.json().catch(() => null)) as {
      imageUrl?: string
      instruction?: string
      format?: OutputFormat
      referenceSelfieUrl?: string
      sourceImageId?: number
      conversation?: unknown
      sourceTitle?: string
    } | null
    if (!body) {
      return NextResponse.json({ error: "A valid image to edit is required" }, { status: 400 })
    }
    const isConversationalRequest = body.conversation !== undefined
    const conversation = parseConversationalPhotoEditRequest(body.conversation)
    if (isConversationalRequest && !conversation) {
      return NextResponse.json(
        { error: "Invalid conversational edit request", code: "invalid_edit_contract" },
        { status: 400 }
      )
    }
    if (!conversation && !isAllowedImageUrl(body.imageUrl)) {
      return NextResponse.json({ error: "A valid image to edit is required" }, { status: 400 })
    }
    const instruction = conversationalEditInstruction(body.instruction) ?? ""
    if ((!conversation || conversation.action === "apply") && !instruction)
      return NextResponse.json({ error: "Tell Maya what to change" }, { status: 400 })

    let format: OutputFormat =
      body.format && VALID_FORMATS.includes(body.format) ? body.format : "photo"
    let sourceImageId =
      typeof body.sourceImageId === "number" &&
      Number.isInteger(body.sourceImageId) &&
      body.sourceImageId > 0
        ? body.sourceImageId
        : null
    let sourceImageUrl = isAllowedImageUrl(body.imageUrl) ? body.imageUrl : ""
    let sourceAssetId = sourceImageId ? `ai_${sourceImageId}` : null
    let rootAssetId = sourceAssetId
    let authoritativeEditDepth = 0
    let imageTitle =
      typeof body.sourceTitle === "string" && body.sourceTitle.trim()
        ? body.sourceTitle.trim().slice(0, 120)
        : `Edited ${format}`

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser)
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })

    if (conversation) {
      const ownedSource = await resolveOwnedCanonicalEditAsset(
        neonUser.id,
        conversation.sourceAssetId
      )
      const ownedAsset =
        conversation.action === "undo"
          ? await resolveOwnedCanonicalEditAsset(neonUser.id, conversation.undoToAssetId)
          : ownedSource
      if (!ownedSource || !ownedAsset) {
        return NextResponse.json(
          {
            error: "Choose a photo from your Gallery before editing",
            code: "edit_source_not_found",
          },
          { status: 404 }
        )
      }
      if (ownedSource.rootId !== ownedAsset.rootId) {
        return NextResponse.json(
          { error: "That version is not part of this edit history", code: "stale_edit_history" },
          { status: 409 }
        )
      }
      const canonicalRootAssetId = `ai_${ownedSource.rootId}`
      if (conversation.rootAssetId && conversation.rootAssetId !== canonicalRootAssetId) {
        return NextResponse.json(
          { error: "This edit history is out of date", code: "stale_edit_history" },
          { status: 409 }
        )
      }
      const versionCountRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM ai_images
        WHERE user_id = ${neonUser.id}
          AND (id = ${ownedSource.rootId} OR variant_of = ${ownedSource.rootId})
      `
      authoritativeEditDepth = Math.max(0, Number(versionCountRows[0]?.count || 1) - 1)

      if (conversation.action === "undo") {
        const receipt: ConversationalPhotoEditReceipt = {
          action: "undo",
          sourceAssetId: conversation.sourceAssetId,
          resultAssetId: `ai_${ownedAsset.id}`,
          rootAssetId: canonicalRootAssetId,
          instruction: null,
          historyDepth: authoritativeEditDepth,
          creditRequestId: null,
        }
        return NextResponse.json({
          success: true,
          imageUrl: ownedAsset.imageUrl,
          aiImageId: ownedAsset.id,
          creditsDeducted: 0,
          editReceipt: receipt,
        })
      }

      sourceImageId = ownedAsset.rootId
      sourceImageUrl = ownedAsset.imageUrl
      sourceAssetId = `ai_${ownedAsset.id}`
      rootAssetId = canonicalRootAssetId
      format = ownedAsset.format
      imageTitle = ownedAsset.title?.slice(0, 120) || `Edited ${format}`

      if (conversationalEditNeedsCreditConfirmation(conversation)) {
        return NextResponse.json(
          {
            error: "Confirm this one-credit edit before Maya applies it",
            code: "edit_confirmation_required",
            action: "confirm_edit",
            creditCost: CONVERSATIONAL_PHOTO_EDIT_CREDIT_COST,
            instruction,
            sourceAssetId,
            rootAssetId,
          },
          { status: 428 }
        )
      }
    }

    const size = toOpenAIEditSize(conceptRequestSize(format))

    // BRIDGE-01 Phase D: members and active trials only (same lock as generate).
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
            { status: 403 }
          )
        }
      }
    }

    const requestRefSuffix =
      conversation?.action === "apply" && conversation.creditConfirmation
        ? `edit-${conversation.creditConfirmation.requestId}`
        : Date.now()
    const requestRef = `app-v3-gen-${neonUser.id}-${requestRefSuffix}`

    if (conversation?.action === "apply" && conversation.creditConfirmation) {
      const existing = await sql`
        SELECT id, image_url, variant_of
        FROM ai_images
        WHERE user_id = ${neonUser.id} AND prediction_id = ${requestRef + "-0"}
        LIMIT 1
      `
      const prior = existing[0]
      if (prior && isAllowedImageUrl(prior.image_url)) {
        const receipt: ConversationalPhotoEditReceipt = {
          action: "apply",
          sourceAssetId: sourceAssetId!,
          resultAssetId: `ai_${prior.id}`,
          rootAssetId: `ai_${prior.variant_of || sourceImageId}`,
          instruction,
          historyDepth: authoritativeEditDepth,
          creditRequestId: conversation.creditConfirmation.requestId,
        }
        return NextResponse.json({
          success: true,
          imageUrl: prior.image_url,
          aiImageId: Number(prior.id),
          creditsDeducted: 0,
          newBalance: await getUserCredits(neonUser.id),
          idempotentReplay: true,
          editReceipt: receipt,
        })
      }
      const priorUsage = await sql`
        SELECT 1
        FROM credit_transactions
        WHERE user_id = ${neonUser.id}
          AND transaction_type = 'image'
          AND reference_id = ${requestRef}
        LIMIT 1
      `
      if (priorUsage.length > 0) {
        return NextResponse.json(
          {
            error: "This edit request has already been used. Try again as a new edit.",
            code: "edit_request_already_used",
          },
          { status: 409 }
        )
      }
    }

    // ── LIKENESS-MEMORY-01 (flag-gated, fail-open): read her stored accuracy notes for this
    // edit's prompt, then LEARN from this instruction. A likeness correction ("my hair is dark
    // brown not black") becomes a durable note she never has to repeat; a vanity ask is never
    // stored (the doctrine guard in buildEditPrompt handles it in-flight). Notes are read
    // BEFORE capture so the new note doesn't duplicate the instruction already in the prompt.
    let likenessBlock = ""
    let likenessMemory:
      | { status: "captured"; note: string; acknowledgement: string }
      | { status: "offer"; note: string }
      | null = null
    if (isLikenessMemoryEnabled()) {
      try {
        const memory = await getMemory(String(neonUser.id))
        if (memory.likenessNotes.length > 0) {
          likenessBlock = buildLikenessPromptBlock(memory.likenessNotes)
        }
        const classification = classifyLikenessCorrection(instruction)
        if (classification.isLikeness && classification.note) {
          const captureDecision = decideLikenessCapture(classification)
          if (captureDecision === "offer") {
            likenessMemory = { status: "offer", note: classification.note }
          } else if (captureDecision === "capture") {
            const saved = await addLikenessNote(String(neonUser.id), classification.note)
            likenessMemory = {
              status: "captured",
              note: classification.note,
              acknowledgement: buildLikenessAcknowledgement(classification.note),
            }
            if (saved.added || saved.updated) {
              import("@/lib/analytics/events")
                .then(({ logAnalyticsEvent }) =>
                  logAnalyticsEvent({
                    eventName: "suite_likeness_note_captured",
                    userId: String(neonUser.id),
                    properties: {
                      source: "app-v3-edit",
                      category: classification.category,
                      updated: saved.updated,
                      total_notes: saved.total,
                    },
                  })
                )
                .catch(() => {})
            }
          }
        }
      } catch (likenessError) {
        console.error("[app-v3 edit] likeness memory skipped:", likenessError)
      }
    }

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
        { status: 402 }
      )
    }
    const deduction = await deductCredits(
      neonUser.id,
      CREDIT_COSTS.IMAGE,
      "image",
      `app-v3 edit: ${instruction.slice(0, 50)}`,
      requestRef
    )
    if (!deduction.success) {
      return NextResponse.json(
        { error: deduction.error ?? "Credit deduction failed.", code: "credit_deduction_failed" },
        { status: 402 }
      )
    }

    const refundRef = requestRef
    const refundOrAlert = async (amount: number, reason: string, ref: string) => {
      try {
        const result = await refundCredits(neonUser.id, amount, reason, ref)
        if (!result.success) throw new Error(result.error || "refund reported failure")
      } catch (refundError) {
        console.error("[app-v3 edit] refund failed:", reason, refundError)
        await logAdminError({
          toolName: "app-v3-edit-refund",
          error: refundError,
          context: { userId: neonUser.id, amount, reason, ref },
        }).catch(() => {})
      }
    }
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error("[app-v3 edit] OPENAI_API_KEY is not set in this environment.")
      await refundOrAlert(CREDIT_COSTS.IMAGE, "OpenAI API key not configured", refundRef)
      return NextResponse.json(
        {
          error: "Editing is temporarily unavailable. Please try again later.",
          code: "openai_not_configured",
        },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })
    let sourceFile: Awaited<ReturnType<typeof toFile>>
    try {
      sourceFile = await toFile(
        await normalize(await loadImage(sourceImageUrl)),
        "maya-edit-source.png",
        { type: "image/png" }
      )
    } catch (sourceError) {
      await refundOrAlert(CREDIT_COSTS.IMAGE, "Edit source could not be loaded", refundRef)
      console.error("[app-v3 edit] source load failed:", sourceError)
      return NextResponse.json(
        { error: "That photo could not be loaded. Choose it again from your Gallery." },
        { status: 500 }
      )
    }

    // Re-attach her real selfie so likeness is anchored to the person, not the previous
    // generation. Best effort: if no selfie is resolvable, the edit still runs (old behavior).
    const identitySelfieUrl = await resolveIdentitySelfieUrl(neonUser.id, body.referenceSelfieUrl)
    let editImages = [sourceFile]
    if (identitySelfieUrl) {
      try {
        const selfieFile = await toFile(
          await normalize(await loadImage(identitySelfieUrl)),
          "maya-edit-identity.png",
          { type: "image/png" }
        )
        editImages = [sourceFile, selfieFile]
      } catch (selfieError) {
        console.error("[app-v3 edit] identity selfie attach skipped:", selfieError)
      }
    }
    const hasIdentityReference = editImages.length > 1

    const logEditFailure = (reason: string, detail: unknown) =>
      import("@/lib/analytics/events")
        .then(({ logAnalyticsEvent }) =>
          logAnalyticsEvent({
            eventName: "suite_generation_failed",
            userId: String(neonUser.id),
            properties: {
              source: "app-v3-edit",
              format,
              reason,
              detail: (detail instanceof Error ? detail.message : String(detail)).slice(0, 300),
            },
          })
        )
        .catch(() => {})

    const runEdit = async (promptText: string): Promise<Buffer> => {
      const editInput: Record<string, unknown> = {
        model: OPENAI_IMAGE_MODEL,
        image: editImages.length === 1 ? editImages[0] : editImages,
        prompt: promptText,
        n: 1,
        size,
        quality: EDIT_IMAGE_QUALITY,
        output_format: "png",
        moderation: "low",
      }
      if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"
      const response = await openai.images.edit(editInput as any)
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned from OpenAI")
      return Buffer.from(b64, "base64")
    }

    let imageBuffer: Buffer
    try {
      imageBuffer = await runEdit(
        buildEditPrompt(instruction, false, hasIdentityReference, likenessBlock)
      )
    } catch (firstError) {
      if (isContentPolicyError(firstError)) {
        try {
          imageBuffer = await runEdit(
            buildEditPrompt(instruction, true, hasIdentityReference, likenessBlock)
          )
        } catch (retryError) {
          await refundOrAlert(CREDIT_COSTS.IMAGE, "OpenAI content policy", refundRef)
          if (isContentPolicyError(retryError)) {
            await logEditFailure("content_policy", retryError)
            return NextResponse.json(
              {
                error: "That change isn't available. Try wording it differently.",
                code: "content_policy",
              },
              { status: 400 }
            )
          }
          console.error("[app-v3 edit] edit failed on retry:", retryError)
          await logEditFailure("retry_failed", retryError)
          return NextResponse.json(
            { error: "Couldn't make that change. Please try again." },
            { status: 500 }
          )
        }
      } else {
        await refundOrAlert(CREDIT_COSTS.IMAGE, "OpenAI edit failed", refundRef)
        console.error("[app-v3 edit] edit failed:", firstError)
        await logEditFailure("edit_failed", firstError)
        return NextResponse.json(
          { error: "Couldn't make that change. Please try again." },
          { status: 500 }
        )
      }
    }

    let blob: { url: string }
    try {
      blob = await put(`maya-app-v3/${neonUser.id}/edit-${Date.now()}.png`, imageBuffer, {
        access: "public",
        contentType: "image/png",
      })
    } catch (blobError) {
      await refundOrAlert(CREDIT_COSTS.IMAGE, "Blob upload failed", refundRef)
      console.error("[app-v3 edit] blob upload failed:", blobError)
      return NextResponse.json(
        { error: "Failed to save the edit. Please try again." },
        { status: 500 }
      )
    }

    let insertedId: number | null = null
    try {
      // variant_of resolves through an ownership-scoped subquery: sourceImageId comes from
      // the client, and a raw insert would let any member link their row to another
      // member's image id. Not owned (or missing) -> NULL, insert still succeeds.
      const inserted = await sql`
        INSERT INTO ai_images (
          user_id, image_url, title, variant_of, prompt, generated_prompt, prediction_id,
          generation_status, source, category, created_at
        ) VALUES (
          ${neonUser.id}, ${blob.url}, ${imageTitle},
          (SELECT id FROM ai_images WHERE id = ${sourceImageId} AND user_id = ${neonUser.id}),
          ${instruction}, ${instruction},
          ${requestRef + "-0"}, 'completed', 'openai', ${format}, NOW()
        )
        RETURNING id
      `
      insertedId = inserted[0]?.id ?? null
    } catch (dbError) {
      console.error("[app-v3 edit] DB insert failed (image saved to Blob):", dbError)
      await logAdminError({
        toolName: "app-v3-edit-gallery-insert",
        error: dbError,
        context: { userId: neonUser.id, format, requestRef },
      }).catch(() => {})
      await refundOrAlert(CREDIT_COSTS.IMAGE, "Edited image never reached the gallery", refundRef)
      if (conversation) {
        await del(blob.url).catch(() => {})
        return NextResponse.json(
          {
            error: "The edited photo could not be saved safely. Your credit was returned.",
            code: "edit_persistence_failed",
          },
          { status: 500 }
        )
      }
    }

    // SUITE-UX-02 member pulse: edits are a strong engagement signal; the instruction text
    // (truncated) lets the weekly aggregate surface what members keep wanting changed.
    import("@/lib/analytics/events")
      .then(({ logAnalyticsEvent }) =>
        logAnalyticsEvent({
          eventName: "suite_edit_applied",
          userId: String(neonUser.id),
          properties: { source: "app-v3-edit", format, instruction: instruction.slice(0, 120) },
        })
      )
      .catch(() => {})

    const editReceipt: ConversationalPhotoEditReceipt | null =
      conversation?.action === "apply" && insertedId && sourceAssetId && rootAssetId
        ? {
            action: "apply",
            sourceAssetId,
            resultAssetId: `ai_${insertedId}`,
            rootAssetId,
            instruction,
            historyDepth: authoritativeEditDepth + 1,
            creditRequestId: conversation.creditConfirmation!.requestId,
          }
        : null

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      aiImageId: insertedId,
      creditsDeducted: CREDIT_COSTS.IMAGE,
      newBalance: deduction.newBalance,
      ...(editReceipt ? { editReceipt } : {}),
      ...(likenessMemory ? { likenessMemory } : {}),
    })
  } catch (error) {
    console.error("[app-v3 edit] Unexpected error:", error)
    return NextResponse.json(
      { error: "Couldn't make that change. Please try again." },
      { status: 500 }
    )
  }
}
