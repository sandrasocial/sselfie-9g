import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { imageBlob, highlightId } = await request.json()

    // Convert base64 to blob
    const base64Data = imageBlob.split(",")[1]
    const buffer = Buffer.from(base64Data, "base64")
    const blob = new Blob([buffer], { type: "image/png" })

    // Upload to Vercel Blob
    const uploadedBlob = await put(`maya-generations/highlight-${highlightId}.png`, blob, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: true,
    })

    return NextResponse.json({ url: uploadedBlob.url })
  } catch (error) {
    console.error("[v0] Error uploading highlight overlay:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
