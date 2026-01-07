import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

/**
 * GET /api/maya/get-photoshoot?id={photoshootId}
 * 
 * Retrieves photoshoot data from generated_images table
 * Returns the photoshoot record with all image URLs and status
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const photoshootId = searchParams.get("id")

    if (!photoshootId) {
      return NextResponse.json({ error: "Missing photoshoot ID" }, { status: 400 })
    }

    console.log("[v0] 📸 Loading photoshoot:", photoshootId)

    // Get user ID
    const [dbUser] = await sql`
      SELECT id FROM users 
      WHERE supabase_user_id = ${user.id}
    `

    if (!dbUser || !dbUser.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch photoshoot record
    const [photoshoot] = await sql`
      SELECT 
        id,
        user_id,
        prompt,
        description,
        category,
        subcategory,
        image_urls,
        created_at,
        updated_at
      FROM generated_images
      WHERE id = ${photoshootId}
        AND user_id = ${String(dbUser.id)}
        AND image_urls::text LIKE '%photoshoot_single_predictions%'
      LIMIT 1
    `

    if (!photoshoot) {
      return NextResponse.json({ error: "Photoshoot not found" }, { status: 404 })
    }

    const imageUrlsData = typeof photoshoot.image_urls === 'string' 
      ? JSON.parse(photoshoot.image_urls) 
      : photoshoot.image_urls

    // Extract predictions and final image URLs
    const predictions = imageUrlsData.predictions || []
    const finalImageUrls = imageUrlsData.finalImageUrls || []
    const status = imageUrlsData.status || "processing"
    const completedCount = imageUrlsData.completedCount || 0
    const totalCount = imageUrlsData.totalCount || predictions.length

    // Build response with all image data
    const images = predictions.map((pred: any, index: number) => {
      // Use final URLs if available, otherwise use placeholder
      const imageUrls = pred.imageUrls || (finalImageUrls.length > index ? [finalImageUrls[index]] : [])
      
      return {
        id: pred.index !== undefined ? pred.index : index,
        predictionId: pred.predictionId,
        title: pred.title || `Photo ${index + 1}`,
        caption: pred.caption || pred.title || "",
        action: pred.action || pred.pose || "",
        location: pred.location || "",
        shotType: pred.shotDistance || "full body",
        imageUrl: imageUrls[0] || null,
        url: imageUrls[0] || null, // For compatibility
        status: pred.status || (imageUrls.length > 0 ? "ready" : "processing"),
        imageUrls: imageUrls, // All URLs for this prediction
      }
    })

    console.log(`[v0] ✅ Photoshoot loaded: ${completedCount}/${totalCount} images complete`)

    return NextResponse.json({
      success: true,
      photoshootId: photoshoot.id,
      status: status,
      completedCount: completedCount,
      totalCount: totalCount,
      images: images,
      baseOutfit: imageUrlsData.baseOutfit,
      baseSeed: imageUrlsData.base_seed,
      heroImage: imageUrlsData.hero_image,
      createdAt: photoshoot.created_at,
      updatedAt: photoshoot.updated_at,
    })
  } catch (error) {
    console.error("[v0] ❌ Error loading photoshoot:", error)
    return NextResponse.json(
      { error: "Failed to load photoshoot", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

