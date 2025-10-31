import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserPersonalMemory, getUserPersonalBrand } from "@/lib/data/maya"

const sql = neon(process.env.DATABASE_URL!)

export async function getUserContextForMaya(authUserId: string): Promise<string> {
  try {
    console.log("[v0] getUserContextForMaya: Starting for authUserId:", authUserId)

    const neonUser = await getUserByAuthId(authUserId)
    console.log("[v0] getUserContextForMaya: Got neon user:", neonUser ? `ID ${neonUser.id}` : "NO USER")

    if (!neonUser) {
      console.log("[v0] getUserContextForMaya: No neon user found, returning empty context")
      return ""
    }

    console.log("[v0] getUserContextForMaya: Fetching memory, brand, and assets...")
    const [memory, personalBrand, assets] = await Promise.all([
      getUserPersonalMemory(neonUser.id).catch((err) => {
        console.error("[v0] Error fetching memory:", err)
        return null
      }),
      getUserPersonalBrand(neonUser.id).catch((err) => {
        console.error("[v0] Error fetching brand:", err)
        return null
      }),
      sql`SELECT * FROM brand_assets WHERE user_id = ${neonUser.id} ORDER BY created_at DESC`.catch((err: any) => {
        console.error("[v0] Error fetching assets:", err)
        return []
      }),
    ])
    console.log("[v0] getUserContextForMaya: Data fetched successfully")

    const contextParts: string[] = []

    if (personalBrand && personalBrand.is_completed) {
      console.log("[v0] getUserContextForMaya: Processing personal brand data...")
      contextParts.push("=== USER'S PERSONAL BRAND ===")

      if (personalBrand.name) contextParts.push(`Name: ${personalBrand.name}`)
      if (personalBrand.business_type) contextParts.push(`Business Type: ${personalBrand.business_type}`)

      // Visual Style & Aesthetic
      if (personalBrand.visual_aesthetic) {
        try {
          const aesthetics =
            typeof personalBrand.visual_aesthetic === "string"
              ? JSON.parse(personalBrand.visual_aesthetic)
              : personalBrand.visual_aesthetic
          if (Array.isArray(aesthetics) && aesthetics.length > 0) {
            contextParts.push(`Visual Aesthetic: ${aesthetics.join(", ")}`)
            contextParts.push(`IMPORTANT: Generate concepts that match these aesthetics: ${aesthetics.join(", ")}`)
          }
        } catch (e) {
          if (typeof personalBrand.visual_aesthetic === "string") {
            contextParts.push(`Visual Aesthetic: ${personalBrand.visual_aesthetic}`)
          }
        }
      }

      if (personalBrand.settings_preference) {
        try {
          const settings =
            typeof personalBrand.settings_preference === "string"
              ? JSON.parse(personalBrand.settings_preference)
              : personalBrand.settings_preference
          if (Array.isArray(settings) && settings.length > 0) {
            contextParts.push(`Preferred Settings: ${settings.join(", ")}`)
            contextParts.push(`IMPORTANT: Use these location types in photo concepts: ${settings.join(", ")}`)
          }
        } catch (e) {
          if (typeof personalBrand.settings_preference === "string") {
            contextParts.push(`Preferred Settings: ${personalBrand.settings_preference}`)
          }
        }
      }

      if (personalBrand.fashion_style) {
        try {
          const styles =
            typeof personalBrand.fashion_style === "string"
              ? JSON.parse(personalBrand.fashion_style)
              : personalBrand.fashion_style
          if (Array.isArray(styles) && styles.length > 0) {
            contextParts.push(`Fashion Style: ${styles.join(", ")}`)
            contextParts.push(`IMPORTANT: Dress the user in these styles: ${styles.join(", ")}`)
          }
        } catch (e) {
          if (typeof personalBrand.fashion_style === "string") {
            contextParts.push(`Fashion Style: ${personalBrand.fashion_style}`)
          }
        }
      }

      // Communication & Voice
      if (personalBrand.communication_voice) {
        try {
          const voices =
            typeof personalBrand.communication_voice === "string"
              ? JSON.parse(personalBrand.communication_voice)
              : personalBrand.communication_voice
          if (Array.isArray(voices) && voices.length > 0) {
            contextParts.push(`Communication Voice: ${voices.join(", ")}`)
            contextParts.push(`IMPORTANT: Match this tone in your responses: ${voices.join(", ")}`)
          }
        } catch (e) {
          if (typeof personalBrand.communication_voice === "string") {
            contextParts.push(`Communication Voice: ${personalBrand.communication_voice}`)
          }
        }
      }

      if (personalBrand.specific_phrases) {
        contextParts.push(`Signature Phrases: ${personalBrand.specific_phrases}`)
      }

      // Target Audience
      if (personalBrand.ideal_audience_description) {
        contextParts.push(`Ideal Audience: ${personalBrand.ideal_audience_description}`)
      }
      if (personalBrand.ideal_audience_challenge) {
        contextParts.push(`Audience Challenge: ${personalBrand.ideal_audience_challenge}`)
      }
      if (personalBrand.ideal_audience_transformation) {
        contextParts.push(`Audience Transformation: ${personalBrand.ideal_audience_transformation}`)
      }

      // Brand Inspiration
      if (personalBrand.brand_inspiration) {
        contextParts.push(`Brand Inspiration: ${personalBrand.brand_inspiration}`)
      }
      if (personalBrand.inspiration_examples) {
        contextParts.push(`Inspiration Examples: ${personalBrand.inspiration_examples}`)
      }

      // Original fields
      if (personalBrand.target_audience) contextParts.push(`Target Audience: ${personalBrand.target_audience}`)
      if (personalBrand.brand_voice) contextParts.push(`Brand Voice: ${personalBrand.brand_voice}`)
      if (personalBrand.language_style) contextParts.push(`Language Style: ${personalBrand.language_style}`)
      if (personalBrand.content_themes) contextParts.push(`Content Themes: ${personalBrand.content_themes}`)
      if (personalBrand.content_pillars) contextParts.push(`Content Pillars: ${personalBrand.content_pillars}`)
      if (personalBrand.brand_vibe) contextParts.push(`Brand Vibe: ${personalBrand.brand_vibe}`)
      if (personalBrand.color_mood) contextParts.push(`Color Mood: ${personalBrand.color_mood}`)
      if (personalBrand.color_theme) contextParts.push(`Color Theme: ${personalBrand.color_theme}`)

      if (personalBrand.color_palette) {
        try {
          console.log("[v0] getUserContextForMaya: Parsing color_palette...")
          console.log("[v0] color_palette type:", typeof personalBrand.color_palette)
          console.log("[v0] color_palette value:", JSON.stringify(personalBrand.color_palette))

          let colorPalette = personalBrand.color_palette

          // If it's a string, try to parse it
          if (typeof colorPalette === "string") {
            try {
              colorPalette = JSON.parse(colorPalette)
            } catch (parseErr) {
              console.error("[v0] Failed to parse color_palette string:", parseErr)
              colorPalette = null
            }
          }

          // Check if it's a valid array
          if (Array.isArray(colorPalette) && colorPalette.length > 0) {
            const colors = colorPalette.filter((c) => typeof c === "string" && c.trim().length > 0)
            if (colors.length > 0) {
              contextParts.push(`Brand Colors: ${colors.join(", ")}`)
              contextParts.push(`IMPORTANT: Use these exact brand colors in all visual prompts: ${colors.join(", ")}`)
              console.log("[v0] getUserContextForMaya: Brand colors added to context:", colors)
            }
          } else {
            console.log("[v0] getUserContextForMaya: color_palette is not a valid array")
          }
        } catch (colorError) {
          console.error("[v0] getUserContextForMaya: Error processing color palette:", colorError)
          // Continue without colors
        }
      }

      if (personalBrand.current_situation) contextParts.push(`Current Situation: ${personalBrand.current_situation}`)
      if (personalBrand.transformation_story)
        contextParts.push(`Transformation Story: ${personalBrand.transformation_story}`)
      if (personalBrand.future_vision) contextParts.push(`Future Vision: ${personalBrand.future_vision}`)
      if (personalBrand.business_goals) contextParts.push(`Business Goals: ${personalBrand.business_goals}`)
      if (personalBrand.photo_goals) contextParts.push(`Photo Goals: ${personalBrand.photo_goals}`)
      if (personalBrand.style_preferences) contextParts.push(`Style Preferences: ${personalBrand.style_preferences}`)

      contextParts.push("")
    }

    if (assets && Array.isArray(assets) && assets.length > 0) {
      console.log("[v0] getUserContextForMaya: Processing brand assets...")
      contextParts.push("=== USER'S BRAND ASSETS ===")
      contextParts.push(`The user has uploaded ${assets.length} brand asset(s):`)

      for (const asset of assets) {
        const assetInfo = [`- ${asset.file_name} (${asset.file_type})`]
        if (asset.description) assetInfo.push(`  Description: ${asset.description}`)
        assetInfo.push(`  URL: ${asset.file_url}`)
        contextParts.push(assetInfo.join("\n"))
      }

      contextParts.push("")
    }

    if (memory) {
      console.log("[v0] getUserContextForMaya: Processing memory data...")
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

    const finalContext = contextParts.length > 0 ? `\n\n${contextParts.join("\n")}` : ""
    console.log("[v0] getUserContextForMaya: Context built successfully, length:", finalContext.length)
    return finalContext
  } catch (error) {
    console.error("[v0] getUserContextForMaya: FATAL ERROR")
    console.error("[v0] Error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error name:", error.name)
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    // Return empty context rather than throwing
    return ""
  }
}
