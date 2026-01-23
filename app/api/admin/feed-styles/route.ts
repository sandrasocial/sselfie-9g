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

export async function GET(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const visualAesthetic = searchParams.get("visual_aesthetic")
  const feedStyle = searchParams.get("feed_style")
  const enabledParam = searchParams.get("enabled")
  const enabled = enabledParam === null ? null : enabledParam === "true"

  const rows = await sql`
    SELECT *
    FROM feed_style_definitions
    WHERE (${visualAesthetic}::text IS NULL OR visual_aesthetic = ${visualAesthetic})
      AND (${feedStyle}::text IS NULL OR feed_style = ${feedStyle})
      AND (${enabled}::boolean IS NULL OR enabled = ${enabled})
    ORDER BY visual_aesthetic, feed_style
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
    visual_aesthetic,
    feed_style,
    category,
    mood,
    color_palette,
    color_hex_codes,
    lighting_description,
    mood_description,
    background_style,
    enabled = true,
  } = body || {}

  if (!visual_aesthetic || !feed_style || !category || !mood) {
    return NextResponse.json(
      { error: "visual_aesthetic, feed_style, category, and mood are required." },
      { status: 400 }
    )
  }

  const palette = parseStringArray(color_palette)
  const hexCodes = parseStringArray(color_hex_codes)

  const [row] = await sql`
    INSERT INTO feed_style_definitions (
      visual_aesthetic,
      feed_style,
      category,
      mood,
      color_palette,
      color_hex_codes,
      lighting_description,
      mood_description,
      background_style,
      enabled,
      updated_at
    )
    VALUES (
      ${visual_aesthetic},
      ${feed_style},
      ${category},
      ${mood},
      ${JSON.stringify(palette)}::jsonb,
      ${JSON.stringify(hexCodes)}::jsonb,
      ${lighting_description || null},
      ${mood_description || null},
      ${background_style || null},
      ${Boolean(enabled)},
      NOW()
    )
    ON CONFLICT (visual_aesthetic, feed_style) DO UPDATE SET
      category = EXCLUDED.category,
      mood = EXCLUDED.mood,
      color_palette = EXCLUDED.color_palette,
      color_hex_codes = EXCLUDED.color_hex_codes,
      lighting_description = EXCLUDED.lighting_description,
      mood_description = EXCLUDED.mood_description,
      background_style = EXCLUDED.background_style,
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
    RETURNING *
  `

  return NextResponse.json({ row })
}
