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

    // Get brand profile
    const brandProfiles = await sql`
      SELECT business_type, brand_vibe, brand_voice, target_audience, content_pillars
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id} AND is_completed = true
      LIMIT 1
    `
    const brandProfile = brandProfiles[0]

    // Generate highlight titles using AI
    console.log("[GENERATE-HIGHLIGHTS] Starting AI generation...")
    let highlightsText: string
    try {
      const result = await generateText({
        model: "anthropic/claude-sonnet-4",
        system: `You are an expert Instagram strategist. Generate 3-4 Instagram story highlight titles based on feed content. 
Return ONLY a JSON array of highlight titles, like: ["About", "Products", "Travel", "Tips"]
Each title should be 1-2 words, relevant to the feed content.`,
        prompt: `Generate Instagram story highlight titles for this feed:

Brand: ${brandProfile?.business_type || feedLayout.brand_name || "Personal Brand"}
Vibe: ${brandProfile?.brand_vibe || "Creative"}
Content Pillars: ${feedPosts.map((p: any) => p.content_pillar).filter(Boolean).slice(0, 5).join(", ")}

Return a JSON array of 3-4 highlight titles (maximum 4).`,
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
    return NextResponse.json({ highlights })
  } catch (error) {
    console.error("[GENERATE-HIGHLIGHTS] Error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to generate highlights", details: errorMessage },
      { status: 500 }
    )
  }
}

