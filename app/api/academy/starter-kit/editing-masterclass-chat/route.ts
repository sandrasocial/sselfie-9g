import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyProductAccess } from "@/lib/academy-server-access"
import {
  STARTER_KIT_EDITING_MASTERCLASS_SUMMARY,
  STARTER_KIT_EDITING_MASTERCLASS_TRANSCRIPT,
} from "@/lib/academy/starter-kit-editing-masterclass"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_QUESTION_LENGTH = 1200

function normalizeQuestion(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, MAX_QUESTION_LENGTH)
}

export async function POST(request: NextRequest) {
  try {
    const { neonUser } = await requireAcademyProductAccess("starter_kit")
    const body = await request.json().catch(() => null)
    const question = normalizeQuestion(body?.question)

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "anthropic/claude-haiku-4-5-20251001",
      temperature: 0.35,
      maxTokens: 700,
      system: `You are Maya inside SSELFIE Starter Kit.

You answer from Sandra's Editing Masterclass transcript only.
Your job is to help the user apply the lesson, not to invent new editing methods.

Voice:
- Warm, clear, encouraging, and practical.
- Short paragraphs.
- Give one next step.
- No hype, no jargon, no long disclaimers.

Rules:
- If the user asks for settings, use the exact settings from the transcript.
- If the transcript does not answer something, say what the lesson covers and offer the closest next step.
- Do not mention that you are an AI model.
- Do not recommend paid tools unless the transcript says it. Lightroom video presets require paid Lightroom; say that only when relevant.
- Keep answers under 180 words unless the user asks for a checklist.`,
      prompt: `Editing Masterclass summary:
${STARTER_KIT_EDITING_MASTERCLASS_SUMMARY.map((item) => `- ${item}`).join("\n")}

Full transcript:
${STARTER_KIT_EDITING_MASTERCLASS_TRANSCRIPT}

User question:
${question}`,
    })

    await logAnalyticsEvent({
      eventName: "starter_kit_editing_masterclass_maya_asked",
      userId: neonUser.id,
      path: "/academy/access/starter-kit",
      properties: {
        question_length: question.length,
      },
    })

    return NextResponse.json({ answer: text.trim() })
  } catch (error) {
    const routeError = academyRouteErrorToResponse(error)
    if (routeError) return routeError

    console.error("[academy] Starter Kit editing masterclass chat failed:", error)
    return NextResponse.json(
      { error: "Maya could not answer right now. Please try again." },
      { status: 500 },
    )
  }
}
