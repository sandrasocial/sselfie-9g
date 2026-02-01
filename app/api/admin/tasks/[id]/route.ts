import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * PATCH /api/admin/tasks/[id]
 * Update a task (status, priority, completion, etc.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id)

    if (isNaN(taskId)) {
      return NextResponse.json({
        success: false,
        error: "Invalid task ID"
      }, { status: 400 })
    }

    const body = await req.json()
    const sql = getDb()

    // Build dynamic update based on provided fields
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    const allowedFields = [
      'title', 'description', 'priority', 'status',
      'is_quick_win', 'is_deep_work', 'energy_level',
      'estimated_minutes', 'actual_minutes',
      'due_date', 'scheduled_for', 'order_index'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`)
        values.push(body[field])
        paramCount++
      }
    }

    // Handle task completion
    if (body.status === 'done' && body.completed_at === undefined) {
      updates.push(`completed_at = NOW()`)
      updates.push(`celebration_seen = false`) // Show celebration animation
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No fields to update"
      }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)
    values.push(taskId)

    const query = `
      UPDATE project_tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await sql.unsafe(query, values)

    if (result.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Task not found"
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      task: result[0]
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
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id)

    if (isNaN(taskId)) {
      return NextResponse.json({
        success: false,
        error: "Invalid task ID"
      }, { status: 400 })
    }

    const sql = getDb()

    const result = await sql`
      DELETE FROM project_tasks
      WHERE id = ${taskId}
      RETURNING id
    `

    if (result.length === 0) {
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
