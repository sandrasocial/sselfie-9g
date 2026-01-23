import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const rows = await sql`
    SELECT
      s.id,
      s.name,
      s.description,
      s.preview_prompt,
      s.preview_prompt_approved,
      s.preview_test_image_url,
      s.enabled,
      (
        SELECT COUNT(*)::int FROM feed_style_previews_v2 p
        WHERE p.feed_style_id = s.id
      ) AS preview_count,
      (
        SELECT COUNT(*)::int FROM feed_style_previews_v2 p
        WHERE p.feed_style_id = s.id AND p.approved = true
      ) AS approved_preview_count,
      (
        SELECT COUNT(*)::int FROM feed_style_previews_v2 p
        WHERE p.feed_style_id = s.id AND p.is_primary = true
      ) AS primary_preview_count,
      (
        SELECT COUNT(*)::int FROM feed_style_previews_v2 p
        WHERE p.feed_style_id = s.id AND p.is_primary = true AND p.approved = true
      ) AS primary_preview_approved,
      (
        SELECT COUNT(*)::int FROM scene_prompts_v2 sp
        WHERE sp.feed_style_id = s.id AND sp.is_primary = true AND sp.approved = true
      ) AS approved_primary_count,
      (
        SELECT COUNT(*)::int FROM scene_prompts_v2 sp
        WHERE sp.feed_style_id = s.id AND sp.is_primary = true
      ) AS primary_count,
      (
        SELECT COUNT(*)::int FROM scene_prompts_v2 sp
        WHERE sp.feed_style_id = s.id AND sp.is_primary = false
      ) AS variation_count
    FROM feed_styles_v2 s
    ORDER BY s.id ASC
  `

  return NextResponse.json({ rows })
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const { name, description, enabled = true } = body || {}

  if (!name || !description) {
    return NextResponse.json({ error: "Name and description are required." }, { status: 400 })
  }

  const [row] = await sql`
    INSERT INTO feed_styles_v2 (name, description, enabled, updated_at)
    VALUES (${name}, ${description}, ${Boolean(enabled)}, NOW())
    RETURNING *
  `

  return NextResponse.json({ row })
}
