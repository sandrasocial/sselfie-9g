import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 })
    }

    const blob = await put(`feedback/${user.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: file.type,
    })

    console.log("[v0] Feedback image uploaded to Blob:", blob.url)

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Error uploading feedback image:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
