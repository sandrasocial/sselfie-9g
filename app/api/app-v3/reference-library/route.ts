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

    // All of the user's active reference selfies (any type), newest first — so their
    // existing selfies from elsewhere in SSELFIE are reusable here too, not just /app uploads.
    const rows = await sql`
      SELECT image_url
      FROM user_avatar_images
      WHERE user_id = ${String(neonUserId)}
        AND is_active = ${true}
      ORDER BY uploaded_at DESC
      LIMIT 24
    `
    const images = rows
      .map((r: { image_url?: unknown }) => r.image_url)
      .filter((u: unknown): u is string => typeof u === "string" && u.length > 0)

    return NextResponse.json({ images })
  } catch (e) {
    console.error("[app-v3 reference-library] list failed:", e)
    // Never hard-fail the picker; just show it empty.
    return NextResponse.json({ images: [] })
  }
}
