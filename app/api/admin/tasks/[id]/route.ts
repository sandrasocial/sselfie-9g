import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin(): Promise<NextResponse | null> {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser || neonUser.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  return null
}

/**
 * PATCH /api/admin/tasks/[id]
 * Update a task (status, priority, completion, etc.)
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const authError = await requireAdmin()
  if (authError) return authError
  try {
    // Handle both Next.js 14 and 15 params format
    const params = await Promise.resolve(context.params)
    const taskId = parseInt(params.id)

    if (isNaN(taskId)) {
      return NextResponse.json({
        success: false,
        error: "Invalid task ID"
      }, { status: 400 })
    }

    const body = await req.json()
    const sql = getDb()

    // For simple status updates, use a direct approach
    let result
    
    if (body.status && Object.keys(body).length === 1) {
      // Simple status change only
      if (body.status === 'done') {
        result = await sql`
          UPDATE tracker_tasks
          SET status = ${body.status}, completed_at = NOW(), updated_at = NOW()
          WHERE id = ${taskId}
          RETURNING *
        `
      } else {
        result = await sql`
          UPDATE tracker_tasks
          SET status = ${body.status}, updated_at = NOW()
          WHERE id = ${taskId}
          RETURNING *
        `
      }
    } else {
      // Get current task for complex updates
      const currentTask = await sql`
        SELECT * FROM tracker_tasks WHERE id = ${taskId}
      `

      if (currentTask.length === 0) {
        return NextResponse.json({
          success: false,
          error: "Task not found"
        }, { status: 404 })
      }

      const task = currentTask[0] as any

      // Update all fields
      result = await sql`
        UPDATE tracker_tasks
        SET
          title = ${body.title !== undefined ? body.title : task.title},
          description = ${body.description !== undefined ? body.description : task.description},
          priority = ${body.priority !== undefined ? body.priority : task.priority},
          status = ${body.status !== undefined ? body.status : task.status},
          is_quick_win = ${body.is_quick_win !== undefined ? body.is_quick_win : task.is_quick_win},
          is_deep_work = ${body.is_deep_work !== undefined ? body.is_deep_work : task.is_deep_work},
          energy_level = ${body.energy_level !== undefined ? body.energy_level : task.energy_level},
          estimated_minutes = ${body.estimated_minutes !== undefined ? body.estimated_minutes : task.estimated_minutes},
          actual_minutes = ${body.actual_minutes !== undefined ? body.actual_minutes : task.actual_minutes},
          due_date = ${body.due_date !== undefined ? body.due_date : task.due_date},
          scheduled_for = ${body.scheduled_for !== undefined ? body.scheduled_for : task.scheduled_for},
          order_index = ${body.order_index !== undefined ? body.order_index : task.order_index},
          completed_at = ${body.status === 'done' && !task.completed_at ? new Date() : task.completed_at},
          updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING *
      `
    }

    if ((result as any[]).length === 0) {
      return NextResponse.json({
        success: false,
        error: "Task not found"
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      task: (result as any)[0]
    })
  } catch (error) {
    console.error("[Tasks API] Update error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/tasks/[id]
 * Delete a task
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const authError = await requireAdmin()
  if (authError) return authError
  try {
    // Handle both Next.js 14 and 15 params format
    const params = await Promise.resolve(context.params)
    const taskId = parseInt(params.id)

    if (isNaN(taskId)) {
      return NextResponse.json({
        success: false,
        error: "Invalid task ID"
      }, { status: 400 })
    }

    const sql = getDb()

    const result = await sql`
      DELETE FROM tracker_tasks
      WHERE id = ${taskId}
      RETURNING id
    `

    if ((result as any[]).length === 0) {
      return NextResponse.json({
        success: false,
        error: "Task not found"
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Task deleted"
    })
  } catch (error) {
    console.error("[Tasks API] Delete error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
