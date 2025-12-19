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

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const guides = await sql`
      SELECT 
        id, 
        title, 
        category, 
        status, 
        total_prompts, 
        total_approved,
        created_at, 
        published_at,
        description
      FROM prompt_guides
      ORDER BY created_at DESC
    `

    return NextResponse.json({ guides })
  } catch (error: any) {
    console.error("[v0] Error listing prompt guides:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list guides" },
      { status: 500 }
    )
  }
}
