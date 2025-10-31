import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// GET all courses (admin view)
export async function GET() {
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

    const courses = await sql`
      SELECT 
        c.*,
        COUNT(DISTINCT l.id) as lesson_count,
        COUNT(DISTINCT e.user_id) as enrollment_count
      FROM academy_courses c
      LEFT JOIN academy_lessons l ON c.id = l.course_id
      LEFT JOIN user_academy_enrollments e ON c.id = e.course_id
      GROUP BY c.id
      ORDER BY c.order_index ASC, c.created_at DESC
    `

    return NextResponse.json({ courses })
  } catch (error) {
    console.error("[v0] Error fetching courses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST create new course
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

    const { title, description, thumbnail_url, tier, order_index, is_published } = await request.json()

    if (!title || !tier) {
      return NextResponse.json({ error: "Title and tier are required" }, { status: 400 })
    }

    const courseId = crypto.randomUUID()

    const newCourse = await sql`
      INSERT INTO academy_courses (
        id, title, description, thumbnail_url, tier, order_index, is_published, created_at, updated_at
      )
      VALUES (
        ${courseId}, ${title}, ${description || null}, ${thumbnail_url || null}, 
        ${tier}, ${order_index || 0}, ${is_published || false}, NOW(), NOW()
      )
      RETURNING *
    `

    console.log("[v0] Created course:", courseId)

    return NextResponse.json({ course: newCourse[0] })
  } catch (error) {
    console.error("[v0] Error creating course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
