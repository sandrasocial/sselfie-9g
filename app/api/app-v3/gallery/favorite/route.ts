import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import { parseGalleryAssetId } from "@/lib/app-v3/gallery-assets"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as {
    assetId?: unknown
    isFavorite?: unknown
  } | null
  const parsed = parseGalleryAssetId(body?.assetId)
  if (!parsed || parsed.kind === "video") {
    return NextResponse.json({ error: "Invalid favorite asset" }, { status: 400 })
  }
  if (typeof body?.isFavorite !== "boolean") {
    return NextResponse.json({ error: "Invalid favorite state" }, { status: 400 })
  }

  const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
  const neonUser = await getEffectiveNeonUser(user.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  if (parsed.kind === "ai") {
    const updated = await sql`
      UPDATE ai_images
      SET is_favorite = ${body.isFavorite}
      WHERE id = ${parsed.numericId}
        AND user_id = ${neonUser.id}
      RETURNING id
    `
    if (updated.length === 0)
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  }

  const updated = await sql`
    UPDATE generated_images
    SET saved = ${body.isFavorite}
    WHERE id = ${parsed.numericId}
      AND user_id = ${neonUser.id}
    RETURNING id
  `
  if (updated.length === 0) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
