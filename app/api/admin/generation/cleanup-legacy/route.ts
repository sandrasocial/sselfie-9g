import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
}

function clampInt(v: unknown, fallback: number, min: number, max: number) {
  const n = Number.parseInt(String(v ?? ""), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

/**
 * POST /api/admin/generation/cleanup-legacy
 *
 * Marks very old stuck generation rows as failed so dashboards and alerts
 * focus on actionable, recent incidents.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || String(neonUser.email || "").trim().toLowerCase() !== getAdminEmail()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const daysOld = clampInt(body?.daysOld, 30, 7, 365)
    const dryRun = String(body?.dryRun || "").toLowerCase() === "true"

    const sql = getDb()

    const [feedCandidates] = await sql`
      SELECT COUNT(*)::int AS count
      FROM feed_posts
      WHERE prediction_id IS NOT NULL
        AND image_url IS NULL
        AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
        AND updated_at < NOW() - make_interval(days => ${daysOld})
    `

    const [aiCandidates] = await sql`
      SELECT COUNT(*)::int AS count
      FROM ai_images
      WHERE prediction_id IS NOT NULL
        AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
        AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
        AND created_at < NOW() - make_interval(days => ${daysOld})
    `

    const [proCandidates] = await sql`
      SELECT COUNT(*)::int AS count
      FROM pro_photoshoot_grids
      WHERE prediction_id IS NOT NULL
        AND grid_url IS NULL
        AND generation_status = 'generating'
        AND updated_at < NOW() - make_interval(days => ${daysOld})
    `

    const [trackerCandidates] = await sql`
      SELECT COUNT(*)::int AS count
      FROM generation_trackers
      WHERE created_at < NOW() - make_interval(days => ${daysOld})
        AND status IN ('queued', 'starting', 'processing', 'running', 'in_progress', 'pending')
    `

    let updatedFeed = 0
    let updatedAi = 0
    let updatedPro = 0
    let updatedTrackers = 0

    if (!dryRun) {
      const feedRows = await sql`
        UPDATE feed_posts
        SET
          generation_status = 'failed',
          updated_at = NOW()
        WHERE prediction_id IS NOT NULL
          AND image_url IS NULL
          AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
          AND updated_at < NOW() - make_interval(days => ${daysOld})
        RETURNING id
      `
      updatedFeed = (feedRows as any[])?.length || 0

      const aiRows = await sql`
        UPDATE ai_images
        SET generation_status = 'failed'
        WHERE prediction_id IS NOT NULL
          AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
          AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
          AND created_at < NOW() - make_interval(days => ${daysOld})
        RETURNING id
      `
      updatedAi = (aiRows as any[])?.length || 0

      const proRows = await sql`
        UPDATE pro_photoshoot_grids
        SET
          generation_status = 'failed',
          updated_at = NOW()
        WHERE prediction_id IS NOT NULL
          AND grid_url IS NULL
          AND generation_status = 'generating'
          AND updated_at < NOW() - make_interval(days => ${daysOld})
        RETURNING id
      `
      updatedPro = (proRows as any[])?.length || 0

      const trackerRows = await sql`
        UPDATE generation_trackers
        SET
          status = 'failed',
          updated_at = NOW()
        WHERE created_at < NOW() - make_interval(days => ${daysOld})
          AND status IN ('queued', 'starting', 'processing', 'running', 'in_progress', 'pending')
        RETURNING id
      `
      updatedTrackers = (trackerRows as any[])?.length || 0
    }

    return NextResponse.json({
      success: true,
      dryRun,
      daysOld,
      candidates: {
        feedPosts: Number((feedCandidates as any)?.count || 0),
        aiImages: Number((aiCandidates as any)?.count || 0),
        proPhotoshootGrids: Number((proCandidates as any)?.count || 0),
        generationTrackers: Number((trackerCandidates as any)?.count || 0),
      },
      updated: {
        feedPosts: updatedFeed,
        aiImages: updatedAi,
        proPhotoshootGrids: updatedPro,
        generationTrackers: updatedTrackers,
      },
    })
  } catch (error) {
    console.error("[v0] admin generation legacy cleanup failed:", error)
    return NextResponse.json(
      {
        error: "Failed to clean legacy generation backlog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
