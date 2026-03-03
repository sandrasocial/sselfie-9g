import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { ensureBrandEngineApplicationsSchema } from "@/lib/brand-engine/applications"
import { ensureTwinQueueSchema, toTwinLeadStatus } from "@/lib/twin-control-plane"
import { requireTwinBearer } from "@/lib/twin-auth"

function parseSince(req: NextRequest): Date {
  const raw = req.nextUrl.searchParams.get("since")
  if (!raw) {
    return new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
  return parsed
}

export async function GET(req: NextRequest) {
  const auth = requireTwinBearer(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const since = parseSince(req)
    const sql = getDb()
    await ensureBrandEngineApplicationsSchema(sql)
    await ensureTwinQueueSchema(sql)

    const changedRows = await sql`
      SELECT id, pipeline_stage, status, updated_at
      FROM brand_engine_applications
      WHERE updated_at >= ${since.toISOString()}
      ORDER BY updated_at DESC
      LIMIT 200
    `

    const newLeadsResult = await sql`
      SELECT COUNT(*)::int AS count
      FROM brand_engine_applications
      WHERE created_at >= ${since.toISOString()}
    `

    const pendingApprovalsResult = await sql`
      SELECT COUNT(*)::int AS count
      FROM twin_approval_queue
      WHERE status = 'pending'
    `

    const revenueResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE pipeline_stage = 'closed_won')::int AS closed_won,
        COALESCE(SUM(cash_collected_cents) FILTER (WHERE pipeline_stage = 'closed_won'), 0)::bigint AS revenue_total_cents
      FROM brand_engine_applications
      WHERE offer_type = 'cohort' OR offer_type IS NULL
    `

    const staleQualifiedResult = await sql`
      SELECT COUNT(*)::int AS count
      FROM brand_engine_applications
      WHERE pipeline_stage IN ('qualified_queue', 'contacted')
        AND updated_at < NOW() - INTERVAL '48 hours'
    `

    const seatCap = Number(process.env.BRAND_ENGINE_COHORT_SEAT_CAP || 12)
    const closedWon = Number((revenueResult as any[])[0]?.closed_won || 0)
    const revenueTotalCents = Number((revenueResult as any[])[0]?.revenue_total_cents || 0)
    const pendingApprovals = Number((pendingApprovalsResult as any[])[0]?.count || 0)
    const staleQualified = Number((staleQualifiedResult as any[])[0]?.count || 0)

    const actionsNeeded: string[] = []
    if (pendingApprovals > 0) actionsNeeded.push(`Review ${pendingApprovals} pending approval item(s).`)
    if (staleQualified > 0) actionsNeeded.push(`Follow up with ${staleQualified} qualified lead(s) with no update in 48h.`)
    if (actionsNeeded.length === 0) actionsNeeded.push("No urgent manual actions required right now.")

    return NextResponse.json({
      new_leads: Number((newLeadsResult as any[])[0]?.count || 0),
      status_changes: (changedRows as any[]).map((row) => ({
        lead_id: String(row.id),
        status: toTwinLeadStatus(row.pipeline_stage, row.status),
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      })),
      pending_approvals: pendingApprovals,
      spots_remaining: Math.max(0, seatCap - closedWon),
      revenue_total: Number((revenueTotalCents / 100).toFixed(2)),
      actions_needed: actionsNeeded,
    })
  } catch (error) {
    console.error("[Twin Digest] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build digest." },
      { status: 500 },
    )
  }
}

