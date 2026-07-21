import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"

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
      "Create a fast-result Message Kit with: one-line message, 'I help' sentence, Instagram bio, 5 message pillars, 4 content buckets, 10 hooks in the user's voice, 3 ready-to-post captions, soft CTA, bridge to first offer, and the next move into Show Up.",
  },
  show_up: {
    title: "Show Up",
    outcome: "30-day content plan",
    generateLabel: "30-Day Content Plan",
    outputBrief:
      "Create a 30-day content plan with: 4 weekly themes, realistic weekly posting capacity, best-fit formats, existing asset ideas, repurposing ideas, and 30 post ideas. For each post include: post type (Story, Strategy, Social Proof, Show Up, or Sell), goal of the post (trust, connection, reach, conversation, proof, or next step), hook, caption starter, visual idea (selfie, carousel, Reel, Story, screenshot, or behind-the-scenes), and CTA (save, comment, reply, DM, click, buy, or apply). End with a Sunday batching plan the user can actually follow and the clearest content input for Get Paid.",
  },
  get_paid: {
    title: "Get Paid",
    outcome: "Offer and sales path",
    generateLabel: "First Sales Path",
    outputBrief:
      "Create a trust-protecting First Sales Path with: offer sentence, buyer sentence, €500 path, one sales post, 3 warm DM scripts, 3 follow-up scripts, 5 objection replies, first 10 buyer invite list prompts, 7-day selling plan, boundaries and non-guarantee statement, next best move, and the clearest input for the Maya Visibility Plan. Do not create guaranteed income claims. Do not invent testimonials, client results, follower counts, revenue, or proof.",
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
    const rawProductId: unknown = body?.productId
    const rawAction: unknown = body?.action
    const productId = isProductId(rawProductId) ? rawProductId : null
    const action = isAction(rawAction) ? rawAction : null
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
      model: createMayaOpenRouterModel("chat_default", {
        userId: neonUser.id,
        feature: "visibility_suite_workbook",
        metadata: { action, productId },
      }),
      temperature: 0.35,
      maxOutputTokens: action === "generate" ? 1400 : 700,
      system: `You are Maya inside SSELFIE Academy.

You are helping with the existing ${product.title} workbook.
Do not invent a new product.
Do not tell the user to redo the workbook.
Turn their answers into useful next-step outputs for the Visibility To Paid path.

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
