import { after, NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"
import { deliverCampaignOrder } from "@/lib/campaign-outcome/delivery"
import { generateCampaignOrder } from "@/lib/campaign-outcome/generator"
import { ensureCampaignOutcomeSchema } from "@/lib/campaign-outcome/schema"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"
export const maxDuration = 300

async function checkAdmin() {
  const admin = await requireAdmin()
  if (admin.isAdmin) return null
  return NextResponse.json(
    { error: admin.error || "Admin access required" },
    { status: admin.error === "Not authenticated" ? 401 : 403 }
  )
}

function orderIdFrom(value: unknown): number | null {
  const id = Number.parseInt(String(value || ""), 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError
  await ensureCampaignOutcomeSchema()
  const orders = await sql`
    SELECT *
    FROM campaign_orders
    ORDER BY
      CASE status
        WHEN 'needs_qa' THEN 1
        WHEN 'generation_failed' THEN 2
        WHEN 'inputs_ready' THEN 3
        WHEN 'generating' THEN 4
        WHEN 'awaiting_intake' THEN 5
        ELSE 6
      END,
      created_at DESC
    LIMIT 100
  `
  const [summary] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE is_test_mode = FALSE) AS live_orders,
      COUNT(*) FILTER (WHERE is_test_mode = FALSE AND redo_requested_at IS NOT NULL) AS redo_requests,
      COUNT(*) FILTER (WHERE is_test_mode = FALSE AND refund_requested_at IS NOT NULL) AS refund_requests
    FROM campaign_orders
  `
  return NextResponse.json({
    orders,
    summary: {
      liveOrders: Number(summary?.live_orders || 0),
      redoRequests: Number(summary?.redo_requests || 0),
      refundRequests: Number(summary?.refund_requests || 0),
    },
  })
}

export async function POST(request: Request) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const orderId = orderIdFrom(body?.orderId)
  const action = body?.action
  if (
    !orderId ||
    ![
      "approve",
      "regenerate",
      "resend_delivery",
      "record_redo_request",
      "record_refund_request",
    ].includes(action)
  ) {
    return NextResponse.json({ error: "A valid campaign action is required." }, { status: 400 })
  }

  await ensureCampaignOutcomeSchema()
  if (action === "record_redo_request" || action === "record_refund_request") {
    const rows =
      action === "record_redo_request"
        ? await sql`
            UPDATE campaign_orders
            SET redo_requested_at = COALESCE(redo_requested_at, NOW()), updated_at = NOW()
            WHERE id = ${orderId}
            RETURNING id, redo_requested_at
          `
        : await sql`
            UPDATE campaign_orders
            SET refund_requested_at = COALESCE(refund_requested_at, NOW()), updated_at = NOW()
            WHERE id = ${orderId}
            RETURNING id, refund_requested_at
          `
    if (!rows[0]) return NextResponse.json({ error: "Campaign not found." }, { status: 404 })
    return NextResponse.json({ ok: true })
  }
  if (action === "approve") {
    const result = await deliverCampaignOrder(orderId)
    return NextResponse.json(result, { status: result.delivered ? 200 : 409 })
  }
  if (action === "resend_delivery") {
    const result = await deliverCampaignOrder(orderId, { forceEmail: true })
    return NextResponse.json(result, { status: result.delivered ? 200 : 409 })
  }

  // Recovery contract (money review P0, 2026-07-15): a PAID order must never be
  // unrecoverable. Regenerate therefore also accepts the two stuck states a killed
  // serverless run can leave behind: 'inputs_ready' whose after() never fired, and a
  // STALE 'generating' (generation_started_at older than 10 minutes - safely past the
  // 300s function ceiling, so it can never clobber a live run).
  const rows = await sql`
    UPDATE campaign_orders
    SET status = 'inputs_ready', generation_error = NULL, updated_at = NOW()
    WHERE id = ${orderId}
      AND selfie_url IS NOT NULL
      AND what_she_sells IS NOT NULL
      AND promotion IS NOT NULL
      AND target_audience IS NOT NULL
      AND (
        status IN ('generation_failed', 'needs_qa', 'delivered', 'inputs_ready')
        OR (
          status = 'generating'
          AND COALESCE(generation_started_at, updated_at) < NOW() - INTERVAL '10 minutes'
        )
      )
    RETURNING id
  `
  if (!rows[0]) {
    const [current] = await sql`
      SELECT status FROM campaign_orders WHERE id = ${orderId} LIMIT 1
    `
    if (current?.status === "generating") {
      return NextResponse.json(
        { error: "This campaign is still generating. Try again in a few minutes." },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "This campaign is not ready to regenerate." },
      { status: 409 }
    )
  }
  after(async () => {
    await generateCampaignOrder(orderId)
  })
  return NextResponse.json({ ok: true, status: "inputs_ready" })
}
