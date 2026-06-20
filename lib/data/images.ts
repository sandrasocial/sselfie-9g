import { sql } from "@/lib/db/client"

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
  source: "ai_images" | "generated_images" | "feed"
  feed_layout_id?: number
  feed_title?: string
}

/**
 * Fetch paginated gallery images from the canonical ai_images store.
 *
 * `generated_images` remains a legacy staging table for older Classic flows and
 * should not be the primary source for user-facing gallery reads.
 */
export async function getUserImages(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ images: GalleryImage[]; total: number }> {
  try {
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM ai_images
      WHERE user_id = ${userId}
        AND (generation_status = 'completed' OR generation_status IS NULL)
    `
    const total = Number(countResult[0]?.total || 0)

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
        AND (generation_status = 'completed' OR generation_status IS NULL)
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    const images: GalleryImage[] = aiImages.map((img: any) => ({
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

    return { images, total }
  } catch (error) {
    console.error("[v0] Error fetching user images:", error)
    throw error
  }
}

/**
 * Fetch all images for a user with ai_images as canonical and generated_images
 * only as a legacy fallback for rows that have not been mirrored yet.
 */
export async function getAllUserImages(userId: string): Promise<GalleryImage[]> {
  try {
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
        AND (generation_status = 'completed' OR generation_status IS NULL)
      ORDER BY created_at DESC
    `

    const generatedImages = await sql`
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
      WHERE user_id = ${userId}
        AND COALESCE(selected_url, (string_to_array(image_urls, ','))[1]) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM ai_images
          WHERE ai_images.user_id = generated_images.user_id
            AND ai_images.image_url = COALESCE(generated_images.selected_url, (string_to_array(generated_images.image_urls, ','))[1])
        )
      ORDER BY created_at DESC
    `

    const allImages: GalleryImage[] = [
      ...aiImages.map((img: any) => ({
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
      })),
      ...generatedImages.map((img: any) => ({
        id: `gen_${img.id}`,
        user_id: img.user_id,
        image_url: img.image_url,
        prompt: img.prompt || "",
        description: img.prompt || "",
        category: img.category || img.subcategory,
        style: undefined,
        is_favorite: img.saved || false,
        created_at: img.created_at,
        source: "generated_images" as const,
      })),
    ]

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
          style: undefined,
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
