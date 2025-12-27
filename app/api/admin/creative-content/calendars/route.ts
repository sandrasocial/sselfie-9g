import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const calendars = await sql`
      SELECT 
        id,
        title,
        duration,
        start_date,
        end_date,
        platform,
        content_pillars,
        posts,
        total_posts,
        special_focus,
        created_at,
        created_by
      FROM content_calendars
      ORDER BY created_at DESC
    `
    
    // Format the calendars to match the CalendarCard interface
    const formattedCalendars = calendars.rows.map((cal: any) => ({
      id: cal.id,
      title: cal.title,
      duration: cal.duration,
      startDate: cal.start_date,
      endDate: cal.end_date,
      platform: cal.platform,
      contentPillars: cal.content_pillars || [],
      posts: cal.posts || [],
      totalPosts: cal.total_posts || 0,
      specialFocus: cal.special_focus,
      createdAt: cal.created_at
    }))
    
    return NextResponse.json({ calendars: formattedCalendars })
  } catch (error: any) {
    console.error('Error fetching calendars:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendars' },
      { status: 500 }
    )
  }
}

