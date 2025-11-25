import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { createAnthropic } from "@ai-sdk/anthropic"

type MayaConcept = {
  title: string
  description: string
  category: string
  fashionIntelligence: string
  lighting: string
  location: string
  prompt: string
  customSettings?: {
    styleStrength?: number
    promptAccuracy?: number
    aspectRatio?: string
    seed?: number
  }
  referenceImageUrl?: string
}

function getConceptGenerationModel(isPreview: boolean) {
  if (isPreview) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured for preview environment")
    }
    return createOpenAICompatible({
      name: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: "https://api.anthropic.com/v1",
    })("claude-sonnet-4-20250514")
  } else {
    const anthropic = createAnthropic({
      baseURL: "https://gateway.ai.cloudflare.com/v1/f03c72e6eee91a197fe58c550f29a084/sselfie/anthropic",
      apiKey: process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY!,
    })
    return anthropic("claude-sonnet-4-20250514")
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Generate concepts API called")

    // Authenticate user
    const supabase = await createServerClient()
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse request body
    const body = await req.json()
    const {
      userRequest,
      aesthetic,
      context,
      userModifications,
      count = 3,
      referenceImageUrl,
      customSettings,
      mode = "concept",
    } = body

    console.log("[v0] Generating concepts:", { userRequest, aesthetic, mode, count })

    // Detect environment
    const host = req.headers.get("host") || ""
    const isProduction = host === "sselfie.ai" || host === "www.sselfie.ai"
    const isPreview = host.includes("vercel.app") || host.includes("v0.dev") || host.includes("vusercontent.net")

    console.log("[v0] Environment:", isPreview ? "Preview" : isProduction ? "Production" : "Development")

    // Get user data
    let userGender = "person"
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL!)

    const userDataResult = await sql`
      SELECT u.gender, um.trigger_word 
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
      WHERE u.id = ${user.id} 
      LIMIT 1
    `

    if (userDataResult.length > 0 && userDataResult[0].gender) {
      const dbGender = userDataResult[0].gender.toLowerCase().trim()

      if (dbGender === "woman" || dbGender === "female") {
        userGender = "woman"
      } else if (dbGender === "man" || dbGender === "male") {
        userGender = "man"
      } else if (dbGender === "non-binary" || dbGender === "nonbinary" || dbGender === "non binary") {
        userGender = "person"
      } else {
        userGender = dbGender
      }
    }

    const triggerWord = userDataResult[0]?.trigger_word || `user${user.id}`

    // Analyze reference image if provided
    let imageAnalysis = ""
    if (referenceImageUrl) {
      console.log("[v0] 🔍 Analyzing reference image:", referenceImageUrl)

      const visionAnalysisPrompt = `Look at this image carefully and tell me everything I need to know to recreate this vibe.

Focus on:
1. **The outfit** - What are they wearing? Be super specific (fabrics, fit, colors, style)
2. **The pose** - How are they standing/sitting? What are their hands doing?
3. **The setting** - Where is this? What's the vibe of the location?
4. **The lighting** - What kind of light is this? (warm, cool, bright, moody, etc.)
5. **The mood** - What feeling does this give off? (confident, relaxed, mysterious, playful, etc.)
6. **Color palette** - What colors dominate the image?

Keep it conversational and specific. I need to recreate this exact vibe for Instagram.`

      const model = "anthropic/claude-sonnet-4-20250514"

      const { text: visionText } = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: visionAnalysisPrompt,
              },
              {
                type: "image",
                image: referenceImageUrl,
              },
            ],
          },
        ],
        temperature: 0.7,
      })

      imageAnalysis = visionText
      console.log("[v0] 🎨 Vision analysis complete")
    }

    // Generate photoshoot seed if needed
    let photoshootBaseSeed = null
    if (mode === "photoshoot") {
      photoshootBaseSeed = Math.floor(Math.random() * 1000000)
      console.log("[v0] 📸 Photoshoot mode: consistent seed:", photoshootBaseSeed)
    }

    // Generate concepts
    const conceptPrompt = `Create ${count} Instagram photo concepts for ${triggerWord} (${userGender}).

USER REQUEST: "${userRequest}"
${aesthetic ? `VIBE: ${aesthetic}` : ""}
${context ? `CONTEXT: ${context}` : ""}

${
  mode === "photoshoot"
    ? `MODE: PHOTOSHOOT - ${count} variations of ONE outfit/location (same outfit, location, just different poses/angles)`
    : `MODE: CONCEPTS - ${count} completely different concepts (different outfits, locations, vibes)`
}

${
  imageAnalysis
    ? `REFERENCE IMAGE ANALYSIS:
${imageAnalysis}

Use this as inspiration for style, lighting, and composition.`
    : ""
}

PROMPT LENGTH INTELLIGENCE:
- Close-ups: 20-30 words (tight focus, face preservation priority)
- Half body: 25-35 words (optimal sweet spot)
- Full body: 30-40 words (more scene detail)
- Environmental: 35-45 words (wider context)

Keep prompts CONCISE for optimal facial accuracy. Trigger word prominence is critical.

JSON FORMAT (return ONLY this, no markdown):
[
  {
    "title": "Concept name (3-5 words)",
    "description": "Brief user-facing description (1 sentence)",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait",
    "fashionIntelligence": "Outfit styling notes",
    "lighting": "Lighting description",
    "location": "Location description",
    "prompt": "YOUR INTELLIGENT-LENGTH PROMPT - optimized for category (see guidelines above)"
  }
]

Create ${count} concepts now. Use intelligent prompt lengths based on category for best results.`

    console.log("[v0] Calling generateText with model:", conceptPrompt)

    const { text } = await generateText({
      model: getConceptGenerationModel(isPreview),
      messages: [
        {
          role: "user",
          content: conceptPrompt,
        },
      ],
      maxTokens: 4096,
      temperature: 0.85,
    })

    console.log("[v0] Generated concept text (first 200 chars):", text.substring(0, 200))

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("No JSON array found in response")
    }

    const concepts: MayaConcept[] = JSON.parse(jsonMatch[0])

    // Add reference image URL if provided
    if (referenceImageUrl) {
      concepts.forEach((concept) => {
        if (!concept.referenceImageUrl) {
          concept.referenceImageUrl = referenceImageUrl
        }
      })
      console.log("[v0] ✅ Reference image URL attached to all concepts")
    }

    // Add seeds
    if (mode === "photoshoot" && photoshootBaseSeed) {
      concepts.forEach((concept, index) => {
        if (!concept.customSettings) {
          concept.customSettings = {}
        }
        concept.customSettings.seed = photoshootBaseSeed + index
        console.log(`[v0] 🎲 Photoshoot Concept ${index + 1} seed:`, concept.customSettings.seed)
      })
    } else {
      concepts.forEach((concept, index) => {
        if (!concept.customSettings) {
          concept.customSettings = {}
        }
        concept.customSettings.seed = Math.floor(Math.random() * 1000000)
        console.log(`[v0] 🎨 Concept ${index + 1} seed:`, concept.customSettings.seed)
      })
    }

    // Apply custom settings
    if (customSettings) {
      concepts.forEach((concept) => {
        concept.customSettings = {
          ...concept.customSettings,
          ...customSettings,
        }
      })
    }

    console.log("[v0] ✅ Successfully generated", concepts.length, "concepts")

    return NextResponse.json({
      state: "ready",
      concepts: concepts.slice(0, count),
    })
  } catch (error) {
    console.error("[v0] Error generating concepts:", error)
    return NextResponse.json(
      {
        state: "error",
        message: "I need a bit more direction! What vibe are you going for?",
      },
      { status: 500 },
    )
  }
}
