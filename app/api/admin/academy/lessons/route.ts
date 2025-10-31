import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// GET all lessons for a course
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 })
    }

    const lessons = await sql`
      SELECT * FROM academy_lessons
      WHERE course_id = ${courseId}
      ORDER BY lesson_number ASC, created_at ASC
    `

    return NextResponse.json({ lessons })
  } catch (error) {
    console.error("[v0] Error fetching lessons:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST create new lesson
export async function POST(request: Request) {
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

    const { course_id, title, description, lesson_type, video_url, duration_minutes, lesson_number, content } =
      await request.json()

    if (!course_id || !title || !lesson_type) {
      return NextResponse.json({ error: "course_id, title, and lesson_type are required" }, { status: 400 })
    }

    const newLesson = await sql`
      INSERT INTO academy_lessons (
        course_id, title, description, lesson_type, video_url, 
        duration_minutes, lesson_number, content, created_at, updated_at
      )
      VALUES (
        ${course_id}, ${title}, ${description || null}, ${lesson_type},
        ${video_url || null}, ${duration_minutes || 0}, ${lesson_number || 1}, 
        ${content ? JSON.stringify(content) : null}, NOW(), NOW()
      )
      RETURNING *
    `

    console.log("[v0] Created lesson:", newLesson[0].id)

    return NextResponse.json({ lesson: newLesson[0] })
  } catch (error) {
    console.error("[v0] Error creating lesson:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
