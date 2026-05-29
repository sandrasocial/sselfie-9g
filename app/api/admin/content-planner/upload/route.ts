import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 })
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Please upload an image file." }, { status: 400 })
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large. Maximum size is 8MB." }, { status: 413 })
  }

  const fileName = sanitizeFileName(file.name) || "cover-image"
  const blob = await put(`admin-content-planner/${Date.now()}-${fileName}`, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: true,
  })

  return NextResponse.json({ url: blob.url })
}
