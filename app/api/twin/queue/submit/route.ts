import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { ensureTwinQueueSchema, type TwinQueueType } from "@/lib/twin-control-plane"
import { requireTwinBearer } from "@/lib/twin-auth"

export async function POST(req: NextRequest) {
  const auth = requireTwinBearer(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const payload = await req.json()
    const type = String(payload?.type || "") as TwinQueueType
    const leadId = payload?.lead_id ? Number.parseInt(String(payload.lead_id), 10) : null
    const subject = String(payload?.subject || "").trim()
    const body = String(payload?.body || "").trim()

    if (!["content_draft", "offer_email", "dm_response"].includes(type)) {
      return NextResponse.json({ error: "Invalid queue item type." }, { status: 400 })
    }
    if (!subject || !body) {
      return NextResponse.json({ error: "subject and body are required." }, { status: 400 })
    }
    if (leadId !== null && (!Number.isFinite(leadId) || leadId <= 0)) {
      return NextResponse.json({ error: "lead_id must be a positive integer when provided." }, { status: 400 })
    }

    const sql = getDb()
    await ensureTwinQueueSchema(sql)

    const inserted = await sql`
      INSERT INTO twin_approval_queue (
        item_type,
        lead_id,
        subject,
        body,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${type},
        ${leadId},
        ${subject},
        ${body},
        'pending',
        NOW(),
        NOW()
      )
      RETURNING id, item_type, lead_id, status, created_at
    `

    const row = (inserted as any[])[0]
    return NextResponse.json({
      ok: true,
      item: {
        id: String(row.id),
        type: String(row.item_type),
        lead_id: row.lead_id ? String(row.lead_id) : null,
        status: String(row.status),
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      },
    })
  } catch (error) {
    console.error("[Twin Queue Submit] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit queue item." },
      { status: 500 },
    )
  }
}

