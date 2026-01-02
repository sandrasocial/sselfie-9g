import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUser(request)

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Get latest feed strategy
    const [feedLayout] = await sql`
      SELECT 
        id,
        title,
        description,
        brand_vibe,
        business_type,
        color_palette,
        visual_rhythm,
        feed_story,
        username,
        brand_name,
        created_at,
        status
      FROM feed_layouts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!feedLayout) {
      return NextResponse.json({
        hasStrategy: false,
        previewImages: [],
        conceptCards: [],
        feedStrategy: null,
      })
    }

    // Get feed posts
    const feedPosts = await sql`
      SELECT 
        id,
        position,
        post_type,
        image_url,
        caption,
        prompt,
        generation_status
      FROM feed_posts
      WHERE feed_layout_id = ${feedLayout.id}
      AND user_id = ${user.id}
      ORDER BY position ASC
    `

    // Calculate processing progress
    const totalPosts = feedPosts.length
    const postsWithPrompts = feedPosts.filter((post) => post.prompt && post.prompt !== 'Generating prompt...').length
    const postsWithCaptions = feedPosts.filter((post) => post.caption && post.caption !== 'Generating caption...').length
    const completedPosts = feedPosts.filter((post) => post.image_url && post.generation_status === "completed")
    const pendingConcepts = feedPosts.filter((post) => !post.image_url && post.generation_status === "pending")
    
    // Determine processing stage
    let processingStage: 'creating_posts' | 'generating_prompts' | 'generating_captions' | 'queueing_images' | 'generating_images' | 'completed' = 'creating_posts'
    let processingProgress = 0
    
    // Guard against division by zero when feed has no posts yet
    if (totalPosts > 0) {
      if (feedLayout.status === 'processing') {
        if (postsWithPrompts === totalPosts && postsWithCaptions === totalPosts) {
          processingStage = 'queueing_images'
          processingProgress = 90
        } else if (postsWithPrompts === totalPosts) {
          processingStage = 'generating_captions'
          processingProgress = 50 + Math.round((postsWithCaptions / totalPosts) * 40)
        } else {
          processingStage = 'generating_prompts'
          processingProgress = Math.round((postsWithPrompts / totalPosts) * 50)
        }
      } else if (feedLayout.status === 'queueing') {
        processingStage = 'queueing_images'
        processingProgress = 90
      } else if (feedLayout.status === 'pending') {
        processingStage = 'generating_images'
        processingProgress = 90 + Math.round((completedPosts.length / totalPosts) * 10)
      } else if (completedPosts.length === totalPosts) {
        processingStage = 'completed'
        processingProgress = 100
      }
    }

    const previewImages = completedPosts.slice(0, 9).map((post) => ({
      url: post.image_url,
      position: post.position,
      type: post.post_type,
    }))

    const conceptCards = pendingConcepts.slice(0, 9).map((post) => ({
      id: post.id,
      title: post.post_type || "New Post",
      description: post.caption || "Click to generate this post",
      category: post.post_type || "Portrait",
      prompt: post.prompt || "",
      position: post.position,
    }))

    // Get bio
    const [bio] = await sql`
      SELECT bio_text FROM instagram_bios
      WHERE feed_layout_id = ${feedLayout.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    // Get highlights
    const highlights = await sql`
      SELECT id, title, prompt, image_url
      FROM instagram_highlights
      WHERE feed_layout_id = ${feedLayout.id}
      ORDER BY created_at ASC
    `

    return NextResponse.json({
      hasStrategy: true,
      previewImages,
      conceptCards,
      feedStrategy: {
        id: feedLayout.id,
        title: feedLayout.title,
        description: feedLayout.description,
        brandVibe: feedLayout.brand_vibe,
        businessType: feedLayout.business_type,
        colorPalette: feedLayout.color_palette,
        visualRhythm: feedLayout.visual_rhythm,
        feedStory: feedLayout.feed_story,
        username: feedLayout.username,
        brandName: feedLayout.brand_name,
        totalPosts: feedPosts.length,
        completedPosts: previewImages.length,
        pendingConcepts: conceptCards.length,
        status: feedLayout.status,
        bio: bio?.bio_text || null,
        highlights: highlights || [],
        // Progress tracking
        processingStage,
        processingProgress,
        postsWithPrompts,
        postsWithCaptions,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching feed status:", error)
    return NextResponse.json({ error: "Failed to fetch feed status" }, { status: 500 })
  }
}
