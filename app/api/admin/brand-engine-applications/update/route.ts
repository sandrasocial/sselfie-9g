import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import {
  BRAND_ENGINE_CHECKOUT_MODES,
  BRAND_ENGINE_NEXT_ACTIONS,
  BRAND_ENGINE_PIPELINE_STAGES,
  BRAND_ENGINE_ROUTING_PATHS,
  ensureBrandEngineApplicationsSchema,
} from "@/lib/brand-engine/applications"
import { requireAdmin } from "@/lib/admin-feature-flags"

function isValidStage(value: string) {
  return BRAND_ENGINE_PIPELINE_STAGES.includes(value as (typeof BRAND_ENGINE_PIPELINE_STAGES)[number])
}

function isValidRoutingPath(value: string) {
  return BRAND_ENGINE_ROUTING_PATHS.includes(value as (typeof BRAND_ENGINE_ROUTING_PATHS)[number])
}

function isValidNextAction(value: string) {
  return BRAND_ENGINE_NEXT_ACTIONS.includes(value as (typeof BRAND_ENGINE_NEXT_ACTIONS)[number])
}

function isValidCheckoutMode(value: string) {
  return BRAND_ENGINE_CHECKOUT_MODES.includes(value as (typeof BRAND_ENGINE_CHECKOUT_MODES)[number])
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || "Unauthorized" },
        { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
      )
    }

    const payload = await req.json()
    const {
      applicationId,
      pipelineStage,
      status,
      notes,
      cashCollectedCents,
      expectedValueCents,
      closeReason,
      routingPath,
      nextAction,
      callRequired,
      checkoutMode,
      checkoutModeReason,
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

    if (typeof routingPath === "string") {
      if (!isValidRoutingPath(routingPath)) {
        return NextResponse.json({ success: false, error: "Invalid routing path." }, { status: 400 })
      }
      updates.push(`routing_path = $${updates.length + 1}`)
      values.push(routingPath)
    }

    if (typeof nextAction === "string") {
      if (!isValidNextAction(nextAction)) {
        return NextResponse.json({ success: false, error: "Invalid next action." }, { status: 400 })
      }
      updates.push(`next_action = $${updates.length + 1}`)
      values.push(nextAction)
    }

    if (typeof callRequired === "boolean") {
      updates.push(`call_required = $${updates.length + 1}`)
      values.push(callRequired)
    }

    if (typeof checkoutMode === "string") {
      if (!isValidCheckoutMode(checkoutMode)) {
        return NextResponse.json({ success: false, error: "Invalid checkout mode." }, { status: 400 })
      }
      updates.push(`checkout_mode = $${updates.length + 1}`)
      values.push(checkoutMode)
    }

    if (typeof checkoutModeReason === "string") {
      updates.push(`checkout_mode_reason = $${updates.length + 1}`)
      values.push(checkoutModeReason.trim() || null)
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

    const result = await sql.query(query, values)
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
