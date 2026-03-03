import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"


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
  const styleId = Number(resolvedParams.id)
  if (!styleId) {
    return NextResponse.json({ error: "Invalid feed style id." }, { status: 400 })
  }

  const [style] = await sql`
    SELECT *
    FROM feed_styles_v2
    WHERE id = ${styleId}
    LIMIT 1
  `

  if (!style) {
    return NextResponse.json({ error: "Feed style not found." }, { status: 404 })
  }

  const scenePrompts = await sql`
    SELECT *
    FROM scene_prompts_v2
    WHERE feed_style_id = ${styleId}
    ORDER BY position ASC, is_primary DESC, id ASC
  `

  const previews = await sql`
    SELECT *
    FROM feed_style_previews_v2
    WHERE feed_style_id = ${styleId}
    ORDER BY is_primary DESC, id ASC
  `

  return NextResponse.json({ style, scenePrompts, previews })
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
  const styleId = Number(resolvedParams.id)
  if (!styleId) {
    return NextResponse.json({ error: "Invalid feed style id." }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const {
    name,
    description,
    preview_prompt,
    preview_prompt_approved,
    preview_test_image_url,
    enabled,
  } = body || {}

  const [row] = await sql`
    UPDATE feed_styles_v2
    SET
      name = COALESCE(${name}, name),
      description = COALESCE(${description}, description),
      preview_prompt = COALESCE(${preview_prompt}, preview_prompt),
      preview_prompt_approved = COALESCE(${preview_prompt_approved}, preview_prompt_approved),
      preview_test_image_url = COALESCE(${preview_test_image_url}, preview_test_image_url),
      enabled = COALESCE(${enabled}, enabled),
      updated_at = NOW()
    WHERE id = ${styleId}
    RETURNING *
  `

  if (!row) {
    return NextResponse.json({ error: "Feed style not found." }, { status: 404 })
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
  const styleId = Number(resolvedParams.id)
  if (!styleId) {
    return NextResponse.json({ error: "Invalid feed style id." }, { status: 400 })
  }

  await sql`
    DELETE FROM feed_styles_v2
    WHERE id = ${styleId}
  `

  return NextResponse.json({ ok: true })
}

export async function POST(
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
  const styleId = Number(resolvedParams.id)
  if (!styleId) {
    return NextResponse.json({ error: "Invalid feed style id." }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const { action } = body || {}

  if (action !== "approve_all") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  }

  const [style] = await sql`
    UPDATE feed_styles_v2
    SET preview_prompt_approved = true, updated_at = NOW()
    WHERE id = ${styleId}
    RETURNING *
  `

  await sql`
    UPDATE scene_prompts_v2
    SET approved = true, updated_at = NOW()
    WHERE feed_style_id = ${styleId}
  `

  await sql`
    UPDATE feed_style_previews_v2
    SET approved = true, updated_at = NOW()
    WHERE feed_style_id = ${styleId}
  `

  return NextResponse.json({ ok: true, style })
}
