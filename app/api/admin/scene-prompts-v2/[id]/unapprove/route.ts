import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
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
    UPDATE scene_prompts_v2
    SET approved = false, updated_at = NOW()
    WHERE id = ${promptId}
    RETURNING *
  `

  if (!row) {
    return NextResponse.json({ error: "Scene prompt not found." }, { status: 404 })
  }

  return NextResponse.json({ row })
}
