import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateInstagramStrategy } from "@/lib/feed-planner/instagram-strategy-agent"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Generate strategy document for a feed
 * Returns strategy as markdown (for preview)
 * Does NOT save to database - user approves first via "Add to Feed"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { feedId } = await Promise.resolve(params)
    console.log("[GENERATE-STRATEGY] Generating strategy for feed:", feedId)

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify feed belongs to user
    const [feed] = await sql`
      SELECT * FROM feed_layouts
      WHERE id = ${feedId}
      AND user_id = ${neonUser.id}
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    // Get all posts for feed
    const posts = await sql`
      SELECT 
        id,
        position,
        post_type,
        content_pillar,
        prompt,
        caption
      FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      AND user_id = ${neonUser.id}
      ORDER BY position ASC
    `

    if (posts.length === 0) {
      return NextResponse.json({ error: "No posts found for this feed" }, { status: 404 })
    }

    // Get brand profile
    const [brandProfile] = await sql`
      SELECT 
        name,
        business_type,
        brand_vibe,
        brand_voice,
        target_audience,
        content_pillars
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    console.log(`[GENERATE-STRATEGY] Generating strategy for feed with ${posts.length} posts`)

    // Prepare feed posts data for strategy generation
    const feedPosts = posts.map(post => ({
      position: post.position,
      shotType: post.post_type || 'portrait',
      purpose: post.content_pillar || 'general',
      caption: post.caption || '',
    }))

      // Generate strategy using generateText for markdown output
      const { generateText } = await import("ai")
      
      const strategySystemPrompt = `You are an expert Instagram Growth Strategist with deep expertise in:
- Personal brand storytelling
- Instagram algorithm (2025)
- Viral content patterns
- Engagement psychology
- Creator economy trends
- Story sequencing
- Reels strategy
- Carousel storytelling
- Trending audio and formats

You provide COMPREHENSIVE strategies with NO length limits - your advice is thorough, specific, and actionable. Use markdown formatting with clear sections and headers.`
      
      const strategyPrompt = `Create a COMPREHENSIVE, DETAILED Instagram strategy document for this 9-post feed.

**BRAND CONTEXT:**
- Business Type: ${brandProfile?.business_type || 'Personal Brand'}
- Brand Vibe: ${brandProfile?.brand_vibe || 'Strategic'}
- Brand Voice: ${brandProfile?.brand_voice || 'Authentic'}
- Target Audience: ${brandProfile?.target_audience || 'general audience'}
- Content Pillars: ${brandProfile?.content_pillars || 'education, inspiration, connection'}

**THE 9-POST FEED LAYOUT:**
${feedPosts
  .map(
    (post) => `
Post ${post.position}: ${post.shotType}
Purpose: ${post.purpose}
${post.caption ? `Caption: ${post.caption.substring(0, 150)}...` : ''}
`,
  )
  .join("\n")}

**YOUR MISSION:**
Create a detailed Instagram growth strategy document that covers EVERY aspect of this 9-post feed execution. Use markdown formatting with clear sections.

**REQUIRED SECTIONS:**

1. **OVERALL STRATEGY**
2. **POSTING STRATEGY**
3. **CONTENT MIX STRATEGY**
4. **STORIES STRATEGY FOR EACH POST**
5. **REELS STRATEGY**
6. **CAROUSEL STRATEGY**
7. **TREND UTILIZATION**
8. **TEXT OVERLAY & HOOKS**
9. **GROWTH TACTICS**
10. **HASHTAG STRATEGY**

Be SPECIFIC with times, days, audio names, hashtags. NO vague advice - actionable only.
Reference current 2025 Instagram algorithm insights.
Tailor everything to the brand's niche and personal branding approach.`

      const { text: strategyMarkdown } = await generateText({
        model: "anthropic/claude-sonnet-4",
        system: strategySystemPrompt,
        prompt: strategyPrompt,
        temperature: 0.7,
      })

      console.log(`[GENERATE-STRATEGY] ✅ Strategy generated (${strategyMarkdown.length} chars)`)

      const markdownStrategy = strategyMarkdown || 'Strategy document not available'

      return NextResponse.json({
        success: true,
        feedId: parseInt(feedId),
        strategy: markdownStrategy,
      })
  } catch (error) {
    console.error("[GENERATE-STRATEGY] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate strategy",
      },
      { status: 500 }
    )
  }
}

