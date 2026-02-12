import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import {
  BRAND_ENGINE_PIPELINE_STAGES,
  ensureBrandEngineApplicationsSchema,
} from "@/lib/brand-engine/applications"

function isValidStage(value: string) {
  return BRAND_ENGINE_PIPELINE_STAGES.includes(value as (typeof BRAND_ENGINE_PIPELINE_STAGES)[number])
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const {
      applicationId,
      pipelineStage,
      status,
      notes,
      cashCollectedCents,
      expectedValueCents,
      closeReason,
      calendlySent,
      callBookedAt,
      callCompletedAt,
      offerSentAt,
      closedAt,
    } = payload

    if (!applicationId) {
      return NextResponse.json({ success: false, error: "Application ID is required." }, { status: 400 })
    }

    const sql = getDb()
    await ensureBrandEngineApplicationsSchema(sql)

    const updates: string[] = []
    const values: any[] = []

    if (pipelineStage) {
      if (!isValidStage(pipelineStage)) {
        return NextResponse.json({ success: false, error: "Invalid pipeline stage." }, { status: 400 })
      }
      updates.push(`pipeline_stage = $${updates.length + 1}`)
      values.push(pipelineStage)
    }

    if (status) {
      updates.push(`status = $${updates.length + 1}`)
      values.push(status)
    }

    if (typeof notes === "string") {
      updates.push(`notes = $${updates.length + 1}`)
      values.push(notes)
    }

    if (typeof closeReason === "string") {
      updates.push(`closed_reason = $${updates.length + 1}`)
      values.push(closeReason)
    }

    if (typeof cashCollectedCents === "number") {
      updates.push(`cash_collected_cents = $${updates.length + 1}`)
      values.push(cashCollectedCents)
    }

    if (typeof expectedValueCents === "number") {
      updates.push(`expected_value_cents = $${updates.length + 1}`)
      values.push(expectedValueCents)
    }

    if (typeof calendlySent === "boolean") {
      updates.push(`calendly_sent = $${updates.length + 1}`)
      values.push(calendlySent)
    }

    if (callBookedAt) {
      updates.push(`call_booked_at = $${updates.length + 1}`)
      values.push(callBookedAt)
    }

    if (callCompletedAt) {
      updates.push(`call_completed_at = $${updates.length + 1}`)
      values.push(callCompletedAt)
    }

    if (offerSentAt) {
      updates.push(`offer_sent_at = $${updates.length + 1}`)
      values.push(offerSentAt)
    }

    if (closedAt) {
      updates.push(`closed_at = $${updates.length + 1}`)
      values.push(closedAt)
    }

    updates.push(`updated_at = NOW()`)

    const query = `
      UPDATE brand_engine_applications
      SET ${updates.join(", ")}
      WHERE id = $${updates.length}
      RETURNING id, pipeline_stage, status, cash_collected_cents
    `
    values.push(applicationId)

    const result = await sql.unsafe(query, values)
    const row = (result as any[])[0]

    if (!row) {
      return NextResponse.json({ success: false, error: "Application not found." }, { status: 404 })
    }

    return NextResponse.json({ success: true, application: row })
  } catch (error) {
    console.error("[Brand Engine Applications Update] Error:", error)
    return NextResponse.json({ success: false, error: "Something went wrong." }, { status: 500 })
  }
}
