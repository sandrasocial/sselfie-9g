import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAdmin } from "@/lib/admin-feature-flags"

const sql = neon(process.env.DATABASE_URL!)

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
    SELECT * FROM feed_position_templates WHERE id = ${id} LIMIT 1
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
    SELECT * FROM feed_position_templates WHERE id = ${id} LIMIT 1
  `

  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const merged = { ...current, ...body }
  const objects = body?.objects !== undefined ? body.objects : current.objects || []

  const [row] = await sql`
    UPDATE feed_position_templates
    SET
      visual_aesthetic = ${merged.visual_aesthetic},
      feed_style = ${merged.feed_style},
      fashion_style = ${merged.fashion_style},
      position = ${merged.position},
      activity = ${merged.activity || null},
      outfit_description = ${merged.outfit_description || null},
      location_type = ${merged.location_type || null},
      location_description = ${merged.location_description || null},
      camera_framing = ${merged.camera_framing || null},
      objects = ${JSON.stringify(objects || [])}::jsonb,
      lighting_type = ${merged.lighting_type || null},
      pose_description = ${merged.pose_description || null},
      narrative = ${merged.narrative || null},
      final_prompt_override = ${merged.final_prompt_override || null},
      approved = ${Boolean(merged.approved)},
      last_tested_at = ${merged.last_tested_at || null},
      test_image_url = ${merged.test_image_url || null},
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
    DELETE FROM feed_position_templates WHERE id = ${id} RETURNING *
  `

  return NextResponse.json({ row })
}
