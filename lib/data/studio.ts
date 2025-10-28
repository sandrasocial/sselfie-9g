import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export interface GenerationStats {
  totalGenerated: number
  totalFavorites: number
  generationsThisMonth: number
  recentGenerations: number
}

export interface RecentGeneration {
  id: number
  image_url: string
  prompt: string
  description: string | null
  category: string
  subcategory: string | null
  created_at: string
  saved: boolean
}

export async function getGenerationStats(userId: string): Promise<GenerationStats> {
  const [stats] = await sql`
    SELECT 
      COUNT(*)::int as total_generated,
      COUNT(*) FILTER (WHERE saved = true)::int as total_favorites,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int as generations_this_month,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int as recent_generations
    FROM generated_images
    WHERE user_id = ${userId}
  `

  return {
    totalGenerated: stats.total_generated || 0,
    totalFavorites: stats.total_favorites || 0,
    generationsThisMonth: stats.generations_this_month || 0,
    recentGenerations: stats.recent_generations || 0,
  }
}

export async function getRecentGenerations(userId: string, limit = 10): Promise<RecentGeneration[]> {
  const generations = await sql`
    SELECT 
      id,
      COALESCE(selected_url, (string_to_array(image_urls, ','))[1]) as image_url,
      prompt,
      description,
      category,
      subcategory,
      created_at,
      saved
    FROM generated_images
    WHERE user_id = ${userId}
      AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return generations as RecentGeneration[]
}

export async function getUserTrainedModel(userId: string) {
  const [model] = await sql`
    SELECT 
      id,
      model_name,
      trigger_word,
      replicate_version_id,
      lora_weights_url,
      training_status
    FROM user_models
    WHERE user_id = ${userId}
      AND training_status = 'completed'
    ORDER BY created_at DESC
    LIMIT 1
  `

  return model || null
}
