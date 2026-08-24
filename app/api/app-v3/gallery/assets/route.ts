import { del } from "@vercel/blob"
import { NextResponse, type NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import { parseGalleryAssetId } from "@/lib/app-v3/gallery-assets"

export const dynamic = "force-dynamic"

const MAX_DELETE_ASSETS = 100
const MAYA_EDIT_HISTORY_REFERENCE = "MAYA_EDIT_HISTORY_REFERENCE"
const MAYA_EDIT_HISTORY_MESSAGE =
  "This photo is part of your Maya edit history. Keep it in your gallery so the original and edited versions stay available."

type GalleryAssetId = NonNullable<ReturnType<typeof parseGalleryAssetId>>

async function isReferencedByMayaEditHistory(asset: GalleryAssetId, userId: string) {
  if (asset.kind !== "ai") return false

  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM ai_images image
      INNER JOIN app_v3_maya_edit_requests request
        ON request.user_id = image.user_id
      WHERE image.id = ${asset.numericId}
        AND image.user_id = ${userId}
        AND (
          request.source_image_id = image.id
          OR request.root_image_id = image.id
          OR request.result_image_id = image.id
        )
    ) AS is_referenced
  `

  return rows[0]?.is_referenced === true
}

function mayaEditHistoryConflict(blockedAssetIds: string[]) {
  return NextResponse.json(
    {
      error: MAYA_EDIT_HISTORY_MESSAGE,
      code: MAYA_EDIT_HISTORY_REFERENCE,
      blockedAssetIds,
    },
    { status: 409 }
  )
}

function isForeignKeyViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23503"
}

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

  // Preflight all Maya-backed images before deleting anything so a mixed bulk request does not
  // partially succeed when one of its images is needed to preserve edit history.
  const blockedAssetIds: string[] = []
  for (const asset of parsedIds) {
    if (await isReferencedByMayaEditHistory(asset, neonUser.id)) {
      blockedAssetIds.push(`ai_${asset.numericId}`)
    }
  }
  if (blockedAssetIds.length > 0) return mayaEditHistoryConflict(blockedAssetIds)

  const deleted: string[] = []

  for (const asset of parsedIds) {
    if (asset.kind === "ai") {
      let result
      try {
        result = await sql`
          DELETE FROM ai_images
          WHERE id = ${asset.numericId}
            AND user_id = ${neonUser.id}
          RETURNING id
        `
      } catch (error) {
        // A Maya edit can be created between the preflight and DELETE. Convert that race into the
        // same member-safe conflict instead of allowing PostgreSQL's FK error to become a 500.
        if (
          isForeignKeyViolation(error) &&
          (await isReferencedByMayaEditHistory(asset, neonUser.id))
        ) {
          return mayaEditHistoryConflict([`ai_${asset.numericId}`])
        }
        throw error
      }
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
