import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const neonUser = await getUserByAuthId(user.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get latest feed design
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
      WHERE user_id = ${neonUser.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!feedLayout) {
      return NextResponse.json({
        hasDesign: false,
        previewImages: [],
        conceptCards: [],
        feedStrategy: null,
      })
    }

    // Get feed posts with images
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
      AND user_id = ${neonUser.id}
      ORDER BY position ASC
    `

    const completedPosts = feedPosts.filter((post) => post.image_url && post.generation_status === "completed")
    const pendingConcepts = feedPosts.filter((post) => !post.image_url && post.generation_status === "pending")

    // Get preview images (first 9 completed images)
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

    return NextResponse.json({
      hasDesign: true,
      previewImages,
      conceptCards, // Added concept cards to response
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
        pendingConcepts: conceptCards.length, // Added pending concepts count
        status: feedLayout.status,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching feed preview:", error)
    return NextResponse.json({ error: "Failed to fetch feed preview" }, { status: 500 })
  }
}
