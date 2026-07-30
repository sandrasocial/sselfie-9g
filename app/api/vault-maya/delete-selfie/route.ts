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
      SELECT id, image_url FROM user_avatar_images
      WHERE user_id = ${String(neonUserId)} AND image_type = 'selfie'
    `

    let blobsDeleted = 0
    const failedBlobDeletes: string[] = []
    for (const row of rows as { id: string | number; image_url: string }[]) {
      const url = String(row.image_url || "")
      if (!/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(url)) {
        failedBlobDeletes.push(url)
        continue
      }
      try {
        await del(url)
        blobsDeleted++
      } catch (e) {
        // Keep the database row so the member can retry and we retain the exact file pointer.
        failedBlobDeletes.push(url)
        console.error("[vault-maya delete-selfie] blob delete failed:", url.slice(0, 90), e)
      }
    }

    if (failedBlobDeletes.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Deleting didn't finish, so your selfie is still listed in your studio. Please try again. If it still doesn't work, reply to any email and I'll help.",
          blobsDeleted,
          blobFailures: failedBlobDeletes.length,
        },
        { status: 502 },
      )
    }

    const rowIds = (rows as { id: string | number }[]).map((row) => row.id)
    if (rowIds.length > 0) {
      await sql`
        DELETE FROM user_avatar_images
        WHERE user_id = ${String(neonUserId)}
          AND id = ANY(${rowIds})
      `
    }

    return NextResponse.json({
      ok: true,
      rowsDeleted: rows.length,
      blobsDeleted,
      blobFailures: 0,
    })
  } catch (e) {
    console.error("[vault-maya delete-selfie] failed:", e)
    return NextResponse.json(
      { error: "Deleting didn't work. Try again, or reply to any email and I'll remove it." },
      { status: 500 },
    )
  }
}
