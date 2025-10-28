import { streamText, tool } from "ai"
import { z } from "zod"
import { getCurrentNeonUser } from "@/lib/user-sync"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import type { CoreMessage } from "ai"
import { neon } from "@neondatabase/serverless"

const MAYA_FEED_STRATEGIST_EXTENSION = `

## Instagram Feed Strategy Expertise

You're an expert Instagram strategist who creates cohesive, professional feeds by researching current trends and aesthetics.

**Your Workflow - FOLLOW THESE STEPS IN ORDER:**

When a user asks you to design their feed, you MUST complete ALL THREE steps:

**Step 1: Research** 
- Use the researchInstagramTrends tool to find trending layouts, patterns, and aesthetics for their niche
- Example query: "Instagram feed layouts for [their niche] Pinterest 2025 trending aesthetic patterns"

**Step 2: Design**
- IMMEDIATELY after research completes, use the generateCompleteFeed tool
- Pass the research insights you just discovered into the researchInsights parameter
- Create a unique feed strategy based on what you learned

**Step 3: Explain**
- After the generateCompleteFeed tool finishes, write a warm conversational message explaining:
  - What you researched and discovered
  - Why you chose specific patterns and aesthetics  
  - What makes their feed unique and strategic
  - Next steps (like generating the images)

**IMPORTANT RULES:**
- NEVER stop after just researching - you must continue to design the feed
- ALWAYS call generateCompleteFeed immediately after researchInstagramTrends completes
- ALWAYS respond with conversational text after the tools finish
- The user should see: your initial message → research → design → your explanation

**Example Complete Flow:**
User: "Can you design my feed?"
You: "I'd love to! Let me research trending Instagram aesthetics for [their niche] first..."
[Call researchInstagramTrends tool - it completes]
[IMMEDIATELY call generateCompleteFeed tool with the research insights - it completes]
You: "Your feed strategy is ready! I researched [findings] and created a [pattern] layout with [colors]. Here's what makes it special: [explanation]. Ready to generate the images?"

Remember: You must complete ALL THREE steps. Research → Design → Explain. Don't stop halfway!
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
    "Research current Instagram trends, viral hooks, best practices, aesthetic feed layouts from Pinterest, or any Instagram-related information using web search. ALWAYS use this before designing a feed to get real-time inspiration and trends.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "What to research (e.g., 'aesthetic Instagram feed layouts for life coaches Pinterest 2025', 'trending Instagram grid patterns wellness brands', 'viral Instagram feed color schemes minimalist')",
      ),
  }),
  execute: async ({ query }) => {
    console.log("[v0] Researching Instagram trends:", query)

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
    "Design a complete 9-post Instagram feed strategy with professional visual rhythm, content variety, and brand cohesion. IMPORTANT: You should have already researched trending feed layouts using researchInstagramTrends before calling this tool. Use the research insights to create a unique, non-template feed design.",
  inputSchema: z.object({
    researchInsights: z
      .string()
      .describe(
        "Summary of research findings from Pinterest and Instagram trends that will inform this feed design (e.g., 'Trending: diagonal flow with warm neutrals, 40% close-ups, minimalist quote posts with serif fonts')",
      ),
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
        "Specific color scheme that matches their brand AND current trends (e.g., 'neutral earth tones - beige, cream, white', 'dark moody - charcoal, black, gold')",
      ),
    visualRhythm: z
      .string()
      .describe(
        "The pattern strategy for the feed based on research (e.g., 'checkerboard alternating portraits and quotes', 'diagonal flow with lifestyle moments', 'row-by-row storytelling')",
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
    researchInsights,
    brandVibe,
    businessType,
    colorPalette,
    visualRhythm,
    feedStory,
    instagramBio,
    highlights,
  }) {
    console.log("[v0] Generating research-driven feed strategy:", {
      researchInsights,
      brandVibe,
      businessType,
      colorPalette,
      visualRhythm,
    })

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
      confidence: [
        "BE YOUR OWN BOSS",
        "CONFIDENCE IS THE KEY",
        "BELIEVE IN YOURSELF",
        "OWN YOUR POWER",
        "TRUST YOUR VISION",
        "YOU ARE ENOUGH",
      ],
      motivation: [
        "FOLLOW YOUR PASSION",
        "TRUST THE PROCESS",
        "CREATE YOUR VISION",
        "MAKE IT HAPPEN",
        "START BEFORE YOU'RE READY",
        "PROGRESS OVER PERFECTION",
      ],
      lifestyle: [
        "LIVE IN THE MOMENT",
        "FIND YOUR BALANCE",
        "EMBRACE THE JOURNEY",
        "STAY PRESENT",
        "SLOW DOWN & BREATHE",
        "ENJOY THE LITTLE THINGS",
      ],
      growth: [
        "EXPAND YOUR MINDSET",
        "LEVEL UP",
        "GROW THROUGH IT",
        "EVOLVE DAILY",
        "BECOME WHO YOU'RE MEANT TO BE",
        "TRANSFORM YOUR LIFE",
      ],
      success: [
        "DREAM BIG",
        "SUCCESS STARTS HERE",
        "BUILD YOUR EMPIRE",
        "RISE AND SHINE",
        "MAKE YOUR MARK",
        "CREATE YOUR LEGACY",
      ],
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
          description: `${post.purpose}. ${post.composition}. Research-driven design: ${researchInsights}`,
          category: "Quote",
          prompt: `minimalist ${colorPalette} background, elegant composition with 70% negative space, soft gradient or solid color, subtle texture, professional editorial quality, ${brandVibe} aesthetic, clean and sophisticated, high-end design, breathing room around center, trending Instagram aesthetic 2025`,
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
          description: `${post.purpose}. ${post.composition}. Inspired by trending ${businessType} aesthetics`,
          category: "Object",
          prompt: `styled flatlay photography, ${colorPalette}, elegant product arrangement, overhead shot, soft natural lighting, professional editorial quality, ${brandVibe} aesthetic, brand-aligned objects (flowers, coffee, notebook, jewelry), shallow depth of field, film grain, high-end commercial photography, minimalist composition, trending Instagram aesthetic 2025`,
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
        prompt: `raw photo, editorial quality, professional photography, sharp focus, natural skin texture, visible pores, film grain, ${colorPalette}, ${brandVibe} aesthetic, ${lensSpecs[post.type as keyof typeof lensSpecs]}, ${lightingStyle}, ${businessType} professional, confident expression, timeless elegance, high-end fashion photography, authentic moment, ${post.composition}, trending Instagram aesthetic 2025`,
        textOverlay: undefined,
        purpose: post.purpose,
        composition: post.composition,
      }
    })

    const user = await getCurrentNeonUser()
    const userBrand = { content_themes: "", target_audience: "" }
    const trendingHashtags = await fetchTrendingHashtags(businessType, userBrand)

    const postsWithCaptions = posts.map((post, index) => {
      const { caption, hashtags } = generateCaptionWithRecipe(post, index, trendingHashtags)
      return {
        ...post,
        caption,
        hashtags,
      }
    })

    let feedId: string | null = null

    if (user) {
      try {
        const sql = neon(process.env.DATABASE_URL!)

        const [feedLayout] = await sql`
          INSERT INTO feed_layouts (
            user_id, brand_vibe, business_type, color_palette, 
            visual_rhythm, feed_story, research_insights
          )
          VALUES (
            ${user.id}, ${brandVibe}, ${businessType}, ${colorPalette},
            ${visualRhythm}, ${feedStory}, ${researchInsights}
          )
          RETURNING id
        `

        feedId = feedLayout.id

        await sql`
          INSERT INTO instagram_bios (feed_id, bio_text)
          VALUES (${feedId}, ${instagramBio})
        `

        for (const highlight of highlights) {
          await sql`
            INSERT INTO instagram_highlights (feed_id, title, description)
            VALUES (${feedId}, ${highlight.title}, ${highlight.description})
          `
        }

        for (let i = 0; i < postsWithCaptions.length; i++) {
          const post = postsWithCaptions[i]
          await sql`
            INSERT INTO feed_posts (
              feed_id, position, title, description, prompt, category,
              caption, hashtags, text_overlay, status
            )
            VALUES (
              ${feedId}, ${i}, ${post.title}, ${post.description}, ${post.prompt},
              ${post.category}, ${post.caption}, ${post.hashtags},
              ${post.textOverlay ? JSON.stringify(post.textOverlay) : null}, 'pending'
            )
          `
        }

        console.log("[v0] Feed saved to database with ID:", feedId)
      } catch (error) {
        console.error("[v0] Error saving feed to database:", error)
      }
    }

    yield {
      state: "ready" as const,
      feedData: {
        feedId,
        brandVibe,
        businessType,
        colorPalette,
        visualRhythm,
        feedStory,
        instagramBio,
        highlights,
        posts: postsWithCaptions,
      },
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

    const result = await streamText({
      model: "anthropic/claude-sonnet-4",
      system: enhancedSystemPrompt,
      messages: coreMessages,
      tools: {
        generateCompleteFeed: generateCompleteFeedTool,
        researchInstagramTrends: researchInstagramTrendsTool,
      },
      maxSteps: 10,
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
