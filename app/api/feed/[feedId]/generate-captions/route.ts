import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Generate captions for all posts in a feed
 * Returns captions as array (for preview cards)
 * Does NOT save to database - user approves first via "Add to Feed"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { feedId } = await Promise.resolve(params)
    console.log("[GENERATE-CAPTIONS] Generating captions for feed:", feedId)

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
        prompt,
        content_pillar,
        post_type,
        description
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
        content_pillars,
        color_palette
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    // Get research data if available
    const [researchData] = await sql`
      SELECT 
        research_summary,
        best_hooks,
        trending_hashtags,
        competitive_insights
      FROM content_research
      WHERE user_id = ${neonUser.id.toString()}
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log(`[GENERATE-CAPTIONS] Generating captions for ${posts.length} posts`)

    // Generate captions for all posts
    const captionResults = []
    const previousCaptions: Array<{ position: number; caption: string }> = []

    for (const post of posts) {
      try {
        const captionResult = await generateInstagramCaption({
          postPosition: post.position,
          shotType: post.post_type || 'portrait',
          purpose: post.content_pillar || post.description || 'general',
          emotionalTone: 'warm',
          brandProfile: brandProfile || {
            business_type: 'Personal Brand',
            brand_vibe: 'Strategic',
            brand_voice: 'Authentic',
            target_audience: 'Entrepreneurs',
          },
          targetAudience: brandProfile?.target_audience || 'general audience',
          brandVoice: brandProfile?.brand_voice || 'authentic',
          contentPillar: post.content_pillar || 'lifestyle',
          previousCaptions,
          researchData: researchData || null,
        })

        const caption = captionResult.caption || ''
        // Extract hashtags from caption (caption writer doesn't return separate hashtags)
        const hashtagMatches = caption.match(/#\w+/g) || []
        const hashtags = hashtagMatches.map(tag => tag.replace('#', ''))

        captionResults.push({
          postId: post.id,
          position: post.position,
          caption,
          hashtags,
          prompt: post.prompt || post.description || '',
        })

        // Track for variety in next captions
        previousCaptions.push({
          position: post.position,
          caption,
        })

        console.log(`[GENERATE-CAPTIONS] ✅ Caption generated for post ${post.position}`)
      } catch (error) {
        console.error(`[GENERATE-CAPTIONS] ❌ Error generating caption for post ${post.position}:`, error)
        // Continue with other posts even if one fails
        captionResults.push({
          postId: post.id,
          position: post.position,
          caption: `Check out this post! #instagram #feed`,
          hashtags: ['instagram', 'feed'],
          prompt: post.prompt || post.description || '',
          error: error instanceof Error ? error.message : 'Failed to generate caption',
        })
      }
    }

    console.log(`[GENERATE-CAPTIONS] ✅ Generated ${captionResults.length} captions`)

    return NextResponse.json({
      success: true,
      feedId: parseInt(feedId),
      captions: captionResults,
    })
  } catch (error) {
    console.error("[GENERATE-CAPTIONS] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate captions",
      },
      { status: 500 }
    )
  }
}

