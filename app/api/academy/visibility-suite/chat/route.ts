import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_QUESTION_LENGTH = 1200
const SUITE_PRODUCT_IDS = ["what_to_say", "show_up", "get_paid"] as const
type SuiteProductId = (typeof SUITE_PRODUCT_IDS)[number]

type WorkbookAnswer = {
  productId: SuiteProductId
  label: string
  value: string
}

function normalizeQuestion(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, MAX_QUESTION_LENGTH)
}

function isSuiteProductId(value: unknown): value is SuiteProductId {
  return typeof value === "string" && (SUITE_PRODUCT_IDS as readonly string[]).includes(value)
}

function normalizeWorkbookAnswers(value: unknown): WorkbookAnswer[] {
  if (!Array.isArray(value)) return []

  return value
    .map(item => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const productId = isSuiteProductId(record.productId) ? record.productId : null
      const label = typeof record.label === "string" ? record.label.trim() : ""
      const answer = typeof record.value === "string" ? record.value.trim() : ""
      if (!productId || !label || !answer) return null
      return {
        productId,
        label: label.slice(0, 140),
        value: answer.slice(0, 1200),
      }
    })
    .filter((item): item is WorkbookAnswer => Boolean(item))
    .slice(0, 70)
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

3. Get Paid (Monetization Path)
   - Revenue path map based on the user's current audience
   - Offer and message alignment for higher intent
   - 90-day execution cadence with launch checkpoints

Your job:
- Help the user know where to start based on what they own
- Guide them through the three workbooks in the right order
- Turn their answers and work into a concrete weekly plan
- Help them connect message clarity to content consistency to monetization
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
- If asked about monetization before they have their message clear, redirect them to start with What to Say
- Keep answers under 200 words unless the user asks for a full plan or checklist`

export async function POST(request: NextRequest) {
  try {
    const { neonUser } = await requireAcademyUser()
    const entitlementState = await getAcademyEntitlementState(neonUser.id)
    const accessibleIds = new Set(entitlementState.accessibleProductIds)
    const entitledProducts = SUITE_PRODUCT_IDS.filter(productId => accessibleIds.has(productId))
    const hasSuiteAccess = entitlementState.membershipActive || entitledProducts.length > 0

    if (!hasSuiteAccess) {
      return NextResponse.json(
        {
          error: "Visibility Suite access required",
          hasAccess: false,
          requiredProductId: "what_to_say",
        },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)

    const question = normalizeQuestion(body?.question)
    const workbookAnswers = normalizeWorkbookAnswers(body?.answers)
    const ownedProducts = entitlementState.membershipActive
      ? [...SUITE_PRODUCT_IDS]
      : entitledProducts

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const ownedContext =
      ownedProducts.length > 0
        ? `The user currently owns: ${ownedProducts.join(", ")}.`
        : "The user has not yet unlocked any suite products."

    const entitledAnswers = entitlementState.membershipActive
      ? workbookAnswers
      : workbookAnswers.filter(answer => ownedProducts.includes(answer.productId))

    const answerContext = entitledAnswers.length
      ? `Workbook answers saved in this browser:
${SUITE_PRODUCT_IDS.map(productId => {
  const answers = entitledAnswers.filter(answer => answer.productId === productId)
  if (!answers.length) return ""
  return `\n## ${productId}\n${answers
    .map((answer, index) => `${index + 1}. ${answer.label}\n${answer.value}`)
    .join("\n\n")}`
})
  .filter(Boolean)
  .join("\n")}`
      : "No saved workbook answers were sent with this request."

    const { text } = await generateText({
      model: "anthropic/claude-haiku-4-5-20251001",
      temperature: 0.35,
      maxTokens: 700,
      system: SYSTEM_PROMPT,
      prompt: `${ownedContext}\n\n${answerContext}\n\nUser question:\n${question}`,
    })

    await logAnalyticsEvent({
      eventName: "visibility_suite_maya_asked",
      userId: neonUser.id,
      path: "/academy/access/visibility-suite",
      properties: {
        question_length: question.length,
        owned_products: ownedProducts,
        answer_count: entitledAnswers.length,
      },
    })

    return NextResponse.json({ answer: text.trim() })
  } catch (error) {
    const routeError = academyRouteErrorToResponse(error)
    if (routeError) return routeError

    console.error("[academy] Visibility Suite Maya chat failed:", error)
    return NextResponse.json(
      { error: "Maya could not answer right now. Please try again." },
      { status: 500 }
    )
  }
}
