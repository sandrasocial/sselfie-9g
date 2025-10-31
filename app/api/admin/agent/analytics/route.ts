import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

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

    // Get comprehensive user analytics
    const [userStats] = await sql`
      SELECT 
        u.email,
        u.display_name,
        u.created_at as user_since,
        u.last_login_at,
        u.plan,
        COUNT(DISTINCT gi.id) as total_generations,
        COUNT(DISTINCT gi.id) FILTER (WHERE gi.saved = true) as total_favorites,
        COUNT(DISTINCT gi.id) FILTER (WHERE gi.created_at >= date_trunc('month', CURRENT_DATE)) as generations_this_month,
        COUNT(DISTINCT gi.id) FILTER (WHERE gi.created_at >= NOW() - INTERVAL '7 days') as generations_this_week,
        COUNT(DISTINCT mc.id) as total_chats,
        COUNT(DISTINCT mc.id) FILTER (WHERE mc.chat_type = 'maya') as maya_chats,
        COUNT(DISTINCT mc.id) FILTER (WHERE mc.chat_type = 'feed_designer') as feed_designer_chats,
        COUNT(DISTINCT mcm.id) as total_messages,
        COUNT(DISTINCT fl.id) as total_feed_layouts,
        COUNT(DISTINCT fl.id) FILTER (WHERE fl.status = 'completed') as completed_feeds,
        COUNT(DISTINCT um.id) as trained_models,
        COUNT(DISTINCT um.id) FILTER (WHERE um.training_status = 'completed') as completed_models
      FROM users u
      LEFT JOIN generated_images gi ON gi.user_id = u.id
      LEFT JOIN maya_chats mc ON mc.user_id = u.id
      LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
      LEFT JOIN feed_layouts fl ON fl.user_id = u.id
      LEFT JOIN user_models um ON um.user_id = u.id
      WHERE u.id = ${targetUserId}
      GROUP BY u.id, u.email, u.display_name, u.created_at, u.last_login_at, u.plan
    `

    // Get recent activity (last 30 days)
    const recentActivity = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        'generation' as type
      FROM generated_images
      WHERE user_id = ${targetUserId} AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      
      UNION ALL
      
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        'chat_message' as type
      FROM maya_chat_messages mcm
      JOIN maya_chats mc ON mc.id = mcm.chat_id
      WHERE mc.user_id = ${targetUserId} AND mcm.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      
      ORDER BY date DESC
    `

    // Get top categories
    const topCategories = await sql`
      SELECT 
        category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE saved = true) as favorites
      FROM generated_images
      WHERE user_id = ${targetUserId}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `

    // Get chat engagement by type
    const chatEngagement = await sql`
      SELECT 
        mc.chat_type,
        mc.chat_category,
        COUNT(DISTINCT mc.id) as chat_count,
        COUNT(mcm.id) as message_count,
        MAX(mc.last_activity) as last_activity
      FROM maya_chats mc
      LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
      WHERE mc.user_id = ${targetUserId}
      GROUP BY mc.chat_type, mc.chat_category
      ORDER BY message_count DESC
    `

    // Get personal brand info
    const [personalBrand] = await sql`
      SELECT 
        business_type,
        brand_voice,
        target_audience,
        content_pillars,
        is_completed,
        onboarding_step
      FROM user_personal_brand
      WHERE user_id = ${targetUserId}
    `

    return NextResponse.json({
      userStats: userStats || {},
      recentActivity: recentActivity || [],
      topCategories: topCategories || [],
      chatEngagement: chatEngagement || [],
      personalBrand: personalBrand || null,
    })
  } catch (error) {
    console.error("[v0] Error fetching admin analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
