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

    const { id, ids } = await request.json()

    if (!id && !ids) {
      return NextResponse.json(
        { error: "Missing required field: id or ids" },
        { status: 400 }
      )
    }

    // Get admin user ID
    const adminUser = await sql`
      SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1
    `
    const adminUserId = adminUser && adminUser.length > 0 ? adminUser[0].id : null

    if (!adminUserId) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    // Delete single or multiple
    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Bulk delete
      // NOTE: writing_assistant_outputs.id is SERIAL (INTEGER), not UUID
      await sql`
        DELETE FROM writing_assistant_outputs
        WHERE id = ANY(${ids}::integer[])
        AND user_id = ${adminUserId}
      `
      return NextResponse.json({ 
        success: true, 
        deleted: ids.length 
      })
    } else if (id) {
      // Single delete
      const result = await sql`
        DELETE FROM writing_assistant_outputs
        WHERE id = ${id}
        AND user_id = ${adminUserId}
        RETURNING id
      `
      
      if (result.length === 0) {
        return NextResponse.json(
          { error: "Output not found or access denied" },
          { status: 404 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        deleted: 1 
      })
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("[v0] Error deleting writing assistant output:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete output" },
      { status: 500 }
    )
  }
}
