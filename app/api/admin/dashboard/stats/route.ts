import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const usersResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE 
          WHEN last_login_at > NOW() - INTERVAL '30 days' 
          OR created_at > NOW() - INTERVAL '60 days' 
          THEN 1 
        END) as active_users
      FROM users
      WHERE email IS NOT NULL
    `

    // Get courses stats
    const coursesResult = await sql`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN status = 'published' THEN 1 END) as published
      FROM academy_courses
    `

    // Get lessons count
    const lessonsResult = await sql`
      SELECT COUNT(*) as total
      FROM academy_lessons
    `

    const chatsResult = await sql`
      SELECT COUNT(*) as total
      FROM maya_chats
      WHERE user_id IS NOT NULL
    `

    // Get knowledge count
    const knowledgeResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_knowledge_base
      WHERE is_active = true
    `

    // Get recent activity (last 10 items)
    const recentActivity = await sql`
      SELECT 
        'user_signup' as type,
        'New user: ' || email as description,
        created_at as timestamp
      FROM users
      WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 10
    `

    const stats = {
      totalUsers: Number(usersResult[0]?.total || 0),
      activeUsers: Number(usersResult[0]?.active_users || 0),
      totalCourses: Number(coursesResult[0]?.total || 0),
      publishedCourses: Number(coursesResult[0]?.published || 0),
      totalLessons: Number(lessonsResult[0]?.total || 0),
      totalChats: Number(chatsResult[0]?.total || 0),
      totalKnowledge: Number(knowledgeResult[0]?.total || 0),
      recentActivity: recentActivity.map((activity) => ({
        type: activity.type,
        description: activity.description,
        timestamp: activity.timestamp,
      })),
    }

    console.log("[v0] Dashboard stats API: Data fetched", stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
