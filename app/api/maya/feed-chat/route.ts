import { streamText, tool } from "ai"
import { z } from "zod"
import { getCurrentNeonUser } from "@/lib/user-sync"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { neon } from "@neondatabase/serverless"
import type { CoreMessage } from "ai"

const MAYA_FEED_STRATEGIST_EXTENSION = `

## Instagram Feed Strategy Expertise

You're also an expert Instagram strategist who creates cohesive, professional feeds that tell compelling brand stories.

**The Rule of 3 - Content Variety:**
Every great Instagram feed uses strategic variety to create visual rhythm:

1. **Portrait Shots** (40% of feed):
   - Close-Up: Face focus, emotional connection, confident first impression
   - Half Body: Show style and personality, professional yet approachable
   - Full Body: Complete look, fashion/lifestyle showcase

2. **Quote Posts** (20% of feed):
   - Plain backgrounds with 60-70% whitespace
   - Elegant typography (serif for luxury, script for feminine, sans-serif for modern)
   - Inspirational messages aligned with brand values
   - Use when: Need visual rest, want to emphasize a message, create engagement

3. **Lifestyle Shots** (20% of feed):
   - Working moments, coffee shops, behind-the-scenes
   - Show authenticity and daily life
   - Use when: Want to build connection, show personality beyond posed shots

4. **Objects/Flatlays** (10% of feed):
   - Products, flowers, styled arrangements
   - Use when: Showcasing products, creating aesthetic moments, adding variety

5. **Scenery/Spaces** (10% of feed):
   - Interiors, architecture, nature
   - Use when: Setting the scene, showing environment, creating mood

**Visual Rhythm Patterns:**
- **Checkerboard**: Alternate light/dark or portrait/quote for maximum variety
- **Diagonal Flow**: Create diagonal lines of similar content (top-left to bottom-right)
- **Row Themes**: Each row tells a mini-story (e.g., Row 1: Confidence, Row 2: Action, Row 3: Results)
- **The 80/20 Rule**: 80% featuring the person (portraits/lifestyle), 20% supporting content (quotes/objects)

**Whitespace & Negative Space:**
- Quote posts should breathe - 60-70% empty space around text
- Balance busy images (detailed portraits) with minimal posts (simple quotes)
- Create visual rest points every 2-3 posts
- Use negative space to draw attention to the subject

**Color Cohesion Strategies:**
- **Neutral Elegance**: Beige, cream, white, black (for coaches, consultants, luxury brands)
- **Dark & Moody**: Charcoal, black, gold accents (for high-end, sophisticated brands)
- **Warm & Approachable**: Soft browns, warm beiges, natural tones (for wellness, lifestyle brands)
- Stick to 3-5 colors maximum across the entire feed
- Match text overlay colors to brand palette

**Typography Pairing:**
- **Elegant/Luxury**: Playfair Display (serif) + Montserrat (sans-serif)
- **Feminine/Personal**: Dancing Script (script) + Inter (sans-serif)
- **Modern/Bold**: Montserrat Bold (sans-serif) + Playfair Display (serif)
- Never use more than 2-3 font families in one feed

**Strategic Feed Design Process:**
1. Analyze user's brand profile (style, colors, vibe, business type)
2. Choose a visual rhythm pattern that matches their brand energy
3. Design 9 posts with strategic variety (follow the Rule of 3 percentages)
4. Ensure color cohesion throughout
5. Place quote posts strategically for visual rest and engagement
6. Present the complete strategy for approval BEFORE generating

**Your Communication Style:**
- Warm and encouraging, like a trusted creative director
- Explain the "why" behind your design choices in simple terms
- Present the feed as a cohesive story: "This feed tells the story of..."
- Always get approval before generating images
- Be specific about what each post contributes to the overall narrative

**Caption Writing Mastery:**
You write captions that follow the proven "recipe" for personal brands:

1. **Hook** (First line): Grab attention with a bold statement, question, or relatable observation
2. **Story** (Middle): Share personal anecdotes, the "why" behind your work, or your journey
3. **Value** (Core): Offer actionable advice, insights, or lessons learned
4. **CTA** (End): Clear call to action - ask a question, encourage saves, or guide next steps

**Caption Guidelines:**
- Use simple, everyday language - no corporate jargon
- Be authentic and vulnerable - show personality
- Keep paragraphs short (2-3 sentences max)
- Use line breaks for readability
- Match the user's brand voice and language style
- Include 3-5 relevant emojis naturally (not forced)
- End with an engaging question or clear next step

**Hashtag Strategy:**
- Research trending hashtags in the user's niche using web search
- Mix of sizes: 2-3 large (100k-1M), 3-5 medium (10k-100k), 5-7 niche (1k-10k)
- Include branded hashtag if user has one
- Total 10-15 hashtags maximum
- Place at end of caption or first comment

Remember: Every caption should sound like the user wrote it themselves, not like AI.
`

async function fetchTrendingHashtags(businessType: string, userBrand: any): Promise<string[]> {
  const hashtagSearchQuery = `trending Instagram hashtags for ${businessType} ${userBrand.content_themes || ""} ${new Date().getFullYear()}`

  try {
    console.log("[v0] [SERVER] Fetching trending hashtags from Brave Search API...")
    console.log("[v0] [SERVER] Search query:", hashtagSearchQuery)
    console.log("[v0] [SERVER] API key present:", !!process.env.BRAVE_SEARCH_API_KEY)

    const hashtagResponse = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(hashtagSearchQuery)}&count=10`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
        },
      },
    )

    console.log("[v0] [SERVER] Brave Search API response status:", hashtagResponse.status)

    if (hashtagResponse.ok) {
      const searchData = await hashtagResponse.json()
      const extractedHashtags: string[] = []

      if (searchData.web?.results) {
        for (const result of searchData.web.results) {
          const text = `${result.title} ${result.description}`.toLowerCase()
          const hashtagMatches = text.match(/#[a-z0-9_]+/g)
          if (hashtagMatches) {
            extractedHashtags.push(...hashtagMatches)
          }
        }
      }

      const trendingHashtags = [...new Set(extractedHashtags)].slice(0, 15)
      console.log("[v0] [SERVER] Extracted trending hashtags:", trendingHashtags.length)

      if (trendingHashtags.length > 0) {
        return trendingHashtags
      }
    } else {
      const errorText = await hashtagResponse.text()
      console.error("[v0] [SERVER] Brave Search API error:", hashtagResponse.status, errorText)
    }
  } catch (error) {
    console.error("[v0] [SERVER] Error fetching trending hashtags:", error)
  }

  // Fallback to smart business-specific hashtags
  console.log("[v0] [SERVER] Using fallback hashtag generation")

  const businessTypeSlug = businessType.toLowerCase().replace(/\s+/g, "")
  const targetAudience = userBrand.target_audience?.toLowerCase() || ""
  const contentThemes = userBrand.content_themes?.toLowerCase() || ""

  const baseHashtags = [`#${businessTypeSlug}`, "#personalbrand", "#contentcreator", "#entrepreneur"]

  const audienceHashtags = targetAudience.includes("women")
    ? ["#womeninbusiness", "#femaleentrepreneur", "#girlboss"]
    : targetAudience.includes("coach")
      ? ["#businesscoach", "#lifecoach", "#mindsetcoach"]
      : ["#smallbusiness", "#solopreneur", "#businessowner"]

  const themeHashtags = contentThemes.includes("wellness")
    ? ["#wellnesscoach", "#selfcare", "#mindfulness"]
    : contentThemes.includes("fashion")
      ? ["#fashionblogger", "#styleinspo", "#fashionista"]
      : contentThemes.includes("marketing")
        ? ["#digitalmarketing", "#socialmediamarketing", "#marketingtips"]
        : ["#brandstrategy", "#businessgrowth", "#entrepreneurlife"]

  return [
    ...baseHashtags,
    ...audienceHashtags,
    ...themeHashtags,
    "#instagramgrowth",
    "#socialmediatips",
    "#onlinebusiness",
    "#creativeentrepreneur",
  ].slice(0, 15)
}

const researchInstagramTrendsTool = tool({
  description:
    "Research current Instagram trends, viral hooks, best practices, or any Instagram-related information using web search. Use this to get real-time data about what's working on Instagram right now.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "What to research (e.g., 'viral Instagram hooks for coaches 2025', 'best Instagram caption formats', 'trending Instagram reels ideas for wellness brands')",
      ),
  }),
  execute: async ({ query }) => {
    console.log("[v0] [CLIENT] Researching Instagram trends:", query)

    // Call server-side API endpoint to keep API key secure
    try {
      const response = await fetch("/api/maya/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error("Research failed")
      }

      const data = await response.json()
      return data.results
    } catch (error) {
      console.error("[v0] Research error:", error)
      return "Unable to fetch research data at this time. Using my existing knowledge instead."
    }
  },
})

const generateCompleteFeedTool = tool({
  description:
    "Design a complete 9-post Instagram feed strategy with professional visual rhythm, content variety, and brand cohesion. Use this when users ask to create or design their Instagram feed.",
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
    visualRhythm: z
      .string()
      .describe(
        "The pattern strategy for the feed (e.g., 'checkerboard alternating portraits and quotes', 'diagonal flow with lifestyle moments', 'row-by-row storytelling')",
      ),
    feedStory: z
      .string()
      .describe(
        "The complete narrative this feed tells (e.g., 'A confident life coach who empowers women to build their dream businesses', 'An elegant fashion entrepreneur living her creative passion')",
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
          description: z.string().describe("What this highlight category contains"),
        }),
      )
      .describe("5-7 Instagram highlight categories that organize their content strategy"),
  }),
  execute: async function* ({
    brandVibe,
    businessType,
    colorPalette,
    visualRhythm,
    feedStory,
    instagramBio,
    highlights,
  }) {
    console.log("[v0] Generating strategic feed with visual rhythm:", {
      brandVibe,
      businessType,
      colorPalette,
      visualRhythm,
      feedStory,
      instagramBio,
      highlights,
    })

    // Yield loading state immediately
    yield {
      state: "loading" as const,
    }

    const postSequence = [
      {
        type: "Close-Up",
        purpose: "Anchor post - confident first impression that stops the scroll",
        composition: "Face focus, emotional connection, direct eye contact or thoughtful gaze",
      },
      {
        type: "Quote",
        purpose: "Inspirational message that establishes brand values",
        composition: "Elegant typography with 70% whitespace, centered or asymmetric layout",
      },
      {
        type: "Lifestyle",
        purpose: "Show authenticity - working, creating, or in your element",
        composition: "Natural moment, environmental context, authentic action",
      },
      {
        type: "Full Body",
        purpose: "Complete style showcase - fashion meets personality",
        composition: "Full outfit visible, confident posture, environmental context",
      },
      {
        type: "Quote",
        purpose: "Visual rest point + motivational engagement",
        composition: "Bold statement with breathing room, complementary to first quote",
      },
      {
        type: "Half Body",
        purpose: "Professional yet approachable - the sweet spot",
        composition: "Upper body focus, show personality through styling and expression",
      },
      {
        type: "Lifestyle",
        purpose: "Behind-the-scenes or daily moment - build connection",
        composition: "Candid or semi-posed, show your world and process",
      },
      {
        type: "Object",
        purpose: "Product, flatlay, or aesthetic moment - add variety",
        composition: "Styled arrangement, overhead or angled shot, brand-aligned objects",
      },
      {
        type: "Close-Up",
        purpose: "Strong closing portrait - leave them wanting more",
        composition: "Different angle or mood from first close-up, memorable final impression",
      },
    ]

    const quotesByTheme = {
      confidence: ["BE YOUR OWN BOSS", "CONFIDENCE IS THE KEY", "BELIEVE IN YOURSELF", "OWN YOUR POWER"],
      motivation: ["FOLLOW YOUR PASSION", "TRUST THE PROCESS", "CREATE YOUR VISION", "MAKE IT HAPPEN"],
      lifestyle: ["LIVE IN THE MOMENT", "FIND YOUR BALANCE", "EMBRACE THE JOURNEY", "STAY PRESENT"],
      growth: ["EXPAND YOUR MINDSET", "LEVEL UP", "GROW THROUGH IT", "EVOLVE DAILY"],
      success: ["DREAM BIG", "SUCCESS STARTS HERE", "BUILD YOUR EMPIRE", "RISE AND SHINE"],
    }

    const allQuotes = Object.values(quotesByTheme).flat()
    const selectedQuotes = allQuotes.sort(() => 0.5 - Math.random()).slice(0, 3)

    let quoteIndex = 0
    const posts = postSequence.map((post, index) => {
      if (post.type === "Quote") {
        const quoteText = selectedQuotes[quoteIndex]
        quoteIndex++

        return {
          id: `post-${index + 1}`,
          title: quoteText,
          description: `${post.purpose}. ${post.composition}`,
          category: "Quote",
          prompt: `minimalist ${colorPalette} background, elegant composition with 70% negative space, soft gradient or solid color, subtle texture, professional editorial quality, ${brandVibe} aesthetic, clean and sophisticated, high-end design, breathing room around center`,
          textOverlay: {
            text: quoteText,
            position: "center" as const,
            font: brandVibe.includes("elegant") || brandVibe.includes("luxury") ? "Playfair Display" : "Montserrat",
            color: colorPalette.includes("dark") ? "white" : "black",
          },
          purpose: post.purpose,
          composition: post.composition,
        }
      }

      if (post.type === "Object") {
        return {
          id: `post-${index + 1}`,
          title: "Styled Flatlay",
          description: `${post.purpose}. ${post.composition}`,
          category: "Object",
          prompt: `styled flatlay photography, ${colorPalette}, elegant product arrangement, overhead shot, soft natural lighting, professional editorial quality, ${brandVibe} aesthetic, brand-aligned objects (flowers, coffee, notebook, jewelry), shallow depth of field, film grain, high-end commercial photography, minimalist composition`,
          textOverlay: undefined,
          purpose: post.purpose,
          composition: post.composition,
        }
      }

      const categoryDescriptions = {
        "Close-Up": `${post.purpose}. ${post.composition}`,
        "Half Body": `${post.purpose}. ${post.composition}`,
        "Full Body": `${post.purpose}. ${post.composition}`,
        Lifestyle: `${post.purpose}. ${post.composition}`,
      }

      const lensSpecs = {
        "Close-Up": "shot on 85mm lens f/1.4, shallow depth of field, creamy bokeh, face focus",
        "Half Body": "shot on 50mm lens f/2.0, medium depth of field, balanced composition, upper body focus",
        "Full Body": "shot on 35mm lens f/2.8, environmental context, full scene, head to toe",
        Lifestyle: "shot on 35mm lens f/2.0, natural environment, authentic moment, environmental storytelling",
      }

      const lightingStyle = colorPalette.includes("dark")
        ? "dramatic lighting, moody shadows, high contrast"
        : "soft natural lighting, gentle shadows, even exposure"

      return {
        id: `post-${index + 1}`,
        title: `${post.type} Portrait`,
        description: categoryDescriptions[post.type as keyof typeof categoryDescriptions],
        category: post.type,
        prompt: `raw photo, editorial quality, professional photography, sharp focus, natural skin texture, visible pores, film grain, ${colorPalette}, ${brandVibe} aesthetic, ${lensSpecs[post.type as keyof typeof lensSpecs]}, ${lightingStyle}, ${businessType} professional, confident expression, timeless elegance, high-end fashion photography, authentic moment, ${post.composition}`,
        textOverlay: undefined,
        purpose: post.purpose,
        composition: post.composition,
      }
    })

    const feedData = {
      brandVibe,
      businessType,
      colorPalette,
      visualRhythm,
      feedStory,
      instagramBio,
      highlights,
      posts,
    }

    // Yield ready state with complete feed data
    yield {
      state: "ready" as const,
      feedData: feedData,
    }
  },
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const user = await getCurrentNeonUser()

    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    console.log("[v0] Feed chat API called with", messages.length, "messages")

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

    console.log("[v0] Converted to", coreMessages.length, "core messages")

    if (coreMessages.length === 0) {
      console.error("[v0] No valid messages after filtering")
      return new Response("No valid messages", { status: 400 })
    }

    const userContext = await getUserContextForMaya(user.stack_auth_id || "")

    const enhancedSystemPrompt = MAYA_SYSTEM_PROMPT + MAYA_FEED_STRATEGIST_EXTENSION + userContext

    const result = streamText({
      model: "anthropic/claude-sonnet-4",
      system: enhancedSystemPrompt,
      messages: coreMessages,
      tools: {
        generateCompleteFeed: generateCompleteFeedTool,
        researchInstagramTrends: researchInstagramTrendsTool,
      },
      maxSteps: 10,
      onStepFinish: async ({ stepType, toolResults }) => {
        if (stepType === "tool-call" && toolResults) {
          for (const toolResult of toolResults) {
            if (toolResult.toolName === "generateCompleteFeed" && toolResult.result) {
              const generatorResult = toolResult.result as any

              if (generatorResult.state === "ready" && generatorResult.feedData) {
                const feedPlan = generatorResult.feedData

                console.log("[v0] [SERVER] Saving feed to database...")

                const sql = neon(process.env.DATABASE_URL!)

                // Get user's brand profile
                const brandProfile = await sql`
                  SELECT 
                    brand_voice,
                    language_style,
                    content_themes,
                    content_pillars,
                    target_audience,
                    business_type
                  FROM user_personal_brand
                  WHERE user_id = ${user.stack_auth_id}
                  LIMIT 1
                `

                const userBrand = brandProfile[0] || {}

                // Save feed layout
                const feedResult = await sql`
                  INSERT INTO feed_layouts (user_id, layout, created_at, updated_at)
                  VALUES (
                    ${user.stack_auth_id},
                    ${JSON.stringify({
                      ...feedPlan,
                      designPrinciples: {
                        contentVariety:
                          "Following Rule of 3: 40% portraits, 20% quotes, 20% lifestyle, 10% objects, 10% scenery",
                        colorCohesion: `Consistent ${feedPlan.colorPalette} throughout all posts`,
                        whitespace: "Quote posts use 70% negative space for visual rest",
                        typography: feedPlan.brandVibe.includes("elegant")
                          ? "Playfair Display for luxury feel"
                          : "Montserrat for modern look",
                      },
                    })},
                    NOW(),
                    NOW()
                  )
                  RETURNING id
                `

                const feedId = feedResult[0].id

                console.log("[v0] [SERVER] Feed saved with ID:", feedId)

                // Fetch trending hashtags
                console.log("[v0] [SERVER] Fetching trending hashtags...")
                const hashtags = await fetchTrendingHashtags(feedPlan.businessType, userBrand)
                const hashtagString = hashtags.join(" ")

                // Save posts with hashtags
                for (let i = 0; i < feedPlan.posts.length; i++) {
                  const post = feedPlan.posts[i]
                  const { caption } = generateCaptionWithRecipe(post, i, hashtags)

                  await sql`
                    INSERT INTO feed_posts (
                      feed_layout_id,
                      position,
                      post_type,
                      title,
                      description,
                      prompt,
                      caption,
                      hashtags,
                      visual_description,
                      text_overlay,
                      is_posted,
                      created_at
                    )
                    VALUES (
                      ${feedId},
                      ${i + 1},
                      ${post.category},
                      ${post.title},
                      ${post.description},
                      ${post.prompt},
                      ${caption},
                      ${hashtagString},
                      ${post.prompt},
                      ${post.textOverlay ? JSON.stringify(post.textOverlay) : null},
                      false,
                      NOW()
                    )
                  `
                }

                // Save bio
                await sql`
                  INSERT INTO instagram_bios (user_id, feed_layout_id, bio_text, created_at)
                  VALUES (
                    ${user.stack_auth_id},
                    ${feedId},
                    ${feedPlan.instagramBio},
                    NOW()
                  )
                `

                // Save highlights
                for (const highlight of feedPlan.highlights) {
                  await sql`
                    INSERT INTO highlight_covers (
                      user_id,
                      feed_layout_id,
                      title,
                      description,
                      created_at
                    )
                    VALUES (
                      ${user.stack_auth_id},
                      ${feedId},
                      ${highlight.title},
                      ${highlight.description},
                      NOW()
                    )
                  `
                }

                console.log("[v0] [SERVER] Feed saved successfully with hashtags!")

                toolResult.result = {
                  success: true,
                  strategy: feedPlan,
                  feedUrl: `/feed/${feedId}`,
                  message: `✨ Your Instagram Feed Strategy is Ready!\n\nI've designed a strategic 9-post feed that tells your story: ${feedPlan.feedStory}\n\nYour feed is saved and ready! Click "Generate All 9 Posts" to create the images.`,
                }
              }
            }
          }
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Feed chat error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

function generateCaptionWithRecipe(post: any, postIndex: number, hashtags: string[]) {
  const brandVoice = "authentic and relatable"
  const languageStyle = "simple everyday language"
  const contentThemes = "businessType"

  const hooks = {
    "Close-Up": [
      "Here's what nobody tells you about building a personal brand...",
      "Can we talk about something real for a second?",
      "This is the moment everything changed for me.",
      "Let me be honest with you...",
    ],
    Quote: [
      "Save this if you need the reminder today.",
      "Read this when you're doubting yourself.",
      "This is your sign to keep going.",
      "Pin this somewhere you'll see it daily.",
    ],
    Lifestyle: [
      "Behind the scenes of what it really looks like...",
      "This is what a typical day looks like for me.",
      "Real talk: this is the part nobody shows you.",
      "Here's what I'm working on right now...",
    ],
    "Full Body": [
      "Confidence isn't about perfection, it's about showing up.",
      "This outfit? It's more than just clothes.",
      "When you feel good, you show up differently.",
      "Style is just the beginning...",
    ],
    "Half Body": [
      "Let's talk about something important...",
      "I've learned something valuable recently.",
      "Here's what I wish I knew earlier...",
      "Can I share something with you?",
    ],
    Object: [
      "The tools that changed everything for me.",
      "These are my non-negotiables.",
      "What's in my daily routine? Let me show you.",
      "The essentials that keep me going.",
    ],
  }

  const stories = {
    "Close-Up": `When I started as a ${contentThemes}, I thought I had to be perfect. But the truth? People connect with authenticity, not perfection.\n\nThe moment I started showing up as my real self - flaws, struggles, and all - everything shifted. My audience grew, my engagement increased, and most importantly, I felt aligned with my work.`,
    Quote: `Sometimes we all need a reminder that we're on the right path. Building ${contentThemes} isn't always easy, but it's always worth it.\n\nI keep this quote close because on the hard days, it reminds me why I started. And on the good days, it pushes me to keep growing.`,
    Lifestyle: `This is what the journey really looks like. Not just the highlight reel, but the real moments - the coffee breaks, the planning sessions, the work that happens behind the scenes.\n\nAs a ${contentThemes}, I've learned that consistency beats perfection every time. Show up, do the work, trust the process.`,
    "Full Body": `Your personal brand isn't just about what you do - it's about how you show up. The energy you bring, the confidence you carry, the authenticity you share.\n\nI've learned that when you align your outer presence with your inner values, magic happens. You attract the right people, opportunities, and growth.`,
    "Half Body": `Here's something I wish someone told me earlier: ${contentThemes} is a journey, not a destination.\n\nEvery step forward counts. Every lesson learned matters. Every moment of growth adds up. Trust your process, celebrate your progress, and keep moving forward.`,
    Object: `The right tools make all the difference. But here's what matters more than any tool or strategy: your commitment to showing up consistently.\n\nThese are the essentials that support my work as a ${contentThemes}. But the real secret? It's the daily dedication to serving my audience and staying true to my mission.`,
  }

  const ctas = [
    "What resonates with you most? Drop a comment below 👇",
    "Save this for later and share it with someone who needs to hear it 💫",
    "Tell me in the comments - can you relate? 💬",
    "Which part speaks to you? Let me know below ⬇️",
    "Drop a 💛 if this resonates with you",
    "Tag someone who needs this reminder today 🤍",
  ]

  const postType = post.category as keyof typeof hooks
  const hook = hooks[postType]?.[postIndex % hooks[postType].length] || hooks["Close-Up"][0]
  const story = stories[postType] || stories["Close-Up"]
  const cta = ctas[postIndex % ctas.length]

  const emojis =
    brandVoice.includes("elegant") || brandVoice.includes("luxury")
      ? ["✨", "🤍", "💫"]
      : brandVoice.includes("bold") || brandVoice.includes("confident")
        ? ["💪", "🔥", "⚡"]
        : ["💛", "🌟", "✨"]

  const emoji = emojis[postIndex % emojis.length]

  const caption = `${hook}\n\n${story}\n\n${cta} ${emoji}`

  const selectedHashtags = hashtags.slice(0, 12).join(" ")

  return {
    caption,
    hashtags: selectedHashtags,
  }
}
