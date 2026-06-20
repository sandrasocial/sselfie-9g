import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { getDbClient } from "@/lib/db/client"

const sql = getDbClient()
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"

function parseAssetId(value: string | null): number | null {
  if (!value) return null
  const normalized = value.startsWith("ai_") ? value.slice(3) : value
  if (!/^\d+$/.test(normalized)) return null
  return Number(normalized)
}

export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = parseAssetId(request.nextUrl.searchParams.get("id"))
  if (!id) {
    return NextResponse.json({ error: "A valid image id is required" }, { status: 400 })
  }

  const rows = (await sql`
    SELECT id, image_url, prompt, generated_prompt, prediction_id, source, category, created_at
    FROM ai_images
    WHERE id = ${id}
    LIMIT 1
  `) as Array<{
    id: number
    image_url: string | null
    prompt: string | null
    generated_prompt: string | null
    prediction_id: string | null
    source: string | null
    category: string | null
    created_at: string | Date | null
  }>

  const row = rows[0]
  if (!row) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: row.id,
    assetId: `ai_${row.id}`,
    imageUrl: row.image_url,
    prompt: row.generated_prompt || row.prompt || "",
    source: row.source,
    category: row.category,
    predictionId: row.prediction_id,
    modelProvider: "openai",
    model: OPENAI_IMAGE_MODEL,
    createdAt: row.created_at,
  })
}
