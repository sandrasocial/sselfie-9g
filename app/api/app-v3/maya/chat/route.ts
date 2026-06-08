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

interface ChatBody {
  messages?: UIMessage[]
  aestheticName?: string
  aestheticIntent?: string
  format?: OutputFormat
  brandKit?: { colors?: string[]; fonts?: string[]; vibe?: string } | null
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

    const system = getAppV3MayaSystemPrompt({
      aestheticName: body?.aestheticName?.trim() || "SSELFIE editorial",
      aestheticIntent:
        body?.aestheticIntent?.trim() ||
        "An editorial brand-shoot look: cohesive styling, refined light, brand-shoot quality.",
      format,
      brandKit: body?.brandKit ?? null,
    })

    const modelMessages = await convertToModelMessages(uiMessages)

    const result = streamText({
      model: createMayaOpenRouterModel("chat_pro"), // Claude Sonnet 4.5
      system,
      messages: modelMessages,
      tools: { emit_concepts: emitConcepts },
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
