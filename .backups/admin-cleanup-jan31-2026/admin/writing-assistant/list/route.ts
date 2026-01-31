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

    const { searchParams } = new URL(request.url)
    const pillar = searchParams.get("pillar")
    const outputType = searchParams.get("outputType")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Get admin user ID
    const adminUser = await sql`
      SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1
    `
    const adminUserId = adminUser && adminUser.length > 0 ? adminUser[0].id : null

    if (!adminUserId) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    // Build query with filters
    const conditions: any[] = [sql`user_id = ${adminUserId}`]
    
    if (pillar && pillar !== "all") {
      conditions.push(sql`content_pillar = ${pillar}`)
    }
    
    if (outputType && outputType !== "all") {
      conditions.push(sql`output_type = ${outputType}`)
    }
    
    if (startDate) {
      conditions.push(sql`created_at >= ${startDate}::timestamp`)
    }
    
    if (endDate) {
      conditions.push(sql`created_at <= ${endDate}::timestamp + interval '1 day'`)
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``

    const outputs = await sql`
      SELECT 
        id,
        content_pillar,
        output_type,
        content,
        context,
        created_at
      FROM writing_assistant_outputs
      ${whereClause}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ outputs })
  } catch (error: any) {
    console.error("[v0] Error listing writing assistant outputs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list outputs" },
      { status: 500 }
    )
  }
}
