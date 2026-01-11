import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const email = formData.get("email") as string | null
    const files = formData.getAll("files") as File[]

    // Phase 1: Support both user_id (authenticated) and email (backward compatibility)
    let userId: string | null = null

    // Try to get user_id from auth session (Studio flow)
    try {
      const supabase = await createServerClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const neonUser = await getUserByAuthId(authUser.id)
        if (neonUser) {
          userId = neonUser.id
          console.log("[Blueprint] Using user_id from auth session for upload:", userId)
        }
      }
    } catch (authError) {
      // Not authenticated - fall back to email-based lookup
      console.log("[Blueprint] Not authenticated, using email-based lookup for upload")
    }

    // If not authenticated, email is required
    if (!userId && (!email || typeof email !== "string")) {
      return NextResponse.json(
        { error: "Email is required. Please complete email capture first." },
        { status: 400 },
      )
    }

    // Check if blueprint_subscribers record exists
    let subscriber = null
    if (userId) {
      subscriber = await sql`
        SELECT id FROM blueprint_subscribers WHERE user_id = ${userId} LIMIT 1
      `
    } else {
      subscriber = await sql`
        SELECT id FROM blueprint_subscribers WHERE email = ${email} LIMIT 1
      `
    }

    if (subscriber.length === 0) {
      return NextResponse.json(
        { error: userId ? "Blueprint state not found. Please start your blueprint first." : "Email not found. Please complete email capture first." },
        { status: 404 },
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

    // Save selfie URLs to database (merge with existing URLs)
    try {
      // Get existing URLs first
      let existing = null
      if (userId) {
        existing = await sql`
          SELECT selfie_image_urls FROM blueprint_subscribers WHERE user_id = ${userId} LIMIT 1
        `
      } else {
        existing = await sql`
          SELECT selfie_image_urls FROM blueprint_subscribers WHERE email = ${email} LIMIT 1
        `
      }
      
      // JSONB columns are already parsed by the database driver
      const existingUrls = existing.length > 0 && existing[0].selfie_image_urls 
        ? (Array.isArray(existing[0].selfie_image_urls) 
            ? existing[0].selfie_image_urls 
            : [])
        : []
      
      // Merge new URLs with existing ones, avoiding duplicates
      const allUrls = [...existingUrls, ...imageUrls].filter((url, index, self) => 
        self.indexOf(url) === index
      )
      
      if (userId) {
        await sql`
          UPDATE blueprint_subscribers
          SET selfie_image_urls = ${JSON.stringify(allUrls)}::jsonb
          WHERE user_id = ${userId}
        `
        console.log("[Blueprint] Selfie URLs saved to blueprint_subscribers for user_id:", userId, `(${allUrls.length} total)`)
      } else {
        await sql`
          UPDATE blueprint_subscribers
          SET selfie_image_urls = ${JSON.stringify(allUrls)}::jsonb
          WHERE email = ${email}
        `
        console.log("[Blueprint] Selfie URLs saved to blueprint_subscribers for email:", email, `(${allUrls.length} total)`)
      }

      // Phase 5.3.4: Also save to user_avatar_images for Pro Mode image generation
      // Only save if we have userId (authenticated users)
      if (userId) {
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
                  display_order,
                  is_active,
                  uploaded_at,
                  created_at
                )
                VALUES (
                  ${userId},
                  ${imageUrl},
                  ${maxOrder + i + 1},
                  true,
                  NOW(),
                  NOW()
                )
              `
              console.log("[Blueprint] Saved selfie to user_avatar_images:", imageUrl)
            } else {
              console.log("[Blueprint] Selfie already exists in user_avatar_images, skipping:", imageUrl)
            }
          }
          console.log("[Blueprint] ✅ All selfies saved to user_avatar_images for Pro Mode")
        } catch (avatarError) {
          console.error("[Blueprint] Error saving to user_avatar_images:", avatarError)
          // Continue even if this fails - blueprint_subscribers save was successful
        }
      } else {
        console.log("[Blueprint] Skipping user_avatar_images save - no userId (email-only flow)")
      }
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
