import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function checkAdminAccess() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return false
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return false
    }

    if (user.email !== ADMIN_EMAIL) {
      return false
    }

    return { user }
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { title, description, category } = await request.json()

    if (!title || !category) {
      return NextResponse.json(
        { error: "Missing required fields: title, category" },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO prompt_guides (
        title,
        description,
        category,
        status,
        created_by
      ) VALUES (
        ${title},
        ${description || null},
        ${category},
        'draft',
        ${adminCheck.user.id}
      )
      RETURNING *
    `

    if (result.length === 0) {
      throw new Error("Failed to create guide")
    }

    return NextResponse.json({ guide: result[0] })
  } catch (error: any) {
    console.error("[v0] Error creating prompt guide:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create guide" },
      { status: 500 }
    )
  }
}
