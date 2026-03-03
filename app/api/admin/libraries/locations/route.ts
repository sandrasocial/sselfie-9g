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
  const locationType = searchParams.get("location_type")
  const enabledParam = searchParams.get("enabled")
  const enabled = enabledParam === null ? null : enabledParam === "true"

  const rows = await sql`
    SELECT *
    FROM location_library
    WHERE (${locationType}::text IS NULL OR location_type = ${locationType})
      AND (${enabled}::boolean IS NULL OR enabled = ${enabled})
    ORDER BY location_name
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
    location_name,
    location_type,
    category_fit,
    description,
    indoor,
    public: isPublic,
    enabled = true,
  } = body || {}

  if (!location_name) {
    return NextResponse.json({ error: "location_name is required." }, { status: 400 })
  }

  const categories = parseStringArray(category_fit)

  const [row] = await sql`
    INSERT INTO location_library (
      location_name,
      location_type,
      category_fit,
      description,
      indoor,
      public,
      enabled,
      updated_at
    )
    VALUES (
      ${location_name},
      ${location_type || null},
      ${JSON.stringify(categories)}::jsonb,
      ${description || null},
      ${indoor ?? null},
      ${isPublic ?? null},
      ${Boolean(enabled)},
      NOW()
    )
    ON CONFLICT (location_name, location_type) DO UPDATE SET
      category_fit = EXCLUDED.category_fit,
      description = EXCLUDED.description,
      indoor = EXCLUDED.indoor,
      public = EXCLUDED.public,
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
    RETURNING *
  `

  return NextResponse.json({ row })
}
