// SSELFIE Studio 3.0 - reference selfie upload (isolated /app endpoint).
// Uploads one selfie to Vercel Blob (public host the OpenAI route allowlists) and records
// it in user_avatar_images for reuse. Returns the blob URL used as referenceImageUrl.

import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import sharp from "sharp"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_BYTES = 12 * 1024 * 1024 // 12MB
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])

// Identity references below this short-side floor visibly degrade likeness (the generation
// pipeline only ever downsizes, never upscales). Inspiration/video slots are exempt —
// they steer style/motion, not her face.
const MIN_IDENTITY_SHORT_SIDE = 512
const IDENTITY_TYPES = new Set(["selfie", "three-quarter", "side-profile", "full-body"])

// SUITE-UX-02: every upload slot persists, each under its own image_type so the
// restore-on-open flow never mixes a vibe image into the face picker.
const SLOT_TO_TYPE: Record<string, string> = {
  face: "selfie",
  angle: "three-quarter",
  side: "side-profile",
  body: "full-body",
  inspiration: "inspiration",
  video: "video-source",
}
// Slots that hold exactly ONE active image: a new upload replaces the old one.
const SINGLE_ACTIVE_TYPES = new Set(["three-quarter", "side-profile", "full-body", "inspiration"])

function blobFolderForImageType(imageType: string): string {
  if (imageType === "inspiration") return "app-v3/inspiration-references"
  if (imageType === "video-source") return "app-v3/video-sources"
  return "app-v3/identity-references"
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let file: File | null = null
  let slot = "face"
  try {
    const form = await request.formData()
    const candidate = form.get("file")
    if (candidate instanceof File) file = candidate
    const rawSlot = form.get("slot")
    if (typeof rawSlot === "string" && rawSlot in SLOT_TO_TYPE) slot = rawSlot
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
  const imageType = SLOT_TO_TYPE[slot]

  if (IDENTITY_TYPES.has(imageType)) {
    try {
      const meta = await sharp(Buffer.from(await file.arrayBuffer())).metadata()
      // min(width, height) is EXIF-rotation-invariant: the short side stays the short side.
      const shortSide = Math.min(meta.width ?? 0, meta.height ?? 0)
      if (shortSide > 0 && shortSide < MIN_IDENTITY_SHORT_SIDE) {
        return NextResponse.json(
          {
            error:
              "This photo is a bit too small for Maya to keep you looking like you. Try a larger, clearer selfie - straight from your camera roll works best.",
            code: "image_too_small",
          },
          { status: 400 }
        )
      }
    } catch {
      // Fail open: an unreadable-but-allowed file shouldn't block the upload here — the
      // generation pipeline normalizes with sharp again and reports its own errors.
    }
  }

  let blob: { url: string }
  try {
    blob = await put(`${blobFolderForImageType(imageType)}/${user.id}-${Date.now()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    })
  } catch (e) {
    console.error("[app-v3 upload] Blob upload failed:", e)
    return NextResponse.json({ error: "Upload failed, please try again" }, { status: 500 })
  }

  // Best-effort: record the image so it survives a page refresh. Face selfies keep their
  // history (the "use a past selfie" picker); the optional slots keep one active image
  // each, so a new upload replaces the old one instead of accumulating.
  // image_type MUST be one of the values allowed by the table's CHECK constraint
  // (migration 60: selfie/lifestyle/mirror/casual/professional/three-quarter/side-profile/full-body/inspiration).
  try {
    const neonUserId = await getUserIdFromSupabase(user.id)
    if (neonUserId && imageType !== "video-source") {
      if (SINGLE_ACTIVE_TYPES.has(imageType)) {
        await sql`
          UPDATE user_avatar_images SET is_active = false
          WHERE user_id = ${String(neonUserId)} AND image_type = ${imageType} AND is_active = true
        `
      }
      await sql`
        INSERT INTO user_avatar_images (user_id, image_url, image_type, is_active, uploaded_at)
        VALUES (${String(neonUserId)}, ${blob.url}, ${imageType}, ${true}, NOW())
      `
    }
  } catch (e) {
    console.error("[app-v3 upload] user_avatar_images insert skipped:", e)
  }

  return NextResponse.json({ url: blob.url })
}

// Clears an optional slot (side profile, full body, inspiration) so "Remove" sticks across
// refreshes. Face selfies are never deleted here - the member replaces those, and history
// stays available in the past-selfie picker.
export async function DELETE(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const slot = request.nextUrl.searchParams.get("slot") ?? ""
  const imageType = SLOT_TO_TYPE[slot]
  if (!imageType || !SINGLE_ACTIVE_TYPES.has(imageType)) {
    return NextResponse.json({ error: "Unknown slot" }, { status: 400 })
  }

  try {
    const neonUserId = await getUserIdFromSupabase(user.id)
    if (neonUserId) {
      await sql`
        UPDATE user_avatar_images SET is_active = false
        WHERE user_id = ${String(neonUserId)} AND image_type = ${imageType} AND is_active = true
      `
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[app-v3 upload] slot clear failed:", e)
    return NextResponse.json({ error: "Could not remove, please try again" }, { status: 500 })
  }
}
