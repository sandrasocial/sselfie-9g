import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import {
  getVisibilityPlanProductLabel,
  parseVisibilityPlanJson,
  type VisibilityPlanProductId,
  type VisibilityPlanWorkbookAnswer,
} from "@/lib/academy/visibility-plan"

export const runtime = "nodejs"
export const maxDuration = 60

const PRODUCT_IDS = ["what_to_say", "show_up", "get_paid"] as const

type QueryableSql = typeof sql & {
  query: <T = Record<string, unknown>>(queryText: string, params?: unknown[]) => Promise<T[]>
}

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
        value: answer.slice(0, 1400),
      }
    })
    .filter((item): item is VisibilityPlanWorkbookAnswer => Boolean(item))
    .slice(0, 70)
}

async function ensureVisibilityPlanTable() {
  const db = sql as QueryableSql
  await db.query(`
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
  `)
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_visibility_suite_plans_user_id ON visibility_suite_plans(user_id)"
  )
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_visibility_suite_plans_access_token ON visibility_suite_plans(access_token)"
  )
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

Create a personalized Visibility To Paid Plan from this user's workbook answers.
The plan must feel specific, practical, and current.
It should turn static workbook answers into usable assets, not more reflection.

User name: ${input.name || "Friend"}

Workbook answers:
${grouped}

Return ONLY valid JSON in this exact shape:
{
  "cover": {"title":"Visibility To Paid Plan","subtitle":"...","createdFor":"..."},
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

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      temperature: 0.32,
      maxOutputTokens: 3600,
      prompt,
    })

    let plan = parseVisibilityPlanJson(text)
    if (!plan.message?.positioning && !plan.content?.firstFivePosts?.length) {
      const retry = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        temperature: 0.2,
        maxOutputTokens: 3600,
        prompt: `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No prose. No markdown.`,
      })
      plan = parseVisibilityPlanJson(retry.text)
    }

    await ensureVisibilityPlanTable()

    const db = sql as QueryableSql
    const rows = await db.query<{ access_token: string }>(
      `INSERT INTO visibility_suite_plans (user_id, plan_json, source_answers, product_ids, created_at, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, $4::text[], NOW(), NOW())
       RETURNING access_token::text`,
      [neonUser.id, JSON.stringify(plan), JSON.stringify(entitledAnswers), [...productIds]]
    )

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
