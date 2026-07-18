import { NextResponse } from "next/server"

import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"

const GOALS = new Set(["what-to-post", "sound-like-me", "photos-no-plan", "connect-offer"])

async function currentUser() {
  const { user, error } = await getAuthenticatedUser()
  if (error || !user) return null
  const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
  return getEffectiveNeonUser(user.id)
}

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const [plan] = await sql`
    SELECT goal, recommendation, status, updated_at
    FROM suite_learning_plans
    WHERE user_id = ${user.id}
    LIMIT 1
  `
  return NextResponse.json({ plan: plan ?? null })
}

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const goal = typeof body?.goal === "string" ? body.goal : ""
  const recommendation = body?.recommendation
  if (!GOALS.has(goal) || !recommendation || typeof recommendation !== "object") {
    return NextResponse.json({ error: "Invalid learning plan" }, { status: 400 })
  }
  const safeRecommendation = {
    type: recommendation.type === "product" ? "product" : "course",
    id: String(recommendation.id ?? "").slice(0, 100),
    title: String(recommendation.title ?? "")
      .trim()
      .slice(0, 160),
    href:
      typeof recommendation.href === "string" && recommendation.href.startsWith("/")
        ? recommendation.href.slice(0, 500)
        : "/app?view=library",
    reason: String(recommendation.reason ?? "")
      .trim()
      .slice(0, 500),
  }
  if (!safeRecommendation.id || !safeRecommendation.title) {
    return NextResponse.json({ error: "Recommendation is required" }, { status: 400 })
  }

  const [plan] = await sql`
    INSERT INTO suite_learning_plans (user_id, goal, recommendation, status, updated_at)
    VALUES (${user.id}, ${goal}, ${JSON.stringify(safeRecommendation)}::jsonb, 'active', NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      goal = EXCLUDED.goal,
      recommendation = EXCLUDED.recommendation,
      status = 'active',
      updated_at = NOW()
    RETURNING goal, recommendation, status, updated_at
  `
  return NextResponse.json({ success: true, plan })
}
