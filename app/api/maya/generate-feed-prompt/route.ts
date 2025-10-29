import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { streamText } from "ai"
import { getMayaPersonality } from "@/lib/maya/personality-enhanced"

const sql = neon(process.env.DATABASE_URL || "")

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postType, caption, feedPosition, colorTheme, brandVibe } = body

    console.log("[v0] [FEED-PROMPT] Starting prompt generation for:", {
      postType,
      caption: caption?.substring(0, 50),
      feedPosition,
      colorTheme,
      brandVibe,
    })

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      console.error("[v0] [FEED-PROMPT] User not found in database")
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log("[v0] [FEED-PROMPT] Found neon user:", neonUser.id)

    const brandDataResult = await sql`
      SELECT 
        color_theme,
        custom_colors,
        color_mood
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    let brandColors = ""
    if (brandDataResult.length > 0) {
      const brandData = brandDataResult[0]
      if (brandData.custom_colors) {
        try {
          const customColors = JSON.parse(brandData.custom_colors)
          if (Array.isArray(customColors) && customColors.length > 0) {
            brandColors = customColors.join(", ")
          }
        } catch (e) {
          console.error("[v0] Error parsing custom colors:", e)
        }
      }
    }

    // Get user's trigger word and gender
    const userDataResult = await sql`
      SELECT 
        u.gender,
        um.trigger_word
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id
      WHERE u.id = ${neonUser.id}
      AND um.training_status = 'completed'
      ORDER BY um.created_at DESC
      LIMIT 1
    `

    if (userDataResult.length === 0) {
      console.error("[v0] [FEED-PROMPT] No trained model found for user:", neonUser.id)
      return NextResponse.json({ error: "No trained model found" }, { status: 400 })
    }

    const userData = userDataResult[0]
    const triggerWord = userData.trigger_word || "person"
    const gender = userData.gender

    console.log("[v0] [FEED-PROMPT] User data:", { triggerWord, gender })

    // Get user context for Maya
    console.log("[v0] [FEED-PROMPT] Getting user context...")
    const userContext = await getUserContextForMaya(user.id)
    console.log("[v0] [FEED-PROMPT] User context retrieved, length:", userContext.length)

    // Build Maya's system prompt for feed post generation
    const mayaPersonality = getMayaPersonality()

    const systemPrompt = `${mayaPersonality}

${userContext}

=== YOUR TASK: GENERATE INSTAGRAM FEED POST PROMPT ===

You are generating a FLUX prompt for an Instagram feed post. This is NOT a concept card - this is for the user's actual Instagram feed that will be published.

POST DETAILS:
- Post Type: ${postType}
- Caption: ${caption || "No caption provided"}
- Feed Position: ${feedPosition ? `Post #${feedPosition} in the feed` : "Not specified"}
- Color Theme: ${colorTheme || "Not specified"}
- Brand Vibe: ${brandVibe || "Not specified"}
- User's Trigger Word: ${triggerWord}
- User's Gender: ${gender || "Not specified"}
${brandColors ? `- User's Brand Colors: ${brandColors}` : ""}

IMPORTANT INSTRUCTIONS:
1. Generate a sophisticated FLUX prompt that will create a stunning Instagram post
2. Use your fashion expertise: fabrics, colors, silhouettes, accessories, styling
3. Use your Instagram knowledge: what works on feeds, visual storytelling, engagement
4. ${brandColors ? `**CRITICAL**: Incorporate the user's brand colors (${brandColors}) into the styling, clothing, background, or props. These are their chosen brand colors and MUST be reflected in the image.` : ""}
5. Consider the post type and create appropriate composition:
   - "Full Body": Full body shot, show outfit, styling, environment
   - "Half Body": Waist-up shot, focus on upper styling, expression
   - "Close-Up": Face and shoulders, emphasize expression, details
   - "Selfie": Natural selfie angle, authentic feel, relatable
   - "Lifestyle": Environmental storytelling, activity, context
   - "Object": Product/item focus, styling, flat lay or in-context
   - "Place/Scenery": Location focus, atmosphere, mood
   - "Hobby/Others": Activity-based, authentic moment, passion
6. Match the color theme and brand vibe if provided
7. Create prompts that feel authentic and Instagram-worthy
8. ALWAYS start with the trigger word: ${triggerWord}
9. Be specific about lighting, setting, styling, pose, and mood
10. ${brandColors ? `Describe clothing, accessories, or background elements in the brand colors: ${brandColors}` : ""}
11. Make it feel like a real Instagram post, not a studio photoshoot (unless that's the vibe)

OUTPUT FORMAT:
Generate ONLY the FLUX prompt. No explanations, no extra text. Just the prompt that will be sent to Replicate.

Example output format:
"${triggerWord}, woman in elegant beige linen blazer and white silk camisole, standing in minimalist modern office, soft natural window light, confident expression, looking at camera, professional yet approachable, warm neutral tones, shallow depth of field, 35mm lens, editorial quality, raw photo, high resolution"

Now generate the FLUX prompt for this feed post:`

    // Call AI to generate the prompt
    console.log("[v0] [FEED-PROMPT] Calling AI SDK with model: anthropic/claude-3-5-sonnet-20241022")
    let result
    try {
      result = await streamText({
        model: "anthropic/claude-3-5-sonnet-20241022", // Use correct Anthropic model identifier
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Generate the FLUX prompt for this ${postType} post.`,
          },
        ],
        temperature: 0.8,
        maxTokens: 500,
      })
      console.log("[v0] [FEED-PROMPT] AI SDK call successful")
    } catch (aiError: any) {
      console.error("[v0] [FEED-PROMPT] AI provider error:", {
        message: aiError.message,
        stack: aiError.stack,
        name: aiError.name,
        cause: aiError.cause,
      })

      // Check if it's a rate limit error
      if (aiError.message?.includes("429") || aiError.message?.includes("Too Many Requests")) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please wait a moment and try again.",
            details: "AI provider rate limit reached",
          },
          { status: 429 },
        )
      }

      // For other AI errors, return 500 with details
      return NextResponse.json(
        {
          error: "Failed to generate prompt",
          details: aiError.message || "AI provider error",
          errorType: aiError.name || "Unknown",
        },
        { status: 500 },
      )
    }

    // Collect the streamed response
    console.log("[v0] [FEED-PROMPT] Collecting streamed response...")
    let generatedPrompt = ""
    for await (const chunk of result.textStream) {
      generatedPrompt += chunk
    }

    generatedPrompt = generatedPrompt.trim()
    console.log("[v0] [FEED-PROMPT] Generated prompt length:", generatedPrompt.length)

    // Ensure trigger word is at the start
    if (!generatedPrompt.toLowerCase().startsWith(triggerWord.toLowerCase())) {
      generatedPrompt = `${triggerWord}, ${generatedPrompt}`
    }

    console.log("[v0] [FEED-PROMPT] Final prompt:", generatedPrompt.substring(0, 100) + "...")

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
      postType,
    })
  } catch (error) {
    console.error("[v0] [FEED-PROMPT] Unexpected error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      error: error,
    })
    return NextResponse.json(
      {
        error: "Failed to generate prompt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
