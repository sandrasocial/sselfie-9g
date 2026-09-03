// Shared image upload used by the legacy Maya surfaces (/maya, /studio, /feed-planner)
// and the app-v3 concept card. Every caller sits behind an auth-gated page, so this
// endpoint authenticates too: it was previously open to the internet with no type or
// size limit, which made it an unbounded write into the Blob store and let anyone host
// arbitrary files on a SSELFIE URL.

import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_BYTES = 12 * 1024 * 1024 // 12MB — matches app-v3/upload-selfie
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
])

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const candidate = formData.get("file")

    if (!(candidate instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const file = candidate

    if (file.size === 0) {
      return NextResponse.json({ error: "That file is empty" }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "That image is larger than 12MB. Please upload a smaller one." },
        { status: 413 }
      )
    }

    const contentType = (file.type || "").toLowerCase()
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Please upload a JPG, PNG, or WebP image." },
        { status: 415 }
      )
    }

    // The blob key is derived server-side. A client-supplied filename let callers choose
    // the public path (and its extension) on a SSELFIE-branded URL.
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType] || "jpg"
    const blob = await put(`uploads/${user.id}/${Date.now()}.${extension}`, file, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[upload-image] Upload failed:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
