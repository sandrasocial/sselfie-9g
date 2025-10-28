import { getUserPersonalMemory, getUserPersonalBrand } from "@/lib/data/maya"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function getUserContextForMaya(authUserId: string): Promise<string> {
  try {
    const neonUser = await getUserByAuthId(authUserId)
    if (!neonUser) {
      return ""
    }

    const [memory, personalBrand, assets] = await Promise.all([
      getUserPersonalMemory(neonUser.id),
      getUserPersonalBrand(neonUser.id),
      sql`SELECT * FROM brand_assets WHERE user_id = ${neonUser.id} ORDER BY created_at DESC`,
    ])

    const contextParts: string[] = []

    if (personalBrand && personalBrand.is_completed) {
      contextParts.push("=== USER'S PERSONAL BRAND ===")

      if (personalBrand.name) {
        contextParts.push(`Name: ${personalBrand.name}`)
      }

      if (personalBrand.business_type) {
        contextParts.push(`Business Type: ${personalBrand.business_type}`)
      }

      if (personalBrand.target_audience) {
        contextParts.push(`Target Audience: ${personalBrand.target_audience}`)
      }

      if (personalBrand.brand_voice) {
        contextParts.push(`Brand Voice: ${personalBrand.brand_voice}`)
      }

      if (personalBrand.language_style) {
        contextParts.push(`Language Style: ${personalBrand.language_style}`)
      }

      if (personalBrand.content_themes) {
        contextParts.push(`Content Themes: ${personalBrand.content_themes}`)
      }

      if (personalBrand.content_pillars) {
        contextParts.push(`Content Pillars: ${personalBrand.content_pillars}`)
      }

      if (personalBrand.brand_vibe) {
        contextParts.push(`Brand Vibe: ${personalBrand.brand_vibe}`)
      }

      if (personalBrand.color_mood) {
        contextParts.push(`Color Mood: ${personalBrand.color_mood}`)
      }

      if (personalBrand.current_situation) {
        contextParts.push(`Current Situation: ${personalBrand.current_situation}`)
      }

      if (personalBrand.transformation_story) {
        contextParts.push(`Transformation Story: ${personalBrand.transformation_story}`)
      }

      if (personalBrand.future_vision) {
        contextParts.push(`Future Vision: ${personalBrand.future_vision}`)
      }

      if (personalBrand.business_goals) {
        contextParts.push(`Business Goals: ${personalBrand.business_goals}`)
      }

      if (personalBrand.photo_goals) {
        contextParts.push(`Photo Goals: ${personalBrand.photo_goals}`)
      }

      if (personalBrand.style_preferences) {
        contextParts.push(`Style Preferences: ${personalBrand.style_preferences}`)
      }

      contextParts.push("")
    }

    if (assets && assets.length > 0) {
      contextParts.push("=== USER'S BRAND ASSETS ===")
      contextParts.push(`The user has uploaded ${assets.length} brand asset(s):`)

      for (const asset of assets) {
        const assetInfo = [`- ${asset.file_name} (${asset.file_type})`]
        if (asset.description) {
          assetInfo.push(`  Description: ${asset.description}`)
        }
        assetInfo.push(`  URL: ${asset.file_url}`)
        contextParts.push(assetInfo.join("\n"))
      }

      contextParts.push("")
    }

    if (memory) {
      contextParts.push("=== MAYA'S LEARNING ABOUT USER ===")

      if (memory.preferred_topics && Array.isArray(memory.preferred_topics) && memory.preferred_topics.length > 0) {
        contextParts.push(`Preferred topics: ${memory.preferred_topics.join(", ")}`)
      }

      if (memory.personalized_styling_notes) {
        contextParts.push(`Styling notes: ${memory.personalized_styling_notes}`)
      }

      const insights = memory.personal_insights as any
      if (insights) {
        if (insights.concepts_generated > 0) {
          contextParts.push(`Generated ${insights.concepts_generated} concepts previously`)
        }
        if (insights.images_favorited > 0) {
          contextParts.push(`Favorited ${insights.images_favorited} images`)
        }
      }

      const feedbackPatterns = memory.user_feedback_patterns as any
      if (feedbackPatterns && feedbackPatterns.total_interactions > 5) {
        const positiveRate = feedbackPatterns.positive_feedback / feedbackPatterns.total_interactions
        if (positiveRate > 0.7) {
          contextParts.push("Typically responds positively to suggestions")
        }
      }
    }

    return contextParts.length > 0 ? `\n\n${contextParts.join("\n")}` : ""
  } catch (error) {
    console.error("[v0] Error getting user context:", error)
    return ""
  }
}
