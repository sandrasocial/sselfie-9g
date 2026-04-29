import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_QUESTION_LENGTH = 1200

function normalizeQuestion(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, MAX_QUESTION_LENGTH)
}

function normalizeOwnedProducts(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === "string")
    .filter((v) => ["what_to_say", "show_up", "get_paid"].includes(v))
}

const SYSTEM_PROMPT = `You are Maya inside the SSELFIE Visibility Suite.

The Visibility Suite is a three-part business system:

1. What to Say (Message Clarity)
   - 30 caption frameworks for everyday posting
   - Prompt structures to keep voice consistent
   - Quick hooks and closing CTAs for conversion

2. Show Up (Content Consistency)
   - 30-day posting rhythm mapped by content type
   - Weekly batching workflow to reduce content stress
   - Visibility-first structure for stronger reach

3. Get Paid (Monetisation Path)
   - Revenue path map based on the user's current audience
   - Offer and message alignment for higher intent
   - 90-day execution cadence with launch checkpoints

Your job:
- Help the user know where to start based on what they own
- Guide them through the three workbooks in the right order
- Turn their answers and work into a concrete weekly plan
- Help them connect message clarity to content consistency to monetisation
- Be specific and practical — no vague encouragement

Voice:
- Warm, clear, direct, and practical
- Short paragraphs
- Give one next action at a time
- No hype, no jargon, no long disclaimers
- Do not mention that you are an AI model

Rules:
- Always honour the suite order: What to Say → Show Up → Get Paid
- If the user owns only one or two products, acknowledge that and focus on what they have
- If asked about monetisation before they have their message clear, redirect them to start with What to Say
- Keep answers under 200 words unless the user asks for a full plan or checklist`

export async function POST(request: NextRequest) {
  try {
    const { neonUser } = await requireAcademyUser()
    const body = await request.json().catch(() => null)

    const question = normalizeQuestion(body?.question)
    const ownedProducts = normalizeOwnedProducts(body?.ownedProducts)

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const ownedContext =
      ownedProducts.length > 0
        ? `The user currently owns: ${ownedProducts.join(", ")}.`
        : "The user has not yet unlocked any suite products."

    const { text } = await generateText({
      model: "anthropic/claude-haiku-4-5-20251001",
      temperature: 0.35,
      maxTokens: 700,
      system: SYSTEM_PROMPT,
      prompt: `${ownedContext}\n\nUser question:\n${question}`,
    })

    await logAnalyticsEvent({
      eventName: "visibility_suite_maya_asked",
      userId: neonUser.id,
      path: "/academy/access/visibility-suite",
      properties: {
        question_length: question.length,
        owned_products: ownedProducts,
      },
    })

    return NextResponse.json({ answer: text.trim() })
  } catch (error) {
    const routeError = academyRouteErrorToResponse(error)
    if (routeError) return routeError

    console.error("[academy] Visibility Suite Maya chat failed:", error)
    return NextResponse.json(
      { error: "Maya could not answer right now. Please try again." },
      { status: 500 },
    )
  }
}
