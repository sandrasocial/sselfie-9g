import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-sync"

export async function POST(request: Request) {
  try {
    console.log("[v0] Upload endpoint called")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.error("[v0] Upload failed: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.error("[v0] Upload failed: User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const contentType = request.headers.get("content-type")
    console.log("[v0] Content-Type:", contentType)

    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") || formData.get("image")

      console.log(
        "[v0] FormData file:",
        file ? "present" : "missing",
        file instanceof File ? "File" : file instanceof Blob ? "Blob" : typeof file,
      )

      if (!file) {
        console.error("[v0] Upload failed: No file in FormData")
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      // Handle both File and Blob objects
      if (file instanceof File || file instanceof Blob) {
        const fileName = file instanceof File ? file.name : `upload-${Date.now()}.png`
        const blob = await put(`uploads/${neonUser.id}/${Date.now()}-${fileName}`, file, {
          access: "public",
        })

        console.log("[v0] File uploaded to Blob:", blob.url)
        return NextResponse.json({ url: blob.url })
      } else {
        console.error("[v0] Upload failed: Invalid file type")
        return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
      }
    }
    // </CHANGE>

    if (contentType?.includes("application/json")) {
      const body = await request.json()
      const { image } = body

      console.log("[v0] JSON image:", image ? "present" : "missing", image?.substring(0, 50))

      if (!image || !image.startsWith("data:image/")) {
        console.error("[v0] Upload failed: Invalid image data")
        return NextResponse.json({ error: "Invalid image data" }, { status: 400 })
      }

      // Extract base64 data and convert to buffer
      const base64Data = image.split(",")[1]
      const buffer = Buffer.from(base64Data, "base64")

      // Determine file extension from mime type
      const mimeType = image.split(";")[0].split(":")[1]
      const extension = mimeType.split("/")[1]

      const blob = await put(`uploads/${neonUser.id}/${Date.now()}.${extension}`, buffer, {
        access: "public",
        contentType: mimeType,
      })

      console.log("[v0] Base64 image uploaded to Blob:", blob.url)
      return NextResponse.json({ url: blob.url })
    }
    // </CHANGE>

    console.error("[v0] Upload failed: Unsupported content type:", contentType)
    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error uploading image:", error)
    return NextResponse.json(
      { error: "Failed to upload image", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
