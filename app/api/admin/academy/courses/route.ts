import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { ACADEMY_PRODUCTS } from "@/lib/products"

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

    const { title, description, thumbnail_url, product_id, order_index, status } =
      await request.json()

    if (!title || !product_id || !(product_id in ACADEMY_PRODUCTS)) {
      return NextResponse.json(
        { error: "Title and valid product_id are required" },
        { status: 400 }
      )
    }

    const newCourse = await sql`
      INSERT INTO academy_courses (
        product_id, title, description, thumbnail_url, order_index, status, created_at, updated_at
      )
      VALUES (
        ${product_id}, ${title}, ${description || null}, ${thumbnail_url || null},
        ${order_index || 0}, ${status || "draft"}, NOW(), NOW()
      )
      RETURNING *
    `

    console.log("[v0] Created course:", newCourse[0].id)

    return NextResponse.json({ course: newCourse[0] })
  } catch (error) {
    console.error("[v0] Error creating course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
