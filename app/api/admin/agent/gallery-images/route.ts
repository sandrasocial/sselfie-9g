import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"

// Get gallery images for content calendar
export async function GET(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || authUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const sql = neon(process.env.DATABASE_URL!)
    
    // Get admin user ID from email
    const adminUserResult = await sql`
      SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1
    `
    
    if (!adminUserResult || adminUserResult.length === 0) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    const adminUserId = adminUserResult[0].id
    console.log("[v0] Admin user ID:", adminUserId)

    // Helper function to extract image URL from a database record
    const extractImageUrl = (img: any): string | null => {
      // First, try selected_url
      if (img.selected_url && typeof img.selected_url === 'string' && img.selected_url.startsWith('http')) {
        return img.selected_url
      } else if (img.image_urls) {
        // Try to parse image_urls
        const imageUrls = img.image_urls
        if (typeof imageUrls === 'string') {
          // Check if it's a JSON array
          if (imageUrls.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(imageUrls)
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed[0]
              }
            } catch {
              // Not valid JSON, try comma-separated
              const urls = imageUrls.split(',').map((u: string) => u.trim()).filter((u: string) => u.startsWith('http'))
              if (urls.length > 0) {
                return urls[0]
              }
            }
          } else if (imageUrls.trim().startsWith('{')) {
            // JSON object (might be prediction_id), skip
            return null
          } else {
            // Try comma-separated
            const urls = imageUrls.split(',').map((u: string) => u.trim()).filter((u: string) => u.startsWith('http'))
            if (urls.length > 0) {
              return urls[0]
            }
          }
        }
      }
      return null
    }

    // Helper function to process a batch of images and extract valid ones
    const processBatch = (batch: any[]) => {
      return batch.map((img: any) => {
        const imageUrl = extractImageUrl(img)
        return {
          id: img.id,
          user_id: img.user_id,
          prompt: img.prompt,
          created_at: img.created_at,
          content_category: img.content_category,
          content_tags: img.content_tags,
          image_url: imageUrl
        }
      }).filter((img: any) => {
        const url = img.image_url
        return url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))
      })
    }

    // Fetch until we have enough valid records to prevent pagination gaps
    // This ensures we don't skip valid records when many are filtered out
    const validImages: any[] = []
    let currentOffset = offset
    const batchSize = 50 // Fetch in batches of 50
    let totalFetched = 0
    let hasMore = true

    while (validImages.length < limit && hasMore) {
      // Fetch a batch from the database
      let batch
      if (category && category !== "all") {
        batch = await sql`
          SELECT 
            id,
            user_id,
            prompt,
            created_at,
            content_category,
            content_tags,
            selected_url,
            image_urls
          FROM generated_images 
          WHERE user_id = ${adminUserId}
          AND content_category = ${category}
          AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)
          ORDER BY created_at DESC 
          LIMIT ${batchSize}
          OFFSET ${currentOffset}
        `
      } else {
        batch = await sql`
          SELECT 
            id,
            user_id,
            prompt,
            created_at,
            content_category,
            content_tags,
            selected_url,
            image_urls
          FROM generated_images 
          WHERE user_id = ${adminUserId}
          AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)
          ORDER BY created_at DESC 
          LIMIT ${batchSize}
          OFFSET ${currentOffset}
        `
      }

      if (batch.length === 0) {
        // No more records in database
        hasMore = false
        break
      }

      totalFetched += batch.length

      // Process and filter the batch
      const validBatch = processBatch(batch)
      validImages.push(...validBatch)

      // Move offset forward by the number of records we actually fetched
      currentOffset += batch.length

      // If we got fewer records than requested, we've reached the end
      if (batch.length < batchSize) {
        hasMore = false
      }

      // Safety limit: don't fetch more than 500 records in total to prevent infinite loops
      if (totalFetched >= 500) {
        console.log("[v0] ⚠️ Reached safety limit of 500 records fetched")
        break
      }
    }

    // Take only the requested limit (in case we fetched more)
    const finalImages = validImages.slice(0, limit)

    console.log("[v0] Fetched database records:", totalFetched)
    console.log("[v0] Valid images (with URLs):", finalImages.length)
    console.log("[v0] Database offset processed:", currentOffset)
    if (finalImages.length > 0) {
      console.log("[v0] Sample image:", {
        id: finalImages[0].id,
        image_url: finalImages[0].image_url?.substring(0, 50),
        has_url: !!finalImages[0].image_url
      })
    }

    // Return valid images and the actual database offset we've processed
    // This ensures pagination continues from the correct position
    return NextResponse.json({ 
      images: finalImages,
      rawCount: totalFetched, // Total database records fetched (before filtering)
      processedOffset: currentOffset // Actual database offset we've processed
    })
  } catch (error) {
    console.error("[v0] Gallery images fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch gallery images" }, { status: 500 })
  }
}

// Update image metadata for better categorization
export async function PATCH(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || authUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { imageId, category, tags } = await request.json()

    const { error } = await supabase
      .from("generated_images")
      .update({
        content_category: category,
        content_tags: tags,
      })
      .eq("id", imageId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Image metadata update error:", error)
    return NextResponse.json({ error: "Failed to update image metadata" }, { status: 500 })
  }
}
