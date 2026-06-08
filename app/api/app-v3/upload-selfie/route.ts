// SSELFIE Studio 3.0 — reference selfie upload (isolated /app endpoint).
// Uploads one selfie to Vercel Blob (public host the OpenAI route allowlists) and records
// it in user_avatar_images for reuse. Returns the blob URL used as referenceImageUrl.

import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_BYTES = 12 * 1024 * 1024 // 12MB
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let file: File | null = null
  try {
    const form = await request.formData()
    const candidate = form.get("file")
    if (candidate instanceof File) file = candidate
  } catch {
    return NextResponse.json({ error: "Expected multipart form-data with a 'file' field" }, { status: 400 })
  }

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 12MB)" }, { status: 400 })
  }

  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg"
  let blob: { url: string }
  try {
    blob = await put(`app-v3/reference-selfies/${user.id}-${Date.now()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    })
  } catch (e) {
    console.error("[app-v3 upload] Blob upload failed:", e)
    return NextResponse.json({ error: "Upload failed, please try again" }, { status: 500 })
  }

  // Best-effort: record as the active reference selfie. Never block the upload if this fails.
  try {
    const neonUserId = await getUserIdFromSupabase(user.id)
    if (neonUserId) {
      await sql`
        INSERT INTO user_avatar_images (user_id, image_url, image_type, is_active, uploaded_at)
        VALUES (${String(neonUserId)}, ${blob.url}, ${"app_v3_reference"}, ${true}, NOW())
      `
    }
  } catch (e) {
    console.error("[app-v3 upload] user_avatar_images insert skipped:", e)
  }

  return NextResponse.json({ url: blob.url })
}
