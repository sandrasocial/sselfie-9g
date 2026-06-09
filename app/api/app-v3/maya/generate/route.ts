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
import {
  compileConceptJobs,
  compileOverlayOnlyJob,
  conceptOpenAISize,
  type ImageJob,
  type TextRenderMode,
} from "@/lib/app-v3/prompt-compiler"
import { IDENTITY_ANCHOR, IDENTITY_ANCHOR_SAFE } from "@/lib/app-v3/maya/ingredients"
import type { CreativeBrief, MayaGenerateConceptRequest } from "@/lib/app-v3/maya/concept-types"
import type { OutputFormat } from "@/components/app-v3/types"

// gpt-image edit calls (1024x1536, medium quality, reference selfie attached) routinely
// run 60-120s. 60s was killing them with a 504. Match the Pro image route's 300s ceiling.
export const maxDuration = 300

const sql = getDbClient()
// Keep the default matching what the live env already runs ("gpt-image-2"). Switching the
// default also flips the input_fidelity branch below, which was an unintended behavior change;
// production sets OPENAI_IMAGE_MODEL explicitly so the default only matters as a safe fallback.
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
const VALID_FORMATS: OutputFormat[] = ["photo", "reel-cover", "carousel", "story-slide"]

// Image quality (low | medium | high). gpt-image-2 supports all three; default medium to stay
// inside the time budget, override to "high" for maximum finish via env.
const IMAGE_QUALITY = (process.env.APP_V3_IMAGE_QUALITY || "medium") as "low" | "medium" | "high"

// On-image text rendering for NEW photos (Mode B). gpt-image-2 renders photoreal + accurate text
// in a single pass (~99% character accuracy), so one_pass is the default: faster, cheaper, and it
// avoids the quality drop from stacking edits. Set APP_V3_TEXT_RENDER_MODE=two_pass to force the
// clean-photo-then-overlay route when tighter text placement is needed (e.g. complex carousels).
const TEXT_RENDER_MODE: TextRenderMode = process.env.APP_V3_TEXT_RENDER_MODE === "two_pass" ? "two_pass" : "one_pass"

/** True when an OpenAI error looks like a moderation / content-policy rejection. */
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

// Wardrobe words that read as suggestive to OpenAI moderation; softened only on a retry.
const RISKY_WARDROBE =
  /\b(sheer|see-?through|lace|lingerie|bodysuit|bikini|swimsuit|underwear|undergarment|bra|cleavage|topless|nude|naked|bare(?:\s+(?:skin|shoulders|legs))?|body-conscious|wet)\b/gi

/**
 * Soften a compiled prompt for a single content-policy retry: swap in the gentler identity
 * wording, neutralize suggestive wardrobe terms, and add a modest-styling nudge.
 */
function sanitizePromptForModeration(prompt: string): string {
  const softened = prompt.split(IDENTITY_ANCHOR).join(IDENTITY_ANCHOR_SAFE).replace(RISKY_WARDROBE, "elegant")
  return `${softened}\nKeep the styling modest, fully clothed, elegant, and tasteful.`
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

    const body = (await request.json().catch(() => null)) as
      | (MayaGenerateConceptRequest & {
          /** MODE C: overlay text onto this existing image (their upload or a Library image). */
          baseImageUrl?: string
          overlay?: { headline?: string; subline?: string; overlayStyle?: string; role?: "hook" | "value" | "cta" }
        })
      | null
    if (!body) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const format: OutputFormat =
      body.format && VALID_FORMATS.includes(body.format) ? body.format : "photo"

    const baseImageUrl = typeof body.baseImageUrl === "string" ? body.baseImageUrl : null

    // Per mode: Mode C overlays text on a provided image; Modes A/B generate from the selfie.
    let jobs: ImageJob[]
    let referenceUrls: string[] = []
    let baseImageSource: string | null = null

    if (baseImageUrl) {
      // ── MODE C: overlay-only on the user's own / Library image (no selfie, no full brief). ──
      if (!isAllowedReferenceUrl(baseImageUrl)) {
        return NextResponse.json({ error: "That image can't be used here." }, { status: 400 })
      }
      const heading = (body.overlay?.headline ?? body.brief?.graphic?.headline ?? "").trim()
      if (!heading) {
        return NextResponse.json({ error: "Add the text you want on the image." }, { status: 400 })
      }
      const overlayText = {
        heading,
        body: (body.overlay?.subline ?? body.brief?.graphic?.subline ?? "").trim(),
      }
      jobs = [
        compileOverlayOnlyJob(
          overlayText,
          format,
          body.overlay?.overlayStyle ?? body.brief?.graphic?.overlayStyle,
          { aestheticId: body.aestheticId },
          body.overlay?.role ?? "hook",
        ),
      ]
      baseImageSource = baseImageUrl
    } else {
      // ── MODE A / B: generate from the selfie (identity anchor). ──
      if (!isValidBrief(body.brief)) {
        return NextResponse.json({ error: "A complete concept brief is required" }, { status: 400 })
      }
      const referenceSelfieUrl = body.referenceSelfieUrl
      if (typeof referenceSelfieUrl !== "string" || !isAllowedReferenceUrl(referenceSelfieUrl)) {
        return NextResponse.json(
          { error: "A reference selfie is required to keep your likeness." },
          { status: 400 },
        )
      }
      // Front face first, then any optional angles. Dedup + cap at 4. The selfie is the ONLY image
      // input; the Vault connects as text DNA, never as an attached example image.
      referenceUrls = Array.from(
        new Set(
          [referenceSelfieUrl, ...(Array.isArray(body.referenceSelfieUrls) ? body.referenceSelfieUrls : [])].filter(
            isAllowedReferenceUrl,
          ),
        ),
      ).slice(0, 4)
      jobs = compileConceptJobs(body.brief, format, { aestheticId: body.aestheticId }, TEXT_RENDER_MODE)
    }

    const size = conceptOpenAISize(format)
    // Charge once per final image (slide), regardless of how many passes produce it.
    const imageCount = jobs.length
    const totalCost = CREDIT_COSTS.IMAGE * imageCount
    // What we store as the image's prompt (all passes, so photo descriptors + overlay text are searchable).
    const recordPrompts = jobs.map((j) => j.passes.map((p) => p.prompt).join("\n\n--- pass ---\n\n"))

    // ── Neon user ──
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    // ── Credits: deduct the FULL set up front (1 per image). All-or-nothing: any failure
    //    refunds the whole set, so a broken carousel never charges the user. ──
    const hasEnough = await checkCredits(neonUser.id, totalCost)
    if (!hasEnough) {
      const current = await getUserCredits(neonUser.id)
      return NextResponse.json(
        {
          error: "Insufficient credits",
          code: "insufficient_credits",
          action: "open_credits_topup",
          required: totalCost,
          current,
        },
        { status: 402 },
      )
    }

    const label = body.conceptTitle || body.brief?.outfit?.slice(0, 60) || `${format} overlay`
    const deduction = await deductCredits(neonUser.id, totalCost, "image", `app-v3 ${format}: ${label}`)
    if (!deduction.success) {
      return NextResponse.json(
        { error: deduction.error ?? "Credit deduction failed. Please try again.", code: "credit_deduction_failed" },
        { status: 402 },
      )
    }

    const refundRef = `app-v3-fail-${neonUser.id}-${Date.now()}`
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error("[app-v3 generate] OPENAI_API_KEY is not set in this environment.")
      await refundCredits(neonUser.id, totalCost, "OpenAI API key not configured", refundRef).catch(() => {})
      return NextResponse.json(
        { error: "Image generation is temporarily unavailable. Please try again later.", code: "openai_not_configured" },
        { status: 500 },
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Prepare the selfie reference file(s) once, reused across every pass and job (Modes A/B).
    const selfieFiles = await Promise.all(
      referenceUrls.map(async (url, i) => {
        const buf = await normalizeReferenceForOpenAI(await readReferenceImage(url))
        return toFile(buf, `maya-reference-${i}.png`, { type: "image/png" })
      }),
    )

    // Prepare the user-provided base image once (Mode C overlay-only).
    const baseFiles = baseImageSource
      ? [
          await toFile(
            await normalizeReferenceForOpenAI(await readReferenceImage(baseImageSource)),
            "maya-base-input.png",
            { type: "image/png" },
          ),
        ]
      : []

    // One edit call: prompt + image input(s) — the selfie(s), or the prior pass's clean photo.
    const runEdit = async (
      promptText: string,
      images: Awaited<ReturnType<typeof toFile>>[],
    ): Promise<Buffer> => {
      const editInput: Record<string, unknown> = {
        model: OPENAI_IMAGE_MODEL,
        image: images.length === 1 ? images[0] : images,
        prompt: promptText,
        n: 1,
        size,
        quality: IMAGE_QUALITY,
        output_format: "png",
      }
      // gpt-image-2 processes every input at high fidelity automatically; older models need the flag.
      if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

      const response = await openai.images.edit(editInput as any)
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned from OpenAI")
      return Buffer.from(b64, "base64")
    }

    // One edit call with a single graceful retry on a content-policy rejection.
    const runEditWithRetry = async (
      promptText: string,
      images: Awaited<ReturnType<typeof toFile>>[],
    ): Promise<Buffer> => {
      try {
        return await runEdit(promptText, images)
      } catch (firstError) {
        if (isContentPolicyError(firstError)) {
          return await runEdit(sanitizePromptForModeration(promptText), images)
        }
        throw firstError
      }
    }

    // Run one image JOB end to end. Each pass draws its input from its source: the selfie (Mode
    // A/B clean photo), the user's base image (Mode C overlay), or the prior pass's output (the
    // two-pass overlay edit).
    const runJob = async (job: (typeof jobs)[number]): Promise<Buffer> => {
      let current: Buffer | null = null
      for (const pass of job.passes) {
        const images =
          pass.input === "selfie"
            ? selfieFiles
            : pass.input === "base"
              ? baseFiles
              : [await toFile(current as Buffer, "maya-base.png", { type: "image/png" })]
        current = await runEditWithRetry(pass.prompt, images)
      }
      if (!current) throw new Error("Job produced no image")
      return current
    }

    // ── Generate every image (jobs run in parallel; passes within a job run sequentially) ──
    let buffers: Buffer[]
    try {
      buffers = await Promise.all(jobs.map((j) => runJob(j)))
    } catch (genError) {
      await refundCredits(neonUser.id, totalCost, "OpenAI generation failed", refundRef).catch(() => {})
      if (isContentPolicyError(genError)) {
        return NextResponse.json(
          {
            error:
              "That look pushed against the image rules, even after I softened it. Try another concept or a different outfit and I'll get it for you.",
            code: "content_policy",
          },
          { status: 400 },
        )
      }
      console.error("[app-v3 generate] Generation failed:", genError)
      return NextResponse.json({ error: "Failed to generate image. Please try again." }, { status: 500 })
    }

    // ── Persist each image to Blob + gallery (ai_images). Blob failure refunds the set. ──
    const stamp = Date.now()
    let persisted: { url: string; id: number | null }[]
    try {
      persisted = await Promise.all(
        buffers.map(async (buf, i) => {
          const blob = await put(`maya-app-v3/${neonUser.id}/${stamp}-${i}.png`, buf, {
            access: "public",
            contentType: "image/png",
          })
          let id: number | null = null
          try {
            const inserted = await sql`
              INSERT INTO ai_images (
                user_id, image_url, prompt, generated_prompt, prediction_id,
                generation_status, source, category, created_at
              ) VALUES (
                ${neonUser.id}, ${blob.url}, ${recordPrompts[i]}, ${recordPrompts[i]},
                ${"app-v3-" + stamp + "-" + i}, 'completed', 'openai', 'concept', NOW()
              ) RETURNING id
            `
            id = inserted[0]?.id ?? null
          } catch (dbError) {
            console.error("[app-v3 generate] DB insert failed (image saved to Blob):", dbError)
          }
          return { url: blob.url, id }
        }),
      )
    } catch (blobError) {
      await refundCredits(neonUser.id, totalCost, "Blob upload failed", refundRef).catch(() => {})
      console.error("[app-v3 generate] Blob upload failed:", blobError)
      return NextResponse.json({ error: "Failed to save image. Please try again." }, { status: 500 })
    }

    const imageUrls = persisted.map((p) => p.url)
    if (imageUrls.length === 0) {
      await refundCredits(neonUser.id, totalCost, "No images saved", refundRef).catch(() => {})
      return NextResponse.json({ error: "Failed to save image. Please try again." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrls[0],
      imageUrls,
      imageCount: imageUrls.length,
      aiImageId: persisted[0]?.id ?? null,
      creditsDeducted: totalCost,
      newBalance: deduction.newBalance,
    })
  } catch (error) {
    console.error("[app-v3 generate] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to generate image. Please try again." }, { status: 500 })
  }
}
