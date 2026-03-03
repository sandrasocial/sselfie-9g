import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
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
    const boundedScore =
      typeof score === "number" && Number.isFinite(score)
        ? Math.max(0, Math.min(100, Math.round(score)))
        : null
    const trimmedNotes = typeof notes === "string" ? notes.trim() : null

    const result = await sql`
      UPDATE brand_engine_applications
      SET
        pipeline_stage = ${mapped.pipelineStage},
        status = ${mapped.status},
        qualification_score = CASE
          WHEN ${boundedScore !== null} THEN ${boundedScore}
          ELSE qualification_score
        END,
        notes = CASE
          WHEN ${trimmedNotes !== null} THEN ${trimmedNotes}
          ELSE notes
        END,
        call_booked_at = CASE
          WHEN ${mapped.setCallBookedAt} THEN COALESCE(call_booked_at, NOW())
          ELSE call_booked_at
        END,
        offer_sent_at = CASE
          WHEN ${mapped.setOfferSentAt} THEN COALESCE(offer_sent_at, NOW())
          ELSE offer_sent_at
        END,
        next_action = CASE
          WHEN ${mapped.setOfferSentAt} THEN 'follow_up'
          ELSE next_action
        END,
        closed_at = CASE
          WHEN ${mapped.setClosedAt} THEN COALESCE(closed_at, NOW())
          ELSE closed_at
        END,
        updated_at = NOW()
      WHERE id = ${leadId}
      RETURNING id, pipeline_stage, status, qualification_score, updated_at
    `
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
