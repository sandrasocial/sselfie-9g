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
    SELECT * FROM feed_style_definitions WHERE id = ${id} LIMIT 1
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
    SELECT * FROM feed_style_definitions WHERE id = ${id} LIMIT 1
  `

  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const merged = {
    ...current,
    ...body,
  }

  const palette = body?.color_palette !== undefined
    ? parseStringArray(body.color_palette)
    : current.color_palette || []
  const hexCodes = body?.color_hex_codes !== undefined
    ? parseStringArray(body.color_hex_codes)
    : current.color_hex_codes || []

  const [row] = await sql`
    UPDATE feed_style_definitions
    SET
      visual_aesthetic = ${merged.visual_aesthetic},
      feed_style = ${merged.feed_style},
      category = ${merged.category},
      mood = ${merged.mood},
      color_palette = ${JSON.stringify(palette)}::jsonb,
      color_hex_codes = ${JSON.stringify(hexCodes)}::jsonb,
      lighting_description = ${merged.lighting_description || null},
      mood_description = ${merged.mood_description || null},
      background_style = ${merged.background_style || null},
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
    DELETE FROM feed_style_definitions WHERE id = ${id} RETURNING *
  `

  return NextResponse.json({ row })
}
