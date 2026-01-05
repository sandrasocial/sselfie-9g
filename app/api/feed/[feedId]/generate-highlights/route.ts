import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateText } from "ai"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: Promise<{ feedId: string }> | { feedId: string } }) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resolvedParams = await Promise.resolve(params)
    const { feedId } = resolvedParams
    
    if (!feedId) {
      console.error("[GENERATE-HIGHLIGHTS] Missing feedId in params:", params)
      return NextResponse.json({ error: "Missing feed ID" }, { status: 400 })
    }
    
    const feedIdInt = parseInt(String(feedId), 10)

    if (isNaN(feedIdInt)) {
      console.error("[GENERATE-HIGHLIGHTS] Invalid feedId format:", feedId, typeof feedId)
      return NextResponse.json({ error: "Invalid feed ID format" }, { status: 400 })
    }
    
    console.log("[GENERATE-HIGHLIGHTS] Processing feedId:", feedIdInt)

    // Get feed data
    const feedLayouts = await sql`
      SELECT * FROM feed_layouts WHERE id = ${feedIdInt} AND user_id = ${neonUser.id} LIMIT 1
    `
    if (feedLayouts.length === 0) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    const feedLayout = feedLayouts[0]

    // Get feed posts
    const feedPosts = await sql`
      SELECT content_pillar, caption, prompt FROM feed_posts
      WHERE feed_layout_id = ${feedIdInt}
      ORDER BY position ASC
    `

    // Get brand profile with colors
    const brandProfiles = await sql`
      SELECT business_type, brand_vibe, brand_voice, target_audience, content_pillars, color_theme, color_palette
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id} AND is_completed = true
      LIMIT 1
    `
    const brandProfile = brandProfiles[0]
    
    // Extract brand colors from color_palette or color_theme
    let brandColors: string[] = []
    if (brandProfile?.color_palette) {
      try {
        // color_palette is JSONB, could be array of strings or array of objects
        const palette = typeof brandProfile.color_palette === 'string' 
          ? JSON.parse(brandProfile.color_palette)
          : brandProfile.color_palette
        if (Array.isArray(palette)) {
          // Extract hex values from array (could be strings or objects with hex property)
          brandColors = palette.map((c: any) => {
            if (typeof c === 'string') return c
            if (c?.hex) return c.hex
            if (c?.color) return c.color
            return null
          }).filter(Boolean)
        }
      } catch (e) {
        console.error("[GENERATE-HIGHLIGHTS] Failed to parse color_palette:", e)
      }
    }
    
    // If no custom colors, use theme-based colors
    if (brandColors.length === 0 && brandProfile?.color_theme) {
      const themeColors: Record<string, string[]> = {
        'dark-moody': ["#000000", "#2C2C2C", "#4A4A4A", "#6B6B6B"],
        'minimalist-clean': ["#FFFFFF", "#F5F5F0", "#E8E4DC", "#D4CFC4"],
        'beige-creamy': ["#F5F1E8", "#E8DCC8", "#D4C4A8", "#B8A88A"],
        'pastel-coastal': ["#E8F4F8", "#B8E0E8", "#88CCD8", "#5BA8B8"],
        'warm-terracotta': ["#E8D4C8", "#C8A898", "#A88878", "#886858"],
        'bold-colorful': ["#FF6B9D", "#FFA07A", "#FFD700", "#98D8C8"],
      }
      brandColors = themeColors[brandProfile.color_theme] || []
    }
    
    // Extract content pillars from brand profile (preferred) or feed posts
    let brandPillars: string[] = []
    if (brandProfile?.content_pillars) {
      try {
        const pillars = JSON.parse(brandProfile.content_pillars)
        // Handle both array of strings and array of objects with 'name' property
        brandPillars = Array.isArray(pillars) 
          ? pillars.map((p: any) => typeof p === 'string' ? p : p.name || p.pillar || String(p)).filter(Boolean)
          : []
      } catch (e) {
        console.error("[GENERATE-HIGHLIGHTS] Failed to parse content_pillars:", e)
      }
    }
    
    // Fallback to feed posts content pillars if brand pillars not available
    if (brandPillars.length === 0) {
      brandPillars = feedPosts.map((p: any) => p.content_pillar).filter(Boolean).slice(0, 5)
    }

    // Generate highlight titles using AI
    console.log("[GENERATE-HIGHLIGHTS] Starting AI generation...")
    let highlightsText: string
    try {
      const result = await generateText({
        model: "anthropic/claude-sonnet-4",
        system: `You are an expert Instagram strategist. Generate 3-4 Instagram story highlight titles that align with the brand's content pillars and aesthetic.
Return ONLY a JSON array of highlight titles, like: ["About", "Products", "Travel", "Tips"]
Each title should be 1-2 words, relevant to the brand's content strategy and pillars.`,
        prompt: `Generate Instagram story highlight titles that align with this brand's content pillars and aesthetic:

Brand: ${brandProfile?.business_type || feedLayout.brand_name || "Personal Brand"}
Brand Vibe: ${brandProfile?.brand_vibe || "Creative"}
Target Audience: ${brandProfile?.target_audience || "General"}
Content Pillars: ${brandPillars.length > 0 ? brandPillars.join(", ") : feedPosts.map((p: any) => p.content_pillar).filter(Boolean).slice(0, 5).join(", ")}

Return a JSON array of 3-4 highlight titles (maximum 4) that reflect the brand's content strategy and pillars.`,
        temperature: 0.7,
      })
      highlightsText = result.text
      console.log("[GENERATE-HIGHLIGHTS] AI generation successful")
    } catch (aiError) {
      console.error("[GENERATE-HIGHLIGHTS] AI generation failed:", aiError)
      throw new Error(`AI generation failed: ${aiError instanceof Error ? aiError.message : String(aiError)}`)
    }

    // Parse the JSON array from the response
    let highlights: string[] = []
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = highlightsText.match(/\[.*?\]/s)
      if (jsonMatch) {
        highlights = JSON.parse(jsonMatch[0])
      } else {
        highlights = JSON.parse(highlightsText)
      }
    } catch (error) {
      // Fallback to default highlights
      highlights = ["About", "Products", "Travel", "Tips"]
    }

    // Ensure we have 3-4 highlights (max 4)
    if (highlights.length < 3) {
      highlights = [...highlights, "About", "Products", "Tips"].slice(0, 4)
    }
    if (highlights.length > 4) {
      highlights = highlights.slice(0, 4)
    }

    console.log("[GENERATE-HIGHLIGHTS] Successfully generated highlights:", highlights)
    console.log("[GENERATE-HIGHLIGHTS] Using brand colors:", brandColors.length > 0 ? brandColors : "default colors")
    return NextResponse.json({ 
      highlights,
      brandColors: brandColors.length > 0 ? brandColors : undefined // Include brand colors in response
    })
  } catch (error) {
    console.error("[GENERATE-HIGHLIGHTS] Error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to generate highlights", details: errorMessage },
      { status: 500 }
    )
  }
}

