import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"
import { getContentBoardData, savePlannerSlots } from "@/lib/admin/content-planner"

async function guardAdmin() {
  const admin = await requireAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: 401 })
  }

  return null
}

export async function GET() {
  const adminError = await guardAdmin()
  if (adminError) return adminError

  const data = await getContentBoardData()
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const adminError = await guardAdmin()
  if (adminError) return adminError

  const body = (await request.json()) as { slots?: unknown }
  const slots = await savePlannerSlots(body.slots)

  return NextResponse.json({ slots })
}
