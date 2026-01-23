import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
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
  const promptId = Number(resolvedParams.id)
  if (!promptId) {
    return NextResponse.json({ error: "Invalid scene prompt id." }, { status: 400 })
  }

  const [row] = await sql`
    SELECT *
    FROM scene_prompts_v2
    WHERE id = ${promptId}
    LIMIT 1
  `

  if (!row) {
    return NextResponse.json({ error: "Scene prompt not found." }, { status: 404 })
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
  const promptId = Number(resolvedParams.id)
  if (!promptId) {
    return NextResponse.json({ error: "Invalid scene prompt id." }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const { prompt_text, approved, variation_name, test_image_url, variation_id } = body || {}

  const [row] = await sql`
    UPDATE scene_prompts_v2
    SET
      prompt_text = COALESCE(${prompt_text}, prompt_text),
      approved = COALESCE(${approved}, approved),
      variation_name = COALESCE(${variation_name}, variation_name),
      variation_id = COALESCE(${variation_id ? Number(variation_id) : null}, variation_id),
      test_image_url = COALESCE(${test_image_url}, test_image_url),
      updated_at = NOW()
    WHERE id = ${promptId}
    RETURNING *
  `

  if (!row) {
    return NextResponse.json({ error: "Scene prompt not found." }, { status: 404 })
  }

  return NextResponse.json({ row })
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
  const promptId = Number(resolvedParams.id)
  if (!promptId) {
    return NextResponse.json({ error: "Invalid scene prompt id." }, { status: 400 })
  }

  await sql`
    DELETE FROM scene_prompts_v2
    WHERE id = ${promptId} AND is_primary = false
  `

  return NextResponse.json({ ok: true })
}
