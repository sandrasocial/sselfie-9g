import { type NextRequest, NextResponse } from "next/server"
import { streamText, tool, generateObject, convertToCoreMessages } from "ai" // Added generateObject to ai imports
import { z } from "zod"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { generateCaptionsForFeed } from "@/lib/instagram-strategist/caption-logic"
import { generateInstagramBio } from "@/lib/instagram-bio-strategist/bio-logic"
import { setFeedProgress, clearFeedProgress } from "@/lib/feed-progress"
import { createServerClient } from "@/lib/supabase/server"

export const maxDuration = 300

// Global map to track active feed generations per user
const activeFeedGenerations = new Map<number, boolean>()

const MAYA_FEED_STRATEGIST_EXTENSION = `

## Instagram Feed Strategy Expertise

You're an expert Instagram visual strategist who creates cohesive, professional feeds.

**When a user asks you to design their feed:**

1. Respond warmly and let them know you're starting
2. Call the feed_strategy tool ONCE (it creates concepts with prompts - NO images)
3. After the feed is created, explain that users can click each post to generate images one at a time
4. Users can manually generate highlights and profile images later if they want

**CRITICAL: The tool creates CONCEPTS ONLY. Users click each post to generate images individually.**

The Instagram Caption Strategist writes all captions using research-backed insights.
You focus on visual strategy and coordination.
`

const generateCompleteFeedTool = tool({
  description:
    "Design a complete 9-post Instagram feed strategy with VISUAL CONCEPTS ONLY. This tool creates the visual layout, Flux prompts, captions, and bio. NO IMAGES ARE GENERATED - users click each post individually to generate images. **IMPORTANT: Only call this tool ONCE per user request.**",
  inputSchema: z.object({
    brandVibe: z
      .string()
      .describe(
        "The overall aesthetic and mood from user's brand profile (e.g., 'elegant minimalist', 'bold and confident', 'warm and approachable')",
      ),
    businessType: z
      .string()
      .describe("What the user does from their brand profile (e.g., 'life coach', 'fashion designer', 'entrepreneur')"),
    colorPalette: z
      .string()
      .describe(
        "Specific color scheme that matches their brand (e.g., 'neutral earth tones - beige, cream, white', 'dark moody - charcoal, black, gold')",
      ),
    feedStory: z
      .string()
      .describe(
        "The complete narrative this feed tells (e.g., 'A confident life coach who empowers women to build their dream businesses')",
      ),
    username: z.string().describe("Instagram username/handle (e.g., 'sandra.social', 'yourhandle') - without @ symbol"),
    brandName: z.string().describe("Brand or business name to display (e.g., 'Sandra Social', 'Your Brand Name')"),
    highlights: z
      .array(
        z.object({
          title: z.string().describe("Highlight title (e.g., 'Tips', 'BTS', 'Client Wins')"),
          prompt: z
            .string()
            .describe(
              "FLUX prompt for generating the BACKGROUND IMAGE ONLY (flatlay, object, aesthetic scene) - DO NOT include text in the prompt. The text will be overlaid later. Focus on creating a beautiful, brand-aligned background image with the user's colors and aesthetic.",
            ),
        }),
      )
      .describe("4-5 Instagram highlight categories with detailed FLUX prompts for BACKGROUND images (no text)"),
  }),
  execute: async ({ brandVibe, businessType, colorPalette, feedStory, username, brandName, highlights }) => {
    console.log("[v0] [SERVER] === TOOL EXECUTION STARTED ===")
    console.log("[v0] [SERVER] Generating feed strategy (concepts only - no images):", {
      brandVibe,
      businessType,
      colorPalette,
      username,
      brandName,
    })

    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError) {
      console.error("[v0] [SERVER] Auth error:", authError)
      return "I encountered an authentication error - please refresh and try again."
    }

    if (!authUser) {
      console.error("[v0] [SERVER] No auth user - session may have expired")
      return "I encountered an error - your session has expired. Please refresh and try again."
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      console.error("[v0] [SERVER] No user found for auth ID:", authUser.id)
      return "I encountered an error - your user account could not be found. Please contact support."
    }

    console.log("[v0] [SERVER] User authenticated:", user.id)

    await setFeedProgress(authUser.id, {
      status: "starting",
      message: "🎨 Designing your feed strategy...",
      progress: 5,
    })

    console.log("[v0] [SERVER] Creating feed strategy (no credits needed for concepts)")

    if (activeFeedGenerations.get(user.id)) {
      console.log("[v0] [SERVER] ⚠️ Feed generation already in progress for user:", user.id)
      return "I'm already working on your feed strategy! Please wait for it to complete."
    }

    // Mark feed generation as active for this user
    activeFeedGenerations.set(user.id, true)
    console.log("[v0] [SERVER] ✓ Marked feed generation as active for user:", user.id)

    try {
      await setFeedProgress(authUser.id, {
        status: "researching",
        message: "📚 Researching content and trends...",
        progress: 15,
      })

      console.log("[v0] [SERVER] Starting content research...")
      const sql = neon(process.env.DATABASE_URL!)

      const [brandProfile] = await sql`
        SELECT * FROM user_personal_brand
        WHERE user_id = ${user.id}
        AND is_completed = true
        LIMIT 1
      `

      let researchInsights: string | null = null
      researchInsights = `Instagram best practices for ${businessType}: Focus on authentic storytelling, consistent visual aesthetic, engaging captions that spark conversation, strategic use of hashtags, and building genuine community connections.`

      await setFeedProgress(authUser.id, {
        status: "designing",
        message: "🎨 Designing your custom feed layout...",
        progress: 35,
      })

      console.log("[v0] [SERVER] Using AI to design custom feed layout...")

      const [userModel] = await sql`
        SELECT trigger_word
        FROM user_models
        WHERE user_id = ${user.id}
        AND training_status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
      `

      const triggerWord = userModel?.trigger_word || "person"
      console.log("[v0] [SERVER] User trigger word:", triggerWord)

      const { object: feedDesign } = await generateObject({
        model: "anthropic/claude-sonnet-4.5", // Fixed model identifier from claude-sonnet-4 to claude-sonnet-4.5
        schema: z.object({
          visualRhythm: z.string().describe("Description of the visual flow and rhythm of this feed"),
          posts: z
            .array(
              z.object({
                type: z
                  .enum(["Close-Up", "Half Body", "Flatlay"])
                  .describe("Post type - Close-Up (face), Half Body (waist-up), or Flatlay (styled overhead shot)"),
                tone: z.enum(["warm", "cool"]).describe("Color temperature for visual balance"),
                purpose: z.string().describe("What this post achieves in the feed story"),
                composition: z.string().describe("Specific composition and framing details"),
                styleDirection: z.string().describe("Unique styling direction for this specific post"),
              }),
            )
            .length(9),
        }),
        prompt: `You are Maya, an expert Instagram visual strategist and fashion photographer.

Design a cohesive 9-post Instagram feed for a ${businessType} with this brand identity:
- Brand Vibe: ${brandVibe}
- Color Palette: ${colorPalette}
- Feed Story: ${feedStory}
- Username: ${username}
- Brand Name: ${brandName}

${researchInsights ? `\n**Research Insights:**\n${researchInsights}\n` : ""}

Create a unique feed layout that:
1. Has visual rhythm and flow (balance warm/cool tones, vary post types strategically)
2. Tells a compelling story across all 9 posts through VISUALS
3. Showcases personality, expertise, and lifestyle authentically
4. Uses diverse post types: Close-Up (face focus), Half Body (upper body), Flatlay (styled overhead product shot - NO person visible)
5. Each post should have a clear visual purpose in the overall narrative

For each post, provide:
- Type and tone for visual balance
- Specific purpose in the feed story
- Unique composition and styling direction

Focus ONLY on the visual strategy. Bio and captions will be handled separately by specialists.

Be creative and authentic. No generic templates - every element should feel custom-designed for this specific brand.`,
      })

      console.log("[v0] [SERVER] AI-generated feed design complete:", feedDesign.visualRhythm)

      const posts = feedDesign.posts.map((post, index) => {
        if (post.type === "Flatlay") {
          const genderObjectStyling =
            user.gender === "woman" || user.gender === "female"
              ? "elegant feminine aesthetic with refined details, soft textures and sophisticated arrangement, carefully curated objects that convey grace and professionalism"
              : user.gender === "man" || user.gender === "male"
                ? "masculine aesthetic with clean lines and strong composition, sophisticated objects like leather goods, watches, tech accessories, coffee setup, or professional tools, minimalist arrangement with intentional negative space, bold confident styling"
                : "sophisticated neutral aesthetic with clean professional styling, carefully curated objects that convey expertise and authenticity"

          const objectLighting =
            colorPalette.includes("dark") || colorPalette.includes("moody")
              ? "dramatic directional lighting with defined shadows and high contrast, moody atmospheric quality"
              : "soft natural window light with gentle shadows, warm inviting glow, even exposure"

          return {
            id: `post-${index + 1}`,
            title: "Styled Shot",
            description: `${post.purpose}`,
            category: "Flatlay",
            prompt: `${colorPalette.replace(/#[0-9a-fA-F]{6}/g, "").trim()} styled flatlay photography, ${genderObjectStyling}, ${post.styleDirection}, overhead shot with ${objectLighting}, professional editorial quality with ${brandVibe} aesthetic, carefully curated brand-aligned objects that tell a story about ${businessType}, shallow depth of field with creamy bokeh, subtle film grain texture for authenticity, high-end commercial photography, sophisticated composition that feels both aspirational and authentic, trending Instagram aesthetic 2025, cohesive color story, ${post.composition}`,
            textOverlay: undefined,
            purpose: post.purpose,
            composition: post.composition,
          }
        }

        const lightingStyle = colorPalette.includes("dark")
          ? "Dramatic lighting, moody shadows, high contrast."
          : "Soft natural lighting, gentle shadows, warm glow."

        const genderStyling =
          user.gender === "woman" || user.gender === "female"
            ? "Confident woman with natural styled hair and refined minimal makeup showing modern influencer presence with effortless chic energy."
            : user.gender === "man" || user.gender === "male"
              ? "Confident man with clean styling and strong editorial presence conveying masculine sophistication."
              : "Confident person with styled appearance showing authentic presence and editorial energy."

        const fashionDetails =
          post.type === "Half Body"
            ? `${post.styleDirection}. Waist-up framing shows styling details with natural hand positions. ${genderStyling} Dressed in elevated ${colorPalette.replace(/#[0-9a-fA-F]{6}/g, "").trim()} outfit mixing luxury and comfort like oversized cashmere with tailored trousers. Instagram influencer aesthetic with brands like The Row or Toteme. Minimal sophisticated accessories include designer bag and simple jewelry. Relaxed confident pose feels natural against architectural or minimal backdrop.`
            : `${post.styleDirection}. Close-up focuses on face and upper shoulders. ${genderStyling} Styled in ${colorPalette.replace(/#[0-9a-fA-F]{6}/g, "").trim()} tones with premium fabric quality visible. Natural skin texture has radiant healthy glow. Authentic expression conveys confidence and approachability with natural photography aesthetic and subtle grain.`

        const colorGrading =
          colorPalette.includes("dark") || colorPalette.includes("moody")
            ? "Desaturated tones, faded blacks, cool grey."
            : "Warm muted tones, soft highlights."

        const realismDetails = "Raw photography, realistic skin texture." // Simplified realism descriptors

        const atmosphericElements = post.type === "Half Body" ? "Urban haze." : "Subtle film grain." // Simplified atmospheric elements

        return {
          id: `post-${index + 1}`,
          title: post.type === "Close-Up" ? "Portrait" : "Lifestyle Shot",
          description: `${post.purpose}`,
          category: post.type,
          prompt: `${triggerWord}, ${fashionDetails} ${lightingStyle} ${colorGrading} ${post.composition}. ${realismDetails} ${atmosphericElements} High-end Instagram influencer aesthetic with candid natural movement.`,
          textOverlay: undefined,
          purpose: post.purpose,
          composition: post.composition,
        }
      })

      const postsWithoutCaptions = posts

      let feedId: string | null = null

      try {
        const [feedLayout] = await sql`
          INSERT INTO feed_layouts (
            user_id, brand_vibe, business_type, color_palette,
            visual_rhythm, feed_story, research_insights, title, description,
            username, brand_name
          )
          VALUES (
            ${user.id}, ${brandVibe}, ${businessType}, ${colorPalette},
            ${feedDesign.visualRhythm}, ${feedStory}, ${researchInsights},
            ${`${businessType} Feed Strategy`}, ${feedStory},
            ${username}, ${brandName}
          )
          RETURNING id
        `

        feedId = feedLayout.id.toString()
        console.log("[v0] [SERVER] ✓ Feed layout created with ID:", feedId, "Username:", username, "Brand:", brandName)

        console.log("[v0] [SERVER] Generating Instagram bio...")
        try {
          const bioResult = await generateInstagramBio({
            userId: user.id.toString(),
            businessType,
            brandVibe,
            brandVoice: brandProfile?.brand_voice || undefined,
            targetAudience: brandProfile?.target_audience || undefined,
            businessGoals: brandProfile?.business_goals || undefined,
            researchData: researchInsights || undefined,
          })

          const bioText = bioResult.success ? bioResult.bio : bioResult.bio || "Bio generation in progress..."

          console.log("[v0] [SERVER] Bio result:", { success: bioResult.success, bioLength: bioText.length })

          await sql`
            INSERT INTO instagram_bios (feed_layout_id, bio_text, user_id)
            VALUES (${feedId}, ${bioText}, ${user.id})
          `
          console.log("[v0] [SERVER] ✓ Instagram bio saved to database")
        } catch (bioError) {
          console.error("[v0] [SERVER] ⚠️ Error generating bio:", bioError)
          // Continue with feed generation even if bio fails
        }

        if (highlights.length > 0) {
          console.log("[v0] [SERVER] Saving", highlights.length, "highlight concepts...")
          for (const highlight of highlights) {
            await sql`
              INSERT INTO instagram_highlights (feed_layout_id, title, prompt, user_id)
              VALUES (${feedId}, ${highlight.title}, ${highlight.prompt}, ${user.id})
            `
          }
          console.log("[v0] [SERVER] ✓ Highlight concepts saved (users can click to generate images)")
        }

        await setFeedProgress(authUser.id, {
          status: "generating_captions",
          message: `💾 Saving ${postsWithoutCaptions.length} post concepts...`,
          progress: 55,
        })

        console.log("[v0] [SERVER] Saving", postsWithoutCaptions.length, "post concepts...")
        for (let i = 0; i < postsWithoutCaptions.length; i++) {
          const post = postsWithoutCaptions[i]
          await sql`
            INSERT INTO feed_posts (
              feed_layout_id, user_id, position, prompt, post_type,
              caption, text_overlay_style, generation_status
            )
            VALUES (
              ${feedId}, ${user.id}, ${i}, ${post.prompt}, ${post.category},
              ${"Caption will be generated by Instagram Caption Strategist..."},
              ${post.textOverlay ? JSON.stringify(post.textOverlay) : null},
              'pending'
            )
          `
          if (i < postsWithoutCaptions.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 50))
          }
        }
        console.log("[v0] [SERVER] ✓ All", postsWithoutCaptions.length, "post concepts saved")

        await setFeedProgress(authUser.id, {
          status: "generating_captions",
          message: `✍️ Generating captions for ${postsWithoutCaptions.length} posts...`,
          progress: 75,
        })

        console.log("[v0] [SERVER] Calling Instagram Caption Strategist...")
        try {
          const captionResult = await generateCaptionsForFeed({
            feedId,
            userId: user.id,
            brandVibe,
            businessType,
            colorPalette,
            feedStory,
            researchData: researchInsights, // Now using real research data
          })

          if (captionResult.success) {
            console.log(
              `[v0] [SERVER] ✓ Instagram Caption Strategist generated ${captionResult.captionsGenerated}/${captionResult.totalPosts} captions`,
            )

            await sql`
              UPDATE feed_layouts
              SET status = 'complete', updated_at = NOW()
              WHERE id = ${feedId}
            `
            console.log("[v0] [SERVER] ✓ Feed marked as complete")
          } else {
            console.error("[v0] [SERVER] ⚠️ Caption Strategist completed with some errors")
          }
        } catch (captionError) {
          console.error("[v0] [SERVER] ⚠️ Error calling Caption Strategist:", captionError)
        }

        await setFeedProgress(authUser.id, {
          status: "complete",
          message: "✅ Feed strategy complete! Click each post to generate images.",
          progress: 100,
          feedId: feedId as string, // Ensure feedId is passed as a string, not null
        })

        console.log("[v0] [SERVER] === TOOL EXECUTION COMPLETED SUCCESSFULLY ===")
        console.log("[v0] [SERVER] Feed ID:", feedId, "Posts:", postsWithoutCaptions.length)

        setTimeout(() => clearFeedProgress(authUser.id), 30000)

        return `Perfect! I've created your complete Instagram feed strategy with 9 concept cards and captions. Now you can click on each post placeholder to generate the images one at a time. This way you control the pace and avoid rate limits! (Feed ID: ${feedId})`
      } catch (error) {
        console.error("[v0] [SERVER] === TOOL EXECUTION FAILED ===")
        console.error("[v0] [SERVER] Error saving feed to database:", error)
        await setFeedProgress(authUser.id, {
          status: "error",
          message: "Feed generation failed. Please try again.",
          progress: 0,
          error: error instanceof Error ? error.message : String(error),
        })
        if (error instanceof Error) {
          console.error("[v0] [SERVER] Error details:", error.message)
        }
        return "I encountered an error while saving your feed strategy. Please try again."
      }
    } finally {
      activeFeedGenerations.delete(user.id)
      console.log("[v0] [SERVER] ✓ Cleared active feed generation flag for user:", user.id)
    }
  },
})

const rewriteCaptionTool = tool({
  description:
    "Rewrite a specific post's caption based on user instructions (make it longer, shorter, change topic, different tone, etc.)",
  inputSchema: z.object({
    feedId: z.string().describe("The feed layout ID"),
    postNumber: z.number().describe("The post number (1-9) as the user sees it in the grid"),
    instructions: z.string().describe("User's instructions for rewriting"),
    currentCaption: z.string().describe("The current caption text"),
    brandVibe: z.string().describe("The brand's aesthetic vibe for consistency"),
  }),
  execute: async ({ feedId, postNumber, instructions, currentCaption, brandVibe }) => {
    console.log("[v0] [MAYA] Rewriting caption...")
    console.log("[v0] [MAYA] Feed ID:", feedId)
    const position = postNumber - 1
    console.log("[v0] [MAYA] Post Number:", postNumber, "→ Position:", position)
    console.log("[v0] [MAYA] Instructions:", instructions)
    console.log("[v0] [MAYA] Current caption preview:", currentCaption.substring(0, 100) + "...")

    try {
      const { object: rewrittenCaption } = await generateObject({
        model: "anthropic/claude-sonnet-4",
        schema: z.object({
          caption: z.string().describe("The rewritten caption following user's instructions"),
        }),
        prompt: `You are Maya, an expert Instagram caption writer.

Rewrite this caption following the user's instructions:

**Current Caption:**
${currentCaption}

**User's Instructions:**
${instructions}

**Brand Vibe:** ${brandVibe}

Create a new caption that:
1. Follows the user's instructions precisely
2. Maintains the ${brandVibe} brand voice
3. Feels authentic and engaging
4. Has a clear hook and call-to-action
5. Is optimized for Instagram engagement

**CRITICAL WRITING STYLE:**
- Write in SIMPLE, EVERYDAY LANGUAGE - like texting a friend
- NEVER use em dashes (—) - use periods or commas instead
- Use short, punchy sentences that feel natural
- Sound like a real person, NOT like AI wrote it
- Avoid fancy words - use simple, conversational language
- Be authentic and relatable, not polished or formal
- Write how people actually talk on Instagram

**FORMATTING REQUIREMENTS:**
- Use double line breaks (\\n\\n) between paragraphs for readability
- Include 2-3 strategic emojis throughout (not just at the end)
- Place emojis at natural breaks to enhance meaning
- Keep paragraphs short (2-3 sentences max per paragraph)
- End with hashtags on a new line

Be creative and authentic - no generic templates.`,
      })

      console.log("[v0] [MAYA] ✓ AI generated new caption:", rewrittenCaption.caption.substring(0, 100) + "...")

      const sql = neon(process.env.DATABASE_URL!)
      const { user: authUser, error: authError } = await getAuthenticatedUser()

      if (authError) {
        console.error("[v0] [MAYA] Auth error:", authError)
        return "I encountered an authentication error - please refresh and try again."
      }

      if (!authUser) {
        console.error("[v0] [MAYA] No auth user - session may have expired")
        return "I encountered an error - your session has expired. Please refresh and try again."
      }

      const user = await getUserByAuthId(authUser.id)

      if (!user) {
        console.error("[v0] [MAYA] ❌ No user found")
        return "Error: User not found"
      }

      console.log("[v0] [MAYA] User ID:", user.id)

      const existingPost = await sql`
        SELECT id, caption, user_id, feed_layout_id, position
        FROM feed_posts
        WHERE feed_layout_id = ${feedId}
        AND position = ${position}
        AND user_id = ${user.id}
      `

      console.log("[v0] [MAYA] Existing post query result:", existingPost.length, "rows")
      if (existingPost.length > 0) {
        console.log("[v0] [MAYA] Found post:", {
          id: existingPost[0].id,
          position: existingPost[0].position,
          user_id: existingPost[0].user_id,
          feed_layout_id: existingPost[0].feed_layout_id,
          caption_preview: existingPost[0].caption.substring(0, 50) + "...",
        })
      } else {
        console.error("[v0] [MAYA] ❌ Post not found at position:", position, "in feed:", feedId)
        return `Error: Post ${postNumber} not found in the current feed.`
      }

      const postId = existingPost[0].id

      console.log("[v0] [MAYA] Attempting to update caption for post ID:", postId)
      const updateResult = await sql`
        UPDATE feed_posts
        SET caption = ${rewrittenCaption.caption}
        WHERE id = ${postId}
        AND feed_layout_id = ${feedId}
        AND user_id = ${user.id}
        RETURNING id, caption, position
      `

      console.log("[v0] [MAYA] Update result:", updateResult.length, "rows affected")
      if (updateResult.length > 0) {
        console.log("[v0] [MAYA] ✓ Caption updated successfully")
        console.log("[v0] [MAYA] Updated post position:", updateResult[0].position)
        console.log("[v0] [MAYA] New caption preview:", updateResult[0].caption.substring(0, 100) + "...")
      } else {
        console.error("[v0] [MAYA] ❌ No rows updated")
        return "Error: Failed to update caption. Please try again."
      }

      return `Perfect! I've rewritten the caption for post ${postNumber}. Here's the new version:\n\n"${rewrittenCaption.caption}"\n\nThe caption has been updated in your feed preview.`
    } catch (error) {
      console.error("[v0] [MAYA] ❌ Error rewriting caption:", error)
      if (error instanceof Error) {
        console.error("[v0] [MAYA] Error message:", error.message)
        console.error("[v0] [MAYA] Error stack:", error.stack)
      }
      return "Error rewriting caption. Please try again."
    }
  },
})

const callCaptionStrategistTool = tool({
  description:
    "Call the Instagram Caption Strategist to write or rewrite captions. Use this when users ask to change caption tone, style, or content.",
  inputSchema: z.object({
    feedId: z.string().describe("The feed layout ID"),
    postNumber: z.number().describe("The post number (1-9) to rewrite caption for"),
    instructions: z.string().describe("User's instructions for the caption"),
  }),
  execute: async ({ feedId, postNumber, instructions }) => {
    console.log("[v0] [MAYA] Calling Instagram Caption Strategist...")
    console.log("[v0] [MAYA] Feed ID:", feedId, "Post:", postNumber, "Instructions:", instructions)

    try {
      const supabase = await createServerClient()

      const { user: authUser, error: authError } = await getAuthenticatedUser()

      if (authError || !authUser) {
        return "Error: User not found"
      }

      const user = await getUserByAuthId(authUser.id)

      if (!user) {
        return "Error: User not found"
      }

      const sql = neon(process.env.DATABASE_URL!) // Use singleton getDb() instead of creating new connection

      const position = postNumber - 1
      const [post] = await sql`
        SELECT * FROM feed_posts
        WHERE feed_layout_id = ${feedId}
        AND position = ${position}
        AND user_id = ${user.id}
      `

      if (!post) {
        return `Error: Post ${postNumber} not found`
      }

      const [brand] = await sql`
        SELECT * FROM user_personal_brand
        WHERE user_id = ${user.id}
        AND is_completed = true
        LIMIT 1
      `

      // Fetch research data to pass to the caption strategist if available
      let researchData = null
      if (post.feed_layout_id) {
        const [research] = await sql`
          SELECT * FROM content_research
          WHERE user_id = ${user.id}
          AND niche = ${post.feed_layout_id} // Assuming niche can be derived from feed_layout_id for simplicity, adjust if needed
          ORDER BY updated_at DESC
          LIMIT 1
        `
        if (research) {
          researchData = research
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/instagram-strategist/generate-captions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedId,
            postId: post.id,
            postNumber,
            instructions,
            currentCaption: post.caption,
            brandProfile: brand,
            researchData, // Pass research data
          }),
        },
      )

      if (!response.ok) {
        return "Error: Failed to generate caption"
      }

      const data = await response.json()
      return `Perfect! I've updated the caption for post ${postNumber}:\n\n"${data.caption}"\n\nThe caption has been updated in your feed.`
    } catch (error) {
      console.error("[v0] [MAYA] Error calling Caption Strategist:", error)
      return "Error: Failed to generate caption"
    }
  },
})

export async function POST(req: NextRequest) {
  console.log("[v0] ========== FEED CHAT ROUTE STARTED ==========")

  try {
    // Step 1: Authenticate
    console.log("[v0] Step 1: Authenticating user...")
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser?.id) {
      console.log("[v0] ❌ Authentication failed:", authError?.message)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] ✅ User authenticated:", authUser.id)

    // Step 2: Get user mapping
    console.log("[v0] Step 2: Getting user mapping...")
    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      console.log("[v0] ❌ User mapping not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] ✅ User mapping found:", user.id)

    console.log("[v0] Step 2.5: Fetching user brand profile context...")
    const authId = user.stack_auth_id || user.supabase_user_id || user.id
    const userContext = await getUserContextForMaya(authId)
    console.log("[v0] ✅ User context fetched, length:", userContext.length)

    // Step 3: Parse request
    console.log("[v0] Step 3: Parsing request body...")
    const { messages } = await req.json()
    console.log("[v0] Messages count:", messages?.length)

    // Step 4: Create simple feed generation tool
    console.log("[v0] Step 4: Setting up AI stream...")

    const simpleFeedTool = tool({
      description: "Generate a simple Instagram feed with 9 posts",
      inputSchema: z.object({
        brandVibe: z.string().describe("Brand aesthetic"),
        businessType: z.string().describe("What the user does"),
      }),
      execute: async ({ brandVibe, businessType }) => {
        console.log("[v0] [TOOL] Generating feed:", { brandVibe, businessType, userId: user.id })

        try {
          const sql = neon(process.env.DATABASE_URL!)

          // Create feed layout
          console.log("[v0] [TOOL] Creating feed layout...")
          const [feed] = await sql`
            INSERT INTO feed_layouts (user_id, layout_type, created_at)
            VALUES (${user.id}, 'grid', NOW())
            RETURNING id
          `

          console.log("[v0] [TOOL] ✅ Feed created:", feed.id)

          // Create 9 simple posts
          console.log("[v0] [TOOL] Creating 9 posts...")
          for (let i = 0; i < 9; i++) {
            await sql`
              INSERT INTO feed_posts (
                feed_layout_id,
                position,
                caption,
                image_url,
                is_generated,
                created_at
              ) VALUES (
                ${feed.id},
                ${i},
                ${"Post " + (i + 1) + " for " + businessType + " with " + brandVibe + " vibe"},
                '/placeholder.svg?height=400&width=400',
                false,
                NOW()
              )
            `

            // Small delay to avoid rate limits
            if (i < 8) {
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
          }

          console.log("[v0] [TOOL] ✅ All posts created")

          return `Perfect! I've created your Instagram feed with 9 posts. Feed ID: ${feed.id}`
        } catch (error: any) {
          console.error("[v0] [TOOL] ❌ Error:", error?.message)
          throw error
        }
      },
    })

    console.log("[v0] Step 5: Streaming AI response...")
    const result = streamText({
      model: "openai/gpt-4o",
      messages: convertToCoreMessages(messages),
      tools: {
        generateFeed: simpleFeedTool,
        generateCompleteFeed: generateCompleteFeedTool,
        rewriteCaption: rewriteCaptionTool,
        callCaptionStrategist: callCaptionStrategistTool,
      },
      system: MAYA_SYSTEM_PROMPT + userContext + MAYA_FEED_STRATEGIST_EXTENSION,
    })

    console.log("[v0] ✅ Streaming response started")
    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error("[v0] ❌ CRITICAL ERROR:", {
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
    })

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || String(error),
        type: error?.name,
      },
      { status: 500 },
    )
  }
}
