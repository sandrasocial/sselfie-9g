import { del } from "@vercel/blob"
import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import { parseGalleryAssetId } from "@/lib/app-v3/gallery-assets"

export const dynamic = "force-dynamic"

const MAX_DELETE_ASSETS = 100

export async function DELETE(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { assetIds?: unknown } | null
  const assetIds = Array.isArray(body?.assetIds) ? body.assetIds : []
  const parsedIds = assetIds
    .map(parseGalleryAssetId)
    .filter((id): id is NonNullable<typeof id> => Boolean(id))
    .slice(0, MAX_DELETE_ASSETS)

  if (parsedIds.length === 0) {
    return NextResponse.json({ error: "No valid assets selected" }, { status: 400 })
  }

  const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
  const neonUser = await getEffectiveNeonUser(user.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const deleted: string[] = []

  for (const asset of parsedIds) {
    if (asset.kind === "ai") {
      const result = await sql`
        DELETE FROM ai_images
        WHERE id = ${asset.numericId}
          AND user_id = ${neonUser.id}
        RETURNING id
      `
      if (result.length > 0) deleted.push(`ai_${asset.numericId}`)
      continue
    }

    if (asset.kind === "gen") {
      const result = await sql`
        DELETE FROM generated_images
        WHERE id = ${asset.numericId}
          AND user_id = ${neonUser.id}
        RETURNING id
      `
      if (result.length > 0) deleted.push(`gen_${asset.numericId}`)
      continue
    }

    const videoRows = await sql`
      SELECT video_url
      FROM generated_videos
      WHERE id = ${asset.numericId}
        AND user_id = ${neonUser.id}
      LIMIT 1
    `
    if (videoRows.length === 0) continue

    const videoUrl = videoRows[0]?.video_url
    if (typeof videoUrl === "string" && videoUrl.startsWith("http")) {
      await del(videoUrl).catch(error => {
        console.warn("[app-v3 gallery] video blob delete failed:", error)
      })
    }

    const result = await sql`
      DELETE FROM generated_videos
      WHERE id = ${asset.numericId}
        AND user_id = ${neonUser.id}
      RETURNING id
    `
    if (result.length > 0) deleted.push(`video_${asset.numericId}`)
  }

  return NextResponse.json({ success: true, deleted })
}
