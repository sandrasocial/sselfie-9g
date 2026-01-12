import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]

    // Simplified: Only authenticated users (matches Pro Mode pattern)
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to upload images." },
        { status: 401 },
      )
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userId = neonUser.id
    console.log("[Blueprint] Using user_id from auth session for upload:", userId)

    // Simplified: Only authenticated users can upload (no email-only flow)
    // This matches Pro Mode image library pattern
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to upload images." },
        { status: 401 },
      )
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Limit to 3 files max
    if (files.length > 3) {
      return NextResponse.json({ error: "Maximum 3 files allowed" }, { status: 400 })
    }

    const imageUrls: string[] = []

    // Helper function to sanitize filename for Vercel Blob storage
    // Vercel Blob requires alphanumeric characters, hyphens, underscores, dots, and slashes only
    const sanitizeFilename = (filename: string): string => {
      // Get file extension (including the dot)
      const lastDotIndex = filename.lastIndexOf('.')
      const hasExtension = lastDotIndex > 0 && lastDotIndex < filename.length - 1
      const extension = hasExtension ? filename.substring(lastDotIndex) : '.jpg'
      const baseName = hasExtension ? filename.substring(0, lastDotIndex) : filename
      
      // Remove all special characters except alphanumeric, hyphens, and underscores
      // Replace spaces and special chars with hyphens
      const sanitized = baseName
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 100) // Limit length
      
      // Ensure we always have a valid filename
      const finalName = sanitized || 'image'
      return `${finalName}${extension}`
    }

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: `Invalid file type: ${file.name}. Only images are allowed.` }, { status: 400 })
      }

      // Check for HEIC/HEIF files (not supported by web browsers)
      const isHEIC = file.type === "image/heic" || 
                     file.type === "image/heif" ||
                     file.name.toLowerCase().endsWith(".heic") ||
                     file.name.toLowerCase().endsWith(".heif")
      
      if (isHEIC) {
        return NextResponse.json({ 
          error: `${file.name} is in HEIC format which is not supported. Please convert to JPG or PNG first.` 
        }, { status: 400 })
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File too large: ${file.name}. Maximum 10MB per image.` }, { status: 400 })
      }

      // Sanitize filename to prevent pattern mismatch errors
      const sanitizedFilename = sanitizeFilename(file.name)
      const blobPath = `blueprint-selfies/${Date.now()}-${sanitizedFilename}`

      // Upload to Vercel Blob with sanitized filename
      const blob = await put(blobPath, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
      })

      imageUrls.push(blob.url)
    }

    console.log(`[Blueprint] Uploaded ${imageUrls.length} selfie(s) to Blob`)

    // Simplified: Only save to user_avatar_images (same as Pro Mode)
    // This is the single source of truth for reference images
    try {
      // Get current max display_order for this user
      const maxOrderResult = await sql`
        SELECT COALESCE(MAX(display_order), 0) as max_order
        FROM user_avatar_images
        WHERE user_id = ${userId}
      `
      const maxOrder = maxOrderResult[0]?.max_order || 0

      // Insert each new image URL into user_avatar_images
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i]
        
        // Check if this URL already exists for this user
        const existingAvatar = await sql`
          SELECT id FROM user_avatar_images
          WHERE user_id = ${userId} AND image_url = ${imageUrl}
          LIMIT 1
        `

        if (existingAvatar.length === 0) {
          // Insert new avatar image
          await sql`
            INSERT INTO user_avatar_images (
              user_id,
              image_url,
              image_type,
              display_order,
              is_active,
              uploaded_at
            )
            VALUES (
              ${userId},
              ${imageUrl},
              'selfie',
              ${maxOrder + i + 1},
              true,
              NOW()
            )
          `
          console.log("[Blueprint] Saved selfie to user_avatar_images:", imageUrl)
        } else {
          console.log("[Blueprint] Selfie already exists in user_avatar_images, skipping:", imageUrl)
        }
      }
      console.log("[Blueprint] ✅ All selfies saved to user_avatar_images")
    } catch (dbError) {
      console.error("[Blueprint] Error saving selfie URLs:", dbError)
      // Continue even if save fails - user still gets the URLs
    }

    return NextResponse.json({ imageUrls })
  } catch (error) {
    console.error("[Blueprint] Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    )
  }
}
