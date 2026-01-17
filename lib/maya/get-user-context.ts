import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserPersonalMemory, getUserPersonalBrand } from "@/lib/data/maya"

const sql = neon(process.env.DATABASE_URL!)

const parseStringArray = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean)
    return items.length > 0 ? items : null
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        const items = parsed.map((item) => String(item).trim()).filter(Boolean)
        return items.length > 0 ? items : null
      }
    } catch {
      const cleaned = value.replace(/[\[\]{}"]/g, "")
      const items = cleaned
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
      return items.length > 0 ? items : null
    }
  }
  return null
}

export async function getUserContextForMaya(authUserId: string): Promise<string> {
  try {
    console.log("[v0] getUserContextForMaya: Starting for authUserId:", authUserId)

    // Use effective user to support impersonation
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(authUserId)
    console.log("[v0] getUserContextForMaya: Got neon user:", neonUser ? `ID ${neonUser.id}` : "NO USER")

    if (!neonUser) {
      console.log("[v0] getUserContextForMaya: No neon user found, returning empty context")
      return ""
    }

    console.log("[v0] getUserContextForMaya: Fetching memory, brand, and assets...")
    const [memory, personalBrand, assets, userGender, userEthnicity] = await Promise.all([
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
      sql`SELECT gender FROM users WHERE id = ${neonUser.id} LIMIT 1`
        .then((result: any) => result[0]?.gender || null)
        .catch((err: any) => {
          console.error("[v0] Error fetching gender:", err)
          return null
        }),
      sql`SELECT ethnicity FROM users WHERE id = ${neonUser.id} LIMIT 1`
        .then((result: any) => result[0]?.ethnicity || null)
        .catch((err: any) => {
          console.error("[v0] Error fetching ethnicity:", err)
          return null
        }),
    ])
    console.log("[v0] getUserContextForMaya: Data fetched successfully")

    const contextParts: string[] = []

    if (userGender || userEthnicity) {
      contextParts.push("=== USER INFORMATION ===")
      if (userGender) contextParts.push(`Gender: ${userGender}`)
      if (userEthnicity) contextParts.push(`Ethnicity: ${userEthnicity}`)
      contextParts.push(
        `IMPORTANT: This user identifies as ${userEthnicity ? `a ${userEthnicity}` : ""}${userGender ? ` ${userGender}` : "person"}. Use your fashion expertise to create ${userGender || "appropriate"} styling, clothing, and descriptions.`,
      )
      contextParts.push(
        `🔴 CRITICAL FOR IMAGE GENERATION: When creating FLUX prompts, ALWAYS include ethnicity AND gender after the trigger word.`,
      )
      contextParts.push(
        `Format: "trigger_word, ${userEthnicity ? `${userEthnicity} ` : ""}${userGender || "person"}, [rest of prompt]"`,
      )
      contextParts.push(
        `This is NON-NEGOTIABLE for accurate skin tone and facial feature representation, especially for Black women and people of color.`,
      )
      contextParts.push("")
    }

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
        const settings = parseStringArray(personalBrand.settings_preference)
        if (settings && settings.length > 0) {
          contextParts.push(`Preferred Settings: ${settings.join(", ")}`)
          contextParts.push(`IMPORTANT: Use these location types in photo concepts: ${settings.join(", ")}`)
        } else if (typeof personalBrand.settings_preference === "string") {
          console.warn("[v0] getUserContextForMaya: Failed to parse settings_preference JSON, using fallback string")
          contextParts.push(`Preferred Settings: ${personalBrand.settings_preference}`)
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
              contextParts.push(`\n**🎨 BRAND COLORS (MANDATORY - USE THESE EXACT COLORS):**`)
              contextParts.push(`${colors.join(", ")}`)
              contextParts.push(``)
              contextParts.push(
                `⚠️ CRITICAL REQUIREMENT: You MUST use these exact brand colors in EVERY outfit and styling description.`,
              )
              contextParts.push(
                `- Do NOT default to generic warm tones, beige, or neutral colors unless they are in this palette`,
              )
              contextParts.push(`- Do NOT use colors that are NOT in this list`)
              contextParts.push(`- If brand colors are blue and white → use blue and white clothing`)
              contextParts.push(`- If brand colors are black and gold → use black and gold styling`)
              contextParts.push(`- Brand color consistency is NON-NEGOTIABLE`)
              console.log("[v0] getUserContextForMaya: Brand colors added to context with strict enforcement:", colors)
            }
          } else {
            console.log("[v0] getUserContextForMaya: color_palette is not a valid array")
          }
        } catch (colorError) {
          console.error("[v0] getUserContextForMaya: Error processing color palette:", colorError)
          // Continue without colors
        }
      }

      if (personalBrand.physical_preferences) {
        contextParts.push(`\n**🎯 PHYSICAL APPEARANCE PREFERENCES (MANDATORY - APPLY TO ALL IMAGES):**`)
        contextParts.push(`${personalBrand.physical_preferences}`)
        contextParts.push(``)
        contextParts.push(
          `⚠️ CRITICAL: These are user-requested body/appearance modifications that MUST be applied to EVERY image generation.`,
        )
        contextParts.push(`- Include these modifications in EVERY FLUX prompt you create`)
        contextParts.push(
          `- Examples: "curvier body type", "blonde hair instead of brown", "fuller bust", "athletic build"`,
        )
        contextParts.push(`- DO NOT generate images without these modifications - they are NON-NEGOTIABLE`)
        contextParts.push(`- If user requests changes to their appearance, update physical_preferences immediately`)
      }

      if (personalBrand.visual_aesthetic) {
        try {
          const aesthetics =
            typeof personalBrand.visual_aesthetic === "string"
              ? JSON.parse(personalBrand.visual_aesthetic)
              : personalBrand.visual_aesthetic
          if (Array.isArray(aesthetics) && aesthetics.length > 0) {
            contextParts.push(`\n**📐 VISUAL AESTHETIC PREFERENCE (AUTO-APPLY THIS LOOKBOOK):**`)
            contextParts.push(`${aesthetics.join(", ")}`)
            contextParts.push(``)
            contextParts.push(`⚠️ CRITICAL REQUIREMENT: Every concept MUST match this aesthetic automatically.`)
            contextParts.push(
              `- Scandinavian Minimalist → Clean, bright, natural light, minimal styling, Nordic materials`,
            )
            contextParts.push(`- Urban Moody → Dramatic shadows, cinematic feel, sophisticated edge, city atmosphere`)
            contextParts.push(`- High-End Coastal → Effortless luxury, seaside elegance, breezy sophistication`)
            contextParts.push(
              `- Apply the corresponding lookbook style from your creative intelligence WITHOUT being asked`,
            )
            contextParts.push(
              `- This is the default aesthetic for ALL concepts unless user specifically requests different`,
            )
          }
        } catch (e) {
          // Already handled above in original code
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
