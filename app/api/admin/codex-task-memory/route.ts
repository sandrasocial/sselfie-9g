import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"
import {
  getCodexTaskMemory,
  updateCodexTaskStatus,
  type CodexTaskStatus,
} from "@/lib/admin/codex-task-memory"
import { getGrowthIntelligenceReport } from "@/lib/admin/growth-intelligence"

async function guardAdmin() {
  const admin = await requireAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: 401 })
  }

  return null
}

function normalizeDays(value: unknown): number {
  const days = Number(value || 7)
  return [1, 3, 7, 14, 30].includes(days) ? days : 7
}

export async function GET(request: Request) {
  const adminError = await guardAdmin()
  if (adminError) return adminError

  const url = new URL(request.url)
  const days = normalizeDays(url.searchParams.get("days"))
  const report = await getGrowthIntelligenceReport(days)
  const tasks = await getCodexTaskMemory(report)

  return NextResponse.json({ tasks })
}

export async function PATCH(request: Request) {
  const adminError = await guardAdmin()
  if (adminError) return adminError

  const body = (await request.json()) as {
    key?: string
    status?: CodexTaskStatus
    days?: number
  }

  if (!body.key || !body.status) {
    return NextResponse.json({ error: "Missing task key or status." }, { status: 400 })
  }

  const report = await getGrowthIntelligenceReport(normalizeDays(body.days))
  const tasks = await updateCodexTaskStatus(body.key, body.status, report)

  return NextResponse.json({ tasks })
}
