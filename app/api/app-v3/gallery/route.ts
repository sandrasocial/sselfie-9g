// SSELFIE Studio 3.0 — /app gallery (MAYA-REBUILD-05 Phase H).
// Lists the user's generated images from ai_images plus legacy Studio generated_images.
// New /app generation writes ai_images; pre-cutover Studio and trained-model flows may only
// have generated_images rows. Keep this endpoint read-only so migrated members keep their work.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import { mergeGalleryImageUrls } from "@/lib/app-v3/gallery-bridge"
import type { GalleryImageRow, LegacyGeneratedImageRow } from "@/lib/app-v3/gallery-bridge"

export const dynamic = "force-dynamic"

const APP_GALLERY_IMAGE_LIMIT = 180
const LEGACY_GALLERY_SCAN_LIMIT = 240

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) return NextResponse.json({ images: [] })

    const rows = await sql`
      SELECT image_url, created_at
      FROM ai_images
      WHERE user_id = ${neonUser.id}
        AND image_url IS NOT NULL
        AND (generation_status = 'completed' OR generation_status IS NULL)
      ORDER BY created_at DESC
      LIMIT ${APP_GALLERY_IMAGE_LIMIT}
    `
    const legacyRows = await sql`
      SELECT selected_url, image_urls, created_at
      FROM generated_images
      WHERE user_id = ${neonUser.id}
        AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)
      ORDER BY created_at DESC
      LIMIT ${LEGACY_GALLERY_SCAN_LIMIT}
    `
    const images = mergeGalleryImageUrls({
      aiRows: rows as GalleryImageRow[],
      legacyRows: legacyRows as LegacyGeneratedImageRow[],
      limit: APP_GALLERY_IMAGE_LIMIT,
    })

    const videoRows = await sql`
      SELECT video_url
      FROM generated_videos
      WHERE user_id = ${neonUser.id}
        AND status = 'completed'
        AND video_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 30
    `
    const videos = videoRows
      .map((r: { video_url?: unknown }) => r.video_url)
      .filter((u: unknown): u is string => typeof u === "string" && u.startsWith("http"))

    return NextResponse.json({ images, videos })
  } catch (e) {
    console.error("[app-v3 gallery] list failed:", e)
    return NextResponse.json({ images: [] })
  }
}
