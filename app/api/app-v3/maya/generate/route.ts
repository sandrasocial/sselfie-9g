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
import { compileConceptPrompts, conceptRequestSize } from "@/lib/app-v3/prompt-compiler"
import { IDENTITY_ANCHOR, IDENTITY_ANCHOR_SAFE } from "@/lib/app-v3/maya/ingredients"
import { getAestheticById } from "@/components/app-v3/aesthetics"
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

// Vault style anchor: attach the chosen aesthetic's Vault example to the edit call so the
// model has the actual benchmark to match (lighting, grade, finish), not just words. The
// Vault images ARE portraits, so identity bleed is the risk — selfies stay first + sole
// identity source, and this directive makes the anchor style-only. Kill switch:
// set APP_V3_VAULT_STYLE_ANCHOR=0 to disable without a code change.
const VAULT_STYLE_ANCHOR_ENABLED = !/^(0|false|off)$/i.test(process.env.APP_V3_VAULT_STYLE_ANCHOR || "1")
const STYLE_ANCHOR_DIRECTIVE =
  "\n\nThe FINAL attached image is a STYLE REFERENCE ONLY, an example from the SSELFIE Vault. " +
  "Match its photographic quality, lighting, color grade, depth of field, and editorial finish to that standard. " +
  "Do NOT copy the person, face, hair, body, pose, or background from that style reference. " +
  "The woman's identity, face, and likeness come ONLY from the earlier selfie photo(s)."

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

    // Vault style anchor: load the chosen aesthetic's Vault example as a STYLE/quality
    // reference (never identity). Best-effort — a load failure must not block generation.
    let styleAnchorBuffer: Buffer | null = null
    if (VAULT_STYLE_ANCHOR_ENABLED) {
      try {
        const aesthetic = body.aestheticId ? getAestheticById(body.aestheticId) : undefined
        const anchorPath = aesthetic?.coverImage
        if (anchorPath && anchorPath.startsWith("/")) {
          const anchorUrl = new URL(anchorPath, request.nextUrl.origin).toString()
          styleAnchorBuffer = await normalizeReferenceForOpenAI(await readReferenceImage(anchorUrl))
        }
      } catch (e) {
        console.error("[app-v3 generate] Vault style anchor load skipped:", e)
        styleAnchorBuffer = null
      }
    }

    // Front face first, then any optional angles (side profile, full body). Dedup + cap so the
    // edit request stays at <=4 images total; when a style anchor is attached, leave room for it.
    const maxSelfies = styleAnchorBuffer ? 3 : 4
    const referenceUrls = Array.from(
      new Set(
        [referenceSelfieUrl, ...(Array.isArray(body.referenceSelfieUrls) ? body.referenceSelfieUrls : [])].filter(
          isAllowedReferenceUrl,
        ),
      ),
    ).slice(0, maxSelfies)

    // Compile into one prompt per image (carousel = one per slide; others = single),
    // injecting the vision-extracted look for the chosen aesthetic.
    const prompts = compileConceptPrompts(body.brief, format, { aestheticId: body.aestheticId })
    const size = toOpenAIEditSize(conceptRequestSize(format))
    const imageCount = prompts.length
    const totalCost = CREDIT_COSTS.IMAGE * imageCount

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

    const label = body.conceptTitle || body.brief.outfit.slice(0, 60)
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

    // One generation attempt for a given prompt: read refs, call the edit endpoint, return bytes.
    const attemptEdit = async (promptText: string): Promise<Buffer> => {
      const refFiles = await Promise.all(
        referenceUrls.map(async (url, i) => {
          const buf = await normalizeReferenceForOpenAI(await readReferenceImage(url))
          return toFile(buf, `maya-reference-${i}.png`, { type: "image/png" })
        }),
      )

      // Selfies first (identity), Vault style anchor LAST (quality reference only).
      const images = [...refFiles]
      let prompt = promptText
      if (styleAnchorBuffer) {
        images.push(await toFile(styleAnchorBuffer, "vault-style-reference.png", { type: "image/png" }))
        prompt = `${promptText}${STYLE_ANCHOR_DIRECTIVE}`
      }

      const editInput: Record<string, unknown> = {
        model: OPENAI_IMAGE_MODEL,
        // gpt-image accepts an array of reference images; a single file also works.
        image: images.length === 1 ? images[0] : images,
        prompt,
        n: 1,
        size,
        quality: "medium",
        output_format: "png",
      }
      // Higher identity fidelity on models that support it (gpt-image-2 does not).
      if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

      const response = await openai.images.edit(editInput as any)
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned from OpenAI")
      return Buffer.from(b64, "base64")
    }

    // One image, with a single graceful retry on a content-policy rejection.
    const generateOne = async (promptText: string): Promise<Buffer> => {
      try {
        return await attemptEdit(promptText)
      } catch (firstError) {
        if (isContentPolicyError(firstError)) {
          return await attemptEdit(sanitizePromptForModeration(promptText))
        }
        throw firstError
      }
    }

    // ── Generate every image (carousels run in parallel to stay within the time budget) ──
    let buffers: Buffer[]
    try {
      buffers = await Promise.all(prompts.map((p) => generateOne(p)))
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
                ${neonUser.id}, ${blob.url}, ${prompts[i]}, ${prompts[i]},
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
