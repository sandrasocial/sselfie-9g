import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { ensureTwinQueueSchema } from "@/lib/twin-control-plane"
import { requireTwinBearer } from "@/lib/twin-auth"

export async function POST(req: NextRequest) {
  const auth = requireTwinBearer(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const payload = await req.json()
    const itemId = Number.parseInt(String(payload?.id || ""), 10)
    const status = String(payload?.status || "").toLowerCase()

    if (!Number.isFinite(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "id is required." }, { status: 400 })
    }
    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 })
    }

    const sql = getDb()
    await ensureTwinQueueSchema(sql)

    const rows = await sql`
      UPDATE twin_approval_queue
      SET
        status = ${status},
        updated_at = NOW(),
        approved_at = CASE WHEN ${status} = 'approved' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
        rejected_at = CASE WHEN ${status} = 'rejected' THEN COALESCE(rejected_at, NOW()) ELSE rejected_at END
      WHERE id = ${itemId}
      RETURNING id, status, updated_at
    `

    const row = (rows as any[])[0]
    if (!row) {
      return NextResponse.json({ error: "Queue item not found." }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: String(row.id),
        status: String(row.status),
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      },
    })
  } catch (error) {
    console.error("[Twin Queue Update] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update queue item." },
      { status: 500 },
    )
  }
}

