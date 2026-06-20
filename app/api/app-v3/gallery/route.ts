// SSELFIE Studio 3.0 — /app gallery (MAYA-REBUILD-05 Phase H).
// Lists the user's generated images from ai_images plus legacy Studio generated_images.
// New /app generation writes ai_images; pre-cutover Studio and trained-model flows may only
// have generated_images rows. Keep this endpoint read-only so migrated members keep their work.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import {
  buildGalleryCounts,
  imageToGalleryAsset,
  sortGalleryAssets,
  videoToGalleryAsset,
  type GalleryVideoRow,
} from "@/lib/app-v3/gallery-assets"
import { getAllUserImages } from "@/lib/data/images"

export const dynamic = "force-dynamic"

const APP_GALLERY_IMAGE_LIMIT = 180
const LEGACY_GALLERY_SCAN_LIMIT = 240

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser)
      return NextResponse.json({
        assets: [],
        counts: buildGalleryCounts([]),
        images: [],
        videos: [],
      })

    const galleryImages = (await getAllUserImages(String(neonUser.id))).slice(
      0,
      APP_GALLERY_IMAGE_LIMIT + LEGACY_GALLERY_SCAN_LIMIT
    )
    const imageAssets = galleryImages
      .map(imageToGalleryAsset)
      .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))

    const videoRows = await sql`
      SELECT id, image_source, video_url, motion_prompt, status, created_at, completed_at
      FROM generated_videos
      WHERE user_id = ${neonUser.id}
        AND status = 'completed'
        AND video_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 30
    `
    const videoAssets = (videoRows as GalleryVideoRow[])
      .map(videoToGalleryAsset)
      .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
    const assets = sortGalleryAssets([...imageAssets, ...videoAssets])
    const images = assets.filter(asset => asset.kind === "image").map(asset => asset.url)
    const videos = assets.filter(asset => asset.kind === "video").map(asset => asset.url)

    return NextResponse.json({ assets, counts: buildGalleryCounts(assets), images, videos })
  } catch (e) {
    console.error("[app-v3 gallery] list failed:", e)
    return NextResponse.json({ assets: [], counts: buildGalleryCounts([]), images: [], videos: [] })
  }
}
