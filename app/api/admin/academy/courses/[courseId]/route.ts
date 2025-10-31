import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// PATCH update course
export async function PATCH(request: Request, { params }: { params: { courseId: string } }) {
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

    const { courseId } = params
    const { title, description, thumbnail_url, tier, order_index, status } = await request.json()

    const updatedCourse = await sql`
      UPDATE academy_courses
      SET 
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        thumbnail_url = COALESCE(${thumbnail_url}, thumbnail_url),
        tier = COALESCE(${tier}, tier),
        order_index = COALESCE(${order_index}, order_index),
        status = COALESCE(${status}, status),
        updated_at = NOW()
      WHERE id = ${courseId}
      RETURNING *
    `

    if (updatedCourse.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    console.log("[v0] Updated course:", courseId)

    return NextResponse.json({ course: updatedCourse[0] })
  } catch (error) {
    console.error("[v0] Error updating course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE course
export async function DELETE(request: Request, { params }: { params: { courseId: string } }) {
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

    const { courseId } = params

    await sql`DELETE FROM academy_courses WHERE id = ${courseId}`

    console.log("[v0] Deleted course:", courseId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
