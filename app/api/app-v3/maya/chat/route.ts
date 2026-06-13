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
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import type { OutputFormat } from "@/components/app-v3/types"
import { NextResponse } from "next/server"

export const maxDuration = 60

const VALID_FORMATS: OutputFormat[] = ["photo", "reel-cover", "carousel", "story-slide"]

// Concept turns are token-heavy: Maya's prose + an emit_concepts call with 3 full briefs (and,
// for graphic formats, headline/slides copy). The shared chat_pro cap (4096) could truncate the
// tool call mid-stream — the user watched cards stream in, then they vanished at finish (P0).
// app-v3 sets its own budget; the shared map stays untouched for legacy /studio.
const APP_V3_MAX_OUTPUT_TOKENS = 8192

// Zod schema for one concept brief. Mirrors lib/app-v3/maya/concept-types.CreativeBrief.
const graphicSpec = z
  .object({
    role: z.enum(["hook", "value", "cta"]).optional(),
    headline: z.string().optional(),
    subline: z.string().optional(),
    slides: z
      .array(
        z.object({
          heading: z.string(),
          body: z.string().optional(),
          role: z.enum(["hook", "value", "cta"]).optional(),
          visual: z
            .enum(["identity", "detail", "text-only"])
            .optional()
            .describe(
              "Slide type: identity = she appears (MAX 2 per carousel), detail = object shot from " +
                "her world with no people, text-only = designed typographic slide.",
            ),
          detailSubject: z
            .string()
            .optional()
            .describe(
              'For detail slides: the concrete subject, e.g. "cappuccino on a marble table beside her phone".',
            ),
        }),
      )
      .optional(),
    overlayStyle: z
      .enum(["editorial-serif-center", "lower-third-accent", "top-band-minimal", "quote-statement", "series-cover"])
      .optional()
      .describe("Text-overlay style for this concept, chosen to fit her brand and the post's emotion."),
    designSystem: z
      .enum(["cutout-editorial", "full-bleed-editorial", "soft-minimal"])
      .optional()
      .describe("Carousel design system for the WHOLE set. Default to cutout-editorial unless the look says otherwise."),
  })
  .optional()

const conceptSchema = z.object({
  id: z.string().describe("Stable id for this concept, e.g. 'concept-1'."),
  title: z.string().describe("Short editorial title, e.g. 'Quiet-Luxury Morning Desk'."),
  description: z.string().describe("1–2 sentences in Maya's voice describing what the user will see."),
  brief: z.object({
    outfit: z.string().describe("Exact brand + garment, e.g. 'The Row cream cashmere turtleneck'. Never generic."),
    setting: z.string().describe("A concrete place with real detail."),
    mood: z.string().describe("The emotional register, in a few words."),
    pose: z.string().describe("One simple, natural pose — a real moment."),
    cameraSpec: z.string().describe("A NAMED camera body + lens matched to the positioning."),
    lighting: z.string().describe("A NAMED lighting setup, not 'soft light'."),
    graphic: graphicSpec,
  }),
})

const emitConcepts = tool({
  description:
    "Present EXACTLY 3 distinct photo/graphic concept directions to the user. Call this once you " +
    "understand what they want. Each concept's brief must be production-grade with exact brand names, " +
    "a named camera body, and named lighting. Never more or fewer than 3.",
  inputSchema: z.object({
    concepts: z
      .array(conceptSchema)
      .min(1)
      .max(9)
      .describe(
        "Size the set to her ask: 3 distinct directions by default; 1-2 when she described one specific photo; 6-9 cohesive shots when she asked for a full photoshoot/series.",
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
      .enum(["photo", "reel-cover", "carousel", "story-slide"])
      .describe("The format she asked for."),
  }),
  execute: async (input) => input,
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
    options: z.array(z.string()).min(2).max(5).describe("Short tappable options drawn from her brand."),
    allowFreeText: z.boolean().optional(),
  }),
  execute: async (input) => input,
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
  if (Array.isArray(value)) return value.slice(0, 5).map(summarizeBriefValue).filter(Boolean).join(" / ")
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 8)
    return entries.map(([key, item]) => `${key}: ${summarizeBriefValue(item)}`).filter(Boolean).join("; ")
  }
  return ""
}

async function getAdminBriefContext(): Promise<string> {
  try {
    const { getLatestAnalyticsReports } = await import("@/lib/analytics/reports")
    const reports = await getLatestAnalyticsReports({ reportType: "content_brief_weekly", limit: 1 })
    const report = reports[0]
    if (!report?.payload) return ""
    const payload = report.payload as Record<string, unknown>
    const period = report.period_start ? new Date(report.period_start).toISOString().slice(0, 10) : "latest"
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
          .map((c) => c.title)
          .filter((t): t is string => !!t && t.trim().length > 0)
          // Drop the generic format-phrase titles ("Let's create photos") so only real signal remains.
          .filter((t) => !/^(let's|actually,\s*let's)\b/i.test(t.trim()))
          .slice(0, 6)
      }
    } catch (e) {
      console.error("[app-v3 maya chat] memory/activity load skipped:", e)
    }

    const vaultStyleGuide = (await getVaultStyleGuide(body?.aestheticId)) ?? (await getVaultOverviewGuide())
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
    if (body?.adminSession === true) {
      const { isAdminEmail } = await import("@/lib/admin-feature-flags")
      if (isAdminEmail(user.email)) {
        isAdminSession = true
        const { ADMIN_MAYA_CONTRACT } = await import("@/lib/app-v3/maya/admin-persona")
        const briefContext = await getAdminBriefContext()
        system = `${system}\n\n${ADMIN_MAYA_CONTRACT}${briefContext ? `\n\n${briefContext}` : ""}`
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
          }),
        )
        .catch(() => {})
    }

    let modelMessages = await convertToModelMessages(uiMessages)
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
          .describe("Short lasting brand fact, e.g. 'Sells a 12-week pilates program for new moms'."),
        preference: z
          .string()
          .optional()
          .describe("Short lasting style preference or aversion, e.g. 'Hates studio backdrops; loves warm window light'."),
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

    // SUITE-UX-02 slice 6: the text styles become something she can SEE and tap, not guess
    // from names. Cards carry the admin-curated example image per style (app_v3_style_examples).
    const showStyleOptions = tool({
      description:
        "Show the text style options as tappable visual example cards. Call this when she asks what " +
        "text/overlay styles exist, wants to choose how the text or the slides look, or asks for 'a " +
        "different style' on a cover, story slide, or carousel. Keep your reply to one short line and " +
        "do NOT call emit_concepts in the same turn; after she taps a style, use it (graphic.overlayStyle " +
        "or graphic.designSystem) on every following concept until she changes it.",
      inputSchema: z.object({
        kind: z
          .enum(["overlay", "carousel"])
          .optional()
          .describe(
            "overlay = text styles for covers and story slides; carousel = whole-set design systems. " +
              "Defaults to what fits the current format.",
          ),
      }),
      execute: async ({ kind }) => {
        const resolved = kind ?? (format === "carousel" ? "carousel" : "overlay")
        const { listStyleOptions } = await import("@/lib/app-v3/maya/style-example-store")
        const options = await listStyleOptions(resolved).catch(() => [])
        logBehavior("suite_style_options_shown", { format, kind: resolved })
        return { kind: resolved, options }
      },
    })

    const result = streamText({
      model: createMayaOpenRouterModel("chat_pro"), // Claude Sonnet 4.5
      system,
      messages: modelMessages,
      tools: {
        emit_concepts: emitConcepts,
        ask_clarify: askClarify,
        set_format: setFormat,
        remember,
        show_style_options: showStyleOptions,
      },
      temperature: 0.8,
      maxOutputTokens: APP_V3_MAX_OUTPUT_TOKENS,
      // Diagnosis for the disappearing-cards class of bug: a "length" finish means the concept
      // tool call was cut mid-stream and its cards may not survive validation.
      onFinish: ({ finishReason, steps }) => {
        if (finishReason !== "stop" && finishReason !== "tool-calls") {
          console.error(
            `[app-v3 maya chat] stream ended early: finishReason=${finishReason} format=${format} — concept cards may be lost`,
          )
        }
        // Member pulse: count what Maya actually did this turn (behavior only, fail-open).
        try {
          for (const step of steps ?? []) {
            for (const call of step.toolCalls ?? []) {
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
      { status: 500 },
    )
  }
}
