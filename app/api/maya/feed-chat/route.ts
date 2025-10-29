import { streamText, tool, generateObject } from "ai"
import { z } from "zod"
import { getCurrentNeonUser } from "@/lib/user-sync"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import type { CoreMessage } from "ai"
import { neon } from "@neondatabase/serverless"

const MAYA_FEED_STRATEGIST_EXTENSION = `

## Instagram Feed Strategy Expertise

You're an expert Instagram strategist who creates cohesive, professional feeds by researching current trends and aesthetics.

**Research Strategy:**
- Use searchWeb BEFORE generating feeds to research:
  * "Scandinavian minimalist Instagram aesthetics 2025"
  * "Dark moody photography trends Instagram"
  * "Personal brand storytelling best practices"
  * "[user's niche] Instagram content strategy"
- Don't overdo searches - 1-2 targeted searches per feed generation
- Focus on: current trends, proven aesthetics, engagement strategies
- Apply research insights to create on-trend, sophisticated feeds

**When a user asks you to design their feed:**

1. Research current trends with searchWeb (1-2 focused queries)
2. Respond warmly and let them know you're starting
3. Call the generateCompleteFeed tool with research-informed strategy
4. After the feed is created, AUTOMATICALLY call generateStoryHighlights to create highlight covers
5. Then call generateProfileImage to create the profile picture
6. After all generations complete, explain the complete strategy with trend insights

The tools handle all the design work internally, so you research first, then call them in sequence and explain the results.
`

const generateCompleteFeedTool = tool({
  description:
    "Design a complete 9-post Instagram feed strategy. This tool automatically researches trending layouts and aesthetics before creating the feed, so you don't need to research separately.",
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
    instagramBio: z
      .string()
      .describe(
        "A compelling Instagram bio (150 characters max) that captures their brand essence, includes their business type, and has a clear call-to-action",
      ),
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
    trendingHashtags: z
      .array(z.string())
      .describe(
        "12-15 strategic, trending hashtags researched for this specific niche and brand. Mix of: niche-specific (3-4), branded (2-3), community (3-4), trending (2-3), and engagement (2-3). NO generic templates - research current trends.",
      ),
  }),
  execute: async ({ brandVibe, businessType, colorPalette, feedStory, instagramBio, highlights, trendingHashtags }) => {
    console.log("[v0] [SERVER] === TOOL EXECUTION STARTED ===")
    console.log("[v0] [SERVER] Generating feed strategy:", {
      brandVibe,
      businessType,
      colorPalette,
    })

    const researchInsights = "Using current Instagram best practices and proven feed layout strategies"

    const user = await getCurrentNeonUser()
    let triggerWord = "person"
    let userGender = "person"

    if (user) {
      const sql = neon(process.env.DATABASE_URL!)
      const userDataResult = await sql`
        SELECT 
          u.gender,
          um.trigger_word
        FROM users u
        LEFT JOIN user_models um ON u.id = um.user_id
        WHERE u.id = ${user.id}
        AND um.training_status = 'completed'
        ORDER BY um.created_at DESC
        LIMIT 1
      `

      if (userDataResult.length > 0) {
        triggerWord = userDataResult[0].trigger_word || "person"
        userGender = userDataResult[0].gender || "person"
      }
    }

    console.log("[v0] [SERVER] Using AI to design custom feed layout...")

    const { object: feedDesign } = await generateObject({
      model: "anthropic/claude-sonnet-4",
      schema: z.object({
        visualRhythm: z.string().describe("Description of the visual flow and rhythm of this feed"),
        posts: z
          .array(
            z.object({
              type: z.enum(["Close-Up", "Half Body", "Full Body", "Lifestyle", "Object"]).describe("Post type"),
              tone: z.enum(["warm", "cool"]).describe("Color temperature for visual balance"),
              purpose: z.string().describe("What this post achieves in the feed story"),
              composition: z.string().describe("Specific composition and framing details"),
              styleDirection: z.string().describe("Unique styling direction for this specific post"),
              caption: z.string().describe("Authentic, engaging caption that matches brand voice and tells a story"),
            }),
          )
          .length(9),
      }),
      prompt: `You are Maya, an expert Instagram strategist with deep fashion and visual storytelling expertise.

Design a cohesive 9-post Instagram feed for a ${businessType} with this brand identity:
- Brand Vibe: ${brandVibe}
- Color Palette: ${colorPalette}
- Feed Story: ${feedStory}

Create a unique feed layout that:
1. Has visual rhythm and flow (balance warm/cool tones, vary post types strategically)
2. Tells a compelling story across all 9 posts
3. Showcases personality, expertise, and lifestyle authentically
4. Uses diverse post types: Close-Up (face focus), Half Body (upper body), Full Body (complete outfit), Lifestyle (environment/activity), Object (styled flatlay)
5. Each post should have a clear purpose in the overall narrative

For each post, provide:
- Type and tone for visual balance
- Specific purpose in the feed story
- Unique composition and styling direction
- Authentic caption (150-200 words) with:
  * Engaging hook that draws readers in
  * Personal story or valuable insight
  * Clear call-to-action
  * Natural, conversational tone (no generic templates)
  * Reflects ${brandVibe} aesthetic

Be creative and authentic. No generic templates - every element should feel custom-designed for this specific brand.`,
    })

    console.log("[v0] [SERVER] AI-generated feed design complete:", feedDesign.visualRhythm)

    const posts = feedDesign.posts.map((post, index) => {
      if (post.type === "Object") {
        return {
          id: `post-${index + 1}`,
          title: "Styled Moment",
          description: `${post.purpose}. ${post.composition}`,
          category: "Object",
          prompt: `${colorPalette} styled flatlay photography, ${post.styleDirection}, elegant arrangement showcasing ${businessType} essentials, overhead shot with soft directional natural lighting creating gentle shadows, professional editorial quality with ${brandVibe} aesthetic, carefully curated brand-aligned objects, shallow depth of field with creamy bokeh, subtle film grain texture, high-end commercial photography, sophisticated composition, trending Instagram aesthetic 2025, warm inviting atmosphere, cohesive color story with ${colorPalette}`,
          textOverlay: undefined,
          purpose: post.purpose,
          composition: post.composition,
          caption: post.caption,
        }
      }

      const lensSpecs = {
        "Close-Up": "shot on 85mm lens f/1.4, shallow depth of field, creamy bokeh, face focus",
        "Half Body": "shot on 50mm lens f/2.0, medium depth of field, balanced composition, upper body focus",
        "Full Body": "shot on 35mm lens f/2.8, environmental context, full scene, head to toe",
        Lifestyle: "shot on 35mm lens f/2.0, natural environment, authentic moment, environmental storytelling",
      }

      const lightingStyle = colorPalette.includes("dark")
        ? "dramatic lighting with moody shadows and high contrast, cinematic atmosphere"
        : "soft natural lighting with gentle shadows and even exposure, warm inviting glow"

      const genderStyling =
        userGender === "woman" || userGender === "female"
          ? "elegant flowing hair styled naturally, refined makeup with natural glow, feminine grace and confidence"
          : userGender === "man" || userGender === "male"
            ? "styled hair with clean lines, masculine confidence and presence, strong professional demeanor"
            : "styled appearance with confident presence, authentic professional energy"

      const fashionDetails =
        post.type === "Full Body"
          ? `wearing sophisticated ${colorPalette} attire with impeccable tailoring and refined silhouette, ${post.styleDirection}, styled with carefully chosen accessories that complement the overall aesthetic, complete outfit showcasing personal style and brand identity`
          : post.type === "Half Body"
            ? `dressed in elegant ${colorPalette} professional attire with attention to fabric quality and fit, ${post.styleDirection}, styled with minimal sophisticated accessories, upper body styling that conveys both professionalism and approachability`
            : post.type === "Close-Up"
              ? `styled with ${colorPalette} tones in clothing and background, ${post.styleDirection}, natural skin texture with healthy radiant glow, authentic expression that connects with viewers`
              : `authentic ${colorPalette} styling that feels natural and effortless, ${post.styleDirection}, environmental elements that tell a story, genuine moment captured with editorial quality`

      return {
        id: `post-${index + 1}`,
        title: `${post.type} ${post.type === "Lifestyle" ? "Moment" : "Portrait"}`,
        description: `${post.purpose}. ${post.composition}`,
        category: post.type,
        prompt: `${triggerWord}, confident ${businessType} professional with ${genderStyling}, ${fashionDetails}, ${lensSpecs[post.type as keyof typeof lensSpecs]}, ${lightingStyle}, natural skin texture with subtle film grain for authenticity, timeless elegance meets modern sophistication, high-high-end editorial photography with ${brandVibe} aesthetic, ${post.composition}, genuine professional presence that feels both aspirational and relatable, trending Instagram aesthetic 2025, cohesive visual story with ${colorPalette} color palette`,
        textOverlay: undefined,
        purpose: post.purpose,
        composition: post.composition,
        caption: post.caption,
      }
    })

    const postsWithCaptions = posts.map((post) => ({
      ...post,
      hashtags: trendingHashtags.slice(0, 12).join(" "),
    }))

    let feedId: string | null = null
    const userInstance = await getCurrentNeonUser()

    try {
      const sql = neon(process.env.DATABASE_URL!)

      if (!userInstance) {
        console.error("[v0] [SERVER] No user found, cannot save feed")
        return "I encountered an error - you need to be logged in to save your feed strategy. Please refresh and try again."
      }

      const [feedLayout] = await sql`
        INSERT INTO feed_layouts (
          user_id, brand_vibe, business_type, color_palette, 
          visual_rhythm, feed_story, research_insights, title, description
        )
        VALUES (
          ${userInstance.id}, ${brandVibe}, ${businessType}, ${colorPalette},
          ${feedDesign.visualRhythm}, ${feedStory}, ${researchInsights},
          ${`${businessType} Feed Strategy`}, ${feedStory}
        )
        RETURNING id
      `

      feedId = feedLayout.id.toString()
      console.log("[v0] [SERVER] ✓ Feed layout created with ID:", feedId)

      await sql`
        INSERT INTO instagram_bios (feed_layout_id, bio_text, user_id)
        VALUES (${feedId}, ${instagramBio}, ${userInstance.id})
      `
      console.log("[v0] [SERVER] ✓ Instagram bio saved")

      for (const highlight of highlights) {
        await sql`
          INSERT INTO instagram_highlights (feed_layout_id, title, prompt, user_id)
          VALUES (${feedId}, ${highlight.title}, ${highlight.prompt}, ${userInstance.id})
        `
      }
      console.log("[v0] [SERVER] ✓ Highlights saved with FLUX prompts:", highlights.length)

      for (let i = 0; i < postsWithCaptions.length; i++) {
        const post = postsWithCaptions[i]
        await sql`
          INSERT INTO feed_posts (
            feed_layout_id, user_id, position, prompt, post_type,
            caption, text_overlay_style, generation_status
          )
          VALUES (
            ${feedId}, ${userInstance.id}, ${i}, ${post.prompt}, ${post.category},
            ${post.caption}, ${post.textOverlay ? JSON.stringify(post.textOverlay) : null}, 
            'pending'
          )
        `
      }
      console.log("[v0] [SERVER] ✓ All", postsWithCaptions.length, "posts saved to database")
      console.log("[v0] [SERVER] === TOOL EXECUTION COMPLETED SUCCESSFULLY ===")

      return `Perfect! I've created your complete Instagram feed strategy with 9 concept cards. Your feed is ready in the preview - click on any card to generate that specific image, or use "Generate All" to create the entire feed at once. (Feed ID: ${feedId})`
    } catch (error) {
      console.error("[v0] [SERVER] === TOOL EXECUTION FAILED ===")
      console.error("[v0] [SERVER] Error saving feed to database:", error)
      if (error instanceof Error) {
        console.error("[v0] [SERVER] Error details:", error.message)
      }
      return "I encountered an error while saving your feed strategy. Please try again."
    }
  },
})

const generateStoryHighlightsTool = tool({
  description:
    "Generate cover images for all story highlights in the feed. Call this after creating the feed strategy.",
  inputSchema: z.object({
    feedId: z.string().describe("The feed layout ID from generateCompleteFeed"),
    colorPalette: z.string().describe("The brand's color palette"),
    brandVibe: z.string().describe("The brand's aesthetic vibe"),
  }),
  execute: async ({ feedId, colorPalette, brandVibe }) => {
    console.log("[v0] [SERVER] === GENERATING STORY HIGHLIGHTS ===")
    console.log("[v0] [SERVER] Feed ID:", feedId, "Color Palette:", colorPalette)

    try {
      const sql = neon(process.env.DATABASE_URL!)
      const user = await getCurrentNeonUser()

      if (!user) {
        return "Error: User not found"
      }

      // Get all highlights for this feed
      const highlights = await sql`
        SELECT * FROM instagram_highlights
        WHERE feed_layout_id = ${feedId}
        ORDER BY created_at ASC
      `

      console.log("[v0] [SERVER] Found", highlights.length, "highlights to generate")

      let successCount = 0
      for (const highlight of highlights) {
        try {
          // Generate image for this highlight
          const conceptPrompt = `Instagram story highlight cover for "${highlight.title}". ${highlight.prompt}. ${colorPalette} color palette, ${brandVibe} aesthetic, minimalist design, professional quality, centered composition, soft lighting, elegant and cohesive with brand identity`

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/maya/generate-image`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conceptTitle: highlight.title,
                conceptDescription: highlight.prompt,
                conceptPrompt,
                category: "feed-design",
              }),
            },
          )

          if (response.ok) {
            const data = await response.json()

            // Update highlight with prediction ID
            await sql`
              UPDATE instagram_highlights
              SET prediction_id = ${data.predictionId},
                  cover_url = 'generating'
              WHERE id = ${highlight.id}
            `

            successCount++
            console.log("[v0] [SERVER] ✓ Started generation for highlight:", highlight.title)
          }
        } catch (error) {
          console.error("[v0] [SERVER] Error generating highlight:", highlight.title, error)
        }
      }

      console.log("[v0] [SERVER] === STORY HIGHLIGHTS GENERATION COMPLETE ===")
      return `Started generating ${successCount} story highlight covers. They'll appear in the preview as they complete.`
    } catch (error) {
      console.error("[v0] [SERVER] Error in generateStoryHighlights:", error)
      return "Error generating story highlights"
    }
  },
})

const generateProfileImageTool = tool({
  description:
    "Generate an intelligent FLUX prompt for the profile picture using AI. This creates a sophisticated, detailed prompt that matches the feed's aesthetic.",
  inputSchema: z.object({
    feedId: z.string().describe("The feed layout ID from generateCompleteFeed"),
    businessType: z.string().describe("What the user does"),
    colorPalette: z.string().describe("The brand's color palette"),
    brandVibe: z.string().describe("The brand's aesthetic vibe"),
  }),
  execute: async ({ feedId, businessType, colorPalette, brandVibe }) => {
    console.log("[v0] [SERVER] === GENERATING PROFILE IMAGE PROMPT WITH AI ===")
    console.log("[v0] [SERVER] Feed ID:", feedId, "Business Type:", businessType)

    try {
      const sql = neon(process.env.DATABASE_URL!)
      const user = await getCurrentNeonUser()

      if (!user) {
        return "Error: User not found"
      }

      const userDataResult = await sql`
        SELECT 
          u.gender,
          um.trigger_word
        FROM users u
        LEFT JOIN user_models um ON u.id = um.user_id
        WHERE u.id = ${user.id}
        AND um.training_status = 'completed'
        ORDER BY um.created_at DESC
        LIMIT 1
      `

      let triggerWord = "person"
      let userGender = "person"

      if (userDataResult.length > 0) {
        triggerWord = userDataResult[0].trigger_word || "person"
        userGender = userDataResult[0].gender || "person"
      }

      const { object: profileDesign } = await generateObject({
        model: "anthropic/claude-sonnet-4",
        schema: z.object({
          styleDirection: z.string().describe("Specific styling direction for this profile image"),
          composition: z.string().describe("Composition and framing details"),
          lightingMood: z.string().describe("Lighting style and mood"),
          fashionDetails: z.string().describe("Clothing and styling details"),
        }),
        prompt: `You are Maya, an expert fashion photographer and Instagram strategist.

Create a sophisticated FLUX prompt for an Instagram profile picture for a ${businessType} with this brand identity:
- Brand Vibe: ${brandVibe}
- Color Palette: ${colorPalette}
- Gender: ${userGender}

The profile image should:
1. Be a close-up portrait (face focus, circular crop friendly)
2. Convey confidence, approachability, and professionalism
3. Match the ${brandVibe} aesthetic perfectly
4. Use ${colorPalette} in clothing and background
5. Feel authentic and editorial quality

Provide specific details for:
- Style direction (hair, makeup/grooming, expression, energy)
- Composition (framing, angle, focus)
- Lighting mood (natural/dramatic, soft/bold, warm/cool)
- Fashion details (clothing style, colors, accessories)

Be specific and sophisticated - this should feel like high-end editorial photography, not a generic headshot.`,
      })

      console.log("[v0] [SERVER] AI-generated profile design:", profileDesign.styleDirection)

      const genderStyling =
        userGender === "woman" || userGender === "female"
          ? "elegant flowing hair styled naturally, refined makeup with natural glow, feminine grace and confidence"
          : userGender === "man" || userGender === "male"
            ? "styled hair with clean lines, masculine confidence and presence, strong professional demeanor"
            : "styled appearance with confident presence, authentic professional energy"

      const profileImagePrompt = `${triggerWord}, confident ${businessType} professional with ${genderStyling}, ${profileDesign.fashionDetails}, ${profileDesign.styleDirection}, shot on 85mm lens f/1.4, shallow depth of field, creamy bokeh, face focus, ${profileDesign.lightingMood}, natural skin texture with subtle film grain for authenticity, ${profileDesign.composition}, timeless elegance meets modern sophistication, high-end editorial photography with ${brandVibe} aesthetic, perfect for Instagram profile picture, circular crop friendly, genuine professional presence that feels both aspirational and relatable, cohesive with ${colorPalette} color palette`

      await sql`
        UPDATE feed_layouts
        SET profile_image_prompt = ${profileImagePrompt}
        WHERE id = ${feedId}
      `

      console.log("[v0] [SERVER] ✓ Sophisticated profile image prompt saved to database")
      console.log("[v0] [SERVER] Prompt preview:", profileImagePrompt.substring(0, 150) + "...")
      return `Profile image prompt created with sophisticated styling! Users can click the profile placeholder to generate it.`
    } catch (error) {
      console.error("[v0] [SERVER] Error creating profile image prompt:", error)
      return "Error creating profile image prompt"
    }
  },
})

const searchWebTool = tool({
  description:
    "Search the web for current Instagram trends, aesthetic best practices, and content strategies. Use this to stay on-trend with Scandinavian aesthetics, dark moody styling, and personal branding.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Search query for Instagram trends (e.g., 'Scandinavian minimalist Instagram 2025', 'dark moody photography trends', 'personal brand storytelling')",
      ),
  }),
  execute: async ({ query }) => {
    try {
      console.log("[v0] [SERVER] Searching web for:", query)
      console.log("[v0] [SERVER] API key present:", !!process.env.BRAVE_SEARCH_API_KEY)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
          },
          signal: controller.signal,
        },
      )

      clearTimeout(timeoutId)

      console.log("[v0] [SERVER] Brave Search API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] [SERVER] Brave Search API error:", response.status, errorText)
        // Fallback to built-in expertise
        return `Based on current Instagram best practices: Scandinavian minimalist aesthetics emphasize clean compositions with neutral palettes (whites, beiges, grays), dark moody photography uses dramatic lighting with rich colors (charcoal, black, deep browns), and personal brand storytelling focuses on authentic behind-the-scenes content with consistent visual identity. Current trends favor natural lighting, editorial quality, and cohesive color stories.`
      }

      const searchData = await response.json()

      // Extract relevant information from search results
      const results = searchData.web?.results || []
      const summary = results
        .slice(0, 5)
        .map((result: any, index: number) => {
          return `${index + 1}. **${result.title}**\n${result.description}\n`
        })
        .join("\n")

      console.log("[v0] [SERVER] Web search results extracted:", results.length, "results")

      return summary || "No specific results found, using Instagram expertise instead."
    } catch (error) {
      if (error instanceof Error) {
        console.error("[v0] [SERVER] Web search error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        })
      } else {
        console.error("[v0] [SERVER] Web search error:", error)
      }

      // Fallback to built-in expertise
      return `Based on current Instagram best practices: Scandinavian minimalist aesthetics emphasize clean compositions with neutral palettes (whites, beiges, grays), dark moody photography uses dramatic lighting with rich colors (charcoal, black, deep browns), and personal brand storytelling focuses on authentic behind-the-scenes content with consistent visual identity. Current trends favor natural lighting, editorial quality, and cohesive color stories.`
    }
  },
})

export async function POST(req: Request) {
  console.log("[v0] 🚀 FEED CHAT API CALLED - INLINE USER CONTEXT")

  try {
    console.log("[v0] === FEED CHAT API START ===")

    let messages
    try {
      const body = await req.json()
      messages = body.messages
      console.log("[v0] Step 1: Parsed request body, messages count:", messages?.length)
    } catch (parseError) {
      console.error("[v0] ERROR parsing request body:", parseError)
      return new Response("Invalid request body", { status: 400 })
    }

    const user = await getCurrentNeonUser()
    console.log("[v0] Step 2: Got current user:", user ? `ID ${user.id}` : "NO USER")

    if (!user) {
      console.error("[v0] ERROR: No user found")
      return new Response("Unauthorized", { status: 401 })
    }

    console.log("[v0] Step 3: Converting messages to core messages...")
    const coreMessages: CoreMessage[] = messages
      .map((msg: any, index: number) => {
        if (!msg.role || (msg.role !== "user" && msg.role !== "assistant")) {
          console.warn(`[v0] Skipping message ${index} with invalid role:`, msg.role)
          return null
        }

        let textContent = ""

        if (typeof msg.content === "string") {
          textContent = msg.content
        } else if (Array.isArray(msg.content)) {
          textContent = msg.content
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        } else if (msg.parts && Array.isArray(msg.parts)) {
          textContent = msg.parts
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        }

        if (!textContent || textContent.trim() === "") {
          console.warn(`[v0] Skipping message ${index} with empty content`)
          return null
        }

        return {
          role: msg.role,
          content: textContent,
        } as CoreMessage
      })
      .filter((msg): msg is CoreMessage => msg !== null)

    console.log("[v0] Step 4: Converted to", coreMessages.length, "core messages")

    if (coreMessages.length === 0) {
      console.error("[v0] ERROR: No valid messages after filtering")
      return new Response("No valid messages", { status: 400 })
    }

    console.log("[v0] Step 5: Getting user context (inline)...")
    let userContext = ""
    try {
      const authId = user.stack_auth_id || user.supabase_user_id || user.id
      console.log("[v0] Using auth ID:", authId)

      const sql = neon(process.env.DATABASE_URL!)

      // Get user by auth ID
      const { getUserByAuthId } = await import("@/lib/user-mapping")
      const neonUser = await getUserByAuthId(authId)

      if (neonUser) {
        const contextParts: string[] = []

        // Get personal brand
        const [brandResult] = await sql`
          SELECT * FROM user_personal_brand 
          WHERE user_id = ${neonUser.id} 
          AND is_completed = true 
          LIMIT 1
        `

        if (brandResult) {
          contextParts.push("=== USER'S PERSONAL BRAND ===")
          if (brandResult.name) contextParts.push(`Name: ${brandResult.name}`)
          if (brandResult.business_type) contextParts.push(`Business Type: ${brandResult.business_type}`)
          if (brandResult.brand_vibe) contextParts.push(`Brand Vibe: ${brandResult.brand_vibe}`)
          if (brandResult.color_theme) contextParts.push(`Color Theme: ${brandResult.color_theme}`)

          // Handle color_palette
          if (brandResult.color_palette) {
            try {
              let colorPalette = brandResult.color_palette
              if (typeof colorPalette === "string") {
                colorPalette = JSON.parse(colorPalette)
              }
              if (Array.isArray(colorPalette) && colorPalette.length > 0) {
                const colors = colorPalette.filter((c: any) => typeof c === "string" && c.trim().length > 0)
                if (colors.length > 0) {
                  contextParts.push(`Brand Colors: ${colors.join(", ")}`)
                  contextParts.push(
                    `IMPORTANT: Use these exact brand colors in all visual prompts: ${colors.join(", ")}`,
                  )
                }
              }
            } catch (e) {
              console.error("[v0] Error parsing color_palette:", e)
            }
          }

          contextParts.push("")
        }

        const existingFeeds = await sql`
          SELECT 
            fl.id,
            fl.brand_vibe,
            fl.business_type,
            fl.color_palette,
            fl.visual_rhythm,
            fl.feed_story,
            fl.created_at,
            COUNT(fp.id) as post_count
          FROM feed_layouts fl
          LEFT JOIN feed_posts fp ON fl.id = fp.feed_layout_id
          WHERE fl.user_id = ${neonUser.id}
          GROUP BY fl.id, fl.brand_vibe, fl.business_type, fl.color_palette, fl.visual_rhythm, fl.feed_story, fl.created_at
          ORDER BY fl.created_at DESC
          LIMIT 1
        `

        if (existingFeeds.length > 0) {
          const latestFeed = existingFeeds[0]
          contextParts.push("=== EXISTING FEED STRATEGY ===")
          contextParts.push(`Feed ID: ${latestFeed.id}`)
          contextParts.push(`Brand Vibe: ${latestFeed.brand_vibe}`)
          contextParts.push(`Business Type: ${latestFeed.business_type}`)
          contextParts.push(`Color Palette: ${latestFeed.color_palette}`)
          contextParts.push(`Visual Rhythm: ${latestFeed.visual_rhythm}`)
          contextParts.push(`Feed Story: ${latestFeed.feed_story}`)
          contextParts.push(`Posts: ${latestFeed.post_count} concept cards created`)
          contextParts.push(`Created: ${new Date(latestFeed.created_at).toLocaleDateString()}`)
          contextParts.push("")
          contextParts.push(
            "IMPORTANT: A feed strategy already exists! Unless the user explicitly asks for a 'new feed' or 'fresh feed', you should refine and improve the existing feed instead of creating a new one. Use your expertise to suggest improvements, adjust specific posts, or refine the strategy.",
          )
          contextParts.push("")
        }

        userContext = contextParts.length > 0 ? `\n\n${contextParts.join("\n")}` : ""
      }

      console.log("[v0] Step 5 SUCCESS: User context retrieved, length:", userContext.length)
    } catch (contextError) {
      console.error("[v0] Step 5 WARNING: Error getting user context, continuing without it:", contextError)
      userContext = ""
    }

    console.log("[v0] Step 6: Building system prompt...")
    const enhancedSystemPrompt = MAYA_SYSTEM_PROMPT + MAYA_FEED_STRATEGIST_EXTENSION + userContext
    console.log("[v0] Step 6 SUCCESS: System prompt built, length:", enhancedSystemPrompt.length)

    console.log("[v0] Step 7: Calling streamText...")
    try {
      const result = await streamText({
        model: "anthropic/claude-sonnet-4",
        system: enhancedSystemPrompt,
        messages: coreMessages,
        tools: {
          searchWeb: searchWebTool,
          generateCompleteFeed: generateCompleteFeedTool,
          generateStoryHighlights: generateStoryHighlightsTool,
          generateProfileImage: generateProfileImageTool,
        },
        maxSteps: 5,
      })

      console.log("[v0] Step 7 SUCCESS: streamText completed")
      console.log("[v0] === FEED CHAT API END (success) ===")
      return result.toUIMessageStreamResponse()
    } catch (streamError) {
      console.error("[v0] Step 7 ERROR: streamText failed")
      console.error("[v0] Stream error:", streamError)
      if (streamError instanceof Error) {
        console.error("[v0] Stream error message:", streamError.message)
        console.error("[v0] Stream error stack:", streamError.stack)
      }
      throw streamError
    }
  } catch (error) {
    console.error("[v0] === FEED CHAT API ERROR ===")
    console.error("[v0] Feed chat error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error name:", error.name)
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    console.error("[v0] === FEED CHAT API END (error) ===")
    return new Response("Internal Server Error", { status: 500 })
  }
}
