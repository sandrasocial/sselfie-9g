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
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { rateLimit } from "@/lib/rate-limit-api"
import { isOpenAIImageEnabled } from "@/lib/feature-flags"
import {
  buildGraphicRedesignSlides,
  compileConceptJobs,
  conceptOpenAISize,
  validateCustomerCarouselBrief,
  type ImageJob,
} from "@/lib/app-v3/prompt-compiler"
import { IDENTITY_ANCHOR, IDENTITY_ANCHOR_SAFE } from "@/lib/app-v3/maya/ingredients"
import {
  SSELFIE_INSPIRATION_CLOSE_RECREATE,
  SSELFIE_INSPIRATION_SET_VARIATION,
  SSELFIE_PROMPT_VERSION,
} from "@/lib/app-v3/maya/visual-rules"
import {
  pickContentStyleReference,
  redesignContentSlideToBuffer,
  type StyleReferenceCategory,
} from "@/lib/content-kit/slide-redesign-generator"
import type { CarouselSlide, ShootShotRole } from "@/lib/content-kit/types"
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
const VALID_FORMATS: OutputFormat[] = [
  "photo",
  "photoshoot",
  "reel-cover",
  "carousel",
  "story-slide",
]
const SHOOT_SHOT_ROLES = new Set<ShootShotRole>([
  "establishing-full-body",
  "movement-lifestyle-action",
  "seated-hero",
  "profile",
  "close-portrait",
  "cover-safe-hero",
  "true-detail",
])

// Image quality (low | medium | high). MEASURED 2026-06-10 on real prompts: medium ~82s/$0.06,
// high ~191s/$0.22 per image. Members buy "premium presence", so single images default HIGH
// (the streamed preview keeps the longer wait alive). Carousels run up to 6 parallel jobs, so
// they stay MEDIUM for cost + time sanity. APP_V3_IMAGE_QUALITY overrides both.
type ImgQuality = "low" | "medium" | "high"
const QUALITY_OVERRIDE = process.env.APP_V3_IMAGE_QUALITY as ImgQuality | undefined
function qualityForFormat(format: OutputFormat): ImgQuality {
  if (QUALITY_OVERRIDE === "low" || QUALITY_OVERRIDE === "medium" || QUALITY_OVERRIDE === "high")
    return QUALITY_OVERRIDE
  return format === "carousel" ? "medium" : "high"
}

type AppGraphicRedesignJob = {
  label: string
  slide: CarouselSlide
  category: StyleReferenceCategory
  topic: string
  referenceUrl: string
  recordPrompt: string
}

type PhotoshootJob = {
  index: number
  role: ShootShotRole
  job: ImageJob
}

function isRedesignGraphicFormat(format: OutputFormat): boolean {
  return format === "carousel" || format === "reel-cover" || format === "story-slide"
}

function categoryForGraphicFormat(format: OutputFormat): StyleReferenceCategory {
  if (format === "carousel") return "photoshoot-carousel"
  if (format === "reel-cover") return "reel-cover"
  return "story-sequence"
}

function fallbackCategoryForGraphicFormat(format: OutputFormat): StyleReferenceCategory | undefined {
  return format === "reel-cover" ? "story-sequence" : undefined
}

function topicForGraphicBrief(
  brief: CreativeBrief,
  format: OutputFormat,
  conceptTitle?: string
): string {
  return (
    brief.graphic?.creativePlan?.userIntent ||
    brief.graphic?.carouselTitle ||
    conceptTitle ||
    brief.graphic?.headline ||
    brief.graphic?.slides?.[0]?.heading ||
    (format === "reel-cover" ? "Reel cover" : format === "story-slide" ? "Story slide" : "Carousel")
  )
}

function buildAppGraphicRedesignJobs({
  brief,
  format,
  conceptTitle,
  referenceUrls,
}: {
  brief: CreativeBrief
  format: OutputFormat
  conceptTitle?: string
  referenceUrls: string[]
}): AppGraphicRedesignJob[] {
  const category = categoryForGraphicFormat(format)
  const topic = topicForGraphicBrief(brief, format, conceptTitle)
  const slides = buildGraphicRedesignSlides(brief, format, conceptTitle)
  return slides.map((slide, index) => ({
    label: `${format} ${index + 1}/${slides.length}`,
    slide,
    category,
    topic,
    referenceUrl: referenceUrls[index % referenceUrls.length],
    recordPrompt: [
      `SSELFIE redesign engine (${category})`,
      `Topic: ${topic}`,
      `Slide: ${slide.title}`,
      slide.body ? `Body: ${slide.body}` : "",
      slide.purpose ? `Purpose: ${slide.purpose}` : "",
      slide.visualConcept ? `Visual concept: ${slide.visualConcept}` : "",
      slide.imagePromptDirection ? `Image direction: ${slide.imagePromptDirection}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  }))
}

function normalizeShootBriefs(raw: unknown, fallback: CreativeBrief): CreativeBrief[] {
  const candidates = Array.isArray(raw) ? raw : []
  const briefs = candidates.map(normalizeBrief).filter((brief): brief is CreativeBrief => !!brief)
  return briefs.length > 0 ? briefs.slice(0, 9) : [fallback]
}

function validatePhotoshootBriefs(briefs: CreativeBrief[]): string[] {
  const errors: string[] = []
  if (briefs.length < 6) errors.push(`photoshoot needs at least 6 shots, got ${briefs.length}`)
  const roles = briefs.map(brief => brief.shotRole).filter(Boolean)
  if (roles.length !== briefs.length) errors.push("every photoshoot shot needs a shotRole")
  if (new Set(roles).size < Math.min(4, briefs.length)) {
    errors.push("photoshoot needs at least 4 distinct shot roles")
  }
  const detailCount = roles.filter(role => role === "true-detail").length
  if (detailCount < 1 || detailCount > 2) {
    errors.push(`photoshoot needs 1-2 true-detail shots, got ${detailCount}`)
  }
  return errors
}

function pickPhotoshootHeroJobIndex(jobs: PhotoshootJob[]): number {
  const seatedHero = jobs.findIndex(item => item.role === "seated-hero")
  if (seatedHero >= 0) return seatedHero
  const establishingHero = jobs.findIndex(item => item.role === "establishing-full-body")
  return establishingHero >= 0 ? establishingHero : 0
}

function withPhotoshootCohesionInstruction(
  job: ImageJob,
  role: ShootShotRole,
  isHero: boolean
): ImageJob {
  const instruction = isHero
    ? [
        "Photoshoot cohesion role: HERO ANCHOR.",
        "Generate this shot from the uploaded real selfies only. Establish the exact shared outfit, accessories, hair, makeup, lighting, color grade, palette, and world for the full photoshoot set.",
        "Do not introduce alternate wardrobe, alternate accessories, or a second location family.",
      ].join("\n")
    : [
        "Photoshoot cohesion role: ANCHORED SET SHOT.",
        "Use the uploaded selfies as the identity anchor. Use the generated hero reference only as a style/cohesion anchor for outfit, accessories, lighting, palette, and world.",
        "Match the hero shot's wardrobe, accessories, hair, makeup, color grade, and location mood while creating this shot's distinct role and composition. Do not copy the hero pose unless this shot asks for it.",
        role === "true-detail"
          ? "For this true-detail shot, keep the same outfit/world from the hero but do NOT show the full face or full body."
          : "",
      ]
        .filter(Boolean)
        .join("\n")

  return {
    ...job,
    passes: job.passes.map(pass => ({
      ...pass,
      prompt: `${pass.prompt}\n\n${instruction}`,
    })),
  }
}

function withInspirationReferenceInstruction(
  job: ImageJob,
  mode: "close-recreation" | "set-variation" = "close-recreation"
): ImageJob {
  const instruction = [
    "Inspiration reference handling:",
    mode === "close-recreation"
      ? SSELFIE_INSPIRATION_CLOSE_RECREATE
      : SSELFIE_INSPIRATION_SET_VARIATION,
  ].join("\n")

  return {
    ...job,
    passes: job.passes.map(pass => ({
      ...pass,
      prompt: `${pass.prompt}\n\n${instruction}`,
    })),
  }
}

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
  const softened = prompt
    .split(IDENTITY_ANCHOR)
    .join(IDENTITY_ANCHOR_SAFE)
    .replace(RISKY_WARDROBE, "elegant")
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

/**
 * Normalize a concept brief, tolerating salvaged ones (a truncated concept stream can lose the
 * tail fields). Only outfit + setting are hard requirements — the compiler drops empty lines and
 * has NAMED fallbacks for camera/lighting, so a partial brief still produces a Vault-level shot.
 */
function normalizeBrief(brief: unknown): CreativeBrief | null {
  if (!brief || typeof brief !== "object") return null
  const b = brief as Record<string, unknown>
  if (typeof b.outfit !== "string" || b.outfit.trim().length === 0) return null
  if (typeof b.setting !== "string" || b.setting.trim().length === 0) return null
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  const shotRole = str(b.shotRole) as ShootShotRole
  return {
    outfit: b.outfit,
    setting: b.setting,
    mood: str(b.mood),
    pose: str(b.pose),
    cameraSpec: str(b.cameraSpec),
    lighting: str(b.lighting),
    shotRole: SHOOT_SHOT_ROLES.has(shotRole) ? shotRole : undefined,
    graphic:
      b.graphic && typeof b.graphic === "object"
        ? (b.graphic as CreativeBrief["graphic"])
        : undefined,
  }
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
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | (MayaGenerateConceptRequest & {
          /** Retired MODE C: local text overlays no longer exist. */
          baseImageUrl?: string
          /** CUSTOMER-PHOTOSHOOT-01: full set briefs generated by Maya in one plan. */
          shootBriefs?: unknown
        })
      | null
    if (!body) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const format: OutputFormat =
      body.format && VALID_FORMATS.includes(body.format) ? body.format : "photo"

    const baseImageUrl = typeof body.baseImageUrl === "string" ? body.baseImageUrl : null

    // Per mode: legacy Mode C is retired; Modes A/B generate from the selfie.
    let jobs: ImageJob[] = []
    let photoshootJobs: PhotoshootJob[] = []
    let graphicJobs: AppGraphicRedesignJob[] = []
    let graphicStyle: Awaited<ReturnType<typeof pickContentStyleReference>> | null = null
    let referenceUrls: string[] = []
    let inspirationReferenceUrl: string | null = null
    const baseImageSource: string | null = null

    if (baseImageUrl) {
      // ── MODE C legacy guard: the text-overlay workflow has been retired. ──
      if (!isAllowedReferenceUrl(baseImageUrl)) {
        return NextResponse.json({ error: "That image can't be used here." }, { status: 400 })
      }
      return NextResponse.json(
        { error: "Text overlays are retired. Ask Maya to create a finished styled slide instead." },
        { status: 410 }
      )
    } else {
      // ── MODE A / B: generate from the selfie (identity anchor). ──
      const brief = normalizeBrief(body.brief)
      if (!brief) {
        return NextResponse.json({ error: "A complete concept brief is required" }, { status: 400 })
      }
      if (format === "carousel") {
        const validationErrors = validateCustomerCarouselBrief(brief, body.conceptTitle)
        if (validationErrors.length > 0) {
          return NextResponse.json(
            {
              error:
                "That carousel plan was too thin. Ask Maya for a fuller carousel with slide-specific visuals.",
              code: "carousel_plan_invalid",
              details: validationErrors,
            },
            { status: 400 }
          )
        }
      }
      const referenceSelfieUrl = body.referenceSelfieUrl
      if (typeof referenceSelfieUrl !== "string" || !isAllowedReferenceUrl(referenceSelfieUrl)) {
        return NextResponse.json(
          { error: "A reference selfie is required to keep your likeness." },
          { status: 400 }
        )
      }
      inspirationReferenceUrl =
        typeof body.inspirationImageUrl === "string" &&
        isAllowedReferenceUrl(body.inspirationImageUrl)
          ? body.inspirationImageUrl
          : null
      // Front face first, then any optional identity angles. Dedup + cap at 4. Inspiration is
      // attached separately after identity references so it can guide pose/style without becoming
      // the face anchor.
      referenceUrls = Array.from(
        new Set(
          [
            referenceSelfieUrl,
            ...(Array.isArray(body.referenceSelfieUrls) ? body.referenceSelfieUrls : []),
          ].filter(isAllowedReferenceUrl)
        )
      ).slice(0, 4)
      if (format === "photoshoot") {
        const shootBriefs = normalizeShootBriefs(body.shootBriefs, brief)
        const validationErrors = validatePhotoshootBriefs(shootBriefs)
        if (validationErrors.length > 0) {
          return NextResponse.json(
            {
              error: "That photoshoot plan was too thin. Ask Maya for a fuller shoot plan.",
              code: "photoshoot_plan_invalid",
              details: validationErrors,
            },
            { status: 400 }
          )
        }
        const plannedPhotoshootJobs = shootBriefs.map((shootBrief, index) => {
          const role = shootBrief.shotRole as ShootShotRole
          const job = compileConceptJobs(shootBrief, "photo", { aestheticId: body.aestheticId })[0]
          return {
            index,
            role,
            job: {
              ...job,
              label: `photoshoot ${index + 1}/${shootBriefs.length} · ${role}`,
            },
          }
        })
        const heroJobIndex = pickPhotoshootHeroJobIndex(plannedPhotoshootJobs)
        photoshootJobs = plannedPhotoshootJobs.map((item, index) => {
          const isHero = index === heroJobIndex
          const cohesiveJob = withPhotoshootCohesionInstruction(
            item.job,
            item.role,
            isHero
          )
          return {
            ...item,
            job: inspirationReferenceUrl
              ? withInspirationReferenceInstruction(
                  cohesiveJob,
                  isHero ? "close-recreation" : "set-variation"
                )
              : cohesiveJob,
          }
        })
        jobs = photoshootJobs.map(item => item.job)
      } else if (isRedesignGraphicFormat(format)) {
        graphicJobs = buildAppGraphicRedesignJobs({
          brief,
          format,
          conceptTitle: body.conceptTitle,
          referenceUrls,
        })
        graphicStyle = await pickContentStyleReference(
          categoryForGraphicFormat(format),
          fallbackCategoryForGraphicFormat(format)
        )
        if (!graphicStyle) {
          return NextResponse.json(
            { error: "No SSELFIE style references are configured for this format." },
            { status: 500 }
          )
        }
      } else {
        jobs = compileConceptJobs(brief, format, { aestheticId: body.aestheticId })
        if (inspirationReferenceUrl) {
          jobs = jobs.map(job => withInspirationReferenceInstruction(job, "close-recreation"))
        }
      }
    }

    const size = conceptOpenAISize(format)
    const IMAGE_QUALITY = qualityForFormat(format)
    // Charge once per final image (slide), regardless of how many passes produce it.
    const imageCount = graphicJobs.length > 0 ? graphicJobs.length : jobs.length
    const totalCost = CREDIT_COSTS.IMAGE * imageCount
    // What we store as the image's prompt (all passes, so descriptors + baked slide text are searchable).
    const recordPrompts =
      graphicJobs.length > 0
        ? graphicJobs.map(j => j.recordPrompt)
        : jobs.map(j => j.passes.map(p => p.prompt).join("\n\n--- pass ---\n\n"))
    let actualPromptRecords = recordPrompts.map(prompt =>
      [`Prompt version: ${SSELFIE_PROMPT_VERSION}`, prompt].join("\n")
    )

    // ── Neon user ──
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    // ── BRIDGE-01 Phase D: generation is for members and active trials only. Limited mode
    //    (expired trial, one-time owners) is enforced HERE, not just in the UI. Admin skips. ──
    let isTrialUser = false
    if (!isAdminEmail(user.email)) {
      const { getSuiteAccess } = await import("@/lib/trial/suite-trial")
      const access = await getSuiteAccess(String(neonUser.id))
      if (access.level !== "member" && access.level !== "trial") {
        return NextResponse.json(
          {
            error: "Photo-making is paused. Join the SUITE to keep creating.",
            code: "generation_locked",
            action: "open_membership_checkout",
          },
          { status: 403 }
        )
      }
      isTrialUser = access.level === "trial"
    }

    // BRIDGE-01 Phase E: first trial generation is the activation signal (behavior only).
    if (isTrialUser) {
      try {
        const { sql: analyticsSql } = await import("@/lib/db/client")
        const prior = await analyticsSql`
          SELECT 1 FROM analytics_events
          WHERE user_id = ${String(neonUser.id)} AND event_name = 'trial_first_generation'
          LIMIT 1
        `
        if (prior.length === 0) {
          const { logAnalyticsEvent } = await import("@/lib/analytics/events")
          await logAnalyticsEvent({
            eventName: "trial_first_generation",
            userId: String(neonUser.id),
            properties: { source: "app-v3-generate", format },
          })
        }
      } catch {
        // behavior tracking only — never block generation
      }
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
        { status: 402 }
      )
    }

    const label = body.conceptTitle || body.brief?.outfit?.slice(0, 60) || `${format} concept`
    const deduction = await deductCredits(
      neonUser.id,
      totalCost,
      "image",
      `app-v3 ${format}: ${label}`
    )
    if (!deduction.success) {
      return NextResponse.json(
        {
          error: deduction.error ?? "Credit deduction failed. Please try again.",
          code: "credit_deduction_failed",
        },
        { status: 402 }
      )
    }

    const refundRef = `app-v3-fail-${neonUser.id}-${Date.now()}`
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error("[app-v3 generate] OPENAI_API_KEY is not set in this environment.")
      await refundCredits(neonUser.id, totalCost, "OpenAI API key not configured", refundRef).catch(
        () => {}
      )
      return NextResponse.json(
        {
          error: "Image generation is temporarily unavailable. Please try again later.",
          code: "openai_not_configured",
        },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Prepare the selfie reference file(s) once, reused across every pass and job (Modes A/B).
    const generationReferenceUrls = inspirationReferenceUrl
      ? Array.from(new Set([...referenceUrls, inspirationReferenceUrl]))
      : referenceUrls
    actualPromptRecords = recordPrompts.map((prompt, index) =>
      [
        `Prompt version: ${SSELFIE_PROMPT_VERSION}`,
        `Model provider: openai`,
        `Model: ${OPENAI_IMAGE_MODEL}`,
        `Format: ${format}`,
        `Generation job: ${jobs[index]?.label ?? graphicJobs[index]?.label ?? `image ${index + 1}`}`,
        `Reference URLs used: ${generationReferenceUrls.join(", ") || "none"}`,
        photoshootJobs.length > 0
          ? "Photoshoot reference flow: hero shot uses uploaded identity references; non-hero shots use uploaded identity references plus generated hero anchor."
          : "",
        "",
        prompt,
      ]
        .filter(Boolean)
        .join("\n")
    )
    const selfieFiles = await Promise.all(
      generationReferenceUrls.map(async (url, i) => {
        const buf = await normalizeReferenceForOpenAI(await readReferenceImage(url))
        return toFile(buf, `maya-reference-${i}.png`, { type: "image/png" })
      })
    )

    // Retired Mode C placeholder. Kept empty so old request shapes fail safely above.
    const baseFiles = baseImageSource
      ? [
          await toFile(
            await normalizeReferenceForOpenAI(await readReferenceImage(baseImageSource)),
            "maya-base-input.png",
            { type: "image/png" }
          ),
        ]
      : []

    // One edit call: prompt + image input(s) — the selfie(s), or the prior pass's clean photo.
    const runEdit = async (
      promptText: string,
      images: Awaited<ReturnType<typeof toFile>>[]
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
      images: Awaited<ReturnType<typeof toFile>>[]
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
    // A/B concept), a retired base image path, or the prior pass's output.
    const runJob = async (
      job: (typeof jobs)[number],
      selfieInputFiles: Awaited<ReturnType<typeof toFile>>[] = selfieFiles
    ): Promise<Buffer> => {
      let current: Buffer | null = null
      for (const pass of job.passes) {
        const images =
          pass.input === "selfie"
            ? selfieInputFiles
            : pass.input === "base"
              ? baseFiles
              : [await toFile(current as Buffer, "maya-base.png", { type: "image/png" })]
        current = await runEditWithRetry(pass.prompt, images)
      }
      if (!current) throw new Error("Job produced no image")
      return current
    }

    const runPhotoshootHeroAnchoredJobs = async (setJobs: PhotoshootJob[]): Promise<Buffer[]> => {
      const heroJobIndex = pickPhotoshootHeroJobIndex(setJobs)
      const hero = setJobs[heroJobIndex]
      if (!hero) throw new Error("Photoshoot hero job missing")

      // CUSTOMER-PHOTOSHOOT-02: hero first from real selfies only, then every other
      // shot references selfies FIRST for identity and the generated hero SECOND for cohesion.
      const heroBuffer = await runJob(hero.job, selfieFiles)
      const heroFile = await toFile(heroBuffer, "maya-photoshoot-hero-anchor.png", {
        type: "image/png",
      })
      const selfieAndHeroFiles = [...selfieFiles, heroFile]
      const buffers = new Array<Buffer>(setJobs.length)
      buffers[heroJobIndex] = heroBuffer

      const restJobs = setJobs
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => index !== heroJobIndex)
      await Promise.all(
        restJobs.map(async ({ item, index }) => {
          buffers[index] = await runJob(item.job, selfieAndHeroFiles)
        })
      )

      return buffers
    }

    // Persist buffers to Blob + gallery. Throws on blob failure (caller refunds).
    const persistBuffers = async (
      bufs: Buffer[]
    ): Promise<{ url: string; id: number | null }[]> => {
      const stamp = Date.now()
      return Promise.all(
        bufs.map(async (buf, i) => {
          const blob = await put(`maya-app-v3/${neonUser.id}/${stamp}-${i}.png`, buf, {
            access: "public",
            contentType: "image/png",
          })
          let id: number | null = null
          try {
            const storedPrompt = actualPromptRecords[i] ?? recordPrompts[i] ?? recordPrompts[0]
            const inserted = await sql`
              INSERT INTO ai_images (
                user_id, image_url, prompt, generated_prompt, prediction_id,
                generation_status, source, category, created_at
              ) VALUES (
                ${neonUser.id}, ${blob.url}, ${storedPrompt}, ${storedPrompt},
                ${"app-v3-" + stamp + "-" + i}, 'completed', 'openai', 'concept', NOW()
              ) RETURNING id
            `
            id = inserted[0]?.id ?? null
          } catch (dbError) {
            console.error("[app-v3 generate] DB insert failed (image saved to Blob):", dbError)
          }
          return { url: blob.url, id }
        })
      )
    }

    // SUITE-UX-02 member pulse: one behavior event per successful generation (fail-open).
    // rerun=true means "Make another version" on an already-finished card (friction signal).
    const isRerun = (body as { rerun?: boolean }).rerun === true
    const logGenerated = (imageCount: number) => {
      import("@/lib/analytics/events")
        .then(({ logAnalyticsEvent }) =>
          logAnalyticsEvent({
            eventName: "suite_image_generated",
            userId: String(neonUser.id),
            properties: {
              source: "app-v3-generate",
              format,
              rerun: isRerun,
              mode: baseImageSource ? "retired-base" : "concept",
              aestheticId: body.aestheticId ?? null,
              conceptTitle:
                typeof body.conceptTitle === "string" ? body.conceptTitle.slice(0, 120) : null,
              images: imageCount,
            },
          })
        )
        .catch(() => {})
    }

    // One streaming pass: partial frames go to onPartial as they form; resolves the final image.
    const runStreamingPass = async (
      promptText: string,
      images: Awaited<ReturnType<typeof toFile>>[],
      onPartial: (b64: string) => void
    ): Promise<Buffer> => {
      const base: Record<string, unknown> = {
        model: OPENAI_IMAGE_MODEL,
        prompt: promptText,
        n: 1,
        size,
        quality: IMAGE_QUALITY,
        output_format: "png",
        stream: true,
        partial_images: 2,
      }
      if (OPENAI_IMAGE_MODEL !== "gpt-image-2") base.input_fidelity = "high"
      const events = await openai.images.edit({
        ...base,
        image: images.length === 1 ? images[0] : images,
      } as any)
      let final: Buffer | null = null
      for await (const event of events as unknown as AsyncIterable<{
        type?: string
        b64_json?: string
      }>) {
        if (typeof event?.b64_json !== "string") continue
        if (event.type?.endsWith("partial_image")) onPartial(event.b64_json)
        else if (event.type?.endsWith("completed")) final = Buffer.from(event.b64_json, "base64")
      }
      if (!final) throw new Error("No image data returned from OpenAI")
      return final
    }

    const runStreamingPassWithRetry = async (
      promptText: string,
      images: Awaited<ReturnType<typeof toFile>>[],
      onPartial: (b64: string) => void
    ): Promise<Buffer> => {
      try {
        return await runStreamingPass(promptText, images, onPartial)
      } catch (firstError) {
        if (isContentPolicyError(firstError)) {
          return await runStreamingPass(sanitizePromptForModeration(promptText), images, onPartial)
        }
        throw firstError
      }
    }

    // ── Streaming path (single-image jobs): progressive previews over SSE so the 60-120s
    // wait becomes a photo developing in front of her instead of a spinner. Carousels and
    // multi-job runs keep the JSON path. Credit checks already happened (402s stay JSON). ──
    const wantsStream = (body as { stream?: boolean }).stream === true && jobs.length === 1
    if (wantsStream) {
      const job = jobs[0]
      const encoder = new TextEncoder()
      const sse = (obj: unknown) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
      const streamBody = new ReadableStream({
        start: async controller => {
          try {
            let current: Buffer | null = null
            for (let pi = 0; pi < job.passes.length; pi++) {
              const pass = job.passes[pi]
              const isFinal = pi === job.passes.length - 1
              const images: Awaited<ReturnType<typeof toFile>>[] =
                pass.input === "selfie"
                  ? selfieFiles
                  : pass.input === "base"
                    ? baseFiles
                    : [await toFile(current as Buffer, "maya-base.png", { type: "image/png" })]
              if (!isFinal) {
                current = await runEditWithRetry(pass.prompt, images)
                continue
              }
              current = await runStreamingPassWithRetry(pass.prompt, images, b64 =>
                controller.enqueue(sse({ type: "partial", b64 }))
              )
            }
            if (!current) throw new Error("Job produced no image")
            const persisted = await persistBuffers([current])
            logGenerated(1)
            controller.enqueue(
              sse({
                type: "done",
                success: true,
                imageUrl: persisted[0].url,
                imageUrls: [persisted[0].url],
                imageCount: 1,
                aiImageId: persisted[0].id,
                aiImageIds: [persisted[0].id],
                creditsDeducted: totalCost,
                newBalance: deduction.newBalance,
              })
            )
          } catch (err) {
            await refundCredits(
              neonUser.id,
              totalCost,
              "OpenAI generation failed",
              refundRef
            ).catch(() => {})
            console.error("[app-v3 generate] Streaming generation failed:", err)
            controller.enqueue(
              sse({
                type: "error",
                error: isContentPolicyError(err)
                  ? "That look pushed against the image rules, even after I softened it. Try another concept or a different outfit and I'll get it for you."
                  : "Failed to generate image. Please try again.",
              })
            )
          } finally {
            controller.close()
          }
        },
      })
      return new Response(streamBody, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      })
    }

    // ── Generate every image (jobs run in parallel; passes within a job run sequentially) ──
    let buffers: Buffer[]
    try {
      if (graphicJobs.length > 0) {
        if (!graphicStyle) throw new Error("Missing style reference for graphic generation")
        buffers = await Promise.all(
          graphicJobs.map(async (job, index) => {
            const result = await redesignContentSlideToBuffer({
              referenceUrl: job.referenceUrl,
              styleReferenceUrl: graphicStyle.imageUrl,
              styleLabel: graphicStyle.label,
              category: job.category,
              topic: job.topic,
              slide: job.slide,
              referenceMode: "identity-scene",
            })
            actualPromptRecords[index] = [
              `Prompt version: ${SSELFIE_PROMPT_VERSION}`,
              result.prompt,
              "",
              "Prompt metadata:",
              `Format: ${format}`,
              `Content type: ${job.category}`,
              `Topic: ${job.topic}`,
              `Slide: ${job.slide.title}`,
              `Style anchor: ${graphicStyle.label ?? "approved SSELFIE reference"}`,
              `Reference URL used: ${job.referenceUrl}`,
              `Style reference URL used: ${graphicStyle.imageUrl}`,
            ].join("\n")
            return result.buffer
          })
        )
      } else if (photoshootJobs.length > 0) {
        buffers = await runPhotoshootHeroAnchoredJobs(photoshootJobs)
      } else {
        buffers = await Promise.all(jobs.map(j => runJob(j)))
      }
    } catch (genError) {
      await refundCredits(neonUser.id, totalCost, "OpenAI generation failed", refundRef).catch(
        () => {}
      )
      if (isContentPolicyError(genError)) {
        return NextResponse.json(
          {
            error:
              "That look pushed against the image rules, even after I softened it. Try another concept or a different outfit and I'll get it for you.",
            code: "content_policy",
          },
          { status: 400 }
        )
      }
      console.error("[app-v3 generate] Generation failed:", genError)
      return NextResponse.json(
        { error: "Failed to generate image. Please try again." },
        { status: 500 }
      )
    }

    // ── Persist each image to Blob + gallery (ai_images). Blob failure refunds the set. ──
    let persisted: { url: string; id: number | null }[]
    try {
      persisted = await persistBuffers(buffers)
    } catch (blobError) {
      await refundCredits(neonUser.id, totalCost, "Blob upload failed", refundRef).catch(() => {})
      console.error("[app-v3 generate] Blob upload failed:", blobError)
      return NextResponse.json(
        { error: "Failed to save image. Please try again." },
        { status: 500 }
      )
    }

    const imageUrls = persisted.map(p => p.url)
    if (imageUrls.length === 0) {
      await refundCredits(neonUser.id, totalCost, "No images saved", refundRef).catch(() => {})
      return NextResponse.json(
        { error: "Failed to save image. Please try again." },
        { status: 500 }
      )
    }

    logGenerated(imageUrls.length)
    return NextResponse.json({
      success: true,
      imageUrl: imageUrls[0],
      imageUrls,
      imageCount: imageUrls.length,
      aiImageId: persisted[0]?.id ?? null,
      aiImageIds: persisted.map(p => p.id),
      creditsDeducted: totalCost,
      newBalance: deduction.newBalance,
    })
  } catch (error) {
    console.error("[app-v3 generate] Unexpected error:", error)
    return NextResponse.json(
      { error: "Failed to generate image. Please try again." },
      { status: 500 }
    )
  }
}
