import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { checkCredits } from "@/lib/credits"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ==================== CREATE STRATEGY API CALLED ====================")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.log("[v0] No auth user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Auth user:", authUser.id)

    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      console.log("[v0] Neon user not found for auth user:", authUser.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Neon user found:", neonUser.id)

    const body = await request.json()
    const { request: userRequest, chatId } = body

    if (!userRequest) {
      return NextResponse.json({ error: "Request is required" }, { status: 400 })
    }

    console.log("[v0] Feed Planner API: Creating strategy for user", neonUser.id)
    console.log("[v0] User request:", userRequest.substring(0, 100) + "...")

    const totalCreditsNeeded = 5
    const hasCredits = await checkCredits(neonUser.id.toString(), totalCreditsNeeded)

    if (!hasCredits) {
      console.error("[v0] Insufficient credits for auto-generation")
      return NextResponse.json(
        {
          error: `Insufficient credits. You need ${totalCreditsNeeded} credits to generate your feed strategy.`,
        },
        { status: 402 },
      )
    }

    console.log("[v0] Credits checked: User has enough credits")
    console.log("[v0] Starting strategy generation...")

    const sql = neon(process.env.DATABASE_URL!)

    // Get brand profile
    const [brandProfile] = await sql`
      SELECT * FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      AND is_completed = true
      LIMIT 1
    `

    if (!brandProfile) {
      return NextResponse.json({ error: "Please complete your personal brand profile first" }, { status: 400 })
    }

    console.log("[v0] Brand profile loaded")

    const strategyResult = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You are an expert Instagram strategist. Create a comprehensive 9-post Instagram feed strategy.
      
CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no backticks.`,
      prompt: `Create a complete Instagram feed strategy for:
      
Brand: ${brandProfile.business_name || "Personal brand"}
Type: ${brandProfile.business_type}
Vibe: ${brandProfile.brand_vibe}
Voice: ${brandProfile.brand_voice}
Audience: ${brandProfile.target_audience}
Values: ${JSON.stringify(brandProfile.core_values)}
User Request: ${userRequest}

Return ONLY this JSON structure (no markdown, no backticks):
{
  "strategyDocument": "# Instagram Feed Strategy\n\n## Overview\n[Full markdown strategy document with sections: Brand Positioning, Content Pillars, Visual Aesthetic, Engagement Strategy, Growth Tactics, Posting Schedule]\n\n## 9-Post Grid Strategy\n[Explain the visual flow and storytelling]",
  "gridPattern": "Description of the 3x3 visual pattern",
  "visualRhythm": "How the posts flow together visually",
  "posts": [
    {
      "position": 1,
      "postType": "portrait",
      "contentPillar": "connection",
      "caption": "Full Instagram caption with hook, value, CTA (150-200 words)",
      "hashtags": ["tag1", "tag2", "tag3"],
      "prompt": "Detailed FLUX prompt for image generation including person description, setting, lighting, mood, camera angle"
    },
    ... (9 posts total, each with unique caption, hashtags, and prompt)
  ]
}

Make the strategy document comprehensive (500+ words) with actionable insights.
Make captions engaging with strong hooks and clear CTAs.
Include 10-15 relevant hashtags per post.`,
      temperature: 0.8,
    })

    console.log("[v0] Strategy generation successful!")
    console.log("[v0] Raw AI response length:", strategyResult.text.length)
    console.log("[v0] First 500 chars:", strategyResult.text.substring(0, 500))

    let cleanedText = strategyResult.text.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "").trim()
    }

    console.log("[v0] Cleaned text length:", cleanedText.length)
    console.log("[v0] Attempting JSON parse...")

    const strategy = JSON.parse(cleanedText)

    console.log("[v0] Strategy parsed successfully!")
    console.log("[v0] Strategy has posts array:", Array.isArray(strategy.posts))
    console.log("[v0] Posts array length:", strategy.posts?.length || 0)
    if (strategy.posts && strategy.posts.length > 0) {
      console.log("[v0] First post structure:", JSON.stringify(strategy.posts[0], null, 2))
    }

    const truncate = (str: string, max = 50) => (str && str.length > max ? str.substring(0, max) : str)

    const [feedLayout] = await sql`
      INSERT INTO feed_layouts (
        user_id, 
        title, 
        description, 
        business_type, 
        brand_vibe, 
        layout_type, 
        visual_rhythm, 
        feed_story, 
        status,
        created_at,
        updated_at
      ) VALUES (
        ${neonUser.id}, 
        'Instagram Feed Strategy', 
        ${strategy.strategyDocument},
        ${truncate(brandProfile.business_type)}, 
        ${truncate(brandProfile.brand_vibe)},
        ${truncate(strategy.gridPattern)}, 
        ${strategy.visualRhythm},
        ${userRequest.substring(0, 500)}, 
        'pending',
        NOW(),
        NOW()
      )
      RETURNING id
    `

    console.log("[v0] Feed layout created:", feedLayout.id)

    if (!strategy.posts || !Array.isArray(strategy.posts) || strategy.posts.length === 0) {
      console.error("[v0] ERROR: No posts in strategy!")
      console.error("[v0] Strategy object keys:", Object.keys(strategy))
      throw new Error("Strategy generation failed: No posts array found")
    }

    console.log("[v0] Starting to insert", strategy.posts.length, "posts...")

    for (let i = 0; i < strategy.posts.length; i++) {
      const post = strategy.posts[i]

      try {
        console.log(`[v0] === Inserting post ${i + 1}/9 (position ${post.position}) ===`)
        console.log(`[v0] Post data: position=${post.position}, type=${post.postType}, pillar=${post.contentPillar}`)
        console.log(`[v0] Caption length: ${post.caption?.length || 0}`)
        console.log(`[v0] Prompt length: ${post.prompt?.length || 0}`)
        console.log(`[v0] Hashtags count: ${post.hashtags?.length || 0}`)

        await sql`
          INSERT INTO feed_posts (
            feed_layout_id,
            user_id,
            position,
            post_type,
            content_pillar,
            caption,
            prompt,
            post_status,
            generation_status,
            created_at,
            updated_at
          ) VALUES (
            ${feedLayout.id},
            ${neonUser.id},
            ${post.position},
            ${post.postType || "post"},
            ${post.contentPillar || "general"},
            ${post.caption + "\n\n" + post.hashtags.map((h: string) => "#" + h).join(" ")},
            ${post.prompt},
            'draft',
            'pending',
            NOW(),
            NOW()
          )
        `

        console.log(`[v0] ✓ Successfully inserted post ${post.position}`)
      } catch (error) {
        console.error(`[v0] ✗ Error inserting post ${post.position}:`, error)
        throw error
      }
    }

    console.log("[v0] All posts inserted successfully!")
    console.log("[v0] ==================== CREATE STRATEGY API COMPLETE ====================")

    return NextResponse.json({
      success: true,
      feedLayoutId: feedLayout.id,
      message: "Strategy created! Ready to generate images.",
    })
  } catch (error) {
    console.error("[v0] Feed Planner API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create feed strategy",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
