import { NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { sql } from "@/lib/db/client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"

export const dynamic = "force-dynamic"

// B8 (Sandra, 2026-07-30): selfie deletion must be REAL, not a support promise. Deletes
// every stored face selfie for the authenticated user — database rows AND the underlying
// blob files. Generated photos are separate assets and are not touched here; the FAQ says
// so explicitly.
export async function DELETE() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) {
    return NextResponse.json({ error: "Account not found" }, { status: 403 })
  }

  try {
    const rows = await sql`
      DELETE FROM user_avatar_images
      WHERE user_id = ${String(neonUserId)} AND image_type = 'selfie'
      RETURNING image_url
    `

    let blobsDeleted = 0
    let blobFailures = 0
    for (const row of rows as { image_url: string }[]) {
      const url = String(row.image_url || "")
      if (!/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(url)) continue
      try {
        await del(url)
        blobsDeleted++
      } catch (e) {
        // A failed blob delete must not be silent: the row is gone, the file may linger.
        blobFailures++
        console.error("[vault-maya delete-selfie] blob delete failed:", url.slice(0, 90), e)
      }
    }

    return NextResponse.json({
      ok: true,
      rowsDeleted: rows.length,
      blobsDeleted,
      blobFailures,
    })
  } catch (e) {
    console.error("[vault-maya delete-selfie] failed:", e)
    return NextResponse.json(
      { error: "Deleting didn't work. Try again, or reply to any email and I'll remove it." },
      { status: 500 },
    )
  }
}
