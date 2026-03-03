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
  const objectType = searchParams.get("object_type")
  const enabledParam = searchParams.get("enabled")
  const enabled = enabledParam === null ? null : enabledParam === "true"

  const rows = await sql`
    SELECT *
    FROM object_library
    WHERE (${objectType}::text IS NULL OR object_type = ${objectType})
      AND (${enabled}::boolean IS NULL OR enabled = ${enabled})
    ORDER BY object_name
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
    object_name,
    object_type,
    category_fit,
    description,
    position_type,
    enabled = true,
  } = body || {}

  if (!object_name) {
    return NextResponse.json({ error: "object_name is required." }, { status: 400 })
  }

  const categories = parseStringArray(category_fit)

  const [row] = await sql`
    INSERT INTO object_library (
      object_name,
      object_type,
      category_fit,
      description,
      position_type,
      enabled,
      updated_at
    )
    VALUES (
      ${object_name},
      ${object_type || null},
      ${JSON.stringify(categories)}::jsonb,
      ${description || null},
      ${position_type || null},
      ${Boolean(enabled)},
      NOW()
    )
    ON CONFLICT (object_name, object_type) DO UPDATE SET
      category_fit = EXCLUDED.category_fit,
      description = EXCLUDED.description,
      position_type = EXCLUDED.position_type,
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
    RETURNING *
  `

  return NextResponse.json({ row })
}
