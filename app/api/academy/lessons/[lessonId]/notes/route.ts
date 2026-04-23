import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getLessonCourseProductId } from "@/lib/data/academy"
import { userHasAcademyProductAccess } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"

type LessonNotesPayload = {
  reflection?: string
  action_level?: "bare_minimum" | "bold_move" | "bonus_vibe"
  profile_answer?: string
}

const ALLOWED_PROFILE_FIELDS = new Set([
  "mission_statement",
  "brand_voice",
  "visual_aesthetic",
  "brand_vibe",
  "content_pillars",
  "content_themes",
  "origin_story",
  "transformation_story",
] as const)

type QueryableSql = typeof sql & {
  query: <T = Record<string, unknown>>(queryText: string, params?: unknown[]) => Promise<T[]>
}

async function requireLessonNotesAccess(userId: string, lessonId: number) {
  const productId = await getLessonCourseProductId(lessonId)
  if (!productId || !(await userHasAcademyProductAccess(userId, productId))) {
    return {
      hasAccess: false,
      requiredProductId: productId,
    }
  }

  return {
    hasAccess: true,
    requiredProductId: productId,
  }
}

async function getLessonProfileField(lessonId: number): Promise<string | null> {
  const db = sql as QueryableSql
  const rows = await db.query<{ profile_field: string | null }>(
    "SELECT content->>'profile_field' AS profile_field FROM academy_lessons WHERE id = $1 LIMIT 1",
    [lessonId]
  )

  return rows[0]?.profile_field || null
}

async function upsertPersonalBrandField(userId: string, profileField: string, value: string) {
  const db = sql as QueryableSql
  const existingRows = await db.query<{ id: string }>(
    "SELECT id FROM user_personal_brand WHERE user_id = $1 LIMIT 1",
    [userId]
  )

  if (existingRows.length > 0) {
    await db.query(
      `UPDATE user_personal_brand SET ${profileField} = $2, updated_at = NOW() WHERE user_id = $1`,
      [userId, value]
    )
    return
  }

  await db.query(
    `INSERT INTO user_personal_brand (user_id, ${profileField}, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())`,
    [userId, value]
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const lessonIdNum = Number.parseInt(lessonId, 10)

    if (!Number.isFinite(lessonIdNum) || lessonIdNum <= 0) {
      return NextResponse.json({ error: "Invalid lesson ID" }, { status: 400 })
    }

    const { neonUser } = await requireAcademyUser()
    const access = await requireLessonNotesAccess(neonUser.id, lessonIdNum)
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error: "Academy product access required",
          hasAccess: false,
          requiredProductId: access.requiredProductId,
        },
        { status: 403 }
      )
    }

    const db = sql as QueryableSql
    const rows = await db.query<{
      reflection: string | null
      action_level: "bare_minimum" | "bold_move" | "bonus_vibe" | null
      profile_answer: string | null
    }>(
      "SELECT reflection, action_level, profile_answer FROM user_lesson_notes WHERE user_id = $1 AND lesson_id = $2 LIMIT 1",
      [neonUser.id, lessonIdNum]
    )

    return NextResponse.json(
      rows[0] || {
        reflection: null,
        action_level: null,
        profile_answer: null,
      }
    )
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[academy-notes] Error fetching lesson notes:", error)
    return NextResponse.json({ error: "Failed to fetch lesson notes" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const lessonIdNum = Number.parseInt(lessonId, 10)

    if (!Number.isFinite(lessonIdNum) || lessonIdNum <= 0) {
      return NextResponse.json({ error: "Invalid lesson ID" }, { status: 400 })
    }

    const body = (await req.json()) as LessonNotesPayload
    const reflection =
      typeof body.reflection === "string" ? body.reflection.trim() : undefined
    const actionLevel = body.action_level
    const profileAnswer =
      typeof body.profile_answer === "string" ? body.profile_answer.trim() : undefined

    if (
      reflection === undefined &&
      actionLevel === undefined &&
      profileAnswer === undefined
    ) {
      return NextResponse.json({ error: "No notes to save" }, { status: 400 })
    }

    if (
      actionLevel !== undefined &&
      !["bare_minimum", "bold_move", "bonus_vibe"].includes(actionLevel)
    ) {
      return NextResponse.json({ error: "Invalid action level" }, { status: 400 })
    }

    const { neonUser } = await requireAcademyUser()
    const access = await requireLessonNotesAccess(neonUser.id, lessonIdNum)
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error: "Academy product access required",
          hasAccess: false,
          requiredProductId: access.requiredProductId,
        },
        { status: 403 }
      )
    }

    const db = sql as QueryableSql
    const existingRows = await db.query<{
      reflection: string | null
      action_level: string | null
      profile_answer: string | null
    }>(
      "SELECT reflection, action_level, profile_answer FROM user_lesson_notes WHERE user_id = $1 AND lesson_id = $2 LIMIT 1",
      [neonUser.id, lessonIdNum]
    )

    const existing = existingRows[0]
    const nextReflection = reflection !== undefined ? reflection : existing?.reflection || null
    const nextActionLevel =
      actionLevel !== undefined ? actionLevel : (existing?.action_level as LessonNotesPayload["action_level"]) || null
    const nextProfileAnswer =
      profileAnswer !== undefined ? profileAnswer : existing?.profile_answer || null

    await db.query(
      `INSERT INTO user_lesson_notes (user_id, lesson_id, reflection, action_level, profile_answer, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET reflection = EXCLUDED.reflection, action_level = EXCLUDED.action_level, profile_answer = EXCLUDED.profile_answer, updated_at = NOW()`,
      [neonUser.id, lessonIdNum, nextReflection, nextActionLevel, nextProfileAnswer]
    )

    let profileUpdated = false

    if (profileAnswer !== undefined) {
      const profileField = await getLessonProfileField(lessonIdNum)
      if (profileField && ALLOWED_PROFILE_FIELDS.has(profileField as never)) {
        await upsertPersonalBrandField(neonUser.id, profileField, profileAnswer)
        profileUpdated = true
      }
    }

    return NextResponse.json({ success: true, profileUpdated })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[academy-notes] Error saving lesson notes:", error)
    return NextResponse.json({ error: "Failed to save lesson notes" }, { status: 500 })
  }
}
