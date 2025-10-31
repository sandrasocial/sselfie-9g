import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// PATCH update lesson
export async function PATCH(request: Request, { params }: { params: { lessonId: string } }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { lessonId } = params
    const { title, description, video_url, duration_seconds, order_index, content } = await request.json()

    const updatedLesson = await sql`
      UPDATE academy_lessons
      SET 
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        video_url = COALESCE(${video_url}, video_url),
        duration_seconds = COALESCE(${duration_seconds}, duration_seconds),
        order_index = COALESCE(${order_index}, order_index),
        content = COALESCE(${content ? JSON.stringify(content) : null}, content),
        updated_at = NOW()
      WHERE id = ${lessonId}
      RETURNING *
    `

    if (updatedLesson.length === 0) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    console.log("[v0] Updated lesson:", lessonId)

    return NextResponse.json({ lesson: updatedLesson[0] })
  } catch (error) {
    console.error("[v0] Error updating lesson:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE lesson
export async function DELETE(request: Request, { params }: { params: { lessonId: string } }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { lessonId } = params

    await sql`DELETE FROM academy_lessons WHERE id = ${lessonId}`

    console.log("[v0] Deleted lesson:", lessonId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting lesson:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
