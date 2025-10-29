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

**When a user asks you to design their feed:**

1. Respond warmly and let them know you're starting
2. Call the generateCompleteFeed tool (it will research trends automatically)
3. After the tool completes, explain the feed strategy in a conversational way

The generateCompleteFeed tool handles all the research and design work internally, so you just need to call it once and then explain the results to the user.
`

function generateSmartHashtags(businessType: string): string[] {
  const businessTypeSlug = businessType.toLowerCase().replace(/\s+/g, "")

  const baseHashtags = [`#${businessTypeSlug}`, "#personalbrand", "#contentcreator", "#entrepreneur"]

  const businessSpecificHashtags = businessType.toLowerCase().includes("coach")
    ? ["#businesscoach", "#lifecoach", "#mindsetcoach", "#coachingbusiness"]
    : businessType.toLowerCase().includes("designer")
      ? ["#designerlife", "#creativeentrepreneur", "#designbusiness", "#branddesigner"]
      : businessType.toLowerCase().includes("photographer")
        ? ["#photographerbusiness", "#creativebusiness", "#photographylife", "#shootandshare"]
        : ["#smallbusiness", "#solopreneur", "#businessowner", "#onlinebusiness"]

  return [
    ...baseHashtags,
    ...businessSpecificHashtags,
    "#instagramgrowth",
    "#socialmediatips",
    "#brandstrategy",
    "#businessgrowth",
    "#entrepreneurlife",
    "#creativeentrepreneur",
  ].slice(0, 15)
}

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
          description: z.string().describe("What this highlight category contains"),
        }),
      )
      .describe("5-7 Instagram highlight categories that organize their content strategy"),
  }),
  execute: async ({ brandVibe, businessType, colorPalette, feedStory, instagramBio, highlights }) => {
    console.log("[v0] [SERVER] === TOOL EXECUTION STARTED ===")
    console.log("[v0] [SERVER] Generating feed strategy:", {
      brandVibe,
      businessType,
      colorPalette,
    })

    const researchInsights = "Using current Instagram best practices and proven feed layout strategies"

    // Instead of a fixed template, we now generate dynamic patterns that create visual interest

    // Define multiple aesthetic layout patterns
    const layoutPatterns = {
      // Checkerboard pattern - alternates between personal and lifestyle/object posts
      checkerboard: [
        { type: "Object", tone: "cool" },
        { type: "Place/Scenery", tone: "cool" },
        { type: "Hobby/Others", tone: "cool" },
        { type: "Full Body", tone: "warm" },
        { type: "Selfie", tone: "warm" },
        { type: "Object", tone: "cool" },
        { type: "Place/Scenery", tone: "cool" },
        { type: "Hobby/Others", tone: "cool" },
        { type: "Full Body", tone: "warm" },
      ],

      // Diagonal flow - creates diagonal lines of similar content
      diagonal: [
        { type: "Object", tone: "cool" },
        { type: "Full Body", tone: "warm" },
        { type: "Place/Scenery", tone: "cool" },
        { type: "Place/Scenery", tone: "cool" },
        { type: "Selfie", tone: "warm" },
        { type: "Hobby/Others", tone: "cool" },
        { type: "Hobby/Others", tone: "cool" },
        { type: "Full Body", tone: "warm" },
        { type: "Selfie", tone: "warm" },
      ],

      // Row storytelling - each row tells a different part of the story
      rowStory: [
        { type: "Selfie", tone: "warm" },
        { type: "Object", tone: "cool" },
        { type: "Place/Scenery", tone: "cool" },
        { type: "Full Body", tone: "warm" },
        { type: "Hobby/Others", tone: "cool" },
        { type: "Selfie", tone: "warm" },
        { type: "Place/Scenery", tone: "cool" },
        { type: "Full Body", tone: "warm" },
        { type: "Object", tone: "cool" },
      ],

      // Scattered balance - creates visual interest with scattered warm/cool tones
      scattered: [
        { type: "Full Body", tone: "warm" },
        { type: "Place/Scenery", tone: "cool" },
        { type: "Selfie", tone: "warm" },
        { type: "Object", tone: "cool" },
        { type: "Hobby/Others", tone: "cool" },
        { type: "Full Body", tone: "warm" },
        { type: "Selfie", tone: "warm" },
        { type: "Place/Scenery", tone: "cool" },
        { type: "Object", tone: "cool" },
      ],
    }

    // Select pattern based on brand vibe
    let selectedPattern: typeof layoutPatterns.checkerboard
    let visualRhythm: string

    if (brandVibe.includes("elegant") || brandVibe.includes("minimalist") || brandVibe.includes("clean")) {
      selectedPattern = layoutPatterns.checkerboard
      visualRhythm = "checkerboard pattern with alternating personal and lifestyle moments"
    } else if (brandVibe.includes("bold") || brandVibe.includes("colorful") || brandVibe.includes("vibrant")) {
      selectedPattern = layoutPatterns.diagonal
      visualRhythm = "diagonal flow creating dynamic visual movement"
    } else if (brandVibe.includes("moody") || brandVibe.includes("dark") || brandVibe.includes("dramatic")) {
      selectedPattern = layoutPatterns.scattered
      visualRhythm = "scattered balance with strategic contrast"
    } else {
      selectedPattern = layoutPatterns.rowStory
      visualRhythm = "row-by-row storytelling with cohesive narrative"
    }

    const postTypeMapping = {
      Object: "Object",
      "Place/Scenery": "Lifestyle",
      "Hobby/Others": "Lifestyle",
      "Full Body": "Full Body",
      Selfie: "Close-Up",
    }

    const postSequence = selectedPattern.map((item, index) => {
      const mappedType = postTypeMapping[item.type as keyof typeof postTypeMapping]

      // Define purpose and composition based on post type
      const postDetails = {
        Object: {
          purpose: "Brand aesthetic moment - styled flatlay or product shot",
          composition: "Overhead or angled shot, elegant arrangement, brand-aligned objects",
        },
        Lifestyle:
          item.type === "Place/Scenery"
            ? {
                purpose: "Environmental storytelling - show your world and spaces",
                composition: "Location-based shot, architectural or natural elements, atmospheric",
              }
            : {
                purpose: "Authentic moment - hobbies, interests, or behind-the-scenes",
                composition: "Candid or activity-based, show personality and interests",
              },
        "Full Body": {
          purpose: "Complete style showcase - fashion meets personality",
          composition: "Full outfit visible, confident posture, environmental context",
        },
        "Close-Up": {
          purpose:
            item.tone === "warm"
              ? "Personal connection - face and expression focus"
              : "Detail shot - intimate and engaging",
          composition: "Face focus, emotional connection, direct or thoughtful gaze",
        },
        "Half Body": {
          purpose: "Professional yet approachable - the sweet spot",
          composition: "Upper body focus, show personality through styling and expression",
        },
      }

      return {
        type: mappedType,
        tone: item.tone,
        purpose: postDetails[mappedType as keyof typeof postDetails]?.purpose || "Engaging content",
        composition: postDetails[mappedType as keyof typeof postDetails]?.composition || "Balanced composition",
      }
    })

    const posts = postSequence.map((post, index) => {
      if (post.type === "Object") {
        return {
          id: `post-${index + 1}`,
          title: "Styled Moment",
          description: `${post.purpose}. ${post.composition}. Inspired by trending ${businessType} aesthetics`,
          category: "Object",
          prompt: `styled flatlay photography, ${colorPalette}, elegant product arrangement, overhead shot, soft natural lighting, professional editorial quality, ${brandVibe} aesthetic, brand-aligned objects (flowers, coffee, notebook, jewelry, books, workspace items), shallow depth of field, film grain, high-end commercial photography, minimalist composition, trending Instagram aesthetic 2025`,
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
        title: `${post.type} ${post.type === "Lifestyle" ? "Moment" : "Portrait"}`,
        description: categoryDescriptions[post.type as keyof typeof categoryDescriptions],
        category: post.type,
        prompt: `A confident ${businessType} professional with styled appearance, ${colorPalette} color palette, ${brandVibe} aesthetic, ${lensSpecs[post.type as keyof typeof lensSpecs]}, ${lightingStyle}, natural skin texture with film grain, timeless elegance, high-end editorial photography, authentic professional presence, ${post.composition}, trending Instagram aesthetic 2025`,
        textOverlay: undefined,
        purpose: post.purpose,
        composition: post.composition,
      }
    })

    const trendingHashtags = generateSmartHashtags(businessType)

    const postsWithCaptions = posts.map((post, index) => {
      const { caption, hashtags } = generateCaptionWithRecipe(post, index, trendingHashtags, businessType)
      return {
        ...post,
        caption,
        hashtags,
      }
    })

    let feedId: string | null = null

    try {
      const sql = neon(process.env.DATABASE_URL!)

      const user = await getCurrentNeonUser()

      if (!user) {
        console.error("[v0] [SERVER] No user found, cannot save feed")
        return "I encountered an error - you need to be logged in to save your feed strategy. Please refresh and try again."
      }

      const [feedLayout] = await sql`
        INSERT INTO feed_layouts (
          user_id, brand_vibe, business_type, color_palette, 
          visual_rhythm, feed_story, research_insights, title, description
        )
        VALUES (
          ${user.id}, ${brandVibe}, ${businessType}, ${colorPalette},
          ${visualRhythm}, ${feedStory}, ${researchInsights},
          ${`${businessType} Feed Strategy`}, ${feedStory}
        )
        RETURNING id
      `

      feedId = feedLayout.id.toString()
      console.log("[v0] [SERVER] ✓ Feed layout created with ID:", feedId)

      await sql`
        INSERT INTO instagram_bios (feed_layout_id, bio_text, user_id)
        VALUES (${feedId}, ${instagramBio}, ${user.id})
      `
      console.log("[v0] [SERVER] ✓ Instagram bio saved")

      for (const highlight of highlights) {
        await sql`
          INSERT INTO instagram_highlights (feed_layout_id, title, prompt, user_id)
          VALUES (${feedId}, ${highlight.title}, ${highlight.description}, ${user.id})
        `
      }
      console.log("[v0] [SERVER] ✓ Highlights saved:", highlights.length)

      for (let i = 0; i < postsWithCaptions.length; i++) {
        const post = postsWithCaptions[i]
        await sql`
          INSERT INTO feed_posts (
            feed_layout_id, user_id, position, prompt, post_type,
            caption, text_overlay_style, generation_status
          )
          VALUES (
            ${feedId}, ${user.id}, ${i}, ${post.prompt}, ${post.category},
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
      },
      maxSteps: 5,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Feed chat error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

function generateCaptionWithRecipe(post: any, postIndex: number, hashtags: string[], businessType: string) {
  const brandVoice = "authentic and relatable"

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
      "The essentials that changed my workflow.",
      "What's on my desk today? Let me show you.",
      "These pieces tell my brand story.",
      "The details that make all the difference.",
    ],
  }

  const stories = {
    "Close-Up": `When I started as a ${businessType}, I thought I had to be perfect. But the truth? People connect with authenticity, not perfection.\n\nThe moment I started showing up as my real self - flaws, struggles, and all - everything shifted. My audience grew, my engagement increased, and most importantly, I felt aligned with my work.`,
    Quote: `Sometimes we all need a reminder that we're on the right path. Building a ${businessType} business isn't always easy, but it's always worth it.\n\nI keep this quote close because on the hard days, it reminds me why I started. And on the good days, it pushes me to keep growing.`,
    Lifestyle: `This is what the journey really looks like. Not just the highlight reel, but the real moments - the coffee breaks, the planning sessions, the work that happens behind the scenes.\n\nAs a ${businessType}, I've learned that consistency beats perfection every time. Show up, do the work, trust the process.`,
    "Full Body": `Your personal brand isn't just about what you do - it's about how you show up. The energy you bring, the confidence you carry, the authenticity you share.\n\nI've learned that when you align your outer presence with your inner values, magic happens. You attract the right people, opportunities, and growth.`,
    "Half Body": `Here's something I wish someone told me earlier: being a ${businessType} is a journey, not a destination.\n\nEvery step forward counts. Every lesson learned matters. Every moment of growth adds up. Trust your process, celebrate your progress, and keep moving forward.`,
    Object: `Every detail in my workspace is intentional. From the way I style my desk to the tools I choose, it all reflects my brand aesthetic and values.\n\nAs a ${businessType}, I've learned that your environment shapes your creativity. These carefully curated pieces aren't just beautiful - they inspire me to do my best work every single day.`,
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
