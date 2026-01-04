import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 300 // 5 minutes for generating 9 captions

/**
 * Generate captions for all posts in a feed
 * Saves captions directly to database
 * Returns success message with caption count
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
        post_type
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

    // Parse content pillars from brand profile
    let contentPillars: any[] = []
    if (brandProfile?.content_pillars) {
      try {
        const parsed = typeof brandProfile.content_pillars === 'string' 
          ? JSON.parse(brandProfile.content_pillars) 
          : brandProfile.content_pillars
        contentPillars = Array.isArray(parsed) ? parsed : (parsed?.pillars || [])
      } catch (error) {
        console.warn("[GENERATE-CAPTIONS] Failed to parse content_pillars:", error)
      }
    }

    // Strategic caption type rotation for 9 posts
    // Pattern: Story → Value/Tips → Motivational → Story → Value/Tips → Motivational → Story → Value/Tips → Motivational
    const getCaptionType = (position: number): 'story' | 'value' | 'motivational' => {
      const pattern: ('story' | 'value' | 'motivational')[] = [
        'story',        // Post 1: Personal story/origin
        'value',        // Post 2: Educational tip
        'motivational', // Post 3: Inspiration
        'story',        // Post 4: Journey/challenge
        'value',        // Post 5: Actionable tip
        'motivational', // Post 6: Transformation
        'story',        // Post 7: Outcome/success
        'value',        // Post 8: Advanced tip
        'motivational', // Post 9: Community/invitation
      ]
      return pattern[position - 1] || 'story'
    }

    // Get content pillar for this post (rotate through available pillars)
    const getContentPillarForPost = (position: number, postContentPillar: string | null): { name: string; description?: string } => {
      // If post has a specific content_pillar, use it
      if (postContentPillar) {
        return { name: postContentPillar }
      }
      
      // Otherwise, rotate through brand's content pillars
      if (contentPillars.length > 0) {
        const pillarIndex = (position - 1) % contentPillars.length
        const pillar = contentPillars[pillarIndex]
        return {
          name: pillar?.name || pillar || 'lifestyle',
          description: pillar?.description || undefined,
        }
      }
      
      // Fallback
      return { name: 'lifestyle' }
    }

    // Generate captions for all posts
    const captionResults = []
    const previousCaptions: Array<{ position: number; caption: string }> = []

    console.log(`[GENERATE-CAPTIONS] Starting caption generation for ${posts.length} posts`)

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      try {
        console.log(`[GENERATE-CAPTIONS] Processing post ${post.position} (${i + 1}/${posts.length})`)
        const captionType = getCaptionType(post.position)
        const pillarInfo = getContentPillarForPost(post.position, post.content_pillar)
        
        const captionResult = await generateInstagramCaption({
          postPosition: post.position,
          shotType: post.post_type || 'portrait',
          purpose: pillarInfo.name,
          emotionalTone: captionType === 'motivational' ? 'inspiring' : captionType === 'value' ? 'helpful' : 'warm',
          brandProfile: brandProfile || {
            business_type: 'Personal Brand',
            brand_vibe: 'Strategic',
            brand_voice: 'Authentic',
            target_audience: 'Entrepreneurs',
          },
          targetAudience: brandProfile?.target_audience || 'general audience',
          brandVoice: brandProfile?.brand_voice || 'authentic',
          contentPillar: pillarInfo.name,
          previousCaptions,
          researchData: researchData || null,
          captionType, // Pass caption type for strategic variety
          contentPillars, // Pass all pillars for context
        })

        const caption = captionResult.caption || ''
        // Extract hashtags from caption (caption writer doesn't return separate hashtags)
        const hashtagMatches = caption.match(/#\w+/g) || []
        const hashtags = hashtagMatches.map(tag => tag.replace('#', ''))

        // Save caption directly to database
        await sql`
          UPDATE feed_posts
          SET caption = ${caption.trim()}, updated_at = NOW()
          WHERE id = ${post.id}
          AND feed_layout_id = ${feedId}
          AND user_id = ${neonUser.id}
        `

        captionResults.push({
          postId: post.id,
          position: post.position,
          caption,
          hashtags,
          prompt: post.prompt || '',
        })

        // Track for variety in next captions
        previousCaptions.push({
          position: post.position,
          caption,
        })

        console.log(`[GENERATE-CAPTIONS] ✅ Caption generated and saved for post ${post.position}`)
      } catch (error) {
        console.error(`[GENERATE-CAPTIONS] ❌ Error generating caption for post ${post.position}:`, error)
        // Continue with other posts even if one fails
        captionResults.push({
          postId: post.id,
          position: post.position,
          caption: `Check out this post! #instagram #feed`,
          hashtags: ['instagram', 'feed'],
          prompt: post.prompt || '',
          error: error instanceof Error ? error.message : 'Failed to generate caption',
        })
      }
    }

    const successfulCaptions = captionResults.filter(c => !c.error).length
    const failedCaptions = captionResults.filter(c => c.error).length

    console.log(`[GENERATE-CAPTIONS] ✅ Generated and saved ${successfulCaptions} captions${failedCaptions > 0 ? ` (${failedCaptions} failed)` : ''}`)

    return NextResponse.json({
      success: true,
      feedId: parseInt(feedId),
      captionsGenerated: successfulCaptions,
      captionsFailed: failedCaptions,
      totalPosts: posts.length,
      message: `Successfully generated ${successfulCaptions} captions${failedCaptions > 0 ? ` (${failedCaptions} failed)` : ''}`,
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

