// SSELFIE Studio 3.0 — /app gallery (MAYA-REBUILD-05 Phase H).
// Lists the user's generated images from ai_images (the same table /app generation writes to,
// and where her existing SSELFIE shoots already live), newest first. Read-only, isolated.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) return NextResponse.json({ images: [] })

    const rows = await sql`
      SELECT image_url
      FROM ai_images
      WHERE user_id = ${neonUser.id}
        AND image_url IS NOT NULL
        AND (generation_status = 'completed' OR generation_status IS NULL)
      ORDER BY created_at DESC
      LIMIT 60
    `
    const images = rows
      .map((r: { image_url?: unknown }) => r.image_url)
      .filter((u: unknown): u is string => typeof u === "string" && u.startsWith("http"))

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
