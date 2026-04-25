import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"
import { generateFunnel2026Snapshot } from "@/lib/analytics/reports"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const report = await generateFunnel2026Snapshot({ windowDays: 30 })
  return NextResponse.json({ report })
}
