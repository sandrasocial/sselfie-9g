import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import {
  isCompleteWhatToSayMessageKit,
  parseWhatToSayMessageKit,
  type WhatToSayMessageKit,
} from "@/lib/academy/what-to-say-output"
import { sql } from "@/lib/db/client"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"

export const runtime = "nodejs"
export const maxDuration = 90

const PRODUCT_IDS = ["what_to_say", "show_up", "get_paid"] as const
type ProductId = (typeof PRODUCT_IDS)[number]

const ACTIONS = ["review", "generate", "next"] as const
type WorkbookAction = (typeof ACTIONS)[number]

type WorkbookAnswer = {
  label: string
  value: string
}

let ensureOutputTablePromise: Promise<void> | null = null

async function ensureWorkbookOutputTable() {
  if (!ensureOutputTablePromise) {
    ensureOutputTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS academy_workbook_outputs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          access_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          output_json JSONB NOT NULL,
          source_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS idx_academy_workbook_outputs_user_id ON academy_workbook_outputs(user_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_academy_workbook_outputs_token ON academy_workbook_outputs(access_token)`
    })().catch(error => {
      ensureOutputTablePromise = null
      throw error
    })
  }

  await ensureOutputTablePromise
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

function getCreatedFor(email?: string | null) {
  const emailName = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim()
  if (!emailName) return "Friend"
  return emailName.replace(/\b\w/g, letter => letter.toUpperCase()).slice(0, 80)
}

function buildWhatToSayPrompt(input: {
  answers: WorkbookAnswer[]
  createdFor: string
}) {
  const answerText = input.answers
    .map((answer, index) => `${index + 1}. ${answer.label}\n${answer.value}`)
    .join("\n\n")

  return `You are Maya inside SSELFIE Academy.

Turn this woman's completed What To Say workbook into a complete, personal Message Kit she can save as a PDF and use immediately.

This is a rewrite, not a summary. Write the finished words for her in first person wherever she will copy them into her bio, posts, captions, or offer. Preserve her meaning and lived details. Make the language clearer, warmer, and more specific. Do not invent credentials, customer results, revenue, proof, or parts of her story that she did not give you. If an answer is thin, make the strongest honest version possible without adding facts.

Voice rules:
- Plainspoken, warm, direct, and human.
- Short sentences and everyday words.
- No corporate marketing language, hype, guru promises, or em dashes.
- Avoid repetitive "Not X. It is Y." constructions.
- Make the reader feel seen.

Created for: ${input.createdFor}

Return ONLY valid JSON in this exact shape:
{
  "cover": {
    "title": "What To Say",
    "subtitle": "one personal sentence describing this message kit",
    "createdFor": "${input.createdFor}"
  },
  "coreMessage": {
    "oneLineMessage": "one clear finished positioning sentence",
    "iHelpStatement": "a finished I help sentence",
    "instagramBio": "a finished bio, maximum 150 characters"
  },
  "foundation": {
    "audience": "a specific rewritten description of her one person",
    "audienceSelfTalk": "the real words that person says to herself",
    "transformation": "the honest 90-day change she helps create",
    "authority": "why she is the right person, grounded only in her answers",
    "story": "her story rewritten as a polished first-person paragraph",
    "expertise": "her expertise rewritten clearly",
    "values": "her values rewritten clearly",
    "vision": "her vision rewritten clearly",
    "voice": "a practical description of how she should sound"
  },
  "contentBuckets": [
    {
      "name": "Story",
      "purpose": "a personal description of what belongs here",
      "postIdeas": ["specific idea 1", "specific idea 2", "specific idea 3"]
    }
  ],
  "brandWords": ["word or short phrase"],
  "hooks": ["10 finished hooks in her voice"],
  "captions": [
    {
      "label": "Story post",
      "hook": "finished hook",
      "body": "a complete ready-to-post caption",
      "cta": "one clear CTA"
    }
  ],
  "softCta": "one finished soft CTA",
  "offerBridge": "a finished first-person bridge from her content to what she sells",
  "nextSteps": ["three small actions she can take now"]
}

Requirements:
- Exactly 4 content buckets: Story, Teach, Sell, Connect. Personalize every purpose and idea.
- Exactly 10 finished hooks.
- Exactly 3 complete captions. Each body should be 80 to 140 words and must have a hook, useful body, and CTA. Do not return outlines or fill-in-the-blank templates.
- Keep the Instagram bio at 150 characters or fewer.
- Every section must use the workbook answers. Do not leave placeholders.

Workbook answers:
${answerText}`
}

async function generateWhatToSayOutput(input: {
  userId: string
  createdFor: string
  answers: WorkbookAnswer[]
}) {
  const prompt = buildWhatToSayPrompt(input)

  async function run(feature: string, retry = false): Promise<WhatToSayMessageKit> {
    const result = await generateText({
      model: createMayaOpenRouterModel("chat_pro", {
        userId: input.userId,
        feature,
        metadata: { action: "generate", productId: "what_to_say" },
      }),
      temperature: retry ? 0.2 : 0.32,
      maxOutputTokens: 5200,
      prompt: retry ? `${prompt}\n\nIMPORTANT: Return only the complete valid JSON object.` : prompt,
    })

    const parsed = parseWhatToSayMessageKit(result.text, input.createdFor)
    return {
      ...parsed,
      cover: {
        ...parsed.cover,
        title: "What To Say",
        createdFor: input.createdFor,
      },
    }
  }

  let output: WhatToSayMessageKit
  try {
    output = await run("what_to_say_complete_pdf")
  } catch {
    output = await run("what_to_say_complete_pdf_retry", true)
  }

  if (!isCompleteWhatToSayMessageKit(output)) {
    output = await run("what_to_say_complete_pdf_retry", true)
  }

  if (!isCompleteWhatToSayMessageKit(output)) {
    throw new Error("Maya returned an incomplete What To Say document")
  }

  await ensureWorkbookOutputTable()
  const rows = (await sql`
    INSERT INTO academy_workbook_outputs (
      user_id,
      product_id,
      output_json,
      source_answers,
      created_at,
      updated_at
    ) VALUES (
      ${input.userId},
      'what_to_say',
      ${JSON.stringify(output)}::jsonb,
      ${JSON.stringify(input.answers)}::jsonb,
      NOW(),
      NOW()
    )
    RETURNING access_token::text
  `) as Array<{ access_token: string }>

  const token = rows[0]?.access_token
  if (!token) throw new Error("What To Say document was not saved")

  return {
    output,
    token,
    url: `/academy/what-to-say-result/${token}`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authUser, neonUser } = await requireAcademyUser()
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

    if (productId === "what_to_say" && action === "generate") {
      const generated = await generateWhatToSayOutput({
        userId: neonUser.id,
        createdFor: getCreatedFor(authUser.email || neonUser.email),
        answers,
      })

      await logAnalyticsEvent({
        eventName: "visibility_suite_workbook_maya_used",
        userId: neonUser.id,
        path: `/academy/${productId}`,
        properties: {
          product_id: productId,
          action,
          answer_count: answers.length,
          output_type: "complete_pdf",
        },
      })

      return NextResponse.json({
        label: "Your Complete What To Say PDF",
        answer: "Your personalized Message Kit is ready.",
        token: generated.token,
        url: generated.url,
      })
    }

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
