import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number.parseInt(String(v ?? ""), 10)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, n))
}

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
}

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url)
    const limit = clampInt(url.searchParams.get("limit"), 50, 1, 200)

    const sql = getDb()

    const [stuck15m] = await sql`
      SELECT COUNT(*)::int AS count
      FROM feed_posts
      WHERE prediction_id IS NOT NULL
        AND image_url IS NULL
        AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
        AND updated_at < NOW() - INTERVAL '15 minutes'
    `

    const [stuck60m] = await sql`
      SELECT COUNT(*)::int AS count
      FROM feed_posts
      WHERE prediction_id IS NOT NULL
        AND image_url IS NULL
        AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
        AND updated_at < NOW() - INTERVAL '60 minutes'
    `

    const [inconsistentCompleted] = await sql`
      SELECT COUNT(*)::int AS count
      FROM feed_posts
      WHERE image_url IS NOT NULL
        AND generation_status IS DISTINCT FROM 'completed'
    `

    const recentStuck = await sql`
      SELECT id, feed_layout_id, user_id, position, post_type, generation_status, prediction_id, updated_at
      FROM feed_posts
      WHERE prediction_id IS NOT NULL
        AND image_url IS NULL
        AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
      ORDER BY updated_at ASC
      LIMIT ${limit}
    `

    const [aiStuck15m] = await sql`
      SELECT COUNT(*)::int AS count
      FROM ai_images
      WHERE prediction_id IS NOT NULL
        AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
        AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
        AND created_at < NOW() - INTERVAL '15 minutes'
    `

    const [aiStuck60m] = await sql`
      SELECT COUNT(*)::int AS count
      FROM ai_images
      WHERE prediction_id IS NOT NULL
        AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
        AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
        AND created_at < NOW() - INTERVAL '60 minutes'
    `

    const recentAiStuck = await sql`
      SELECT id, user_id, source, category, generation_status, prediction_id, created_at
      FROM ai_images
      WHERE prediction_id IS NOT NULL
        AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
        AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
      ORDER BY created_at ASC
      LIMIT ${limit}
    `

    const [proGridStuck15m] = await sql`
      SELECT COUNT(*)::int AS count
      FROM pro_photoshoot_grids
      WHERE prediction_id IS NOT NULL
        AND grid_url IS NULL
        AND generation_status = 'generating'
        AND updated_at < NOW() - INTERVAL '15 minutes'
    `

    const [proGridStuck60m] = await sql`
      SELECT COUNT(*)::int AS count
      FROM pro_photoshoot_grids
      WHERE prediction_id IS NOT NULL
        AND grid_url IS NULL
        AND generation_status = 'generating'
        AND updated_at < NOW() - INTERVAL '60 minutes'
    `

    const recentProGrids = await sql`
      SELECT id, session_id, grid_number, generation_status, prediction_id, updated_at
      FROM pro_photoshoot_grids
      WHERE prediction_id IS NOT NULL
        AND grid_url IS NULL
        AND generation_status = 'generating'
      ORDER BY updated_at ASC
      LIMIT ${limit}
    `

    return NextResponse.json({
      now: new Date().toISOString(),
      feedPosts: {
        stuckOver15m: Number((stuck15m as any)?.count || 0),
        stuckOver60m: Number((stuck60m as any)?.count || 0),
        inconsistentCompleted: Number((inconsistentCompleted as any)?.count || 0),
        oldestPending: recentStuck,
      },
      aiImages: {
        stuckOver15m: Number((aiStuck15m as any)?.count || 0),
        stuckOver60m: Number((aiStuck60m as any)?.count || 0),
        oldestPending: recentAiStuck,
      },
      proPhotoshoot: {
        stuckOver15m: Number((proGridStuck15m as any)?.count || 0),
        stuckOver60m: Number((proGridStuck60m as any)?.count || 0),
        oldestPending: recentProGrids,
      },
      recommendations: [
        "If stuck counts grow, verify Replicate availability and check Vercel logs for reconcile-feed-posts.",
        "If Pro Mode images are stuck, run reconcile-ai-images to finalize predictions into Blob URLs.",
        "If Pro Photoshoot grids are stuck, run reconcile-pro-photoshoot-grids to finalize and split frames.",
        "If inconsistentCompleted is non-zero, running reconciliation will normalize statuses.",
      ],
    })
  } catch (error) {
    console.error("[v0] Error generating generation health report:", error)
    return NextResponse.json(
      {
        error: "Failed to generate generation health report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
