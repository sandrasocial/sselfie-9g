import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"
const PLANNER_TITLE = "Content Engine Planner v1"

type PostStatus = "draft" | "ready" | "scheduled" | "posted"

interface PlannerPost {
  id: string
  dayLabel: string
  format: string
  pillar: string
  hook: string
  cta: string
  productionNotes: string
  postingTime: string
  captionTheme: string
  status: PostStatus
  assignedAssetUrl?: string
}

interface BrainEntry {
  id: string
  topic: string
  brainDump: string
  happenedWeek: string
  painPoint: string
  desiredOutcome: string
  createdAt: string
}

function normalizeStatus(value: unknown): PostStatus {
  if (value === "ready" || value === "scheduled" || value === "posted") {
    return value
  }
  return "draft"
}

function normalizePosts(input: unknown): PlannerPost[] {
  if (!Array.isArray(input)) return []

  return input
    .map((rawPost, index) => {
      const post = rawPost as Record<string, unknown>
      return {
        id: typeof post.id === "string" ? post.id : `post-${index + 1}`,
        dayLabel: typeof post.dayLabel === "string" ? post.dayLabel : "",
        format: typeof post.format === "string" ? post.format : "POST",
        pillar: typeof post.pillar === "string" ? post.pillar : "Educational",
        hook: typeof post.hook === "string" ? post.hook : "",
        cta: typeof post.cta === "string" ? post.cta : "",
        productionNotes: typeof post.productionNotes === "string" ? post.productionNotes : "",
        postingTime: typeof post.postingTime === "string" ? post.postingTime : "TBD",
        captionTheme: typeof post.captionTheme === "string" ? post.captionTheme : "",
        status: normalizeStatus(post.status),
        assignedAssetUrl: typeof post.assignedAssetUrl === "string" ? post.assignedAssetUrl : undefined,
      } satisfies PlannerPost
    })
    .slice(0, 80)
}

function normalizeBrainEntries(input: unknown): BrainEntry[] {
  if (!Array.isArray(input)) return []

  return input
    .map((rawEntry, index) => {
      const entry = rawEntry as Record<string, unknown>
      return {
        id: typeof entry.id === "string" ? entry.id : `memory-${index + 1}`,
        topic: typeof entry.topic === "string" ? entry.topic : "",
        brainDump: typeof entry.brainDump === "string" ? entry.brainDump : "",
        happenedWeek: typeof entry.happenedWeek === "string" ? entry.happenedWeek : "",
        painPoint: typeof entry.painPoint === "string" ? entry.painPoint : "",
        desiredOutcome: typeof entry.desiredOutcome === "string" ? entry.desiredOutcome : "",
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
      }
    })
    .filter((entry) => entry.topic || entry.brainDump || entry.painPoint || entry.desiredOutcome)
    .slice(0, 100)
}

async function requireAdmin() {
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

  return { ok: true as const }
}

async function getOrCreateWorkspaceRow() {
  const rows = await sql`
    SELECT id, calendar_data, updated_at
    FROM content_calendars
    WHERE created_by = ${ADMIN_EMAIL}
      AND title = ${PLANNER_TITLE}
    ORDER BY updated_at DESC
    LIMIT 1
  `

  if (rows.length > 0) {
    return rows[0] as { id: number; calendar_data: unknown; updated_at: string }
  }

  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 29)

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
      ${"Second brain + one-click draft workspace"},
      ${"30 days"},
      ${today.toISOString().slice(0, 10)}::date,
      ${endDate.toISOString().slice(0, 10)}::date,
      ${"instagram"},
      ${JSON.stringify({ version: "content-engine-v2", days: [], brainEntries: [] })}::jsonb,
      ${[]},
      ${0},
      ${ADMIN_EMAIL},
      NOW(),
      NOW()
    )
    RETURNING id, calendar_data, updated_at
  `

  return inserted[0] as { id: number; calendar_data: unknown; updated_at: string }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const row = await getOrCreateWorkspaceRow()

    let parsedData: unknown = row.calendar_data
    if (typeof parsedData === "string") {
      try {
        parsedData = JSON.parse(parsedData)
      } catch {
        parsedData = {}
      }
    }

    const data = (parsedData || {}) as Record<string, unknown>
    const posts = normalizePosts(data.days)
    const brainEntries = normalizeBrainEntries(data.brainEntries)

    return NextResponse.json({
      workspace: {
        id: row.id,
        posts,
        brainEntries,
        updatedAt: row.updated_at,
      },
    })
  } catch (error: unknown) {
    console.error("[content-engine] workspace GET error", error)
    const message = error instanceof Error ? error.message : "Failed to load workspace"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const body = (await request.json()) as { posts?: unknown; brainEntries?: unknown }
    const posts = normalizePosts(body.posts)
    const brainEntries = normalizeBrainEntries(body.brainEntries)

    const row = await getOrCreateWorkspaceRow()

    const uniquePillars = Array.from(new Set(posts.map((post) => post.pillar).filter(Boolean)))

    const nextData = {
      version: "content-engine-v2",
      days: posts,
      brainEntries,
    }

    await sql`
      UPDATE content_calendars
      SET
        calendar_data = ${JSON.stringify(nextData)}::jsonb,
        content_pillars = ${uniquePillars},
        total_posts = ${posts.length},
        updated_at = NOW()
      WHERE id = ${row.id}
    `

    return NextResponse.json({
      success: true,
      workspace: {
        id: row.id,
        posts,
        brainEntries,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error("[content-engine] workspace POST error", error)
    const message = error instanceof Error ? error.message : "Failed to save workspace"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const row = await getOrCreateWorkspaceRow()

    await sql`
      UPDATE content_calendars
      SET
        calendar_data = ${JSON.stringify({ version: "content-engine-v2", days: [], brainEntries: [] })}::jsonb,
        content_pillars = ${[]},
        total_posts = 0,
        updated_at = NOW()
      WHERE id = ${row.id}
    `

    return NextResponse.json({
      success: true,
      workspace: {
        id: row.id,
        posts: [],
        brainEntries: [],
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error("[content-engine] workspace DELETE error", error)
    const message = error instanceof Error ? error.message : "Failed to clear workspace"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
