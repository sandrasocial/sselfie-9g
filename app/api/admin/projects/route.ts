import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"

/**
 * GET /api/admin/projects
 * List all projects with task counts and progress
 */
export async function GET() {
  try {
    const sql = getDb()

    const projects = await sql`
      SELECT
        p.*,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done') as tasks_remaining,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') as tasks_completed,
        COUNT(DISTINCT t.id) as total_tasks
      FROM tracker_projects p
      LEFT JOIN tracker_tasks t ON t.project_id = p.id
      WHERE p.status != 'archived'
      GROUP BY p.id
      ORDER BY
        CASE p.status
          WHEN 'active' THEN 1
          WHEN 'paused' THEN 2
          WHEN 'completed' THEN 3
          ELSE 4
        END,
        p.created_at DESC
    `

    return NextResponse.json({ success: true, projects })
  } catch (error) {
    console.error("[Projects API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * POST /api/admin/projects
 * Create a new project
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      title,
      description,
      emoji = '🎯',
      color = '#8B5CF6',
      vision_image_url,
      goal_date
    } = body

    if (!title) {
      return NextResponse.json({
        success: false,
        error: "Title is required"
      }, { status: 400 })
    }

    const sql = getDb()

    const result = await sql`
      INSERT INTO tracker_projects (title, description, emoji, color, vision_image_url, goal_date, user_id)
      VALUES (${title}, ${description}, ${emoji}, ${color}, ${vision_image_url}, ${goal_date}, 'ssa@ssasocial.com')
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      project: (result as any)[0]
    })
  } catch (error) {
    console.error("[Projects API] Create error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
