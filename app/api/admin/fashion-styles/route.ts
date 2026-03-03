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

export async function GET(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const enabledParam = searchParams.get("enabled")
  const enabled = enabledParam === null ? null : enabledParam === "true"

  const rows = await sql`
    SELECT *
    FROM fashion_style_definitions
    WHERE (${enabled}::boolean IS NULL OR enabled = ${enabled})
    ORDER BY fashion_style_name
  `

  return NextResponse.json({ rows })
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 }
    )
  }

  const body = await request.json()
  const {
    fashion_style_name,
    category_compatibility,
    outfit_base_options,
    outfit_layer_options,
    enabled = true,
  } = body || {}

  if (!fashion_style_name) {
    return NextResponse.json({ error: "fashion_style_name is required." }, { status: 400 })
  }

  const [row] = await sql`
    INSERT INTO fashion_style_definitions (
      fashion_style_name,
      category_compatibility,
      outfit_base_options,
      outfit_layer_options,
      enabled,
      updated_at
    )
    VALUES (
      ${fashion_style_name},
      ${JSON.stringify(parseStringArray(category_compatibility))}::jsonb,
      ${JSON.stringify(parseStringArray(outfit_base_options))}::jsonb,
      ${JSON.stringify(parseStringArray(outfit_layer_options))}::jsonb,
      ${Boolean(enabled)},
      NOW()
    )
    ON CONFLICT (fashion_style_name) DO UPDATE SET
      category_compatibility = EXCLUDED.category_compatibility,
      outfit_base_options = EXCLUDED.outfit_base_options,
      outfit_layer_options = EXCLUDED.outfit_layer_options,
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
    RETURNING *
  `

  return NextResponse.json({ row })
}
