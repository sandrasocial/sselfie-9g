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
  const fashionStyle = searchParams.get("fashion_style")
  const enabledParam = searchParams.get("enabled")
  const enabled = enabledParam === null ? null : enabledParam === "true"

  const rows = await sql`
    SELECT *
    FROM outfit_library
    WHERE (${fashionStyle}::text IS NULL OR fashion_style = ${fashionStyle})
      AND (${enabled}::boolean IS NULL OR enabled = ${enabled})
    ORDER BY outfit_name
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
    outfit_name,
    fashion_style,
    category_fit,
    outfit_base,
    outfit_style,
    outfit_layer,
    description,
    enabled = true,
  } = body || {}

  if (!outfit_name) {
    return NextResponse.json({ error: "outfit_name is required." }, { status: 400 })
  }

  const categories = parseStringArray(category_fit)

  const [row] = await sql`
    INSERT INTO outfit_library (
      outfit_name,
      fashion_style,
      category_fit,
      outfit_base,
      outfit_style,
      outfit_layer,
      description,
      enabled,
      updated_at
    )
    VALUES (
      ${outfit_name},
      ${fashion_style || null},
      ${JSON.stringify(categories)}::jsonb,
      ${outfit_base || null},
      ${outfit_style || null},
      ${outfit_layer || null},
      ${description || null},
      ${Boolean(enabled)},
      NOW()
    )
    ON CONFLICT (outfit_name, fashion_style) DO UPDATE SET
      category_fit = EXCLUDED.category_fit,
      outfit_base = EXCLUDED.outfit_base,
      outfit_style = EXCLUDED.outfit_style,
      outfit_layer = EXCLUDED.outfit_layer,
      description = EXCLUDED.description,
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
    RETURNING *
  `

  return NextResponse.json({ row })
}
