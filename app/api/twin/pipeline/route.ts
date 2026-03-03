import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { ensureBrandEngineApplicationsSchema } from "@/lib/brand-engine/applications"
import { requireTwinBearer } from "@/lib/twin-auth"
import { toTwinLeadStatus } from "@/lib/twin-control-plane"

function extractInstagramHandle(sourceDetail: string | null, website: string | null): string {
  const detail = String(sourceDetail || "")
  const match = detail.match(/handle:([a-z0-9._-]+)/i)
  if (match?.[1]) return match[1]

  const site = String(website || "")
  const siteMatch = site.match(/instagram\.com\/([a-z0-9._-]+)/i)
  if (siteMatch?.[1]) return siteMatch[1]

  return ""
}

export async function GET(req: NextRequest) {
  const auth = requireTwinBearer(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const sql = getDb()
    await ensureBrandEngineApplicationsSchema(sql)

    const rows = await sql`
      SELECT
        id,
        name,
        email,
        website,
        source_channel,
        source_detail,
        pipeline_stage,
        status,
        qualification_score,
        created_at,
        updated_at,
        notes
      FROM brand_engine_applications
      ORDER BY created_at DESC
      LIMIT 500
    `

    const leadStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE pipeline_stage = 'closed_won')::int AS closed_won,
        COALESCE(SUM(cash_collected_cents) FILTER (WHERE pipeline_stage = 'closed_won'), 0)::bigint AS revenue_total_cents
      FROM brand_engine_applications
      WHERE offer_type = 'cohort' OR offer_type IS NULL
    `

    const seatCap = Number(process.env.BRAND_ENGINE_COHORT_SEAT_CAP || 12)
    const closedWon = Number((leadStats as any[])[0]?.closed_won || 0)
    const revenueTotalCents = Number((leadStats as any[])[0]?.revenue_total_cents || 0)

    const leads = (rows as any[]).map((row) => ({
      id: String(row.id),
      name: String(row.name || ""),
      email: String(row.email || ""),
      instagram: extractInstagramHandle(row.source_detail, row.website),
      source: String(row.source_channel || "unknown"),
      status: toTwinLeadStatus(row.pipeline_stage, row.status),
      score: Number(row.qualification_score || 0),
      applied_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      notes: String(row.notes || ""),
    }))

    return NextResponse.json({
      leads,
      spots_remaining: Math.max(0, seatCap - closedWon),
      revenue_total: Number((revenueTotalCents / 100).toFixed(2)),
    })
  } catch (error) {
    console.error("[Twin Pipeline] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load pipeline." },
      { status: 500 },
    )
  }
}

