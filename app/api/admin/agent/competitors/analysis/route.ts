import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// POST - Add competitor analysis
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const {
      competitorId,
      analysisDate,
      contentThemes,
      topPerformingPosts,
      hashtagStrategy,
      visualStyle,
      captionStyle,
      engagementMetrics,
      insights,
    } = await request.json()

    if (!competitorId) {
      return NextResponse.json({ error: "competitorId required" }, { status: 400 })
    }

    const [analysis] = await sql`
      INSERT INTO competitor_content_analysis (
        competitor_id, analysis_date, content_themes, top_performing_posts,
        hashtag_strategy, visual_style, caption_style, engagement_metrics, insights
      )
      VALUES (
        ${competitorId}, ${analysisDate || new Date().toISOString().split("T")[0]},
        ${contentThemes ? JSON.stringify(contentThemes) : null},
        ${topPerformingPosts ? JSON.stringify(topPerformingPosts) : null},
        ${hashtagStrategy ? JSON.stringify(hashtagStrategy) : null},
        ${visualStyle}, ${captionStyle},
        ${engagementMetrics ? JSON.stringify(engagementMetrics) : null},
        ${insights}
      )
      RETURNING *
    `

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("[v0] Error creating competitor analysis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET - Get competitor analyses
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const competitorId = searchParams.get("competitorId")

    if (!competitorId) {
      return NextResponse.json({ error: "competitorId required" }, { status: 400 })
    }

    const analyses = await sql`
      SELECT * FROM competitor_content_analysis
      WHERE competitor_id = ${competitorId}
      ORDER BY analysis_date DESC
      LIMIT 10
    `

    return NextResponse.json({ analyses })
  } catch (error) {
    console.error("[v0] Error fetching competitor analyses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
