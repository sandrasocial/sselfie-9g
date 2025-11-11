import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

export async function POST(request: Request): Promise<NextResponse> {
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

    if (contentType?.includes("application/json")) {
      try {
        // Clone the request to peek at the body
        const clonedRequest = request.clone()
        const bodyText = await clonedRequest.text()

        // Check if this looks like a client upload token request
        if (
          bodyText.includes('"type"') &&
          (bodyText.includes('"blob-upload-token') || bodyText.includes("multipart"))
        ) {
          console.log("[v0] Detected client upload token request")

          const body = JSON.parse(bodyText) as HandleUploadBody

          const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
              console.log("[v0] Generating upload token for:", pathname)

              // Validate file path belongs to the user
              if (!pathname.startsWith(`training/${neonUser.id}/`)) {
                throw new Error("Invalid upload path")
              }

              return {
                allowedContentTypes: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
                maximumSizeInBytes: 10 * 1024 * 1024, // 10MB per image
              }
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
              console.log("[v0] Upload completed:", blob.url)
            },
          })

          console.log("[v0] Token generated successfully")
          return NextResponse.json(jsonResponse)
        }

        // If not a token request, try base64 image upload
        const jsonBody = JSON.parse(bodyText)
        const { image } = jsonBody

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
        console.error("[v0] JSON processing failed:", jsonError)
        return NextResponse.json(
          {
            error: "Failed to process request",
            details: jsonError instanceof Error ? jsonError.message : String(jsonError),
          },
          { status: 500 },
        )
      }
    }

    // Try FormData upload
    let formData: FormData | null = null
    try {
      formData = await request.formData()
    } catch (formDataError) {
      console.log("[v0] FormData parsing failed")
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

        const maxSize = 500 * 1024 * 1024 // 500MB limit
        if (fileSize > maxSize) {
          console.error("[v0] File too large:", fileSize, "bytes")
          return NextResponse.json(
            {
              error: `File too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum size is 500MB.`,
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
          return NextResponse.json(
            {
              error: "Failed to upload file to storage",
              details: blobError instanceof Error ? blobError.message : String(blobError),
            },
            { status: 500 },
          )
        }
      }

      console.error("[v0] No valid file found in FormData")
      return NextResponse.json({ error: "No valid file provided in FormData" }, { status: 400 })
    }

    console.error("[v0] Upload failed: No valid request format")
    return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Unexpected error in upload endpoint:", error)
    return NextResponse.json(
      { error: "Failed to upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
