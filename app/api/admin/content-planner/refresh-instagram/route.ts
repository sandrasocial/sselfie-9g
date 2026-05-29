import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"
import { refreshInstagramPostsFromGraph } from "@/lib/admin/content-planner"

export async function POST() {
  const admin = await requireAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: 401 })
  }

  const result = await refreshInstagramPostsFromGraph()

  if (result.error) {
    return NextResponse.json(result, { status: 502 })
  }

  return NextResponse.json(result)
}
