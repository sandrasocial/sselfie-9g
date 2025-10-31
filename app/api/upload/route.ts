import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

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

    let formData: FormData | null = null
    try {
      formData = await request.formData()
    } catch (formDataError) {
      console.log("[v0] FormData parsing failed, will try JSON")
      // FormData parsing failed, continue to JSON parsing below
    }

    if (formData) {
      const file = formData.get("file") || formData.get("image")

      console.log(
        "[v0] FormData file:",
        file ? "present" : "missing",
        file instanceof File ? "File" : file instanceof Blob ? "Blob" : typeof file,
      )

      if (file && (file instanceof File || file instanceof Blob)) {
        const fileName = file instanceof File ? file.name : `upload-${Date.now()}.png`
        const fileSize = file.size

        console.log("[v0] Uploading file to Blob:", fileName, "Size:", fileSize, "bytes")

        const maxSize = 500 * 1024 * 1024 // 500MB limit (Vercel Blob free/hobby tier limit)
        if (fileSize > maxSize) {
          console.error("[v0] File too large:", fileSize, "bytes")
          return NextResponse.json(
            {
              error: `File too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum size is 500MB.`,
              suggestion:
                "For videos larger than 500MB, please upload to YouTube (unlisted) or Vimeo and paste the video URL instead. This provides better streaming and no file size limits.",
            },
            { status: 413 },
          )
        }

        try {
          const blob = await put(`uploads/${neonUser.id}/${Date.now()}-${fileName}`, file, {
            access: "public",
          })

          console.log("[v0] File uploaded to Blob successfully:", blob.url)
          return NextResponse.json({ url: blob.url })
        } catch (blobError) {
          console.error("[v0] Blob upload failed:", blobError)

          const errorMessage = blobError instanceof Error ? blobError.message : String(blobError)

          // Check if it's a file size error from Vercel Blob
          if (errorMessage.includes("too large") || errorMessage.includes("Entity Too Large")) {
            return NextResponse.json(
              {
                error: "File exceeds Vercel Blob's size limit (500MB)",
                suggestion:
                  "Please upload your video to YouTube (unlisted) or Vimeo and paste the video URL instead. This provides better streaming and no file size limits.",
              },
              { status: 413 },
            )
          }

          return NextResponse.json(
            {
              error: "Failed to upload file to storage",
              details: errorMessage,
              suggestion: "For large videos, consider using YouTube (unlisted) or Vimeo instead.",
            },
            { status: 500 },
          )
        }
      }

      console.error("[v0] No valid file found in FormData")
      return NextResponse.json({ error: "No valid file provided in FormData" }, { status: 400 })
    }

    if (contentType?.includes("application/json")) {
      try {
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
      } catch (jsonError) {
        console.error("[v0] JSON parsing or upload failed:", jsonError)
        return NextResponse.json(
          {
            error: "Failed to process JSON upload",
            details: jsonError instanceof Error ? jsonError.message : String(jsonError),
          },
          { status: 500 },
        )
      }
    }

    console.error("[v0] Upload failed: No valid file or image data found")
    return NextResponse.json({ error: "No valid file or image data provided" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Unexpected error in upload endpoint:", error)
    return NextResponse.json(
      { error: "Failed to upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
