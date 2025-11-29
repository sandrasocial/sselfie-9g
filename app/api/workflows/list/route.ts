import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAdmin } from "@/lib/security/require-admin"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const guard = await requireAdmin()
    if (guard instanceof NextResponse) return guard

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
