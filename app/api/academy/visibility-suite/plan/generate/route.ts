import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import {
  getVisibilityPlanProductLabel,
  parseVisibilityPlanJson,
  type VisibilityPlanJson,
  type VisibilityPlanProductId,
  type VisibilityPlanWorkbookAnswer,
} from "@/lib/academy/visibility-plan"

export const runtime = "nodejs"
export const maxDuration = 60

const PRODUCT_IDS = ["what_to_say", "show_up", "get_paid"] as const
let ensureTablePromise: Promise<void> | null = null

function isProductId(value: unknown): value is VisibilityPlanProductId {
  return typeof value === "string" && (PRODUCT_IDS as readonly string[]).includes(value)
}

function normalizeAnswers(value: unknown): VisibilityPlanWorkbookAnswer[] {
  if (!Array.isArray(value)) return []

  return value
    .map(item => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const productId = isProductId(record.productId) ? record.productId : null
      const label = typeof record.label === "string" ? record.label.trim() : ""
      const answer = typeof record.value === "string" ? record.value.trim() : ""
      if (!productId || !label || !answer) return null
      return {
        productId,
        label: label.slice(0, 160),
        value: answer.slice(0, 800),
      }
    })
    .filter((item): item is VisibilityPlanWorkbookAnswer => Boolean(item))
    .slice(0, 70)
}

async function ensureVisibilityPlanTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS visibility_suite_plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          access_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          plan_json JSONB NOT NULL,
          source_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
          product_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS idx_visibility_suite_plans_user_id ON visibility_suite_plans(user_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_visibility_suite_plans_access_token ON visibility_suite_plans(access_token)`
    })().catch(error => {
      ensureTablePromise = null
      throw error
    })
  }

  await ensureTablePromise
}

function firstAnswer(answers: VisibilityPlanWorkbookAnswer[], productId: VisibilityPlanProductId) {
  return answers.find(answer => answer.productId === productId)?.value || ""
}

function answerByLabel(answers: VisibilityPlanWorkbookAnswer[], labelMatch: string) {
  const needle = labelMatch.toLowerCase()
  return answers.find(answer => answer.label.toLowerCase().includes(needle))?.value || ""
}

function buildFallbackVisibilityPlan(input: {
  name: string
  answers: VisibilityPlanWorkbookAnswer[]
}): VisibilityPlanJson {
  const { answers, name } = input
  const positioning =
    answerByLabel(answers, "message test") ||
    [answerByLabel(answers, "who do you help"), answerByLabel(answers, "what do you help")]
      .filter(Boolean)
      .join(" ") ||
    firstAnswer(answers, "what_to_say") ||
    "You help your audience move from unclear to visible with one simple next step."

  const audience =
    answerByLabel(answers, "one person") ||
    answerByLabel(answers, "buyer in one sentence") ||
    "The person who already feels the problem and needs a clear next move."

  const offer =
    answerByLabel(answers, "offer name") ||
    answerByLabel(answers, "offer statement") ||
    answerByLabel(answers, "what would you need to sell") ||
    "A simple starter offer connected to the problem your audience already has."

  const weeklyTheme =
    answerByLabel(answers, "week 1") ||
    answerByLabel(answers, "4 things") ||
    "Show the problem, teach the shift, and invite the next step."

  return {
    cover: {
      title: "Visibility To Paid Plan",
      subtitle: "Your message, content rhythm, sales path, and next 7 days in one place.",
      createdFor: name,
    },
    message: {
      positioning,
      audience,
      brandPhrases: [
        answerByLabel(answers, "brand words") || "Start simple.",
        "Say the real thing.",
        "Make the next step clear.",
      ],
      pillars: [
        {
          name: "Story",
          description:
            answerByLabel(answers, "your story") || "Share the real reason this work matters.",
          postIdeas: ["The moment this became personal", "What you had to learn", "What changed"],
        },
        {
          name: "Teach",
          description:
            answerByLabel(answers, "expertise") ||
            "Teach the small shifts your person needs before she buys.",
          postIdeas: ["The mistake to stop making", "One simple method", "What to do first"],
        },
        {
          name: "Sell",
          description: `Point your visibility toward ${offer}.`,
          postIdeas: ["Who this is for", "What they get", "How to take the next step"],
        },
      ],
    },
    content: {
      weeklyThemes: [weeklyTheme],
      firstFivePosts: [
        {
          day: "Day 1",
          type: "Story",
          hook: "Here is what I know now.",
          caption:
            answerByLabel(answers, "proof") ||
            "Share the proof, story, or result that makes your message believable.",
          cta: "Reply if this is where you are too.",
        },
        {
          day: "Day 2",
          type: "Teach",
          hook: "The first shift is simpler than you think.",
          caption: positioning,
          cta: "Save this for later.",
        },
        {
          day: "Day 3",
          type: "Connect",
          hook: "Real question.",
          caption:
            answerByLabel(answers, "what does she tell herself") ||
            "Ask your audience what they are stuck on right now.",
          cta: "Tell me in one sentence.",
        },
        {
          day: "Day 4",
          type: "Proof",
          hook: "This is what changed.",
          caption:
            answerByLabel(answers, "what did they say after") ||
            "Show a result, client sentence, or personal shift.",
          cta: "DM me if you want this too.",
        },
        {
          day: "Day 5",
          type: "Sell",
          hook: "If this is you, I made this for you.",
          caption: `The next step is ${offer}.`,
          cta: answerByLabel(answers, "how to buy") || "DM me the word READY.",
        },
      ],
      batchingChecklist: [
        "Pick one weekly theme.",
        "Choose three to five realistic posts.",
        "Reuse selfies, notes, screenshots, and client questions you already have.",
        "End every post with one clear next step.",
      ],
    },
    sales: {
      offerStatement: offer,
      buyerProfile: audience,
      first500Plan: [
        answerByLabel(answers, "most realistic") || "Choose one simple starter path.",
        "Invite the first 10 warm people directly.",
        "Post one sales story and one direct sales post this week.",
      ],
      salesPost: {
        hook:
          answerByLabel(answers, "sales post hook") ||
          "You have been visible. Now make the next step clear.",
        body:
          answerByLabel(answers, "sales post story") ||
          `This is for ${audience}. The offer is ${offer}. It gives your visibility somewhere to go.`,
        cta:
          answerByLabel(answers, "sales post CTA") ||
          "DM me READY and I will send you the details.",
      },
      dmScripts: [
        answerByLabel(answers, "DM script") ||
          `Hey, I saw what you shared and thought of ${offer}. Want me to send you the details?`,
      ],
      followUps: [
        "Just checking in. Do you want me to send the details?",
        "No pressure. I thought this might help with the exact thing you mentioned.",
      ],
    },
    nextSevenDays: [
      {
        day: "Day 1",
        action: "Clean up your positioning sentence.",
        output: "One sentence you can use in your bio and posts.",
      },
      {
        day: "Day 2",
        action: "Choose your weekly theme.",
        output: "One focus for the next five posts.",
      },
      { day: "Day 3", action: "Write your first story post.", output: "A trust-building post." },
      { day: "Day 4", action: "Write one teaching post.", output: "A save-worthy post." },
      { day: "Day 5", action: "Write one sales post.", output: "A direct invite to your offer." },
      { day: "Day 6", action: "Invite 3 warm people.", output: "Three real conversations." },
      { day: "Day 7", action: "Review what got replies.", output: "Your next content clue." },
    ],
  }
}

function buildPrompt(input: {
  name: string
  answers: VisibilityPlanWorkbookAnswer[]
  productIds: VisibilityPlanProductId[]
}) {
  const grouped = input.productIds
    .map(productId => {
      const answers = input.answers.filter(answer => answer.productId === productId)
      if (!answers.length) return ""
      return `## ${getVisibilityPlanProductLabel(productId)}
${answers.map((answer, index) => `${index + 1}. ${answer.label}\n${answer.value}`).join("\n\n")}`
    })
    .filter(Boolean)
    .join("\n\n")

  return `You are Maya, the SSELFIE strategy partner.

Create a personalized Maya Visibility Plan from this user's workbook answers.
The plan must feel specific, practical, and current.
It should turn static workbook answers into usable assets, not more reflection.

User name: ${input.name || "Friend"}

Workbook answers:
${grouped}

Return ONLY valid JSON in this exact shape:
{
  "cover": {"title":"Maya Visibility Plan","subtitle":"...","createdFor":"..."},
  "message": {
    "positioning":"...",
    "audience":"...",
    "brandPhrases":["..."],
    "pillars":[{"name":"...","description":"...","postIdeas":["..."]}]
  },
  "content": {
    "weeklyThemes":["..."],
    "firstFivePosts":[{"day":"Day 1","type":"Story","hook":"...","caption":"...","cta":"..."}],
    "batchingChecklist":["..."]
  },
  "sales": {
    "offerStatement":"...",
    "buyerProfile":"...",
    "first500Plan":["..."],
    "salesPost":{"hook":"...","body":"...","cta":"..."},
    "dmScripts":["..."],
    "followUps":["..."]
  },
  "nextSevenDays":[{"day":"Day 1","action":"...","output":"..."}]
}

Rules:
- Keep it honest. No income guarantees.
- Use the user's exact context when possible.
- If one workbook is missing, infer carefully from what they did provide.
- What To Say inputs should shape the positioning, audience, proof points, brand phrases, and content-to-offer bridge.
- Show Up inputs should shape the weekly capacity, best formats, asset reuse, repurposing, weekly themes, and first five posts.
- Get Paid inputs should shape the buyer urgency, willingness-to-pay signal, offer statement, delivery boundaries, first 10 buyer path, sales post, and DM scripts.
- Treat pricing as practical guidance, not a promise. Suggest a simple starter path when the user seems early.
- Make every section usable today.
- Short sentences.
- No corporate language.
- No markdown. JSON only.`
}

export async function POST(request: NextRequest) {
  try {
    const { authUser, neonUser } = await requireAcademyUser()
    const entitlementState = await getAcademyEntitlementState(neonUser.id)
    const accessibleIds = new Set(entitlementState.accessibleProductIds)
    const body = await request.json().catch(() => null)
    const answers = normalizeAnswers(body?.answers)

    const hasSuiteAccess =
      entitlementState.membershipActive ||
      PRODUCT_IDS.some(productId => accessibleIds.has(productId))

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

    const entitledAnswers = entitlementState.membershipActive
      ? answers
      : answers.filter(answer => accessibleIds.has(answer.productId))

    const productIds = PRODUCT_IDS.filter(productId =>
      entitledAnswers.some(answer => answer.productId === productId)
    )

    if (!entitledAnswers.length) {
      return NextResponse.json(
        { error: "Fill in at least one workbook answer before creating your plan." },
        { status: 400 }
      )
    }

    const displayName =
      typeof body?.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 80)
        : authUser.email?.split("@")[0] || "Friend"

    const prompt = buildPrompt({
      name: displayName,
      answers: entitledAnswers,
      productIds: productIds as VisibilityPlanProductId[],
    })

    let plan: VisibilityPlanJson

    try {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        temperature: 0.32,
        maxOutputTokens: 3600,
        prompt,
      })

      plan = parseVisibilityPlanJson(text)
      if (!plan.message?.positioning && !plan.content?.firstFivePosts?.length) {
        const retry = await generateText({
          model: "anthropic/claude-sonnet-4-20250514",
          temperature: 0.2,
          maxOutputTokens: 3600,
          prompt: `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No prose. No markdown.`,
        })
        plan = parseVisibilityPlanJson(retry.text)
      }
    } catch (error) {
      console.warn("[academy] Visibility Suite AI plan fallback used:", error)
      plan = buildFallbackVisibilityPlan({
        name: displayName,
        answers: entitledAnswers,
      })
    }

    await ensureVisibilityPlanTable()

    const rows = await sql<{ access_token: string }[]>`
      INSERT INTO visibility_suite_plans (user_id, plan_json, source_answers, product_ids, created_at, updated_at)
      VALUES (
        ${neonUser.id},
        ${JSON.stringify(plan)}::jsonb,
        ${JSON.stringify(entitledAnswers)}::jsonb,
        ${[...productIds]}::text[],
        NOW(),
        NOW()
      )
      RETURNING access_token::text
    `

    const token = rows[0]?.access_token
    if (!token) {
      throw new Error("Visibility plan was not created")
    }

    await logAnalyticsEvent({
      eventName: "visibility_suite_plan_generated",
      userId: neonUser.id,
      path: "/academy/access/visibility-suite",
      properties: {
        answer_count: entitledAnswers.length,
        product_ids: productIds,
      },
    })

    return NextResponse.json({
      token,
      url: `/academy/visibility-plan/${token}`,
    })
  } catch (error) {
    const routeError = academyRouteErrorToResponse(error)
    if (routeError) return routeError

    console.error("[academy] Visibility Suite plan generation failed:", error)
    return NextResponse.json(
      { error: "Maya could not create your Visibility Plan right now. Please try again." },
      { status: 500 }
    )
  }
}
