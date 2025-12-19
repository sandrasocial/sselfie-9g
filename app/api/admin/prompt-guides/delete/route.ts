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

    return true
  } catch {
    return false
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { guideId } = await request.json()

    if (!guideId) {
      return NextResponse.json(
        { error: "Missing required field: guideId" },
        { status: 400 }
      )
    }

    // Delete guide (cascade will delete related items and pages)
    await sql`
      DELETE FROM prompt_guides
      WHERE id = ${guideId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting prompt guide:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete guide" },
      { status: 500 }
    )
  }
}
