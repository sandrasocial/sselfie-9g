import { NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import {
  AcademyRouteError,
  academyRouteErrorToResponse,
  requireAcademyMembershipCollectionAccess,
} from "@/lib/academy-server-access"

type MonthlyDropRow = {
  id: number | string
  downloaded?: boolean | null
  [key: string]: unknown
}

function dedupeMonthlyDrops(rows: MonthlyDropRow[]): MonthlyDropRow[] {
  const byId = new Map<string, MonthlyDropRow>()

  for (const row of rows) {
    const key = String(row.id)
    const existing = byId.get(key)
    if (!existing) {
      byId.set(key, {
        ...row,
        downloaded: row.downloaded === true,
      })
      continue
    }

    byId.set(key, {
      ...existing,
      ...row,
      downloaded: existing.downloaded === true || row.downloaded === true,
    })
  }

  return Array.from(byId.values())
}

export async function GET() {
  try {
    const { neonUser } = await requireAcademyMembershipCollectionAccess("monthly-drops")

    const monthlyDrops = await sql`
      SELECT
        md.id,
        md.title,
        md.description,
        md.thumbnail_url,
        md.resource_type,
        md.resource_url,
        md.month,
        md.category,
        md.order_index,
        md.download_count,
        CASE WHEN urd.id IS NOT NULL THEN true ELSE false END AS downloaded
      FROM academy_monthly_drops md
      LEFT JOIN user_resource_downloads urd
        ON md.id::text = urd.resource_id::text
        AND urd.resource_type = 'monthly-drop'
        AND urd.user_id = ${neonUser.id}
      WHERE md.status = 'published'
      ORDER BY md.created_at DESC, md.order_index ASC
    `

    return NextResponse.json({
      hasAccess: true,
      monthlyDrops: dedupeMonthlyDrops(monthlyDrops as MonthlyDropRow[]),
    })
  } catch (error) {
    if (error instanceof AcademyRouteError && error.status === 403) {
      return NextResponse.json({
        hasAccess: false,
        monthlyDrops: [],
      })
    }

    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error fetching monthly drops:", error)
    return NextResponse.json({ error: "Failed to fetch monthly drops" }, { status: 500 })
  }
}
