import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"

/**
 * GET /api/admin/tasks
 * List tasks with filters
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
    const today = searchParams.get('today') === 'true'

    const sql = getDb()

    let tasks

    if (today) {
      // Get today's tasks (from daily_focus or scheduled_for today)
      tasks = await sql`
        SELECT
          t.*,
          p.title as project_title,
          p.emoji as project_emoji,
          p.color as project_color,
          (SELECT COUNT(*) FROM tracker_subtasks WHERE task_id = t.id) as subtask_count,
          (SELECT COUNT(*) FROM tracker_subtasks WHERE task_id = t.id AND completed = true) as subtasks_completed
        FROM tracker_tasks t
        LEFT JOIN tracker_projects p ON p.id = t.project_id
        WHERE (
          t.scheduled_for = CURRENT_DATE
          OR t.id IN (SELECT task_id FROM tracker_daily_focus WHERE date = CURRENT_DATE)
        )
        AND t.status != 'done'
        ORDER BY
          CASE t.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            WHEN 'someday' THEN 5
          END,
          t.created_at DESC
      `
    } else {
      // Regular task list with optional filters
      const conditions = []
      const params: any = {}

      if (projectId) {
        conditions.push(`t.project_id = ${projectId}`)
      }

      if (status) {
        conditions.push(`t.status = '${status}'`)
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      tasks = await sql`
        SELECT
          t.*,
          p.title as project_title,
          p.emoji as project_emoji,
          p.color as project_color,
          (SELECT COUNT(*) FROM tracker_subtasks WHERE task_id = t.id) as subtask_count,
          (SELECT COUNT(*) FROM tracker_subtasks WHERE task_id = t.id AND completed = true) as subtasks_completed
        FROM tracker_tasks t
        LEFT JOIN tracker_projects p ON p.id = t.project_id
        ${whereClause ? sql.unsafe(whereClause) : sql``}
        ORDER BY
          t.order_index ASC,
          CASE t.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            WHEN 'someday' THEN 5
          END,
          t.created_at DESC
      `
    }

    return NextResponse.json({ success: true, tasks })
  } catch (error) {
    console.error("[Tasks API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * POST /api/admin/tasks
 * Create a new task
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      project_id,
      title,
      description,
      priority = 'medium',
      is_quick_win = false,
      is_deep_work = false,
      energy_level = 'medium',
      estimated_minutes,
      due_date,
      scheduled_for
    } = body

    if (!title) {
      return NextResponse.json({
        success: false,
        error: "Title is required"
      }, { status: 400 })
    }

    const sql = getDb()

    const result = await sql`
      INSERT INTO tracker_tasks (
        project_id,
        title,
        description,
        priority,
        is_quick_win,
        is_deep_work,
        energy_level,
        estimated_minutes,
        due_date,
        scheduled_for
      )
      VALUES (
        ${project_id},
        ${title},
        ${description},
        ${priority},
        ${is_quick_win},
        ${is_deep_work},
        ${energy_level},
        ${estimated_minutes},
        ${due_date},
        ${scheduled_for}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      task: (result as any)[0]
    })
  } catch (error) {
    console.error("[Tasks API] Create error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
