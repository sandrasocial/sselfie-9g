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

    console.log("[v0] Maya generating feed prompt for:", {
      postType,
      caption: caption?.substring(0, 50),
      feedPosition,
      colorTheme,
      brandVibe,
    })

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
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
      return NextResponse.json({ error: "No trained model found" }, { status: 400 })
    }

    const userData = userDataResult[0]
    const triggerWord = userData.trigger_word || "person"
    const gender = userData.gender

    // Get user context for Maya
    const userContext = await getUserContextForMaya(user.id)

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

IMPORTANT INSTRUCTIONS:
1. Generate a sophisticated FLUX prompt that will create a stunning Instagram post
2. Use your fashion expertise: fabrics, colors, silhouettes, accessories, styling
3. Use your Instagram knowledge: what works on feeds, visual storytelling, engagement
4. Consider the post type and create appropriate composition:
   - "Full Body": Full body shot, show outfit, styling, environment
   - "Half Body": Waist-up shot, focus on upper styling, expression
   - "Close-Up": Face and shoulders, emphasize expression, details
   - "Selfie": Natural selfie angle, authentic feel, relatable
   - "Lifestyle": Environmental storytelling, activity, context
   - "Object": Product/item focus, styling, flat lay or in-context
   - "Place/Scenery": Location focus, atmosphere, mood
   - "Hobby/Others": Activity-based, authentic moment, passion
5. Match the color theme and brand vibe if provided
6. Create prompts that feel authentic and Instagram-worthy
7. ALWAYS start with the trigger word: ${triggerWord}
8. Be specific about lighting, setting, styling, pose, and mood
9. Make it feel like a real Instagram post, not a studio photoshoot (unless that's the vibe)

OUTPUT FORMAT:
Generate ONLY the FLUX prompt. No explanations, no extra text. Just the prompt that will be sent to Replicate.

Example output format:
"${triggerWord}, woman in elegant beige linen blazer and white silk camisole, standing in minimalist modern office, soft natural window light, confident expression, looking at camera, professional yet approachable, warm neutral tones, shallow depth of field, 35mm lens, editorial quality, raw photo, high resolution"

Now generate the FLUX prompt for this feed post:`

    // Call AI to generate the prompt
    let result
    try {
      result = await streamText({
        model: "openai/gpt-4o",
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
    } catch (aiError: any) {
      console.error("[v0] AI provider error:", aiError)

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

      // For other AI errors, return 500
      return NextResponse.json(
        {
          error: "Failed to generate prompt",
          details: aiError.message || "AI provider error",
        },
        { status: 500 },
      )
    }

    // Collect the streamed response
    let generatedPrompt = ""
    for await (const chunk of result.textStream) {
      generatedPrompt += chunk
    }

    generatedPrompt = generatedPrompt.trim()

    // Ensure trigger word is at the start
    if (!generatedPrompt.toLowerCase().startsWith(triggerWord.toLowerCase())) {
      generatedPrompt = `${triggerWord}, ${generatedPrompt}`
    }

    console.log("[v0] Maya generated feed prompt:", generatedPrompt)

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
      postType,
    })
  } catch (error) {
    console.error("[v0] Error generating feed prompt:", error)
    return NextResponse.json(
      {
        error: "Failed to generate prompt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
