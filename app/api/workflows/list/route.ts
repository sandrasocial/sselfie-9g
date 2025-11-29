import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workflows = await sql`
      SELECT 
        wq.id,
        wq.subscriber_id,
        wq.workflow_type,
        wq.status,
        wq.created_at,
        bs.email as subscriber_email,
        bs.name as subscriber_name
      FROM workflow_queue wq
      LEFT JOIN blueprint_subscribers bs ON wq.subscriber_id = bs.id::text
      WHERE wq.status = 'pending'
      ORDER BY wq.created_at DESC
    `

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error("Error fetching workflows:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
