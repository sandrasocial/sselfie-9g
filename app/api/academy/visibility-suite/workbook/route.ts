import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const runtime = "nodejs"
export const maxDuration = 30

const PRODUCT_IDS = ["what_to_say", "show_up", "get_paid"] as const
type ProductId = (typeof PRODUCT_IDS)[number]

const ACTIONS = ["review", "generate", "next"] as const
type WorkbookAction = (typeof ACTIONS)[number]

type WorkbookAnswer = {
  label: string
  value: string
}

const PRODUCT_CONTEXT: Record<
  ProductId,
  {
    title: string
    outcome: string
    generateLabel: string
    outputBrief: string
  }
> = {
  what_to_say: {
    title: "What To Say",
    outcome: "Message OS",
    generateLabel: "Message Kit",
    outputBrief:
      "Create a message kit with: one-line positioning, Instagram bio, 5 message pillars, 20 caption hooks, 10 brand phrases, content bucket ideas, and one next step.",
  },
  show_up: {
    title: "Show Up",
    outcome: "30-day content plan",
    generateLabel: "30-Day Content Plan",
    outputBrief:
      "Create a content plan with: 4 weekly themes, 30 post ideas, the first 5 captions, CTA suggestions, a Sunday batching checklist, and one next step.",
  },
  get_paid: {
    title: "Get Paid",
    outcome: "Offer and sales path",
    generateLabel: "First Sales Path",
    outputBrief:
      "Create a sales path with: clean offer statement, buyer profile, first 500 plan, one sales post, 3 DM scripts, 3 follow-up messages, simple CTA, 7-day selling plan, and one next step.",
  },
}

function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && (PRODUCT_IDS as readonly string[]).includes(value)
}

function isAction(value: unknown): value is WorkbookAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value)
}

function normalizeAnswers(value: unknown): WorkbookAnswer[] {
  if (!Array.isArray(value)) return []

  return value
    .map(item => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const label = typeof record.label === "string" ? record.label.trim() : ""
      const answer = typeof record.value === "string" ? record.value.trim() : ""
      if (!label || !answer) return null
      return {
        label: label.slice(0, 160),
        value: answer.slice(0, 1400),
      }
    })
    .filter((item): item is WorkbookAnswer => Boolean(item))
    .slice(0, 40)
}

function buildActionInstruction(
  action: WorkbookAction,
  product: (typeof PRODUCT_CONTEXT)[ProductId]
) {
  if (action === "review") {
    return `Review the user's answers for ${product.title}. Tell them what is clear, what is missing, and what to fix next. Keep it kind and specific.`
  }

  if (action === "next") {
    return `Use the user's answers from ${product.title} and give them the next 3 actions they should take today. Make the first action tiny and doable.`
  }

  return product.outputBrief
}

export async function POST(request: NextRequest) {
  try {
    const { neonUser } = await requireAcademyUser()
    const entitlementState = await getAcademyEntitlementState(neonUser.id)
    const accessibleIds = new Set(entitlementState.accessibleProductIds)

    const body = await request.json().catch(() => null)
    const productId = isProductId(body?.productId) ? body.productId : null
    const action = isAction(body?.action) ? body.action : null
    const answers = normalizeAnswers(body?.answers)

    if (!productId || !action) {
      return NextResponse.json({ error: "Product and action are required" }, { status: 400 })
    }

    if (!entitlementState.membershipActive && !accessibleIds.has(productId)) {
      return NextResponse.json(
        {
          error: "Workbook access required",
          hasAccess: false,
          requiredProductId: productId,
        },
        { status: 403 }
      )
    }

    if (!answers.length) {
      return NextResponse.json(
        { error: "Fill in at least one workbook answer first." },
        { status: 400 }
      )
    }

    const product = PRODUCT_CONTEXT[productId]
    const answerText = answers
      .map((answer, index) => `${index + 1}. ${answer.label}\n${answer.value}`)
      .join("\n\n")

    const { text } = await generateText({
      model: "anthropic/claude-haiku-4-5-20251001",
      temperature: 0.35,
      maxTokens: action === "generate" ? 1400 : 700,
      system: `You are Maya inside SSELFIE Academy.

You are helping with the existing ${product.title} workbook.
Do not invent a new product.
Do not tell the user to redo the workbook.
Turn their answers into useful next-step outputs.

Voice:
- Warm, real, clear, encouraging, actionable.
- Short paragraphs.
- Specific outputs over vague motivation.
- No buzzwords.
- Do not mention that you are an AI model.

Formatting:
- Use short section labels.
- Use bullets when helpful.
- End with one clear next step.`,
      prompt: `Product: ${product.title}
Desired outcome: ${product.outcome}
Action: ${action}
Instruction: ${buildActionInstruction(action, product)}

Workbook answers:
${answerText}`,
    })

    await logAnalyticsEvent({
      eventName: "visibility_suite_workbook_maya_used",
      userId: neonUser.id,
      path: `/academy/${productId}`,
      properties: {
        product_id: productId,
        action,
        answer_count: answers.length,
      },
    })

    return NextResponse.json({
      answer: text.trim(),
      label: action === "generate" ? product.generateLabel : "Maya Review",
    })
  } catch (error) {
    const routeError = academyRouteErrorToResponse(error)
    if (routeError) return routeError

    console.error("[academy] Visibility Suite workbook Maya failed:", error)
    return NextResponse.json(
      { error: "Maya could not help with this workbook right now. Please try again." },
      { status: 500 }
    )
  }
}
