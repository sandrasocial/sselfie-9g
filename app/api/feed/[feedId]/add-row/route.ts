import { type NextRequest, NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { generateObject } from "ai"
import { z } from "zod"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 300

export async function POST(request: NextRequest, { params }: { params: Promise<{ feedId: string }> }) {
  try {
    const { feedId } = await params
    console.log("[v0] [ADD-ROW] Starting add row for feed:", feedId)

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify feed belongs to user
    const [feed] = await sql`
      SELECT * FROM feed_layouts
      WHERE id = ${feedId}
      AND user_id = ${user.id}
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    console.log("[v0] [ADD-ROW] Feed found:", {
      brandVibe: feed.brand_vibe,
      businessType: feed.business_type,
      colorPalette: feed.color_palette,
    })

    // Get current post count to determine starting position
    const existingPosts = await sql`
      SELECT COUNT(*) as count FROM feed_posts
      WHERE feed_layout_id = ${feedId}
    `
    const startPosition = Number.parseInt(existingPosts[0].count)

    console.log("[v0] [ADD-ROW] Current posts:", startPosition, "New posts will start at position:", startPosition)

    // Generate 3 new posts using AI
    console.log("[v0] [ADD-ROW] Generating 3 new post concepts...")
    const { object: newPosts } = await generateObject({
      model: "anthropic/claude-sonnet-4.5",
      schema: z.object({
        posts: z
          .array(
            z.object({
              type: z.enum(["Close-Up", "Half Body", "Full Body", "Lifestyle", "Object"]),
              tone: z.enum(["warm", "cool"]),
              purpose: z.string(),
              composition: z.string(),
              styleDirection: z.string(),
            }),
          )
          .length(3),
      }),
      prompt: `You are Maya, an expert Instagram visual strategist.

Generate 3 MORE posts to extend an existing Instagram feed for a ${feed.business_type}.

**Existing Feed Context:**
- Brand Vibe: ${feed.brand_vibe}
- Color Palette: ${feed.color_palette}
- Feed Story: ${feed.feed_story}
- Visual Rhythm: ${feed.visual_rhythm}

**Your Task:**
Create 3 new posts that:
1. Continue the visual rhythm and flow of the existing feed
2. Maintain consistency with the brand aesthetic
3. Add variety while staying cohesive
4. Use diverse post types for visual interest

For each post, provide:
- Type and tone for visual balance
- Specific purpose in the feed story
- Unique composition and styling direction

Be creative and ensure these posts feel like a natural extension of the existing feed.`,
    })

    console.log("[v0] [ADD-ROW] AI generated 3 new post concepts")

    // Convert AI concepts to post prompts
    const postPrompts = newPosts.posts.map((post, index) => {
      if (post.type === "Object") {
        return {
          prompt: `${feed.color_palette.replace(/#[0-9a-fA-F]{6}/g, "").trim()} styled flatlay photography, ${post.styleDirection}, elegant arrangement, overhead shot with soft directional natural lighting creating gentle shadows, professional editorial quality with ${feed.brand_vibe} aesthetic, carefully curated brand-aligned objects, shallow depth of field with creamy bokeh, subtle film grain texture, high-end commercial photography, sophisticated composition, trending Instagram aesthetic 2025, warm inviting atmosphere, cohesive color story`,
          category: "Object",
        }
      }

      const lensSpecs = {
        "Close-Up": "shot on 85mm lens f/1.4, shallow depth of field, creamy bokeh, face focus",
        "Half Body": "shot on 50mm lens f/2.0, medium depth of field, balanced composition, upper body focus",
        "Full Body": "shot on 35mm lens f/2.8, environmental context, full scene, head to toe",
        Lifestyle: "shot on 35mm lens f/2.0, natural environment, authentic moment, environmental storytelling",
      }

      const colorDescription = feed.color_palette
        .replace(/#[0-9a-fA-F]{6}/g, "")
        .replace(/,\s*,/g, ",")
        .trim()

      const lightingStyle = feed.color_palette.includes("dark")
        ? "dramatic lighting with moody shadows and high contrast, cinematic atmosphere"
        : "soft natural lighting with gentle shadows and even exposure, warm inviting glow"

      const genderStyling =
        user.gender === "woman" || user.gender === "female"
          ? "elegant flowing hair styled naturally, refined makeup with natural glow, feminine grace and confidence"
          : user.gender === "man" || user.gender === "male"
            ? "styled hair with clean lines, masculine confidence and presence, strong professional demeanor"
            : "styled appearance with confident presence, authentic professional energy"

      const fashionDetails =
        post.type === "Full Body"
          ? `wearing sophisticated ${colorDescription} attire with impeccable tailoring and refined silhouette, ${post.styleDirection}, styled with carefully chosen accessories that complement the overall aesthetic, complete outfit showcasing personal style and brand identity`
          : post.type === "Half Body"
            ? `dressed in elegant ${colorDescription} professional attire with attention to fabric quality and fit, ${post.styleDirection}, styled with minimal sophisticated accessories, upper body styling that conveys both professionalism and approachability`
            : post.type === "Close-Up"
              ? `styled with ${colorDescription} tones in clothing and background, ${post.styleDirection}, natural skin texture with healthy radiant glow, authentic expression that connects with viewers`
              : `authentic ${colorDescription} styling that feels natural and effortless, ${post.styleDirection}, environmental elements that tell a story, genuine moment captured with editorial quality`

      return {
        prompt: `${user.trigger_word}, ${genderStyling}, ${fashionDetails}, ${post.styleDirection}, ${lensSpecs[post.type as keyof typeof lensSpecs]}, ${lightingStyle}, natural skin texture with subtle film grain for authenticity, ${post.composition}, timeless elegance meets modern sophistication, high-end editorial photography with ${feed.brand_vibe} aesthetic, genuine professional presence that feels both aspirational and relatable, trending Instagram aesthetic 2025, cohesive visual story`,
        category: post.type,
      }
    })

    // Insert new posts into database
    console.log("[v0] [ADD-ROW] Saving 3 new posts to database...")
    const insertedPosts = []
    for (let i = 0; i < postPrompts.length; i++) {
      const post = postPrompts[i]
      const [insertedPost] = await sql`
        INSERT INTO feed_posts (
          feed_layout_id, user_id, position, prompt, post_type,
          caption, generation_status
        )
        VALUES (
          ${feedId}, ${user.id}, ${startPosition + i}, ${post.prompt}, ${post.category},
          ${"Caption will be generated by Instagram Caption Strategist..."},
          'pending'
        )
        RETURNING id, position, prompt, post_type
      `
      insertedPosts.push(insertedPost)

      if (i < postPrompts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }

    console.log("[v0] [ADD-ROW] Posts saved, generating captions...")

    // Generate captions for new posts
    try {
      const newPostsForCaptions = await sql`
        SELECT id, prompt, post_type, position
        FROM feed_posts
        WHERE feed_layout_id = ${feedId}
        AND position >= ${startPosition}
        ORDER BY position ASC
      `

      // Generate captions for each new post
      for (const post of newPostsForCaptions) {
        try {
          const { generateCaptionForPost } = await import("@/lib/instagram-strategist/caption-logic")
          const caption = await generateCaptionForPost({
            postPrompt: post.prompt,
            postType: post.post_type,
            brandVibe: feed.brand_vibe,
            businessType: feed.business_type,
            feedStory: feed.feed_story,
            researchData: feed.research_insights,
          })

          await sql`
            UPDATE feed_posts
            SET caption = ${caption}
            WHERE id = ${post.id}
          `
        } catch (captionError) {
          console.error("[v0] [ADD-ROW] Caption generation error for post:", post.id, captionError)
        }
      }

      console.log("[v0] [ADD-ROW] Captions generated for", newPostsForCaptions.length, "posts")
    } catch (captionError) {
      console.error("[v0] [ADD-ROW] Caption generation error:", captionError)
      // Continue even if captions fail
    }

    // Fetch the complete new posts with captions
    const newPostsData = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      AND position >= ${startPosition}
      ORDER BY position ASC
    `

    console.log("[v0] [ADD-ROW] Successfully added 3 new posts")

    return NextResponse.json({
      success: true,
      posts: newPostsData,
      message: "3 new posts added to your feed",
    })
  } catch (error) {
    console.error("[v0] [ADD-ROW] Error:", error)
    return NextResponse.json({ error: "Failed to add row" }, { status: 500 })
  }
}
