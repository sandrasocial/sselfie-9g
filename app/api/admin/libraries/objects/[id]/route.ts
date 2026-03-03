import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { requireAdmin } from "@/lib/admin-feature-flags"


function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 }
    )
  }

  const { id } = await params
  const [row] = await sql`
    SELECT * FROM object_library WHERE id = ${id} LIMIT 1
  `

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ row })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 }
    )
  }

  const { id } = await params
  const body = await request.json()

  const [current] = await sql`
    SELECT * FROM object_library WHERE id = ${id} LIMIT 1
  `

  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const merged = { ...current, ...body }
  const categories = body?.category_fit !== undefined
    ? parseStringArray(body.category_fit)
    : current.category_fit || []

  const [row] = await sql`
    UPDATE object_library
    SET
      object_name = ${merged.object_name},
      object_type = ${merged.object_type || null},
      category_fit = ${JSON.stringify(categories)}::jsonb,
      description = ${merged.description || null},
      position_type = ${merged.position_type || null},
      enabled = ${Boolean(merged.enabled)},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `

  return NextResponse.json({ row })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 }
    )
  }

  const { id } = await params
  const [row] = await sql`
    DELETE FROM object_library WHERE id = ${id} RETURNING *
  `

  return NextResponse.json({ row })
}
