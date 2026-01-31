import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const calendars = await sql`
      SELECT 
        id, title, description, duration, start_date, end_date,
        platform, calendar_data, content_pillars, total_posts, created_at
      FROM content_calendars
      WHERE created_by = ${ADMIN_EMAIL}
      ORDER BY created_at DESC
      LIMIT 50
    `
    
    const formattedCalendars = calendars.map((c: any) => {
      // Parse calendar_data if it's a string
      let calendarData = c.calendar_data
      if (typeof calendarData === 'string') {
        try {
          calendarData = JSON.parse(calendarData)
        } catch (e) {
          calendarData = { days: [] }
        }
      }
      
      return {
        id: c.id,
        title: c.title,
        duration: c.duration,
        startDate: c.start_date,
        endDate: c.end_date,
        platform: c.platform,
        contentPillars: c.content_pillars || [],
        posts: calendarData?.days || [],
        totalPosts: c.total_posts,
        specialFocus: c.description,
        createdAt: c.created_at
      }
    })
    
    return NextResponse.json({ calendars: formattedCalendars })
  } catch (error: any) {
    console.error('[API] Error fetching calendars:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
