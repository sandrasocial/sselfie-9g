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

async function findMayaReferencedAssetIds(assets: GalleryAssetId[], userId: string) {
  const aiImageIds = [
    ...new Set(assets.filter(asset => asset.kind === "ai").map(asset => asset.numericId)),
  ]
  if (aiImageIds.length === 0) return []

  const rows = await sql`
    SELECT DISTINCT image.id
    FROM ai_images image
    INNER JOIN app_v3_maya_edit_requests request
      ON request.user_id = image.user_id
    WHERE image.user_id = ${userId}
      AND image.id = ANY(${aiImageIds}::int[])
      AND (
        request.source_image_id = image.id
        OR request.root_image_id = image.id
        OR request.result_image_id = image.id
      )
  `

  const referencedIds = new Set(rows.map(row => Number(row.id)))
  return aiImageIds.filter(id => referencedIds.has(id)).map(id => `ai_${id}`)
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
  const blockedAssetIds = await findMayaReferencedAssetIds(parsedIds, neonUser.id)
  if (blockedAssetIds.length > 0) return mayaEditHistoryConflict(blockedAssetIds)

  let deletionRows
  try {
    // Keep every database mutation in one transaction. If a Maya reference is created after the
    // preflight, its FK rejection rolls back the complete mixed batch before we return a 409.
    deletionRows = await sql.transaction(tx =>
      parsedIds.map(asset => {
        if (asset.kind === "ai") {
          return tx`
          DELETE FROM ai_images
          WHERE id = ${asset.numericId}
            AND user_id = ${neonUser.id}
          RETURNING id
        `
        }

        if (asset.kind === "gen") {
          return tx`
        DELETE FROM generated_images
        WHERE id = ${asset.numericId}
          AND user_id = ${neonUser.id}
        RETURNING id
      `
        }

        return tx`
        WITH owned_video AS (
          SELECT id, video_url
          FROM generated_videos
          WHERE id = ${asset.numericId}
            AND user_id = ${neonUser.id}
        ), deleted_video AS (
          DELETE FROM generated_videos video
          USING owned_video
          WHERE video.id = owned_video.id
          RETURNING video.id
        )
        SELECT owned_video.id, owned_video.video_url
        FROM owned_video
        WHERE EXISTS (SELECT 1 FROM deleted_video)
      `
      })
    )
  } catch (error) {
    // A Maya edit can be created between preflight and DELETE. The failed transaction has already
    // rolled back the full batch; now identify the raced asset(s) for the member-safe response.
    if (isForeignKeyViolation(error)) {
      const racedAssetIds = await findMayaReferencedAssetIds(parsedIds, neonUser.id)
      if (racedAssetIds.length > 0) return mayaEditHistoryConflict(racedAssetIds)
    }
    throw error
  }

  const deleted: string[] = []
  const deletedVideoUrls: string[] = []
  parsedIds.forEach((asset, index) => {
    const rows = deletionRows[index]
    if (!rows || rows.length === 0) return
    deleted.push(`${asset.kind}_${asset.numericId}`)
    const videoUrl = rows[0]?.video_url
    if (asset.kind === "video" && typeof videoUrl === "string" && videoUrl.startsWith("http")) {
      deletedVideoUrls.push(videoUrl)
    }
  })

  await Promise.all(
    deletedVideoUrls.map(videoUrl =>
      del(videoUrl).catch(error => {
        console.warn("[app-v3 gallery] video blob delete failed:", error)
      })
    )
  )

  return NextResponse.json({ success: true, deleted })
}
