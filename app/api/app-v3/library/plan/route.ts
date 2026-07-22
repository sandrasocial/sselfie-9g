import { NextResponse } from "next/server"

import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"

const GOALS = new Set(["what-to-post", "sound-like-me", "photos-no-plan", "connect-offer"])
const TASK_ID = /^[a-zA-Z0-9:_-]{8,160}$/

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
    guidanceReason: String(recommendation.guidanceReason ?? "")
      .trim()
      .slice(0, 500),
    taskId:
      typeof recommendation.taskId === "string" && TASK_ID.test(recommendation.taskId)
        ? recommendation.taskId
        : undefined,
    courseId:
      Number.isInteger(recommendation.courseId) && recommendation.courseId > 0
        ? recommendation.courseId
        : undefined,
    lessonId:
      Number.isInteger(recommendation.lessonId) && recommendation.lessonId > 0
        ? recommendation.lessonId
        : undefined,
    sourceRefs: Array.isArray(recommendation.sourceRefs)
      ? recommendation.sourceRefs
          .slice(0, 4)
          .map((source: unknown) => {
            const item =
              source && typeof source === "object" ? (source as Record<string, unknown>) : {}
            const kind = ["method", "course", "lesson", "transcript"].includes(String(item.kind))
              ? String(item.kind)
              : "method"
            return {
              kind,
              ...(Number.isInteger(item.courseId) && Number(item.courseId) > 0
                ? { courseId: Number(item.courseId) }
                : {}),
              ...(Number.isInteger(item.lessonId) && Number(item.lessonId) > 0
                ? { lessonId: Number(item.lessonId) }
                : {}),
              title: String(item.title ?? "")
                .trim()
                .slice(0, 160),
              version: /^[a-f0-9]{16}$/.test(String(item.version ?? ""))
                ? String(item.version)
                : "",
            }
          })
          .filter((source: { title: string; version: string }) => source.title && source.version)
      : [],
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
