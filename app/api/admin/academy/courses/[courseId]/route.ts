import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { ACADEMY_PRODUCTS } from "@/lib/products"

const ADMIN_EMAIL = "ssa@ssasocial.com"

// PATCH update course
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
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

    const { courseId } = await params
    const { title, description, thumbnail_url, product_id, order_index, status } =
      await request.json()

    if (product_id !== undefined && !(product_id in ACADEMY_PRODUCTS)) {
      return NextResponse.json({ error: "Valid product_id is required" }, { status: 400 })
    }

    const updatedCourse = await sql`
      UPDATE academy_courses
      SET 
        product_id = COALESCE(${product_id}, product_id),
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        thumbnail_url = COALESCE(${thumbnail_url}, thumbnail_url),
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
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
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

    const { courseId } = await params

    await sql`DELETE FROM academy_courses WHERE id = ${courseId}`

    console.log("[v0] Deleted course:", courseId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
