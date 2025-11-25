import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { FLUX_PROMPT_OPTIMIZATION } from "@/lib/maya/flux-prompt-optimization"

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
      conversationContext,
    } = body

    console.log("[v0] Generating concepts:", {
      userRequest,
      aesthetic,
      mode,
      count,
      hasConversationContext: !!conversationContext,
    })

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

    const genderStylingGuide =
      userGender === "woman"
        ? `
=== STYLING FOR WOMEN ===
- Feminine silhouettes: flowing fabrics, tailored blazers, elegant dresses
- Accessories: delicate jewelry, designer handbags, statement earrings
- Hair: styled naturally, flowing, or elegantly pinned
- Makeup: natural glam, soft glowing skin, defined features
- Poses: graceful, confident, elegant hand placement
- Fashion references: Hailey Bieber, Zendaya, Sofia Richie, Kendall Jenner
- Common outfit types: slip dresses, oversized blazers, tailored trousers, cashmere knits, leather pieces
`
        : userGender === "man"
          ? `
=== STYLING FOR MEN ===
- Masculine silhouettes: structured blazers, well-fitted shirts, tailored pants
- Accessories: luxury watches, minimal jewelry, leather belts
- Grooming: clean or styled facial hair, natural hair texture
- Poses: strong, confident, relaxed masculine energy
- Fashion references: David Beckham, A$AP Rocky, Timothée Chalamet, Bad Bunny
- Common outfit types: tailored suits, casual streetwear, leather jackets, quality knitwear, clean sneakers
`
          : `
=== STYLING (GENDER NEUTRAL) ===
- Modern silhouettes: relaxed fits, architectural pieces, minimalist design
- Accessories: contemporary jewelry, quality leather goods
- Poses: confident, natural, authentic expression
- Fashion references: contemporary editorial, clean lines, sophisticated casual
`

    // Analyze reference image if provided
    let imageAnalysis = ""
    if (referenceImageUrl) {
      console.log("[v0] Analyzing reference image:", referenceImageUrl)

      const visionAnalysisPrompt = `Look at this image carefully and tell me everything I need to know to recreate this vibe.

Focus on:
1. **The outfit** - What are they wearing? Be super specific (fabrics, fit, colors, style)
2. **The pose** - How are they standing/sitting? What are their hands doing?
3. **The setting** - Where is this? What's the vibe of the location?
4. **The lighting** - What kind of light is this? (warm, cool, bright, moody, etc.)
5. **The mood** - What feeling does this give off? (confident, relaxed, mysterious, playful, etc.)
6. **Color palette** - What colors dominate the image?

Keep it conversational and specific. I need to recreate this exact vibe for Instagram.`

      const { text: visionText } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
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
      console.log("[v0] Vision analysis complete")
    }

    // Generate photoshoot seed if needed
    let photoshootBaseSeed = null
    if (mode === "photoshoot") {
      photoshootBaseSeed = Math.floor(Math.random() * 1000000)
      console.log("[v0] Photoshoot mode: consistent seed:", photoshootBaseSeed)
    }

    const conversationContextSection = conversationContext
      ? `
=== CONVERSATION CONTEXT ===
Here's what we've been discussing. Use this to understand what the user wants MORE of or to continue the creative direction:

${conversationContext}

IMPORTANT: 
- If the user says "more of this", "similar to before", "like the last ones" - create variations on the themes/styles discussed above
- If previous concepts were about a specific aesthetic (G-Wagon, moody, editorial, etc.) - continue with that vibe
- Reference what Maya described in her previous responses for styling continuity
===

`
      : ""

    const conceptPrompt = `You are Maya, an expert fashion photographer and Instagram content strategist. Create ${count} stunning iPhone-quality Instagram photo concepts for ${triggerWord} (${userGender}).

${conversationContextSection}
${genderStylingGuide}

USER REQUEST: "${userRequest}"
${aesthetic ? `AESTHETIC VIBE: ${aesthetic}` : ""}
${context ? `ADDITIONAL CONTEXT: ${context}` : ""}

${
  mode === "photoshoot"
    ? `MODE: PHOTOSHOOT - Create ${count} variations of ONE cohesive look (same outfit and location, different poses/angles/moments)`
    : `MODE: CONCEPTS - Create ${count} completely different concepts (varied outfits, locations, and vibes)`
}

${
  imageAnalysis
    ? `REFERENCE IMAGE ANALYSIS:
${imageAnalysis}

Capture this exact vibe - the styling, mood, lighting, and composition.`
    : ""
}

=== CRITICAL: PROMPT STRUCTURE FOR FLUX AI ===

PROMPT TEMPLATES BY CATEGORY:
- CLOSE-UP: "${FLUX_PROMPT_OPTIMIZATION.TEMPLATES.CLOSE_UP}"
- HALF BODY: "${FLUX_PROMPT_OPTIMIZATION.TEMPLATES.HALF_BODY}"
- FULL BODY: "${FLUX_PROMPT_OPTIMIZATION.TEMPLATES.FULL_BODY}"
- ACTION: "${FLUX_PROMPT_OPTIMIZATION.TEMPLATES.ACTION}"

OPTIMAL WORD COUNTS (for face preservation):
- Close-ups: 15-25 words (tight focus, face preservation priority)
- Half body: 25-35 words (RECOMMENDED sweet spot)
- Full body/Environmental: 35-45 words (more scene detail allowed)
- 45+ words = HIGH RISK of face drift

GOLDEN EXAMPLE (follow this style):
"${FLUX_PROMPT_OPTIMIZATION.STRUCTURE.EXAMPLE_GOOD}"

=== INSTAGRAM AUTHENTICITY (2025 VIRAL AESTHETIC) ===

MUST INCLUDE in every prompt:
- "shot on iPhone 15 Pro" (amateur quality = authenticity)
- Natural skin texture keywords: "natural skin texture", "skin texture visible", "pores visible"
- Film grain or HDR glow for realism
- Focal length: 85mm (close-up), 50mm (half body), 35mm (full body)

INSTAGRAM POSES (natural, NOT staged):
${FLUX_PROMPT_OPTIMIZATION.INSTAGRAM_AUTHENTICITY.REALISTIC_ACTIONS.map((a) => `- ${a}`).join("\n")}

AVOID (looks fake):
${FLUX_PROMPT_OPTIMIZATION.INSTAGRAM_AUTHENTICITY.AVOID_STAGED.map((a) => `- ${a}`).join("\n")}

=== FASHION INTELLIGENCE ===

LUXURY URBAN STYLE KEYWORDS:
- European architecture, oversized designer pieces
- Moody urban atmosphere, crushed blacks
- Cool neutral temperature, muted desaturated tones
- Overcast natural light, editorial mood

COLOR GRADING BY CATEGORY:
- Close-Up: soft muted tones, natural skin warmth, gentle shadows
- Half Body: desaturated warm tones, editorial mood, balanced exposure
- Environmental: crushed blacks, moody atmospheric, dramatic contrast
- Action: high contrast, rich saturation, dynamic tones

=== WORD ECONOMY (SAY MORE WITH LESS) ===

Instead of: "wearing an oversized luxury designer black wool blazer with structured shoulders"
Write: "oversized black blazer"

Instead of: "standing in a beautiful European-style cafe with vintage architectural details"
Write: "European cafe, warm light"

Trust the AI - one adjective per noun maximum.

=== JSON OUTPUT FORMAT ===

Return ONLY valid JSON array, no markdown:
[
  {
    "title": "Concept name (3-5 words, evocative)",
    "description": "Brief description for the user (1 sentence, exciting)",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Environmental Portrait" | "Close-Up Action",
    "fashionIntelligence": "Specific outfit details (brands, fabrics, colors)",
    "lighting": "Lighting description (mood + technical)",
    "location": "Specific location setting",
    "prompt": "FLUX-OPTIMIZED PROMPT following template above. START WITH TRIGGER WORD. Include: outfit, pose, location, lighting, 'shot on iPhone 15 Pro', focal length, 'natural skin texture', film grain. 25-35 words ideal."
  }
]

Now create ${count} STUNNING, INSTAGRAM-VIRAL concepts. Each prompt MUST:
1. Start with "${triggerWord}" 
2. Include "shot on iPhone 15 Pro"
3. Include "natural skin texture" or "skin texture visible"
4. Stay within 25-40 words
5. Use natural candid poses, NOT staged model poses
6. Include focal length (85mm/50mm/35mm)
7. Include film grain or subtle HDR`

    console.log("[v0] Calling generateText for concept generation")

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      messages: [
        {
          role: "user",
          content: conceptPrompt,
        },
      ],
      maxTokens: 4096,
      temperature: 0.85,
    })

    console.log("[v0] Generated concept text (first 300 chars):", text.substring(0, 300))

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
      console.log("[v0] Reference image URL attached to all concepts")
    }

    // Add seeds
    if (mode === "photoshoot" && photoshootBaseSeed) {
      concepts.forEach((concept, index) => {
        if (!concept.customSettings) {
          concept.customSettings = {}
        }
        concept.customSettings.seed = photoshootBaseSeed + index
      })
    } else {
      concepts.forEach((concept, index) => {
        if (!concept.customSettings) {
          concept.customSettings = {}
        }
        concept.customSettings.seed = Math.floor(Math.random() * 1000000)
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

    console.log("[v0] Successfully generated", concepts.length, "sophisticated concepts")

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
