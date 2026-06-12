// SSELFIE Studio 3.0 — reference selfie library (isolated /app endpoint).
// Lists the admin's previously uploaded app-v3 reference selfies so they can reuse one
// without re-uploading. Read-only. Mirrors the upload route's auth + user mapping.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const neonUserId = await getUserIdFromSupabase(user.id)
    if (!neonUserId) return NextResponse.json({ images: [] })

    // All of the user's active FACE selfies (legacy rows included), newest first — so their
    // existing selfies from elsewhere in SSELFIE are reusable here too, not just /app uploads.
    // The optional slots (side-profile/full-body/inspiration) are excluded: a vibe image must
    // never be restored or picked as the member's face.
    const rows = await sql`
      SELECT image_url
      FROM user_avatar_images
      WHERE user_id = ${String(neonUserId)}
        AND is_active = ${true}
        AND (image_type IS NULL OR image_type NOT IN ('side-profile', 'full-body', 'inspiration'))
      ORDER BY uploaded_at DESC
      LIMIT 24
    `
    const images = rows
      .map((r: { image_url?: unknown }) => r.image_url)
      .filter((u: unknown): u is string => typeof u === "string" && u.length > 0)

    // SUITE-UX-02: the optional slots persist too — newest active image per slot, restored
    // alongside the face when Maya opens so nobody re-uploads angles every session.
    const extraRows = await sql`
      SELECT DISTINCT ON (image_type) image_type, image_url
      FROM user_avatar_images
      WHERE user_id = ${String(neonUserId)}
        AND is_active = ${true}
        AND image_type IN ('side-profile', 'full-body', 'inspiration')
      ORDER BY image_type, uploaded_at DESC
    `
    const extras: { sideProfile: string | null; fullBody: string | null; inspiration: string | null } = {
      sideProfile: null,
      fullBody: null,
      inspiration: null,
    }
    for (const r of extraRows as Array<{ image_type?: unknown; image_url?: unknown }>) {
      if (typeof r.image_url !== "string" || r.image_url.length === 0) continue
      if (r.image_type === "side-profile") extras.sideProfile = r.image_url
      else if (r.image_type === "full-body") extras.fullBody = r.image_url
      else if (r.image_type === "inspiration") extras.inspiration = r.image_url
    }

    return NextResponse.json({ images, extras })
  } catch (e) {
    console.error("[app-v3 reference-library] list failed:", e)
    // Never hard-fail the picker; just show it empty.
    return NextResponse.json({ images: [] })
  }
}
