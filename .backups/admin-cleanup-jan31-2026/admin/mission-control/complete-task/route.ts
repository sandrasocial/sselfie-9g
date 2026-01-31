import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(req: Request) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { taskId } = await req.json()
    
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 })
    }
    
    await sql`
      UPDATE mission_control_tasks
      SET completed = TRUE,
          completed_at = NOW()
      WHERE id = ${taskId}
    `
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('[Mission Control] Error completing task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

