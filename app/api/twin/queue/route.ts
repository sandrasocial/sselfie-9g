import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { ensureTwinQueueSchema } from "@/lib/twin-control-plane"
import { requireTwinBearer } from "@/lib/twin-auth"

export async function GET(req: NextRequest) {
  const auth = requireTwinBearer(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const statusFilter = String(req.nextUrl.searchParams.get("status") || "pending").toLowerCase()
    if (!["pending", "approved", "rejected", "all"].includes(statusFilter)) {
      return NextResponse.json({ error: "Invalid status filter." }, { status: 400 })
    }

    const sql = getDb()
    await ensureTwinQueueSchema(sql)

    const rows =
      statusFilter === "all"
        ? await sql`
            SELECT id, item_type, lead_id, subject, body, status, created_at
            FROM twin_approval_queue
            ORDER BY created_at DESC
            LIMIT 500
          `
        : await sql`
            SELECT id, item_type, lead_id, subject, body, status, created_at
            FROM twin_approval_queue
            WHERE status = ${statusFilter}
            ORDER BY created_at DESC
            LIMIT 500
          `

    return NextResponse.json({
      items: (rows as any[]).map((row) => ({
        id: String(row.id),
        type: String(row.item_type),
        lead_id: row.lead_id ? String(row.lead_id) : null,
        subject: String(row.subject || ""),
        body: String(row.body || ""),
        status: String(row.status || "pending"),
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      })),
    })
  } catch (error) {
    console.error("[Twin Queue] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load queue." },
      { status: 500 },
    )
  }
}

