// SSELFIE Studio 3.0 — app-v3 Maya chat (the spine, MAYA-REBUILD-03).
//
// Stage 1 of the two-stage pipeline: Maya (Claude Sonnet 4.5) holds an in-character
// conversation and, once she understands the request, calls the emit_concepts tool with
// production-grade concept briefs sized to the ask (default 3; 1-2 for one specific photo;
// 6-9 for a full photoshoot). The client renders her streamed prose plus the concept cards;
// generation happens later on the synchronous /generate route when the user clicks a card.
// No image model is called here.
//
// Isolated /app endpoint. Reuses shared auth + the persona-injected system prompt only.

import { streamText, tool, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"
import { getAppV3MayaSystemPrompt } from "@/lib/app-v3/maya/persona"
import { getVaultStyleGuide, getVaultOverviewGuide } from "@/lib/app-v3/maya/vault-styles-server"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { getMemory, saveMemory } from "@/lib/app-v3/maya/memory-store"
import { listChats } from "@/lib/app-v3/maya/chat-store"
import { sanitizeMayaMessages } from "@/lib/app-v3/maya/message-sanitizer"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import type { OutputFormat } from "@/components/app-v3/types"
import { NextResponse } from "next/server"

export const maxDuration = 300

const VALID_FORMATS: OutputFormat[] = [
  "photo",
  "photoshoot",
  "reel-cover",
  "carousel",
  "story-slide",
  "video",
]
const SHOOT_SHOT_ROLES = [
  "establishing-full-body",
  "movement-lifestyle-action",
  "seated-hero",
  "profile",
  "close-portrait",
  "cover-safe-hero",
  "true-detail",
] as const

// Concept turns are token-heavy: Maya's prose + an emit_concepts call with 3 full briefs (and,
// for graphic formats, headline/slides copy). The shared chat_pro cap (4096) could truncate the
// tool call mid-stream — the user watched cards stream in, then they vanished at finish (P0).
// app-v3 sets its own budget; the shared map stays untouched for legacy /studio.
const APP_V3_MAX_OUTPUT_TOKENS = 8192

const creativeUseCaseSchema = z.enum([
  "single_editorial",
  "full_photoshoot",
  "educational",
  "tutorial",
  "sales",
  "behind_the_scenes",
  "opinion",
  "trust",
  "vault_product",
  "soft_cta",
  "motion",
])

const textSafeAreaSchema = z.enum([
  "top",
  "upper_third",
  "center",
  "lower_third",
  "bottom",
  "left_column",
  "right_column",
  "none",
])

const referenceImageStrategySchema = z.enum([
  "selfie_identity_anchor",
  "selfie_plus_body_reference",
  "inspiration_style_only",
  "vault_style_context",
  "existing_generated_image",
  "screenshot_preserve_exact",
  "no_reference",
])

const creativePlanOutputSchema = z.object({
  title: z.string().describe("Slide/output title."),
  purpose: z.string().describe("Why this output exists in the creative arc."),
  visualConcept: z.string().describe("Specific visual concept for this output."),
  imagePromptDirection: z
    .string()
    .optional()
    .describe("Image prompt direction: subject, scene, outfit, pose, mood, lighting, crop, text-safe area."),
  videoPromptDirection: z.string().optional().describe("Video prompt direction. Do not use for carousel."),
  textSafeArea: textSafeAreaSchema.optional(),
  referenceImageStrategy: referenceImageStrategySchema,
  reasonThisMatchesUserIntent: z.string().describe("Why this output matches the user's selected request."),
})

const creativePlanSchema = z.object({
  mode: z.enum(["carousel", "video"]).describe("Shared planning contract for carousel and video."),
  userIntent: z.string().describe("The exact user carousel request/topic."),
  useCase: creativeUseCaseSchema,
  audienceEmotion: z.string().describe("What the viewer should feel or realize."),
  contentGoal: z.string().describe("What the carousel is meant to do."),
  visualDirection: z.string().describe("Overall visual direction for the carousel set."),
  vaultStyleReferences: z.array(
    z.object({
      name: z.string(),
      promptSnippet: z.string().optional(),
      mood: z.string().optional(),
      referenceImageUrl: z.string().nullable().optional(),
      reason: z.string().optional(),
    })
  ),
  inspirationInterpretation: z
    .object({
      sourceUrl: z.string().nullable().optional(),
      pose: z.string().optional(),
      outfit: z.string().optional(),
      lighting: z.string().optional(),
      colorGrade: z.string().optional(),
      mood: z.string().optional(),
      accessories: z.string().optional(),
      avoidCopying: z.array(z.string()).optional(),
    })
    .optional(),
  referenceHandling: z.object({
    identityStrategy: referenceImageStrategySchema,
    inspirationStrategy: referenceImageStrategySchema.optional(),
    notes: z.string().optional(),
  }),
  outputCount: z.number().int().min(1).max(10),
  outputs: z.array(creativePlanOutputSchema).min(1).max(10),
  validationRules: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["error", "warning"]),
      description: z.string(),
    })
  ),
})

// Zod schema for one concept brief. Mirrors lib/app-v3/maya/concept-types.CreativeBrief.
const graphicSpec = z
  .object({
    role: z.enum(["hook", "value", "cta"]).optional(),
    headline: z.string().optional(),
    subline: z.string().optional(),
    motionPrompt: z
      .string()
      .optional()
      .describe("For video concepts: subject motion, camera motion, environment motion, pace, and stability."),
    creativePlan: creativePlanSchema
      .optional()
      .describe("The shared Maya Creative Plan. Required for customer-facing carousel concepts and encouraged for video."),
    carouselTitle: z
      .string()
      .optional()
      .describe("The exact user/admin carousel topic this plan answers."),
    contentType: z
      .enum([
        "single_editorial",
        "full_photoshoot",
        "educational",
        "tutorial",
        "sales",
        "behind_the_scenes",
        "opinion",
        "trust",
        "vault_product",
        "soft_cta",
        "motion",
        // Back-compat aliases during the transition to creativePlan.useCase.
        "story",
        "behind-the-scenes",
        "product-vault",
      ])
      .optional()
      .describe("Planner classification. Educational/tutorial/Vault carousels usually need 6-9 slides."),
    desiredOutcome: z
      .string()
      .optional()
      .describe("What the carousel should do: teach, sell, explain, inspire, build trust, or drive comments."),
    slideCount: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Planned slide count. Must match slides.length when present."),
    storyArc: z.string().optional().describe("The planned story arc before individual slides."),
    designDirection: z
      .string()
      .optional()
      .describe("The overall visual direction for the carousel set."),
    relevantVaultStyles: z
      .array(
        z.object({
          name: z.string(),
          mood: z.string().optional(),
          reason: z.string().optional(),
        })
      )
      .optional()
      .describe("Vault styles/prompts used as creative context when the topic connects to the Vault."),
    slides: z
      .array(
        z.object({
          heading: z.string(),
          body: z.string().optional(),
          role: z.enum(["hook", "value", "cta"]).optional(),
          purpose: z.string().optional().describe("Why this slide exists in the carousel arc."),
          visualConcept: z
            .string()
            .optional()
            .describe("Slide-specific visual idea before image generation."),
          imagePrompt: z
            .string()
            .optional()
            .describe(
              "Detailed image ingredients for this slide: subject, scene, outfit, pose, mood, lighting, crop, and text-safe area."
            ),
          imagePromptDirection: z
            .string()
            .optional()
            .describe("Alias for imagePrompt from the shared Creative Plan output."),
          referenceImageStrategy: referenceImageStrategySchema.optional(),
          visualReason: z
            .string()
            .optional()
            .describe("Why this visual matches the slide's message."),
          reasonThisMatchesUserIntent: z
            .string()
            .optional()
            .describe("Alias for visualReason from the shared Creative Plan output."),
          textSafeArea: textSafeAreaSchema.optional(),
        })
      )
      .optional(),
    designSystem: z
      .enum(["cutout-editorial", "full-bleed-editorial", "soft-minimal"])
      .optional()
      .describe(
        "Carousel design system for the WHOLE set. Default to cutout-editorial unless the look says otherwise."
      ),
  })
  .optional()

const conceptSchema = z.object({
  id: z.string().describe("Stable id for this concept, e.g. 'concept-1'."),
  title: z.string().describe("Short editorial title, e.g. 'Quiet-Luxury Morning Desk'."),
  description: z
    .string()
    .describe("1–2 sentences in Maya's voice describing what the user will see."),
  brief: z.object({
    outfit: z
      .string()
      .describe("Exact brand + garment, e.g. 'The Row cream cashmere turtleneck'. Never generic."),
    setting: z.string().describe("A concrete place with real detail."),
    mood: z.string().describe("The emotional register, in a few words."),
    pose: z.string().describe("One simple, natural pose — a real moment."),
    cameraSpec: z.string().describe("A NAMED camera body + lens matched to the positioning."),
    lighting: z.string().describe("A NAMED lighting setup, not 'soft light'."),
    shotRole: z
      .enum(SHOOT_SHOT_ROLES)
      .optional()
      .describe("Required for full photoshoot/series requests: the structural shot role."),
    graphic: graphicSpec,
  }),
})

const emitConcepts = tool({
  description:
    "Present photo/graphic concept directions sized to her ask: 3 distinct directions by default, " +
    "1-2 when she described one specific photo, and 6-9 cohesive shots when she asked for a full shoot. " +
    "Call this once you understand what they want. Each concept's brief must be production-grade with " +
    "exact brand names, a named camera body, named lighting, and shotRole when it is a full shoot.",
  inputSchema: z.object({
    concepts: z
      .array(conceptSchema)
      .min(1)
      .max(9)
      .describe(
        "Size the set to her ask: 3 distinct directions by default; 1-2 when she described one specific photo; 6-9 cohesive shots when she asked for a full photoshoot/series."
      ),
  }),
  // Echo the concepts as the tool output so the client renders them from part.output.concepts,
  // matching the app's existing tool-part convention. Default stop-after-step keeps this terminal.
  execute: async ({ concepts }) => ({ concepts }),
})

// SUITE-UX-02 slice 4: conversational format switching. The format chips are shortcuts, not
// gates — when the user ASKS for a different format mid-chat, Maya calls this and the client
// commits the switch, then auto-pulls fresh directions for it (the existing chip machinery).
const setFormat = tool({
  description:
    "Switch the studio to a different output format when she asks for one in conversation " +
    "(e.g. 'make me a carousel about this', 'turn that into a story slide', 'actually just a photo'). " +
    "Call this INSTEAD of emit_concepts when her request is for a format other than the current one. " +
    "The studio switches and asks you for fresh directions automatically, so keep any text to one " +
    "short line and do not present concepts in the same turn.",
  inputSchema: z.object({
    format: z
      .enum(["photo", "photoshoot", "reel-cover", "carousel", "story-slide", "video"])
      .describe("The format she asked for."),
  }),
  execute: async input => input,
})

const askClarify = tool({
  description:
    "Ask ONE inline clarifying question when you are missing a required detail to make on-brand " +
    "content (e.g. the reel topic, the carousel teaching angle, the story objective). Use this " +
    "INSTEAD of generating something generic. Offer 3 to 5 short tappable options drawn from what " +
    "you know about HER brand (never generic), and set allowFreeText so she can answer in her own " +
    "words. Ask only the single most important missing thing, never a list, never for a plain photo. " +
    "After she answers, call emit_concepts.",
  inputSchema: z.object({
    question: z.string().describe("One short question, e.g. 'What's this reel about?'"),
    options: z
      .array(z.string())
      .min(2)
      .max(5)
      .describe("Short tappable options drawn from her brand."),
    allowFreeText: z.boolean().optional(),
  }),
  execute: async input => input,
})

interface ChatBody {
  messages?: UIMessage[]
  aestheticName?: string
  aestheticIntent?: string
  aestheticId?: string
  format?: OutputFormat
  inspirationImageUrl?: string | null
  brandKit?: { colors?: string[]; fonts?: string[]; vibe?: string } | null
  /** MAYA-ADMIN-01: the /admin surface sets this; only honored for the admin email. */
  adminSession?: boolean
}

function summarizeBriefValue(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 240)
  if (typeof value === "number") return String(value)
  if (Array.isArray(value))
    return value.slice(0, 5).map(summarizeBriefValue).filter(Boolean).join(" / ")
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 8)
    return entries
      .map(([key, item]) => `${key}: ${summarizeBriefValue(item)}`)
      .filter(Boolean)
      .join("; ")
  }
  return ""
}

type AdminToolShoot = {
  id: number
  title: string
  status: string
  approvedShotCount: number
  publishReady: boolean
  publishNeeded: number
  publishedVaultSlug: string | null
  emailDropStatus: string | null
  heroImageUrl: string | null
}

async function getAdminContentToolContext(): Promise<{
  shoots: AdminToolShoot[]
  summary: string
}> {
  try {
    const { listShoots } = await import("@/lib/content-kit/shoot-generator")
    const { getShootPublishReadiness } = await import("@/lib/content-kit/shoot-readiness")
    const shoots = (await listShoots(12))
      .map((shoot): AdminToolShoot => {
        const approvedShots = shoot.shots.filter(
          shot => shot.status === "approved" && shot.imageUrl
        )
        const readiness = getShootPublishReadiness(shoot)
        return {
          id: shoot.id,
          title: shoot.title,
          status: shoot.status,
          approvedShotCount: approvedShots.length,
          publishReady: readiness.ready,
          publishNeeded: readiness.needed,
          publishedVaultSlug: shoot.publishedVaultSlug ?? null,
          emailDropStatus: shoot.emailDropStatus ?? null,
          heroImageUrl: approvedShots[0]?.imageUrl ?? null,
        }
      })
      .filter(shoot => shoot.approvedShotCount >= 2)

    const summary = shoots.length
      ? shoots
          .slice(0, 6)
          .map(shoot => `- ${shoot.id}: ${shoot.title} (${shoot.approvedShotCount} approved shots)`)
          .join("\n")
      : "- No approved shoots with at least 2 rendered shots yet."

    return { shoots, summary }
  } catch (error) {
    console.error("[app-v3 maya chat] admin content tool context failed:", error)
    return { shoots: [], summary: "- Shoot list unavailable right now." }
  }
}

function pickAdminSourceShootId(
  inputId: number | undefined,
  shoots: AdminToolShoot[]
): number | null {
  if (inputId && shoots.some(shoot => shoot.id === inputId)) return inputId
  return shoots[0]?.id ?? null
}

function summarizeAdminCarouselDeck(deck: any) {
  return {
    id: Number(deck.id),
    kind: "carousel" as const,
    title: String(deck.title || "Carousel draft"),
    status: String(deck.status || "draft"),
    caption: String(deck.caption || ""),
    sourceShootId: deck.sourceShootId ?? null,
    sourceShootTitle: deck.sourceShootTitle ?? null,
    slides: Array.isArray(deck.slides)
      ? deck.slides.map((slide: any, index: number) => ({
          index,
          kind: String(slide?.kind || "slide"),
          title: String(slide?.title || `Slide ${index + 1}`),
        }))
      : [],
  }
}

function summarizeAdminStorySequence(sequence: any) {
  return {
    id: Number(sequence.id),
    kind: "story" as const,
    title: String(sequence.title || "Story sequence draft"),
    status: String(sequence.status || "draft"),
    sourceShootId: sequence.sourceShootId ?? null,
    sourceShootTitle: sequence.sourceShootTitle ?? null,
    slides: Array.isArray(sequence.slides)
      ? sequence.slides.map((slide: any, index: number) => ({
          index,
          role: String(slide?.role || "slide"),
          title: Array.isArray(slide?.lines)
            ? slide.lines
                .map((line: any) => line?.text)
                .filter(Boolean)
                .slice(0, 2)
                .join(" / ")
            : `Story ${index + 1}`,
        }))
      : [],
  }
}

function summarizeVaultDropEmailPreview(preview: any) {
  return {
    ready: Boolean(preview.ready),
    dropKey: String(preview.dropKey || ""),
    selectedCollectionIds: Array.isArray(preview.selectedCollectionIds)
      ? preview.selectedCollectionIds
      : [],
    missingCollectionIds: Array.isArray(preview.missingCollectionIds)
      ? preview.missingCollectionIds
      : [],
    collections: Array.isArray(preview.collections) ? preview.collections : [],
    availableCollections: Array.isArray(preview.availableCollections)
      ? preview.availableCollections
      : [],
    segments: preview.segments ?? {
      nonbuyers: { count: 0, sampleRecipients: [] },
      buyers: { count: 0, sampleRecipients: [] },
    },
    totalRecipients: Number(preview.totalRecipients || 0),
    latestRun: preview.latestRun ?? null,
  }
}

async function getAdminBriefContext(): Promise<string> {
  try {
    const { getLatestAnalyticsReports } = await import("@/lib/analytics/reports")
    const reports = await getLatestAnalyticsReports({
      reportType: "content_brief_weekly",
      limit: 1,
    })
    const report = reports[0]
    if (!report?.payload) return ""
    const payload = report.payload as Record<string, unknown>
    const period = report.period_start
      ? new Date(report.period_start).toISOString().slice(0, 10)
      : "latest"
    const contentPlan = Array.isArray(payload.contentPlan)
      ? payload.contentPlan
          .slice(0, 6)
          .map((piece: any) => {
            const title = typeof piece?.title === "string" ? piece.title : "Untitled"
            const format = typeof piece?.format === "string" ? piece.format : "content"
            const hook = typeof piece?.hook === "string" ? piece.hook : ""
            return `- ${format}: ${title}${hook ? ` | hook: ${hook}` : ""}`
          })
          .join("\n")
      : ""
    return [
      "---",
      "## CURRENT WEEKLY BRIEF CONTEXT",
      `Period: ${period}. Use this as live context for Sandra's admin content ideas.`,
      contentPlan ? `Content plan:\n${contentPlan}` : "",
      `Other brief signals: ${summarizeBriefValue(payload).slice(0, 1400)}`,
      "Write in Sandra's simple everyday voice: warm, friendly, clear, no corporate phrasing.",
    ]
      .filter(Boolean)
      .join("\n")
  } catch (e) {
    console.error("[app-v3 maya chat] admin brief context load skipped:", e)
    return ""
  }
}

async function getAdminEditorialMemoryContext(): Promise<string> {
  try {
    const { getAdminMemoryContext } = await import("@/lib/app-v3/maya/admin-memory-store")
    return await getAdminMemoryContext()
  } catch (e) {
    console.error("[app-v3 maya chat] admin editorial memory load skipped:", e)
    return ""
  }
}

/** Only public Vercel Blob https URLs are accepted as an inspiration image. */
function isAllowedInspirationUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

/**
 * If an inspiration image is attached, append it (plus a one-line instruction) to the most
 * recent user message so the multimodal model can read its pose + wardrobe. Mutates a copy.
 */
function attachInspiration(messages: any[], url: string): any[] {
  const next = [...messages]
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i]?.role !== "user") continue
    const existing = next[i].content
    const textParts =
      typeof existing === "string"
        ? [{ type: "text", text: existing }]
        : Array.isArray(existing)
          ? existing
          : []
    next[i] = {
      ...next[i],
      content: [
        ...textParts,
        {
          type: "text",
          text: "Inspiration image attached — use its pose and wardrobe/styling in the concepts (do not copy the face).",
        },
        { type: "image", image: new URL(url) },
      ],
    }
    return next
  }
  return next
}

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as ChatBody | null
    const uiMessages = body?.messages
    if (!Array.isArray(uiMessages) || uiMessages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 })
    }

    const format: OutputFormat =
      body?.format && VALID_FORMATS.includes(body.format) ? body.format : "photo"

    // Her authoritative brand profile from the EXISTING SSELFIE system (reuse, don't rebuild).
    // This is what makes Maya know the creator (not just the look). Best-effort; never blocks chat.
    let brandContext = ""
    try {
      brandContext = await getUserContextForMaya(user.id)
    } catch (e) {
      console.error("[app-v3 maya chat] brand context load skipped:", e)
    }

    // Cross-session memory + recent activity: what Maya already knows + what she's been making.
    // Both feed her confidence so she asks only when she genuinely doesn't know (best-effort).
    let memory = null
    let recentActivity: string[] = []
    let memoryUserId: string | null = null
    try {
      const neonUserId = await getUserIdFromSupabase(user.id)
      if (neonUserId) {
        memoryUserId = String(neonUserId)
        memory = await getMemory(String(neonUserId))
        const chats = await listChats(String(neonUserId))
        recentActivity = chats
          .map(c => c.title)
          .filter((t): t is string => !!t && t.trim().length > 0)
          // Drop the generic format-phrase titles ("Let's create photos") so only real signal remains.
          .filter(t => !/^(let's|actually,\s*let's)\b/i.test(t.trim()))
          .slice(0, 6)
      }
    } catch (e) {
      console.error("[app-v3 maya chat] memory/activity load skipped:", e)
    }

    const vaultStyleGuide =
      (await getVaultStyleGuide(body?.aestheticId)) ?? (await getVaultOverviewGuide())
    let system = getAppV3MayaSystemPrompt({
      aestheticName: body?.aestheticName?.trim() || "SSELFIE editorial",
      aestheticIntent:
        body?.aestheticIntent?.trim() ||
        "An editorial brand-shoot look: cohesive styling, refined light, brand-shoot quality.",
      format,
      brandKit: body?.brandKit ?? null,
      memory,
      recentActivity,
      brandContext,
      // The real Vault shots for the chosen vibe — Maya's styling source of truth. General
      // sessions (a Content idea, "maya-general") fall back to the all-collections overview so
      // EVERY generation path carries Vault DNA, never a generic posed-studio default.
      vaultStyleGuide,
    })

    // MAYA-ADMIN-01: inside /admin, Maya switches jobs to Sandra's content co-creator.
    // Server-gated on the admin email — the flag alone does nothing for anyone else.
    let isAdminSession = false
    let adminContentToolContext: Awaited<ReturnType<typeof getAdminContentToolContext>> | null =
      null
    if (body?.adminSession === true) {
      const { isAdminEmail } = await import("@/lib/admin-feature-flags")
      if (isAdminEmail(user.email)) {
        isAdminSession = true
        const { ADMIN_MAYA_CONTRACT } = await import("@/lib/app-v3/maya/admin-persona")
        const [briefContext, adminMemoryContext] = await Promise.all([
          getAdminBriefContext(),
          getAdminEditorialMemoryContext(),
        ])
        adminContentToolContext = await getAdminContentToolContext()
        const toolContext = [
          "---",
          "## ADMIN CONTENT TOOLS AVAILABLE",
          "When Sandra asks for a carousel, story sequence, content tool, or wants to reuse an approved shoot, use the admin content tools instead of only explaining.",
          "When Sandra asks for a tutorial carousel, iPhone/settings carousel, before-after teaching deck, or content based on strong reels, use create_admin_tutorial_carousel so the real reel-reference frames can be redesigned into finished editorial slides.",
          "When Sandra asks to approve, publish, add to the Vault, or send the drop email, use the admin publish and Vault drop handoff tools.",
          "Default to the newest approved Shoot Studio collection unless Sandra names another source shoot.",
          "Carousels and story sequences are drafts only. Publishing a shoot to the Vault is allowed only through the explicit publish tool. Email sends always stay behind the handoff card buttons.",
          "When Sandra says why something is approved, rejected, too generic, off-voice, or finally feels like her, quietly call remember_admin_decision with that editorial signal.",
          `Approved shoot sources:\n${adminContentToolContext.summary}`,
        ].join("\n")
        system = `${system}\n\n${ADMIN_MAYA_CONTRACT}\n\n${toolContext}${adminMemoryContext ? `\n\n${adminMemoryContext}` : ""}${briefContext ? `\n\n${briefContext}` : ""}`
      }
    }

    // SUITE-UX-02 member pulse: behavior events only (Admin Data Contract), fail-open,
    // admin sessions tagged so the weekly aggregate can exclude Sandra's own use.
    const logBehavior = (eventName: string, properties: Record<string, unknown>) => {
      if (!memoryUserId) return
      import("@/lib/analytics/events")
        .then(({ logAnalyticsEvent }) =>
          logAnalyticsEvent({
            eventName,
            userId: memoryUserId,
            properties: { ...properties, admin: isAdminSession },
          })
        )
        .catch(() => {})
    }

    const cleanUiMessages = sanitizeMayaMessages(uiMessages, { admin: isAdminSession }) as UIMessage[]
    if (cleanUiMessages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 })
    }

    let modelMessages = await convertToModelMessages(cleanUiMessages)
    if (isAllowedInspirationUrl(body?.inspirationImageUrl)) {
      modelMessages = attachInspiration(modelMessages, body.inspirationImageUrl)
    }

    // SUITE-UX-02: Maya learns as she goes. When the user expresses a lasting brand fact or
    // style preference, she appends it to cross-session memory (app_v3_memory) herself —
    // silently, no announcement (persona rule). Dedup + 2000-char cap keep notes sane.
    const remember = tool({
      description:
        "Quietly save a LASTING fact about the user's brand or a style preference/aversion they just expressed, so future sessions already know it. Never announce the save in your reply.",
      inputSchema: z.object({
        brandNote: z
          .string()
          .optional()
          .describe(
            "Short lasting brand fact, e.g. 'Sells a 12-week pilates program for new moms'."
          ),
        preference: z
          .string()
          .optional()
          .describe(
            "Short lasting style preference or aversion, e.g. 'Hates studio backdrops; loves warm window light'."
          ),
      }),
      execute: async ({ brandNote, preference }) => {
        if (!memoryUserId || (!brandNote?.trim() && !preference?.trim())) return { saved: false }
        try {
          const current = await getMemory(memoryUserId)
          const append = (cur: string | null, add?: string): string | undefined => {
            const a = add?.trim()
            if (!a) return undefined
            if (cur && cur.toLowerCase().includes(a.toLowerCase())) return undefined
            return (cur ? `${cur}\n${a}` : a).slice(-2000)
          }
          await saveMemory(memoryUserId, {
            brandNotes: append(current.brandNotes, brandNote),
            preferences: append(current.preferences, preference),
          })
          logBehavior("suite_memory_note_saved", {
            brandNote: !!brandNote?.trim(),
            preference: !!preference?.trim(),
          })
          return { saved: true }
        } catch (e) {
          console.error("[app-v3 maya chat] remember tool failed:", e)
          return { saved: false }
        }
      },
    })

    const showAdminContentSources = tool({
      description:
        "ADMIN ONLY. Show Sandra the approved Shoot Studio sources that can be used for shoot-based " +
        "carousels and story sequences. Call this when she asks what shoots/content sources are ready " +
        "or before making a content tool if the source is unclear.",
      inputSchema: z.object({
        format: z.enum(["carousel", "story-sequence"]).optional(),
      }),
      execute: async ({ format: requestedFormat }) => {
        const context = adminContentToolContext ?? (await getAdminContentToolContext())
        return {
          kind: "sources" as const,
          format: requestedFormat ?? null,
          shoots: context.shoots,
        }
      },
    })

    const rememberAdminDecision = tool({
      description:
        "ADMIN ONLY. Quietly save Sandra's LASTING editorial signal: why she approved a shot, why " +
        "she rejected/killed something, voice corrections, visual taste rules, or workflow preferences. " +
        "Never announce the save. Use only for decisions that should guide future admin content.",
      inputSchema: z.object({
        kind: z
          .enum(["approval", "rejection", "preference", "voice", "workflow", "content_signal"])
          .describe("The type of editorial signal."),
        note: z.string().describe("One clear sentence in simple words. No private speculation."),
        sourceType: z
          .enum(["maya_chat", "shoot", "shot", "carousel", "story", "vault_drop", "manual"])
          .optional(),
        sourceId: z
          .string()
          .optional()
          .describe("Optional shoot, shot, carousel, story, or collection id."),
        sourceTitle: z.string().optional().describe("Optional human title of the source item."),
      }),
      execute: async ({ kind, note, sourceType, sourceId, sourceTitle }) => {
        if (!isAdminSession) return { saved: false }
        try {
          const { addAdminMemoryNote } = await import("@/lib/app-v3/maya/admin-memory-store")
          const result = await addAdminMemoryNote({
            adminUserId: memoryUserId ?? user.id,
            kind,
            note,
            sourceType: sourceType ?? "maya_chat",
            sourceId: sourceId ?? null,
            sourceTitle: sourceTitle ?? null,
          })
          logBehavior("suite_admin_memory_note_saved", { kind, saved: result.saved })
          return { saved: result.saved }
        } catch (e) {
          console.error("[app-v3 maya chat] remember admin decision failed:", e)
          return { saved: false }
        }
      },
    })

    const createAdminCarousel = tool({
      description:
        "ADMIN ONLY. Create one draft carousel from an approved Shoot Studio shoot using the existing " +
        "content-kit carousel renderer. Use this when Sandra asks for a carousel, carousel kit, teaching " +
        "deck, or reel-cover-ready carousel from the current/latest shoot. Draft only, never post.",
      inputSchema: z.object({
        topic: z
          .string()
          .optional()
          .describe("Sandra's teaching angle or carousel topic in her words."),
        sourceShootId: z
          .number()
          .optional()
          .describe("Approved Shoot Studio id. Omit to use the newest ready shoot."),
        overlayUrls: z
          .array(z.string())
          .optional()
          .describe("Optional Vercel Blob screenshot/proof overlay URLs."),
      }),
      execute: async ({ topic, sourceShootId, overlayUrls }) => {
        const context = adminContentToolContext ?? (await getAdminContentToolContext())
        const resolvedShootId = pickAdminSourceShootId(sourceShootId, context.shoots)
        if (!resolvedShootId) {
          return {
            kind: "error" as const,
            tool: "carousel",
            message:
              "Approve at least 2 rendered shots in Shoot Studio before I can make a carousel.",
            shoots: context.shoots,
          }
        }

        try {
          const { generateCarousels } = await import("@/lib/content-kit/carousel-generator")
          const decks = await generateCarousels({
            count: 1,
            topic: topic?.trim() || undefined,
            sourceShootId: resolvedShootId,
            overlayUrls: overlayUrls ?? [],
          })
          return {
            kind: "carousel" as const,
            deck: summarizeAdminCarouselDeck(decks[0]),
            sourceShoot: context.shoots.find(shoot => shoot.id === resolvedShootId) ?? null,
          }
        } catch (error) {
          console.error("[app-v3 maya chat] admin carousel tool failed:", error)
          return {
            kind: "error" as const,
            tool: "carousel",
            message: error instanceof Error ? error.message : "Carousel generation failed.",
            shoots: context.shoots,
          }
        }
      },
    })

    const createAdminTutorialCarousel = tool({
      description:
        "ADMIN ONLY. Create one premium tutorial carousel using Sandra's reel-reference library " +
        "(content_reel_references) plus optional approved Shoot Studio images or screenshot Blob URLs. " +
        "Use this when Sandra asks for a tutorial carousel, iPhone/settings carousel, before-after " +
        "teaching deck, or a carousel based on her strongest reels. Draft only, never post.",
      inputSchema: z.object({
        topic: z
          .string()
          .describe("The tutorial angle, e.g. 'how to make one selfie look like a full shoot'."),
        sourceShootId: z
          .number()
          .optional()
          .describe(
            "Optional approved Shoot Studio id for the finished-result image. Omit to use reel references."
          ),
        reelReferenceIds: z
          .array(z.number())
          .optional()
          .describe("Optional content_reel_references ids if Sandra named exact references."),
        imageUrls: z
          .array(z.string())
          .optional()
          .describe("Optional Vercel Blob result/background images."),
        overlayUrls: z
          .array(z.string())
          .optional()
          .describe("Optional Vercel Blob screenshots to preserve exactly."),
        keyword: z
          .enum(["KIT", "PROMPT", "PRESET", "SELFIE"])
          .optional()
          .describe("CTA keyword. Defaults to KIT."),
      }),
      execute: async ({
        topic,
        sourceShootId,
        reelReferenceIds,
        imageUrls,
        overlayUrls,
        keyword,
      }) => {
        try {
          const { generateCarousels, listContentReelReferences } =
            await import("@/lib/content-kit/carousel-generator")
          const references = await listContentReelReferences({
            limit: 8,
            ids: reelReferenceIds,
          })
          const referenceUrls = references.map(reference => reference.imageUrl)
          const sceneReferenceUrls = references
            .filter(reference => reference.kind === "scene")
            .map(reference => reference.imageUrl)
          const decks = await generateCarousels({
            mode: "tutorial",
            count: 1,
            topic: topic.trim(),
            sourceShootId,
            reelReferenceIds,
            imageUrls: [...(imageUrls ?? []), ...referenceUrls],
            overlayUrls: [...(overlayUrls ?? []), ...sceneReferenceUrls],
            keyword,
          })
          return {
            kind: "carousel" as const,
            deck: summarizeAdminCarouselDeck(decks[0]),
            references: references.map(reference => ({
              id: reference.id,
              kind: reference.kind,
              label: reference.label,
              views: reference.views,
              hookLine: reference.hookLine,
            })),
          }
        } catch (error) {
          console.error("[app-v3 maya chat] admin tutorial carousel tool failed:", error)
          return {
            kind: "error" as const,
            tool: "tutorial-carousel",
            message:
              error instanceof Error ? error.message : "Tutorial carousel generation failed.",
          }
        }
      },
    })

    const createAdminStorySequence = tool({
      description:
        "ADMIN ONLY. Create one draft Instagram story sequence from an approved Shoot Studio shoot " +
        "using the existing story renderer. Use this when Sandra asks for story slides, a story sequence, " +
        "or a Story Prompt Engineer sequence. Draft only, never post.",
      inputSchema: z.object({
        topic: z.string().describe("The story idea, angle, or CTA. Required."),
        sourceShootId: z
          .number()
          .optional()
          .describe("Approved Shoot Studio id. Omit to use the newest ready shoot."),
        overlayUrls: z
          .array(z.string())
          .optional()
          .describe("Optional Vercel Blob screenshot/proof overlay URLs."),
      }),
      execute: async ({ topic, sourceShootId, overlayUrls }) => {
        const context = adminContentToolContext ?? (await getAdminContentToolContext())
        const resolvedShootId = pickAdminSourceShootId(sourceShootId, context.shoots)
        if (!resolvedShootId) {
          return {
            kind: "error" as const,
            tool: "story",
            message:
              "Approve at least 2 rendered shots in Shoot Studio before I can make story slides.",
            shoots: context.shoots,
          }
        }

        try {
          const { generateStorySequence } = await import("@/lib/content-kit/story-generator")
          const sequence = await generateStorySequence({
            topic,
            sourceShootId: resolvedShootId,
            overlayUrls: overlayUrls ?? [],
          })
          return {
            kind: "story" as const,
            sequence: summarizeAdminStorySequence(sequence),
            sourceShoot: context.shoots.find(shoot => shoot.id === resolvedShootId) ?? null,
          }
        } catch (error) {
          console.error("[app-v3 maya chat] admin story tool failed:", error)
          return {
            kind: "error" as const,
            tool: "story",
            message: error instanceof Error ? error.message : "Story sequence generation failed.",
            shoots: context.shoots,
          }
        }
      },
    })

    const publishAdminShootToVault = tool({
      description:
        "ADMIN ONLY. Publish a ready Shoot Studio shoot into the DB-backed Prompt Vault after Sandra " +
        "explicitly asks to approve, publish, add it to the Vault, or move it into the drop workflow. " +
        "Only use this for shoots with at least 6 approved rendered shots. After publishing, show the " +
        "Vault drop email handoff so Sandra can review counts and test emails before any live send.",
      inputSchema: z.object({
        sourceShootId: z
          .number()
          .optional()
          .describe("Ready Shoot Studio id. Omit to publish the newest ready unpublished shoot."),
      }),
      execute: async ({ sourceShootId }) => {
        const context = adminContentToolContext ?? (await getAdminContentToolContext())
        const resolvedShoot =
          (sourceShootId ? context.shoots.find(shoot => shoot.id === sourceShootId) : null) ??
          context.shoots.find(shoot => shoot.publishReady && !shoot.publishedVaultSlug)

        if (!resolvedShoot) {
          return {
            kind: "error" as const,
            tool: "publish",
            message:
              "There is no ready unpublished shoot to publish. Approve 6 rendered shots on a new Shoot Studio collection first.",
            shoots: context.shoots,
          }
        }

        if (resolvedShoot.publishedVaultSlug) {
          return {
            kind: "error" as const,
            tool: "publish",
            message: `${resolvedShoot.title} is already published to the Vault as ${resolvedShoot.publishedVaultSlug}. Create or approve the next shoot before publishing again.`,
            shoots: context.shoots,
          }
        }

        if (!resolvedShoot.publishReady) {
          return {
            kind: "error" as const,
            tool: "publish",
            message: `This shoot needs ${resolvedShoot.publishNeeded} more approved rendered shot${resolvedShoot.publishNeeded === 1 ? "" : "s"} before publishing.`,
            shoots: context.shoots,
          }
        }

        try {
          const { publishShootToVault } = await import("@/lib/content-kit/shoot-publisher")
          const { getVaultDropEmailPreview } = await import("@/lib/admin/vault-drop-email-workflow")
          const { addAdminMemoryNote } = await import("@/lib/app-v3/maya/admin-memory-store")
          const result = await publishShootToVault(resolvedShoot.id)
          await addAdminMemoryNote({
            adminUserId: memoryUserId ?? user.id,
            kind: "workflow",
            note: `Published "${result.shoot.title}" to the Vault from Admin Maya after it had enough approved rendered shots.`,
            sourceType: "shoot",
            sourceId: result.shoot.id,
            sourceTitle: result.shoot.title,
            metadata: { vaultSlug: result.collection.slug },
          }).catch(memoryError =>
            console.error("[app-v3 maya chat] publish memory skipped:", memoryError)
          )
          const dropEmail = await getVaultDropEmailPreview()
          return {
            kind: "vault-publish" as const,
            shoot: {
              ...resolvedShoot,
              publishedVaultSlug: result.collection.slug,
              emailDropStatus: "queued",
            },
            collection: result.collection,
            dropEmail: summarizeVaultDropEmailPreview(dropEmail),
          }
        } catch (error) {
          console.error("[app-v3 maya chat] admin publish tool failed:", error)
          return {
            kind: "error" as const,
            tool: "publish",
            message:
              error instanceof Error ? error.message : "Could not publish this shoot to the Vault.",
            shoots: context.shoots,
          }
        }
      },
    })

    const showAdminVaultDropHandoff = tool({
      description:
        "ADMIN ONLY. Show Sandra the Vault drop email readiness handoff: selected collections, free " +
        "preview recipient count, buyer recipient count, latest run, and buttons for test send, live " +
        "run creation, and batch processing. Use this when she asks if the drop email is ready or says " +
        "ready to send the drop email. Showing the handoff does not send anything.",
      inputSchema: z.object({
        collectionIds: z
          .array(z.string())
          .optional()
          .describe("Optional Vault collection slugs to use for this drop."),
      }),
      execute: async ({ collectionIds }) => {
        try {
          const { getVaultDropEmailPreview } = await import("@/lib/admin/vault-drop-email-workflow")
          const dropEmail = await getVaultDropEmailPreview(collectionIds ?? [])
          return {
            kind: "vault-drop-handoff" as const,
            dropEmail: summarizeVaultDropEmailPreview(dropEmail),
          }
        } catch (error) {
          console.error("[app-v3 maya chat] admin vault drop handoff failed:", error)
          return {
            kind: "error" as const,
            tool: "vault-drop",
            message:
              error instanceof Error
                ? error.message
                : "Could not load the Vault drop email handoff.",
          }
        }
      },
    })

    const tools = {
      emit_concepts: emitConcepts,
      ask_clarify: askClarify,
      set_format: setFormat,
      remember,
      ...(isAdminSession
        ? {
            show_admin_content_sources: showAdminContentSources,
            remember_admin_decision: rememberAdminDecision,
            create_admin_carousel: createAdminCarousel,
            create_admin_tutorial_carousel: createAdminTutorialCarousel,
            create_admin_story_sequence: createAdminStorySequence,
            publish_admin_shoot_to_vault: publishAdminShootToVault,
            show_admin_vault_drop_handoff: showAdminVaultDropHandoff,
          }
        : {}),
    }

    const result = streamText({
      model: createMayaOpenRouterModel("chat_pro"), // Claude Sonnet 4.5
      system,
      messages: modelMessages,
      tools,
      temperature: 0.8,
      maxOutputTokens: APP_V3_MAX_OUTPUT_TOKENS,
      // Diagnosis for the disappearing-cards class of bug: a "length" finish means the concept
      // tool call was cut mid-stream and its cards may not survive validation.
      onFinish: ({ finishReason, steps }) => {
        if (finishReason !== "stop" && finishReason !== "tool-calls") {
          console.error(
            `[app-v3 maya chat] stream ended early: finishReason=${finishReason} format=${format} — concept cards may be lost`
          )
        }
        // Member pulse: count what Maya actually did this turn (behavior only, fail-open).
        try {
          for (const step of steps ?? []) {
            for (const call of step.toolCalls ?? []) {
              if (!call) continue
              if (call.toolName === "emit_concepts") {
                const count = Array.isArray((call.input as any)?.concepts)
                  ? (call.input as any).concepts.length
                  : null
                logBehavior("suite_concepts_emitted", { format, count })
              } else if (call.toolName === "ask_clarify") {
                logBehavior("suite_clarify_asked", { format })
              }
            }
          }
        } catch {
          /* analytics never breaks chat */
        }
      },
      onError: ({ error }) => {
        console.error("[app-v3 maya chat] stream error:", error)
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[app-v3 maya chat] Unexpected error:", error)
    return NextResponse.json(
      { error: "Maya's connection is temporarily unavailable. Please try again in a moment." },
      { status: 500 }
    )
  }
}
