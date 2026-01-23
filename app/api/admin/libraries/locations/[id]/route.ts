import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAdmin } from "@/lib/admin-feature-flags"

const sql = neon(process.env.DATABASE_URL!)

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
    SELECT * FROM location_library WHERE id = ${id} LIMIT 1
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
    SELECT * FROM location_library WHERE id = ${id} LIMIT 1
  `

  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const merged = { ...current, ...body }
  const categories = body?.category_fit !== undefined
    ? parseStringArray(body.category_fit)
    : current.category_fit || []

  const [row] = await sql`
    UPDATE location_library
    SET
      location_name = ${merged.location_name},
      location_type = ${merged.location_type || null},
      category_fit = ${JSON.stringify(categories)}::jsonb,
      description = ${merged.description || null},
      indoor = ${merged.indoor ?? null},
      public = ${merged.public ?? null},
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
    DELETE FROM location_library WHERE id = ${id} RETURNING *
  `

  return NextResponse.json({ row })
}
