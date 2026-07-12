import { NextRequest, NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"
import {
  createWorkWithMeCheckoutLink,
  getReusableWorkWithMeCheckout,
} from "@/lib/work-with-me/checkout"
import {
  ensureWorkWithMePipelineSchema,
  isWorkWithMeAdminAction,
} from "@/lib/work-with-me/pipeline"

export const dynamic = "force-dynamic"

function unauthorized(error?: string) {
  return NextResponse.json(
    { error: error || "Admin access required" },
    { status: error === "Not authenticated" ? 401 : 403 },
  )
}

function applicationIdFrom(value: unknown) {
  const id = Number.parseInt(String(value || ""), 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function checkAdmin() {
  const admin = await requireAdmin()
  return admin.isAdmin ? null : unauthorized(admin.error)
}

export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError

  try {
    await ensureWorkWithMePipelineSchema(sql)
    const applications = await sql`
      SELECT
        id,
        name,
        email,
        website AS instagram_handle,
        qualification_score,
        ready_to_invest AS readiness,
        qualified,
        priority_tier,
        pipeline_stage,
        notes,
        biggest_bottleneck AS current_challenge,
        why_interested AS desired_outcome,
        business_description AS current_offer,
        checkout_session_id,
        checkout_url,
        checkout_created_at,
        created_at,
        updated_at
      FROM brand_engine_applications
      WHERE
        offer_type = 'work_with_me'
        OR source_channel IN ('work_with_me', 'work-with-me')
        OR lead_tags ? 'work-with-me'
      ORDER BY
        CASE pipeline_stage
          WHEN 'qualified_queue' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'call_booked' THEN 3
          WHEN 'call_completed' THEN 4
          WHEN 'offer_sent' THEN 5
          WHEN 'closed_won' THEN 6
          WHEN 'closed_lost' THEN 7
          ELSE 8
        END,
        qualification_score DESC,
        created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ applications })
  } catch (error) {
    console.error("[Work With Me Admin] Failed to list applications:", error)
    return NextResponse.json({ error: "Failed to load Work With Me applications." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  const applicationId = applicationIdFrom(body.applicationId)
  const action = body.action
  const notes = typeof body.notes === "string" ? body.notes.trim() : null

  if (!applicationId) {
    return NextResponse.json({ error: "A valid applicationId is required." }, { status: 400 })
  }
  if (!isWorkWithMeAdminAction(action)) {
    return NextResponse.json({ error: "Invalid Work With Me action." }, { status: 400 })
  }

  try {
    await ensureWorkWithMePipelineSchema(sql)
    let rows: Array<Record<string, unknown>> = []

    if (action === "contacted") {
      rows = await sql`
        UPDATE brand_engine_applications
        SET
          pipeline_stage = 'contacted',
          status = 'contacted',
          next_action = 'book_call',
          notes = CASE WHEN ${notes !== null} THEN ${notes} ELSE notes END,
          updated_at = NOW()
        WHERE id = ${applicationId}
          AND (
            offer_type = 'work_with_me'
            OR source_channel IN ('work_with_me', 'work-with-me')
            OR lead_tags ? 'work-with-me'
          )
          AND pipeline_stage IN ('applied', 'qualified_queue', 'contacted')
        RETURNING id, pipeline_stage, status, notes, updated_at
      `
    } else if (action === "call_booked") {
      rows = await sql`
        UPDATE brand_engine_applications
        SET
          pipeline_stage = 'call_booked',
          status = 'calendly_sent',
          next_action = 'follow_up',
          call_booked_at = COALESCE(call_booked_at, NOW()),
          notes = CASE WHEN ${notes !== null} THEN ${notes} ELSE notes END,
          updated_at = NOW()
        WHERE id = ${applicationId}
          AND (
            offer_type = 'work_with_me'
            OR source_channel IN ('work_with_me', 'work-with-me')
            OR lead_tags ? 'work-with-me'
          )
          AND pipeline_stage IN ('qualified_queue', 'contacted', 'call_booked')
        RETURNING id, pipeline_stage, status, notes, updated_at
      `
    } else if (action === "lost") {
      rows = await sql`
        UPDATE brand_engine_applications
        SET
          pipeline_stage = 'closed_lost',
          status = 'closed_lost',
          next_action = 'follow_up',
          closed_at = COALESCE(closed_at, NOW()),
          closed_reason = COALESCE(closed_reason, 'marked_lost_by_admin'),
          notes = CASE WHEN ${notes !== null} THEN ${notes} ELSE notes END,
          updated_at = NOW()
        WHERE id = ${applicationId}
          AND (
            offer_type = 'work_with_me'
            OR source_channel IN ('work_with_me', 'work-with-me')
            OR lead_tags ? 'work-with-me'
          )
          AND pipeline_stage <> 'closed_won'
        RETURNING id, pipeline_stage, status, notes, updated_at
      `
    } else {
      rows = await sql`
        UPDATE brand_engine_applications
        SET notes = ${notes || ""}, updated_at = NOW()
        WHERE id = ${applicationId}
          AND (
            offer_type = 'work_with_me'
            OR source_channel IN ('work_with_me', 'work-with-me')
            OR lead_tags ? 'work-with-me'
          )
        RETURNING id, pipeline_stage, status, notes, updated_at
      `
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "That action is not available from the application's current stage." },
        { status: 409 },
      )
    }

    return NextResponse.json({ ok: true, application: rows[0] })
  } catch (error) {
    console.error("[Work With Me Admin] Failed to update application:", error)
    return NextResponse.json({ error: "Failed to update the application." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  const applicationId = applicationIdFrom(body.applicationId)
  if (!applicationId || body.action !== "create_checkout") {
    return NextResponse.json({ error: "A valid checkout action is required." }, { status: 400 })
  }

  try {
    await ensureWorkWithMePipelineSchema(sql)
    const [application] = await sql`
      SELECT id, name, email, pipeline_stage, checkout_session_id, checkout_url
      FROM brand_engine_applications
      WHERE id = ${applicationId}
        AND (
          offer_type = 'work_with_me'
          OR source_channel IN ('work_with_me', 'work-with-me')
          OR lead_tags ? 'work-with-me'
        )
      LIMIT 1
    `

    if (!application) {
      return NextResponse.json({ error: "Work With Me application not found." }, { status: 404 })
    }

    const allowedStages = new Set(["contacted", "call_booked", "call_completed", "offer_sent"])
    if (!allowedStages.has(String(application.pipeline_stage || ""))) {
      return NextResponse.json(
        { error: "Contact the applicant before creating her payment link." },
        { status: 409 },
      )
    }

    const previousSessionId = application.checkout_session_id
      ? String(application.checkout_session_id)
      : null
    if (previousSessionId) {
      const reusableCheckout = await getReusableWorkWithMeCheckout(previousSessionId)
      if (reusableCheckout) {
        return NextResponse.json({
          ok: true,
          ...reusableCheckout,
          reused: true,
        })
      }
    }

    const checkout = await createWorkWithMeCheckoutLink({
      applicationId,
      name: String(application.name || ""),
      email: String(application.email || ""),
      previousSessionId,
    })

    const updatedRows = await sql`
      UPDATE brand_engine_applications
      SET
        pipeline_stage = 'offer_sent',
        status = 'offer_sent',
        next_action = 'follow_up',
        offer_sent_at = COALESCE(offer_sent_at, NOW()),
        expected_value_cents = ${checkout.amountCents},
        checkout_mode = 'payment_link',
        checkout_mode_reason = 'admin_attended_offer',
        checkout_session_id = ${checkout.sessionId},
        checkout_url = ${checkout.checkoutUrl},
        checkout_created_at = NOW(),
        updated_at = NOW()
      WHERE id = ${applicationId}
        AND (
          offer_type = 'work_with_me'
          OR source_channel IN ('work_with_me', 'work-with-me')
          OR lead_tags ? 'work-with-me'
        )
        AND pipeline_stage IN ('contacted', 'call_booked', 'call_completed', 'offer_sent')
        AND (
          checkout_session_id IS NOT DISTINCT FROM ${previousSessionId}
          OR checkout_session_id = ${checkout.sessionId}
        )
      RETURNING id
    `

    if (updatedRows.length === 0) {
      return NextResponse.json({ error: "The application changed before the link was saved." }, { status: 409 })
    }

    return NextResponse.json({
      ok: true,
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
      reused: false,
    })
  } catch (error) {
    console.error("[Work With Me Admin] Failed to create checkout:", error)
    return NextResponse.json({ error: "Failed to create the €2,000 checkout link." }, { status: 500 })
  }
}
