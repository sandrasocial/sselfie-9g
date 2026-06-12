// SSELFIE Studio 3.0 — true Edit Mode (MAYA-REBUILD-05 Phase 4).
// Image-to-image refinement: the GENERATED image is the input, and one instruction is applied
// ("make my blazer black", "brighter", "change the background"), keeping everything else.
// Distinct from /generate (which uses the selfie). Synchronous, credit-metered, persists to
// the gallery. Isolated /app endpoint.

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
import { ELEVATION } from "@/lib/app-v3/maya/ingredients"
import type { OutputFormat } from "@/components/app-v3/types"

export const maxDuration = 300

const sql = getDbClient()
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const VALID_FORMATS: OutputFormat[] = ["photo", "reel-cover", "carousel", "story-slide"]

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

function isContentPolicyError(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    m.includes("content_policy") ||
    m.includes("content policy") ||
    m.includes("safety") ||
    m.includes("moderation") ||
    m.includes("violat") ||
    m.includes("rejected") ||
    m.includes("not allowed")
  )
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

function buildEditPrompt(instruction: string, safer = false): string {
  const base =
    "Refine the attached image. Keep the same person, likeness, framing, composition, background, " +
    "and overall look. Apply ONLY this change: "
  const tail = safer
    ? " Keep it tasteful, fully clothed, and modest."
    : ` Keep it natural and editorial. ${ELEVATION}`
  return `${base}${instruction.trim()}.${tail}`
}

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (!rate.success) {
    return NextResponse.json({ error: "Rate limit exceeded", retryAfter: rate.retryAfter }, { status: 429 })
  }

  try {
    if (!isOpenAIImageEnabled()) {
      return NextResponse.json({ error: "This feature is not currently enabled." }, { status: 403 })
    }

    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await request.json().catch(() => null)) as
      | { imageUrl?: string; instruction?: string; format?: OutputFormat }
      | null
    if (!body || !isAllowedImageUrl(body.imageUrl)) {
      return NextResponse.json({ error: "A valid image to edit is required" }, { status: 400 })
    }
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : ""
    if (!instruction) return NextResponse.json({ error: "Tell Maya what to change" }, { status: 400 })

    const format: OutputFormat = body.format && VALID_FORMATS.includes(body.format) ? body.format : "photo"
    const size = toOpenAIEditSize(conceptRequestSize(format))

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) return NextResponse.json({ error: "User not found in database" }, { status: 404 })

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
            { status: 403 },
          )
        }
      }
    }

    const hasEnough = await checkCredits(neonUser.id, CREDIT_COSTS.IMAGE)
    if (!hasEnough) {
      const current = await getUserCredits(neonUser.id)
      return NextResponse.json(
        { error: "Insufficient credits", code: "insufficient_credits", action: "open_credits_topup", required: CREDIT_COSTS.IMAGE, current },
        { status: 402 },
      )
    }
    const deduction = await deductCredits(neonUser.id, CREDIT_COSTS.IMAGE, "image", `app-v3 edit: ${instruction.slice(0, 50)}`)
    if (!deduction.success) {
      return NextResponse.json({ error: deduction.error ?? "Credit deduction failed.", code: "credit_deduction_failed" }, { status: 402 })
    }

    const refundRef = `app-v3-edit-fail-${neonUser.id}-${Date.now()}`
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error("[app-v3 edit] OPENAI_API_KEY is not set in this environment.")
      await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "OpenAI API key not configured", refundRef).catch(() => {})
      return NextResponse.json({ error: "Editing is temporarily unavailable. Please try again later.", code: "openai_not_configured" }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })
    const sourceFile = await toFile(await normalize(await loadImage(body.imageUrl)), "maya-edit-source.png", { type: "image/png" })

    const runEdit = async (promptText: string): Promise<Buffer> => {
      const editInput: Record<string, unknown> = {
        model: OPENAI_IMAGE_MODEL,
        image: sourceFile,
        prompt: promptText,
        n: 1,
        size,
        quality: "medium",
        output_format: "png",
      }
      if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"
      const response = await openai.images.edit(editInput as any)
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned from OpenAI")
      return Buffer.from(b64, "base64")
    }

    let imageBuffer: Buffer
    try {
      imageBuffer = await runEdit(buildEditPrompt(instruction))
    } catch (firstError) {
      if (isContentPolicyError(firstError)) {
        try {
          imageBuffer = await runEdit(buildEditPrompt(instruction, true))
        } catch (retryError) {
          await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "OpenAI content policy", refundRef).catch(() => {})
          if (isContentPolicyError(retryError)) {
            return NextResponse.json({ error: "That change isn't available. Try wording it differently.", code: "content_policy" }, { status: 400 })
          }
          console.error("[app-v3 edit] edit failed on retry:", retryError)
          return NextResponse.json({ error: "Couldn't make that change. Please try again." }, { status: 500 })
        }
      } else {
        await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "OpenAI edit failed", refundRef).catch(() => {})
        console.error("[app-v3 edit] edit failed:", firstError)
        return NextResponse.json({ error: "Couldn't make that change. Please try again." }, { status: 500 })
      }
    }

    let blob: { url: string }
    try {
      blob = await put(`maya-app-v3/${neonUser.id}/edit-${Date.now()}.png`, imageBuffer, { access: "public", contentType: "image/png" })
    } catch (blobError) {
      await refundCredits(neonUser.id, CREDIT_COSTS.IMAGE, "Blob upload failed", refundRef).catch(() => {})
      console.error("[app-v3 edit] blob upload failed:", blobError)
      return NextResponse.json({ error: "Failed to save the edit. Please try again." }, { status: 500 })
    }

    try {
      await sql`
        INSERT INTO ai_images (
          user_id, image_url, prompt, generated_prompt, prediction_id,
          generation_status, source, category, created_at
        ) VALUES (
          ${neonUser.id}, ${blob.url}, ${instruction}, ${instruction},
          ${"app-v3-edit-" + Date.now()}, 'completed', 'openai', 'edit', NOW()
        )
      `
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
        }),
      )
      .catch(() => {})

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      creditsDeducted: CREDIT_COSTS.IMAGE,
      newBalance: deduction.newBalance,
    })
  } catch (error) {
    console.error("[app-v3 edit] Unexpected error:", error)
    return NextResponse.json({ error: "Couldn't make that change. Please try again." }, { status: 500 })
  }
}
