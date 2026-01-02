import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Resolve params (Next.js 16 pattern)
    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId

    if (!feedId || feedId === "null" || feedId === "undefined") {
      return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
    }

    const { postId } = await req.json()

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    const feedIdInt = Number.parseInt(feedId, 10)

    // Get the post and feed data
    const [post] = await sql`
      SELECT 
        fp.id,
        fp.position,
        fp.post_type,
        fp.content_pillar,
        fp.prompt,
        fp.description,
        fl.user_id,
        fl.brand_vibe,
        fl.business_type,
        fl.feed_story,
        fl.research_insights
      FROM feed_posts fp
      INNER JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
      WHERE fp.id = ${postId}
      AND fp.feed_layout_id = ${feedIdInt}
      AND fl.user_id = ${neonUser.id}
      LIMIT 1
    `

    if (!post) {
      return NextResponse.json({ error: "Post not found or access denied" }, { status: 404 })
    }

    // Get all other posts' captions for variety (exclude current post)
    const otherPosts = await sql`
      SELECT position, caption
      FROM feed_posts
      WHERE feed_layout_id = ${feedIdInt}
      AND id != ${postId}
      AND caption IS NOT NULL
      AND caption != ''
      ORDER BY position ASC
    `

    const previousCaptions = otherPosts.map((p: any) => ({
      position: p.position,
      caption: p.caption,
    }))

    // Get user's brand profile data
    const [brandProfile] = await sql`
      SELECT 
        brand_voice,
        brand_vibe,
        business_type,
        target_audience,
        content_pillars
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      AND is_completed = true
      LIMIT 1
    `

    // Parse research insights if available
    let researchData = null
    if (post.research_insights) {
      try {
        researchData = typeof post.research_insights === 'string' 
          ? JSON.parse(post.research_insights) 
          : post.research_insights
      } catch (e) {
        console.warn("[v0] Failed to parse research insights:", e)
      }
    }

    // Generate new caption using the same logic as create-from-strategy
    const captionResult = await generateInstagramCaption({
      postPosition: post.position,
      shotType: post.post_type || 'portrait',
      purpose: post.content_pillar || post.description || 'general',
      emotionalTone: 'warm',
      brandProfile: brandProfile || {
        business_type: post.business_type || 'Personal Brand',
        brand_vibe: post.brand_vibe || 'Strategic',
        brand_voice: brandProfile?.brand_voice || 'Authentic',
        target_audience: brandProfile?.target_audience || 'Entrepreneurs',
      },
      targetAudience: brandProfile?.target_audience || 'general audience',
      brandVoice: brandProfile?.brand_voice || 'authentic',
      contentPillar: post.content_pillar || 'lifestyle',
      previousCaptions: previousCaptions,
      researchData: researchData,
    })

    const newCaption = captionResult.caption || ''

    // Update the caption in the database
    await sql`
      UPDATE feed_posts
      SET caption = ${newCaption}
      WHERE id = ${postId}
      AND feed_layout_id = ${feedIdInt}
    `

    console.log(`[v0] ✅ Regenerated caption for post ${postId} (${newCaption.length} chars)`)

    return NextResponse.json({ 
      success: true,
      caption: newCaption,
      message: "Caption regenerated successfully"
    })
  } catch (error) {
    console.error("[v0] Regenerate caption error:", error)
    return NextResponse.json({ 
      error: "Failed to regenerate caption",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

