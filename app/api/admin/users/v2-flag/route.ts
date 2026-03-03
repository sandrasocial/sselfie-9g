import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"


export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const { userId, email, enabled } = body || {}

  if (!userId && !email) {
    return NextResponse.json(
      { error: "Provide userId or email to update the V2 flag." },
      { status: 400 },
    )
  }

  let targetId = userId ? Number(userId) : null
  if (!targetId && email) {
    const [row] = await sql`
      SELECT id
      FROM users
      WHERE email = ${String(email).trim()}
      LIMIT 1
    `
    targetId = row?.id ? Number(row.id) : null
  }

  if (!targetId) {
    return NextResponse.json({ error: "User not found." }, { status: 404 })
  }

  const [updated] = await sql`
    UPDATE users
    SET use_feed_planner_v2 = ${Boolean(enabled)}
    WHERE id = ${targetId}
    RETURNING id, email, use_feed_planner_v2
  `

  return NextResponse.json({ user: updated })
}

export async function PUT(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const { enabled } = body || {}

  const result = await sql`
    UPDATE users
    SET use_feed_planner_v2 = ${Boolean(enabled)}
  `

  return NextResponse.json({ ok: true, updated: result.length })
}
