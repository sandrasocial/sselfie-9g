import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"
const PLANNER_TITLE = "Content Engine Planner v1"

type PersistedPostStatus = "draft" | "ready" | "scheduled" | "posted"

interface PersistedPlannerPost {
  id: string
  dayLabel: string
  format: string
  pillar: string
  hook: string
  cta: string
  productionNotes: string
  postingTime: string
  captionTheme: string
  status: PersistedPostStatus
  assignedAssetUrl?: string
}

function normalizeStatus(value: unknown): PersistedPostStatus {
  if (value === "ready" || value === "scheduled" || value === "posted") {
    return value
  }
  return "draft"
}

function normalizePosts(input: unknown): PersistedPlannerPost[] {
  if (!Array.isArray(input)) return []

  return input
    .map((rawPost, index) => {
      const post = rawPost as Record<string, unknown>
      const id = typeof post.id === "string" && post.id.length > 0 ? post.id : `post-${index + 1}`

      return {
        id,
        dayLabel: typeof post.dayLabel === "string" ? post.dayLabel : `DAY ${index + 1}`,
        format: typeof post.format === "string" ? post.format : "POST",
        pillar: typeof post.pillar === "string" ? post.pillar : "Educational",
        hook: typeof post.hook === "string" ? post.hook : "",
        cta: typeof post.cta === "string" ? post.cta : "",
        productionNotes: typeof post.productionNotes === "string" ? post.productionNotes : "",
        postingTime: typeof post.postingTime === "string" ? post.postingTime : "TBD",
        captionTheme: typeof post.captionTheme === "string" ? post.captionTheme : "",
        status: normalizeStatus(post.status),
        assignedAssetUrl: typeof post.assignedAssetUrl === "string" ? post.assignedAssetUrl : undefined,
      } satisfies PersistedPlannerPost
    })
    .slice(0, 60)
}

async function requireAdminEmail() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { email: neonUser.email }
}

export async function GET() {
  try {
    const auth = await requireAdminEmail()
    if (auth.error) return auth.error

    const rows = await sql`
      SELECT id, calendar_data, updated_at
      FROM content_calendars
      WHERE created_by = ${ADMIN_EMAIL}
        AND title = ${PLANNER_TITLE}
      ORDER BY updated_at DESC
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return NextResponse.json({ planner: null })
    }

    const row = rows[0] as { id: number; calendar_data: unknown; updated_at: string }

    let parsedCalendarData: unknown = row.calendar_data
    if (typeof parsedCalendarData === "string") {
      try {
        parsedCalendarData = JSON.parse(parsedCalendarData)
      } catch {
        parsedCalendarData = {}
      }
    }

    const dataRecord = (parsedCalendarData || {}) as Record<string, unknown>
    const rawPosts = Array.isArray(dataRecord.days) ? dataRecord.days : []
    const posts = normalizePosts(rawPosts)

    return NextResponse.json({
      planner: {
        id: row.id,
        posts,
        updatedAt: row.updated_at,
      },
    })
  } catch (error: unknown) {
    console.error("[content-engine] GET planner error", error)
    const message = error instanceof Error ? error.message : "Failed to load planner"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminEmail()
    if (auth.error) return auth.error

    const body = (await request.json()) as { posts?: unknown[] }
    const posts = normalizePosts(body.posts)

    if (posts.length === 0) {
      return NextResponse.json({ error: "No posts provided" }, { status: 400 })
    }

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 29)

    const startDateIso = today.toISOString().slice(0, 10)
    const endDateIso = endDate.toISOString().slice(0, 10)

    const uniquePillars = Array.from(new Set(posts.map((post) => post.pillar).filter(Boolean)))

    const calendarData = {
      version: "content-engine-v1",
      days: posts,
    }

    const existingRows = await sql`
      SELECT id
      FROM content_calendars
      WHERE created_by = ${ADMIN_EMAIL}
        AND title = ${PLANNER_TITLE}
      ORDER BY updated_at DESC
      LIMIT 1
    `

    let savedId: number

    if (existingRows.length > 0) {
      const existingId = existingRows[0].id as number
      const updated = await sql`
        UPDATE content_calendars
        SET
          description = ${"Persistent state for /admin/content-engine"},
          duration = ${"30 days"},
          start_date = ${startDateIso}::date,
          end_date = ${endDateIso}::date,
          platform = ${"instagram"},
          calendar_data = ${JSON.stringify(calendarData)}::jsonb,
          content_pillars = ${uniquePillars},
          total_posts = ${posts.length},
          updated_at = NOW()
        WHERE id = ${existingId}
        RETURNING id
      `

      savedId = updated[0].id as number
    } else {
      const inserted = await sql`
        INSERT INTO content_calendars (
          title,
          description,
          duration,
          start_date,
          end_date,
          platform,
          calendar_data,
          content_pillars,
          total_posts,
          created_by,
          created_at,
          updated_at
        ) VALUES (
          ${PLANNER_TITLE},
          ${"Persistent state for /admin/content-engine"},
          ${"30 days"},
          ${startDateIso}::date,
          ${endDateIso}::date,
          ${"instagram"},
          ${JSON.stringify(calendarData)}::jsonb,
          ${uniquePillars},
          ${posts.length},
          ${ADMIN_EMAIL},
          NOW(),
          NOW()
        )
        RETURNING id
      `

      savedId = inserted[0].id as number
    }

    return NextResponse.json({
      success: true,
      planner: {
        id: savedId,
        posts,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error("[content-engine] POST planner error", error)
    const message = error instanceof Error ? error.message : "Failed to save planner"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const auth = await requireAdminEmail()
    if (auth.error) return auth.error

    const existingRows = await sql`
      SELECT id
      FROM content_calendars
      WHERE created_by = ${ADMIN_EMAIL}
        AND title = ${PLANNER_TITLE}
      ORDER BY updated_at DESC
      LIMIT 1
    `

    if (existingRows.length === 0) {
      return NextResponse.json({ success: true, planner: null })
    }

    const existingId = existingRows[0].id as number
    await sql`
      UPDATE content_calendars
      SET
        calendar_data = ${JSON.stringify({ version: "content-engine-v1", days: [] })}::jsonb,
        total_posts = 0,
        content_pillars = ${[]},
        updated_at = NOW()
      WHERE id = ${existingId}
    `

    return NextResponse.json({
      success: true,
      planner: {
        id: existingId,
        posts: [],
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error("[content-engine] DELETE planner error", error)
    const message = error instanceof Error ? error.message : "Failed to clear planner"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
