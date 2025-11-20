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

    const totalCreditsNeeded = 15
    const hasCredits = await checkCredits(neonUser.id.toString(), totalCreditsNeeded)

    if (!hasCredits) {
      console.error("[v0] Insufficient credits for auto-generation")
      return NextResponse.json(
        {
          error: `Insufficient credits. You need ${totalCreditsNeeded} credits to generate your feed.`,
        },
        { status: 402 },
      )
    }

    console.log("[v0] Credits checked: User has enough credits")
    console.log("[v0] Starting orchestration...")

    // Call AI directly in the API route
    console.log("[v0] Calling AI SDK for layout strategy...")

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

    const layoutResult = await generateText({
      model: "anthropic/claude-sonnet-4.5",
      system: `You are a strategic Instagram feed designer. Design a cohesive 9-post grid layout.`,
      prompt: `Create a 9-post Instagram feed strategy for:
      
Brand: ${brandProfile.business_name || "Personal brand"}
Niche: ${brandProfile.business_type}
Vibe: ${brandProfile.brand_vibe}
Audience: ${brandProfile.target_audience}
Request: ${userRequest}

Return JSON with:
{
  "gridPattern": "string",
  "visualRhythm": "string", 
  "overallStrategy": "string",
  "posts": [
    {"position": 1, "shotType": "string", "purpose": "string", "visualDirection": "string"},
    ... 9 posts total
  ]
}`,
      temperature: 0.7,
    })

    console.log("[v0] AI SDK call successful!")
    const layoutStrategy = JSON.parse(layoutResult.text)

    // Create feed layout
    const [feedLayout] = await sql`
      INSERT INTO feed_layouts (
        user_id, title, description, business_type, brand_vibe, 
        layout_type, visual_rhythm, feed_story, status
      ) VALUES (
        ${neonUser.id}, 'Strategic Instagram Feed', ${userRequest.substring(0, 500)},
        ${brandProfile.business_type}, ${brandProfile.brand_vibe},
        ${layoutStrategy.gridPattern}, ${layoutStrategy.visualRhythm},
        ${layoutStrategy.overallStrategy}, 'draft'
      )
      RETURNING id
    `

    console.log("[v0] Feed layout created:", feedLayout.id)

    // Insert posts into feed_posts table
    for (let i = 0; i < layoutStrategy.posts.length; i++) {
      const postData = layoutStrategy.posts[i]

      try {
        console.log(`[v0] === Inserting post ${i + 1}/9 (position ${postData.position}) ===`)

        await sql`
          INSERT INTO feed_posts (
            feed_layout_id, position, shot_type, purpose, visual_direction
          ) VALUES (
            ${feedLayout.id}, ${postData.position}, ${postData.shotType}, ${postData.purpose}, ${postData.visualDirection}
          )
        `

        console.log(`[v0] ✓ Successfully inserted post ${postData.position}`)
      } catch (error) {
        console.error(`[v0] ✗ Error inserting post ${postData.position}:`, error)
      }
    }

    console.log("[v0] Returning success response to client...")
    console.log("[v0] ==================== CREATE STRATEGY API COMPLETE ====================")

    return NextResponse.json({
      success: true,
      feedLayoutId: feedLayout.id,
      message: "AI SDK connection successful! Layout strategy generated.",
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
