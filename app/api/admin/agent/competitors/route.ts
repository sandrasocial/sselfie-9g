import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// GET - List all competitors for a user
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
    const targetUserId = searchParams.get("userId")

    if (!targetUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    const competitors = await sql`
      SELECT 
        c.*,
        COUNT(DISTINCT cca.id) as analysis_count,
        MAX(cca.analysis_date) as last_analysis_date
      FROM competitors c
      LEFT JOIN competitor_content_analysis cca ON cca.competitor_id = c.id
      WHERE c.user_id = ${targetUserId}
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `

    return NextResponse.json({ competitors })
  } catch (error) {
    console.error("[v0] Error fetching competitors:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Add new competitor
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
      userId,
      name,
      businessType,
      instagramHandle,
      websiteUrl,
      targetAudience,
      uniqueSellingPoints,
      contentStrategy,
      postingFrequency,
      engagementRate,
      followerCount,
      notes,
    } = await request.json()

    if (!userId || !name) {
      return NextResponse.json({ error: "userId and name required" }, { status: 400 })
    }

    const [competitor] = await sql`
      INSERT INTO competitors (
        user_id, name, business_type, instagram_handle, website_url,
        target_audience, unique_selling_points, content_strategy,
        posting_frequency, engagement_rate, follower_count, notes
      )
      VALUES (
        ${userId}, ${name}, ${businessType}, ${instagramHandle}, ${websiteUrl},
        ${targetAudience}, ${uniqueSellingPoints}, ${contentStrategy},
        ${postingFrequency}, ${engagementRate}, ${followerCount}, ${notes}
      )
      RETURNING *
    `

    return NextResponse.json({ competitor })
  } catch (error) {
    console.error("[v0] Error creating competitor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update competitor
export async function PUT(request: Request) {
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

    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Competitor id required" }, { status: 400 })
    }

    const [competitor] = await sql`
      UPDATE competitors
      SET
        name = COALESCE(${updates.name}, name),
        business_type = COALESCE(${updates.businessType}, business_type),
        instagram_handle = COALESCE(${updates.instagramHandle}, instagram_handle),
        website_url = COALESCE(${updates.websiteUrl}, website_url),
        target_audience = COALESCE(${updates.targetAudience}, target_audience),
        unique_selling_points = COALESCE(${updates.uniqueSellingPoints}, unique_selling_points),
        content_strategy = COALESCE(${updates.contentStrategy}, content_strategy),
        posting_frequency = COALESCE(${updates.postingFrequency}, posting_frequency),
        engagement_rate = COALESCE(${updates.engagementRate}, engagement_rate),
        follower_count = COALESCE(${updates.followerCount}, follower_count),
        notes = COALESCE(${updates.notes}, notes),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ competitor })
  } catch (error) {
    console.error("[v0] Error updating competitor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Remove competitor
export async function DELETE(request: Request) {
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
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Competitor id required" }, { status: 400 })
    }

    await sql`DELETE FROM competitors WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting competitor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
