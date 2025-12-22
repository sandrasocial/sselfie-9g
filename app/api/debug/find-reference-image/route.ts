import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET(request: NextRequest) {
  try {
    // Allow admin access or authenticated users
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get("imageId") || "5371"
    const searchUrl = searchParams.get("url") || "5371-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR"

    console.log("[v0] Searching for reference image...")
    console.log(`[v0] Image ID: ${imageId}`)
    console.log(`[v0] Search URL pattern: ${searchUrl}`)

    const results: any = {
      found: false,
      source: null,
      data: null,
      searches: [],
    }

    // Search 1: generated_images by ID
    try {
      const generatedImages = await sql`
        SELECT 
          id,
          user_id,
          prompt,
          description,
          category,
          subcategory,
          image_urls,
          selected_url,
          created_at
        FROM generated_images
        WHERE id = ${Number.parseInt(imageId)}
        LIMIT 1
      `

      if (generatedImages.length > 0) {
        const img = generatedImages[0] as any
        results.found = true
        results.source = "generated_images"
        results.data = {
          id: img.id,
          user_id: img.user_id,
          prompt: img.prompt,
          description: img.description,
          category: img.category,
          subcategory: img.subcategory,
          image_url: typeof img.image_urls === 'string' ? img.image_urls : img.selected_url,
          created_at: img.created_at,
        }
        results.searches.push({
          table: "generated_images",
          method: "by_id",
          found: true,
        })
        return NextResponse.json(results)
      } else {
        results.searches.push({
          table: "generated_images",
          method: "by_id",
          found: false,
        })
      }
    } catch (error: any) {
      results.searches.push({
        table: "generated_images",
        method: "by_id",
        error: error.message,
      })
    }

    // Search 2: ai_images by URL pattern
    try {
      const aiImages = await sql`
        SELECT 
          id,
          user_id,
          image_url,
          prompt,
          generated_prompt,
          category,
          created_at
        FROM ai_images
        WHERE image_url LIKE ${`%${searchUrl}%`} OR image_url LIKE ${`%${imageId}%`}
        ORDER BY created_at DESC
        LIMIT 5
      `

      if (aiImages.length > 0) {
        results.found = true
        results.source = "ai_images"
        results.data = aiImages.map((img: any) => ({
          id: img.id,
          user_id: img.user_id,
          prompt: img.prompt,
          generated_prompt: img.generated_prompt,
          image_url: img.image_url,
          category: img.category,
          created_at: img.created_at,
        }))
        results.searches.push({
          table: "ai_images",
          method: "by_url_pattern",
          found: true,
          count: aiImages.length,
        })
        return NextResponse.json(results)
      } else {
        results.searches.push({
          table: "ai_images",
          method: "by_url_pattern",
          found: false,
        })
      }
    } catch (error: any) {
      results.searches.push({
        table: "ai_images",
        method: "by_url_pattern",
        error: error.message,
      })
    }

    // Search 3: generated_images by date range (Dec 13, 2025 ± 1 day)
    try {
      const dateRangeImages = await sql`
        SELECT 
          id,
          user_id,
          prompt,
          description,
          category,
          subcategory,
          image_urls,
          selected_url,
          created_at
        FROM generated_images
        WHERE created_at >= '2025-12-12 00:00:00'::timestamp
          AND created_at <= '2025-12-14 23:59:59'::timestamp
        ORDER BY created_at DESC
        LIMIT 50
      `

      if (dateRangeImages.length > 0) {
        // Check if any match the URL pattern
        const matchingImages = dateRangeImages.filter((img: any) => {
          const imageUrl = typeof img.image_urls === 'string' ? img.image_urls : img.selected_url || ""
          return imageUrl.includes(imageId) || imageUrl.includes(searchUrl.split('-')[1] || '')
        })

        if (matchingImages.length > 0) {
          results.found = true
          results.source = "generated_images"
          results.data = matchingImages.map((img: any) => ({
            id: img.id,
            user_id: img.user_id,
            prompt: img.prompt,
            description: img.description,
            category: img.category,
            subcategory: img.subcategory,
            image_url: typeof img.image_urls === 'string' ? img.image_urls : img.selected_url,
            created_at: img.created_at,
          }))
          results.searches.push({
            table: "generated_images",
            method: "by_date_range",
            found: true,
            matching_count: matchingImages.length,
            total_in_range: dateRangeImages.length,
          })
          return NextResponse.json(results)
        } else {
          results.searches.push({
            table: "generated_images",
            method: "by_date_range",
            found: false,
            total_in_range: dateRangeImages.length,
            note: "Found images in date range but none matching URL pattern",
          })
        }
      } else {
        results.searches.push({
          table: "generated_images",
          method: "by_date_range",
          found: false,
        })
      }
    } catch (error: any) {
      results.searches.push({
        table: "generated_images",
        method: "by_date_range",
        error: error.message,
      })
    }

    // Search 4: ai_images by date range
    try {
      const dateRangeAiImages = await sql`
        SELECT 
          id,
          user_id,
          image_url,
          prompt,
          generated_prompt,
          category,
          created_at
        FROM ai_images
        WHERE created_at >= '2025-12-12 00:00:00'::timestamp
          AND created_at <= '2025-12-14 23:59:59'::timestamp
        ORDER BY created_at DESC
        LIMIT 50
      `

      if (dateRangeAiImages.length > 0) {
        const matchingImages = dateRangeAiImages.filter((img: any) => {
          return img.image_url.includes(imageId) || img.image_url.includes(searchUrl.split('-')[1] || '')
        })

        if (matchingImages.length > 0) {
          results.found = true
          results.source = "ai_images"
          results.data = matchingImages.map((img: any) => ({
            id: img.id,
            user_id: img.user_id,
            prompt: img.prompt,
            generated_prompt: img.generated_prompt,
            image_url: img.image_url,
            category: img.category,
            created_at: img.created_at,
          }))
          results.searches.push({
            table: "ai_images",
            method: "by_date_range",
            found: true,
            matching_count: matchingImages.length,
            total_in_range: dateRangeAiImages.length,
          })
          return NextResponse.json(results)
        } else {
          results.searches.push({
            table: "ai_images",
            method: "by_date_range",
            found: false,
            total_in_range: dateRangeAiImages.length,
            note: "Found images in date range but none matching URL pattern",
          })
        }
      } else {
        results.searches.push({
          table: "ai_images",
          method: "by_date_range",
          found: false,
        })
      }
    } catch (error: any) {
      results.searches.push({
        table: "ai_images",
        method: "by_date_range",
        error: error.message,
      })
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("[v0] Error finding reference image:", error)
    return NextResponse.json(
      {
        error: "Failed to search for reference image",
        message: error.message,
      },
      { status: 500 },
    )
  }
}




























