import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getUserIdFromSupabase } from "@/lib/user-mapping"

export async function POST(req: NextRequest) {
  try {
    // Authenticate user (using same pattern as brand-assets route)
    const { createServerClient } = await import("@/lib/supabase/server")
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error("[SCENE-COMPOSER] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUserId = await getUserIdFromSupabase(user.id)
    
    if (!neonUserId) {
      console.error("[SCENE-COMPOSER] User mapping failed for:", user.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get("file") as File
    const label = formData.get("label") as string

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    if (!label || label.trim().length === 0) {
      return NextResponse.json({ error: "Product label is required" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      )
    }

    console.log("[SCENE-COMPOSER] Uploading product image:", {
      userId: neonUserId,
      label,
      fileName: file.name,
      fileSize: file.size,
    })

    // Upload to Vercel Blob
    let blob
    try {
      blob = await put(
        `scene-composer/${neonUserId}/${Date.now()}-${file.name}`,
        file,
        {
          access: "public",
          contentType: file.type,
          addRandomSuffix: true,
        }
      )
    } catch (blobError) {
      console.error("[SCENE-COMPOSER] Vercel Blob upload error:", blobError)
      return NextResponse.json(
        { 
          error: "Failed to upload to storage",
          details: blobError instanceof Error ? blobError.message : "Storage upload failed"
        },
        { status: 500 }
      )
    }

    if (!blob || !blob.url) {
      console.error("[SCENE-COMPOSER] Blob upload returned invalid response:", blob)
      return NextResponse.json(
        { 
          error: "Upload completed but no URL returned",
          details: "Please try again"
        },
        { status: 500 }
      )
    }

    console.log("[SCENE-COMPOSER] Product image uploaded:", blob.url)

    return NextResponse.json({
      success: true,
      url: blob.url,
      label: label.trim(),
    })
  } catch (error) {
    console.error("[SCENE-COMPOSER] Error uploading product:", error)
    console.error("[SCENE-COMPOSER] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      { 
        error: "Failed to upload product image",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
