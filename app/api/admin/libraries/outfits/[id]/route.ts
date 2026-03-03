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
    SELECT * FROM outfit_library WHERE id = ${id} LIMIT 1
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
    SELECT * FROM outfit_library WHERE id = ${id} LIMIT 1
  `

  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const merged = { ...current, ...body }
  const categories = body?.category_fit !== undefined
    ? parseStringArray(body.category_fit)
    : current.category_fit || []

  const [row] = await sql`
    UPDATE outfit_library
    SET
      outfit_name = ${merged.outfit_name},
      fashion_style = ${merged.fashion_style || null},
      category_fit = ${JSON.stringify(categories)}::jsonb,
      outfit_base = ${merged.outfit_base || null},
      outfit_style = ${merged.outfit_style || null},
      outfit_layer = ${merged.outfit_layer || null},
      description = ${merged.description || null},
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
    DELETE FROM outfit_library WHERE id = ${id} RETURNING *
  `

  return NextResponse.json({ row })
}
