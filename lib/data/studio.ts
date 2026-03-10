import { sql } from "@/lib/db/client"


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
  console.log("[v0] Fetching generation stats for user:", userId)

  const [stats] = await sql`
    WITH canonical_ai_images AS (
      SELECT
        created_at,
        COALESCE(is_favorite, false) AS is_favorite
      FROM ai_images
      WHERE user_id = ${userId}
        AND image_url IS NOT NULL
    ),
    legacy_generated_images AS (
      SELECT
        gi.created_at,
        COALESCE(gi.saved, false) AS is_favorite
      FROM generated_images gi
      WHERE gi.user_id = ${userId}
        AND COALESCE(gi.selected_url, (string_to_array(gi.image_urls, ','))[1]) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM ai_images ai
          WHERE ai.user_id = gi.user_id
            AND ai.image_url = COALESCE(gi.selected_url, (string_to_array(gi.image_urls, ','))[1])
        )
    ),
    combined_images AS (
      SELECT * FROM canonical_ai_images
      UNION ALL
      SELECT * FROM legacy_generated_images
    )
    SELECT
      COUNT(*)::int AS total_generated,
      COUNT(*) FILTER (WHERE is_favorite = true)::int AS total_favorites,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC'))::int AS generations_this_month,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS recent_generations
    FROM combined_images
  `

  console.log("[v0] Raw stats from database:", stats)

  return {
    totalGenerated: stats.total_generated || 0,
    totalFavorites: stats.total_favorites || 0,
    generationsThisMonth: stats.generations_this_month || 0,
    recentGenerations: stats.recent_generations || 0,
  }
}

export async function getRecentGenerations(userId: string, limit = 10): Promise<RecentGeneration[]> {
  const generations = await sql`
    WITH canonical_ai_images AS (
      SELECT
        id,
        image_url,
        prompt,
        generated_prompt AS description,
        category,
        NULL::text AS subcategory,
        created_at,
        COALESCE(is_favorite, false) AS saved
      FROM ai_images
      WHERE user_id = ${userId}
        AND image_url IS NOT NULL
    ),
    legacy_generated_images AS (
      SELECT
        gi.id,
        COALESCE(gi.selected_url, (string_to_array(gi.image_urls, ','))[1]) AS image_url,
        gi.prompt,
        gi.description,
        gi.category,
        gi.subcategory,
        gi.created_at,
        COALESCE(gi.saved, false) AS saved
      FROM generated_images gi
      WHERE gi.user_id = ${userId}
        AND COALESCE(gi.selected_url, (string_to_array(gi.image_urls, ','))[1]) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM ai_images ai
          WHERE ai.user_id = gi.user_id
            AND ai.image_url = COALESCE(gi.selected_url, (string_to_array(gi.image_urls, ','))[1])
        )
    )
    SELECT *
    FROM (
      SELECT * FROM canonical_ai_images
      UNION ALL
      SELECT * FROM legacy_generated_images
    ) combined_images
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
      AND (is_test = false OR is_test IS NULL)
    ORDER BY created_at DESC
    LIMIT 1
  `

  return model || null
}
