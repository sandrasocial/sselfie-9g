import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Check if admin
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")

    let query = `
      SELECT id, user_id, user_email, user_name, type, subject, message, 
             images, status, admin_notes, admin_reply, replied_at, created_at, updated_at
      FROM feedback
      WHERE 1=1
    `

    const params: any[] = []

    if (type) {
      params.push(type)
      query += ` AND type = $${params.length}`
    }

    if (status) {
      params.push(status)
      query += ` AND status = $${params.length}`
    }

    query += ` ORDER BY created_at DESC LIMIT 100`

    const feedback = await sql(query, params)

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("[v0] Error fetching admin feedback:", error)
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Check if admin
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { feedbackId, status, adminNotes, adminReply } = body

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 })
    }

    if (adminReply) {
      // If sending a reply, also mark as resolved
      const result = await sql`
        UPDATE feedback
        SET 
          admin_reply = ${adminReply},
          replied_at = NOW(),
          status = 'resolved',
          updated_at = NOW()
        WHERE id = ${feedbackId}
        RETURNING id
      `

      if (result.length === 0) {
        return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    }

    // Otherwise just update status/notes
    const result = await sql`
      UPDATE feedback
      SET 
        status = COALESCE(${status}, status),
        admin_notes = COALESCE(${adminNotes}, admin_notes),
        updated_at = NOW()
      WHERE id = ${feedbackId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating feedback:", error)
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
  }
}
