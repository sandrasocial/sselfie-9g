import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAdmin } from "@/lib/admin-feature-flags"

const sql = neon(process.env.DATABASE_URL!)

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
  const fashionStyle = searchParams.get("fashion_style")

  const rows = await sql`
    SELECT *
    FROM feed_position_templates
    WHERE (${visualAesthetic}::text IS NULL OR visual_aesthetic = ${visualAesthetic})
      AND (${feedStyle}::text IS NULL OR feed_style = ${feedStyle})
      AND (${fashionStyle}::text IS NULL OR fashion_style = ${fashionStyle})
    ORDER BY visual_aesthetic, feed_style, fashion_style, position
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
    fashion_style,
    position,
    activity,
    outfit_description,
    location_type,
    location_description,
    camera_framing,
    objects,
    lighting_type,
    pose_description,
    narrative,
    final_prompt_override,
    approved = false,
    last_tested_at,
    test_image_url,
  } = body || {}

  if (!visual_aesthetic || !feed_style || !fashion_style || !position) {
    return NextResponse.json(
      { error: "visual_aesthetic, feed_style, fashion_style, and position are required." },
      { status: 400 }
    )
  }

  const [row] = await sql`
    INSERT INTO feed_position_templates (
      visual_aesthetic,
      feed_style,
      fashion_style,
      position,
      activity,
      outfit_description,
      location_type,
      location_description,
      camera_framing,
      objects,
      lighting_type,
      pose_description,
      narrative,
      final_prompt_override,
      approved,
      last_tested_at,
      test_image_url,
      updated_at
    )
    VALUES (
      ${visual_aesthetic},
      ${feed_style},
      ${fashion_style},
      ${position},
      ${activity || null},
      ${outfit_description || null},
      ${location_type || null},
      ${location_description || null},
      ${camera_framing || null},
      ${JSON.stringify(objects || [])}::jsonb,
      ${lighting_type || null},
      ${pose_description || null},
      ${narrative || null},
      ${final_prompt_override || null},
      ${Boolean(approved)},
      ${last_tested_at || null},
      ${test_image_url || null},
      NOW()
    )
    ON CONFLICT (visual_aesthetic, feed_style, fashion_style, position) DO UPDATE SET
      activity = EXCLUDED.activity,
      outfit_description = EXCLUDED.outfit_description,
      location_type = EXCLUDED.location_type,
      location_description = EXCLUDED.location_description,
      camera_framing = EXCLUDED.camera_framing,
      objects = EXCLUDED.objects,
      lighting_type = EXCLUDED.lighting_type,
      pose_description = EXCLUDED.pose_description,
      narrative = EXCLUDED.narrative,
      final_prompt_override = EXCLUDED.final_prompt_override,
      approved = EXCLUDED.approved,
      last_tested_at = EXCLUDED.last_tested_at,
      test_image_url = EXCLUDED.test_image_url,
      updated_at = NOW()
    RETURNING *
  `

  return NextResponse.json({ row })
}
