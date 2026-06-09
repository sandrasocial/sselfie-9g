// SSELFIE Studio 3.0 — app-v3 Maya chat (the spine, MAYA-REBUILD-03).
//
// Stage 1 of the two-stage pipeline: Maya (Claude Sonnet 4.5) holds an in-character
// conversation and, once she understands the request, calls the emit_concepts tool with
// EXACTLY 3 production-grade concept briefs. The client renders her streamed prose plus the
// 3 concept cards; generation happens later on the synchronous /generate route when the
// user clicks a card. No image model is called here.
//
// Isolated /app endpoint. Reuses shared auth + the persona-injected system prompt only.

import { streamText, tool, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { createMayaOpenRouterModel, getMayaMaxTokensForTask } from "@/lib/maya/openrouter"
import { getAppV3MayaSystemPrompt } from "@/lib/app-v3/maya/persona"
import { getVaultStyleGuide } from "@/lib/app-v3/maya/vault-styles"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { getMemory } from "@/lib/app-v3/maya/memory-store"
import { listChats } from "@/lib/app-v3/maya/chat-store"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import type { OutputFormat } from "@/components/app-v3/types"
import { NextResponse } from "next/server"

export const maxDuration = 60

const VALID_FORMATS: OutputFormat[] = ["photo", "reel-cover", "carousel", "story-slide"]

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
        }),
      )
      .optional(),
    overlayStyle: z
      .enum(["editorial-serif-center", "lower-third-accent", "top-band-minimal", "quote-statement", "series-cover"])
      .optional()
      .describe("Text-overlay style for this concept, chosen to fit her brand and the post's emotion."),
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
    concepts: z.array(conceptSchema).length(3),
  }),
  // Echo the concepts as the tool output so the client renders them from part.output.concepts,
  // matching the app's existing tool-part convention. Default stop-after-step keeps this terminal.
  execute: async ({ concepts }) => ({ concepts }),
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
    try {
      const neonUserId = await getUserIdFromSupabase(user.id)
      if (neonUserId) {
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

    const system = getAppV3MayaSystemPrompt({
      aestheticName: body?.aestheticName?.trim() || "SSELFIE editorial",
      aestheticIntent:
        body?.aestheticIntent?.trim() ||
        "An editorial brand-shoot look: cohesive styling, refined light, brand-shoot quality.",
      format,
      brandKit: body?.brandKit ?? null,
      memory,
      recentActivity,
      brandContext,
      // The real Vault shots for the chosen vibe — Maya's styling source of truth.
      vaultStyleGuide: getVaultStyleGuide(body?.aestheticId),
    })

    let modelMessages = await convertToModelMessages(uiMessages)
    if (isAllowedInspirationUrl(body?.inspirationImageUrl)) {
      modelMessages = attachInspiration(modelMessages, body.inspirationImageUrl)
    }

    const result = streamText({
      model: createMayaOpenRouterModel("chat_pro"), // Claude Sonnet 4.5
      system,
      messages: modelMessages,
      tools: { emit_concepts: emitConcepts, ask_clarify: askClarify },
      temperature: 0.8,
      maxOutputTokens: getMayaMaxTokensForTask("chat_pro"),
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
