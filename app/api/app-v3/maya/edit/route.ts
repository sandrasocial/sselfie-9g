// SSELFIE Studio 3.0 - true Edit Mode (MAYA-REBUILD-05 Phase 4).
// Image-to-image refinement: the GENERATED image is the input, and one instruction is applied
// ("make my blazer black", "brighter", "change the background"), keeping everything else.
// Distinct from /generate (which uses the selfie). Synchronous, credit-metered, persists to
// the gallery. Isolated /app endpoint.

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
import { conceptRequestSize } from "@/lib/app-v3/prompt-compiler"
import { AVOID_LIST, ELEVATION } from "@/lib/app-v3/maya/ingredients"
import {
  buildLikenessPromptBlock,
  classifyLikenessCorrection,
  isLikenessMemoryEnabled,
  VANITY_DRIFT_PATTERN,
} from "@/lib/app-v3/likeness-memory"
import { addLikenessNote, getMemory } from "@/lib/app-v3/maya/memory-store"
import { isContentPolicyError, sanitizePromptForImageSafety } from "@/lib/ai/image-safety"
import type { OutputFormat } from "@/components/app-v3/types"

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
  const tail = safer
    ? " Keep it tasteful, fully clothed, and modest."
    : ` Keep it natural and editorial. ${ELEVATION} ${AVOID_LIST}`
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
      sourceTitle?: string
    } | null
    if (!body || !isAllowedImageUrl(body.imageUrl)) {
      return NextResponse.json({ error: "A valid image to edit is required" }, { status: 400 })
    }
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : ""
    if (!instruction)
      return NextResponse.json({ error: "Tell Maya what to change" }, { status: 400 })

    const format: OutputFormat =
      body.format && VALID_FORMATS.includes(body.format) ? body.format : "photo"
    const sourceImageId =
      typeof body.sourceImageId === "number" &&
      Number.isInteger(body.sourceImageId) &&
      body.sourceImageId > 0
        ? body.sourceImageId
        : null
    const imageTitle =
      typeof body.sourceTitle === "string" && body.sourceTitle.trim()
        ? body.sourceTitle.trim().slice(0, 120)
        : `Edited ${format}`
    const size = toOpenAIEditSize(conceptRequestSize(format))

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser)
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })

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

    // ── LIKENESS-MEMORY-01 (flag-gated, fail-open): read her stored accuracy notes for this
    // edit's prompt, then LEARN from this instruction. A likeness correction ("my hair is dark
    // brown not black") becomes a durable note she never has to repeat; a vanity ask is never
    // stored (the doctrine guard in buildEditPrompt handles it in-flight). Notes are read
    // BEFORE capture so the new note doesn't duplicate the instruction already in the prompt.
    let likenessBlock = ""
    if (isLikenessMemoryEnabled()) {
      try {
        const memory = await getMemory(String(neonUser.id))
        if (memory.likenessNotes.length > 0) {
          likenessBlock = buildLikenessPromptBlock(memory.likenessNotes)
        }
        const classification = classifyLikenessCorrection(instruction)
        if (classification.isLikeness && classification.note) {
          const saved = await addLikenessNote(String(neonUser.id), classification.note)
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
      `app-v3 edit: ${instruction.slice(0, 50)}`
    )
    if (!deduction.success) {
      return NextResponse.json(
        { error: deduction.error ?? "Credit deduction failed.", code: "credit_deduction_failed" },
        { status: 402 }
      )
    }

    const refundRef = `app-v3-edit-fail-${neonUser.id}-${Date.now()}`
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error("[app-v3 edit] OPENAI_API_KEY is not set in this environment.")
      await refundCredits(
        neonUser.id,
        CREDIT_COSTS.IMAGE,
        "OpenAI API key not configured",
        refundRef
      ).catch(() => {})
      return NextResponse.json(
        {
          error: "Editing is temporarily unavailable. Please try again later.",
          code: "openai_not_configured",
        },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })
    const sourceFile = await toFile(
      await normalize(await loadImage(body.imageUrl)),
      "maya-edit-source.png",
      { type: "image/png" }
    )

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
          await refundCredits(
            neonUser.id,
            CREDIT_COSTS.IMAGE,
            "OpenAI content policy",
            refundRef
          ).catch(() => {})
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
        await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "OpenAI edit failed", refundRef).catch(
          () => {}
        )
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
      await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "Blob upload failed", refundRef).catch(
        () => {}
      )
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
          ${"app-v3-edit-" + Date.now()}, 'completed', 'openai', ${format}, NOW()
        )
        RETURNING id
      `
      insertedId = inserted[0]?.id ?? null
    } catch (dbError) {
      console.error("[app-v3 edit] DB insert failed (image saved to Blob):", dbError)
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

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      aiImageId: insertedId,
      creditsDeducted: CREDIT_COSTS.IMAGE,
      newBalance: deduction.newBalance,
    })
  } catch (error) {
    console.error("[app-v3 edit] Unexpected error:", error)
    return NextResponse.json(
      { error: "Couldn't make that change. Please try again." },
      { status: 500 }
    )
  }
}
