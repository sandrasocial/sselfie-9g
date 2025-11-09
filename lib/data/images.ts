import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface AIImage {
  id: number
  user_id: string
  image_url: string
  prompt: string
  style?: string
  is_selected?: boolean
  is_favorite?: boolean
  created_at: string
  category?: string
  prediction_id?: string
  generation_status?: string
}

export interface GeneratedImage {
  id: number
  user_id: string
  model_id?: number
  category?: string
  subcategory?: string
  prompt: string
  image_urls?: string // JSON array of URLs
  selected_url?: string
  saved?: boolean
  created_at: string
}

export interface GalleryImage {
  id: string
  user_id: string
  image_url: string
  prompt: string
  description?: string
  category?: string
  style?: string
  is_favorite?: boolean
  created_at: string
  source: "ai_images" | "generated_images"
}

/**
 * Fetch all images for a user from both ai_images and generated_images tables
 */
export async function getUserImages(userId: string): Promise<GalleryImage[]> {
  try {
    console.log("[v0] Fetching images for user:", userId)

    const aiImages = await sql`
      SELECT 
        id,
        user_id,
        image_url,
        prompt,
        generated_prompt,
        style,
        category,
        is_favorite,
        source,
        created_at
      FROM ai_images
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `

    const allImages: GalleryImage[] = aiImages.map((img: any) => ({
      id: `ai_${img.id}`,
      user_id: img.user_id,
      image_url: img.image_url,
      prompt: img.prompt || "",
      description: img.generated_prompt || img.prompt || "",
      category: img.category,
      style: img.style,
      is_favorite: img.is_favorite || false,
      created_at: img.created_at,
      source: "ai_images" as const,
    }))

    console.log("[v0] Gallery images from ai_images:", {
      total_count: allImages.length,
      sample: allImages
        .slice(0, 5)
        .map((img) => ({ id: img.id, category: img.category, is_favorite: img.is_favorite })),
    })

    return allImages
  } catch (error) {
    console.error("[v0] Error fetching user images:", error)
    throw error
  }
}

export async function getImageById(imageId: string): Promise<GalleryImage | null> {
  try {
    const [source, id] = imageId.split("_")

    if (source === "ai") {
      const images = await sql`
        SELECT 
          id,
          user_id,
          image_url,
          prompt,
          generated_prompt,
          style,
          category,
          is_favorite,
          source,
          created_at
        FROM ai_images
        WHERE id = ${id}
        LIMIT 1
      `

      if (images.length > 0) {
        const img = images[0] as any
        return {
          id: `ai_${img.id}`,
          user_id: img.user_id,
          image_url: img.image_url,
          prompt: img.prompt || "",
          description: img.generated_prompt || img.prompt || "",
          category: img.category,
          style: img.style,
          is_favorite: img.is_favorite || false,
          created_at: img.created_at,
          source: "ai_images",
        }
      }
    } else if (source === "gen") {
      const images = await sql`
        SELECT 
          id,
          user_id,
          selected_url as image_url,
          prompt,
          category,
          subcategory,
          saved,
          created_at
        FROM generated_images
        WHERE id = ${id}
        LIMIT 1
      `

      if (images.length > 0) {
        const img = images[0] as any
        return {
          id: `gen_${img.id}`,
          user_id: img.user_id,
          image_url: img.image_url,
          prompt: img.prompt || "",
          description: img.prompt || "",
          category: img.category || img.subcategory,
          is_favorite: img.saved || false,
          created_at: img.created_at,
          source: "generated_images",
        }
      }
    }

    return null
  } catch (error) {
    console.error("[v0] Error fetching image:", error)
    throw error
  }
}
