import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const resolvedParams = await Promise.resolve(params)
  const previewId = Number(resolvedParams.id)
  if (!previewId) {
    return NextResponse.json({ error: "Invalid preview id." }, { status: 400 })
  }

  const [row] = await sql`
    SELECT *
    FROM feed_style_previews_v2
    WHERE id = ${previewId}
    LIMIT 1
  `

  if (!row) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 })
  }

  return NextResponse.json({ row })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const resolvedParams = await Promise.resolve(params)
  const previewId = Number(resolvedParams.id)
  if (!previewId) {
    return NextResponse.json({ error: "Invalid preview id." }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const { name, prompt_text, approved, is_primary, test_image_url, variation_id } = body || {}

  if (is_primary) {
    const [row] = await sql`
      SELECT feed_style_id, variation_id FROM feed_style_previews_v2 WHERE id = ${previewId} LIMIT 1
    `
    if (row?.feed_style_id) {
      await sql`
        UPDATE feed_style_previews_v2
        SET is_primary = false
        WHERE feed_style_id = ${row.feed_style_id}
          AND (${variation_id ? Number(variation_id) : row.variation_id}::int IS NULL OR variation_id = ${
            variation_id ? Number(variation_id) : row.variation_id
          })
      `
    }
  }

  const [updated] = await sql`
    UPDATE feed_style_previews_v2
    SET
      name = COALESCE(${name}, name),
      prompt_text = COALESCE(${prompt_text}, prompt_text),
      approved = COALESCE(${approved}, approved),
      is_primary = COALESCE(${is_primary}, is_primary),
      test_image_url = COALESCE(${test_image_url}, test_image_url),
      variation_id = COALESCE(${variation_id ? Number(variation_id) : null}, variation_id),
      updated_at = NOW()
    WHERE id = ${previewId}
    RETURNING *
  `

  if (!updated) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 })
  }

  return NextResponse.json({ row: updated })
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const resolvedParams = await Promise.resolve(params)
  const previewId = Number(resolvedParams.id)
  if (!previewId) {
    return NextResponse.json({ error: "Invalid preview id." }, { status: 400 })
  }

  await sql`
    DELETE FROM feed_style_previews_v2
    WHERE id = ${previewId} AND is_primary = false
  `

  return NextResponse.json({ ok: true })
}
