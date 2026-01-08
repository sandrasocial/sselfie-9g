import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const email = formData.get("email") as string | null
    const files = formData.getAll("files") as File[]

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required. Please complete email capture first." },
        { status: 400 },
      )
    }

    // Check if email exists in blueprint_subscribers
    const subscriber = await sql`
      SELECT id FROM blueprint_subscribers WHERE email = ${email} LIMIT 1
    `

    if (subscriber.length === 0) {
      return NextResponse.json(
        { error: "Email not found. Please complete email capture first." },
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
      const existing = await sql`
        SELECT selfie_image_urls FROM blueprint_subscribers WHERE email = ${email} LIMIT 1
      `
      
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
      
      await sql`
        UPDATE blueprint_subscribers
        SET selfie_image_urls = ${allUrls}
        WHERE email = ${email}
      `
      console.log("[Blueprint] Selfie URLs saved to database for email:", email, `(${allUrls.length} total)`)
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
