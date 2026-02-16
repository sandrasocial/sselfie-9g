import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { ensureBrandEngineApplicationsSchema } from "@/lib/brand-engine/applications"
import { requireTwinBearer } from "@/lib/twin-auth"
import { toPipelineUpdate, type TwinLeadStatus } from "@/lib/twin-control-plane"

export async function POST(req: NextRequest) {
  const auth = requireTwinBearer(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const payload = await req.json()
    const leadId = Number.parseInt(String(payload?.lead_id || ""), 10)
    const status = String(payload?.status || "").toLowerCase() as TwinLeadStatus
    const score = payload?.score
    const notes = payload?.notes

    if (!Number.isFinite(leadId) || leadId <= 0) {
      return NextResponse.json({ error: "lead_id is required." }, { status: 400 })
    }

    if (!["new", "qualified", "offer_sent", "booked", "closed", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 })
    }

    const sql = getDb()
    await ensureBrandEngineApplicationsSchema(sql)

    const mapped = toPipelineUpdate(status)
    const updates: string[] = [
      `pipeline_stage = $1`,
      `status = $2`,
      `updated_at = NOW()`,
    ]
    const values: any[] = [mapped.pipelineStage, mapped.status]

    if (typeof score === "number" && Number.isFinite(score)) {
      updates.push(`qualification_score = $${values.length + 1}`)
      values.push(Math.max(0, Math.min(100, Math.round(score))))
    }

    if (typeof notes === "string") {
      updates.push(`notes = $${values.length + 1}`)
      values.push(notes.trim())
    }

    if (mapped.setCallBookedAt) {
      updates.push(`call_booked_at = COALESCE(call_booked_at, NOW())`)
    }
    if (mapped.setOfferSentAt) {
      updates.push(`offer_sent_at = COALESCE(offer_sent_at, NOW())`)
      updates.push(`next_action = 'follow_up'`)
    }
    if (mapped.setClosedAt) {
      updates.push(`closed_at = COALESCE(closed_at, NOW())`)
    }

    const query = `
      UPDATE brand_engine_applications
      SET ${updates.join(", ")}
      WHERE id = $${values.length + 1}
      RETURNING id, pipeline_stage, status, qualification_score, updated_at
    `
    values.push(leadId)

    const result = await sql.unsafe(query, values)
    const updated = (result as any[])[0]

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      lead: {
        id: String(updated.id),
        status,
        score: Number(updated.qualification_score || 0),
        updated_at: updated.updated_at ? new Date(updated.updated_at).toISOString() : null,
      },
    })
  } catch (error) {
    console.error("[Twin Pipeline Update] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update lead." },
      { status: 500 },
    )
  }
}
