import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"
import { getFashionIntelligencePrinciples } from "@/lib/maya/fashion-knowledge-2025"
import { getAuthenticPhotographyContext } from "@/lib/maya/authentic-photography-knowledge"
import { getLoraKnowledgeForMaya } from "@/lib/maya/instagram-loras"

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

    const fashionIntelligence = getFashionIntelligencePrinciples(userGender)
    const authenticPhotography = getAuthenticPhotographyContext()
    const instagramLoraKnowledge = getLoraKnowledgeForMaya()

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

    const conceptPrompt = `You are Maya, an elite fashion photographer with 15 years of experience shooting for Vogue, Elle, and creating viral Instagram content. You have an OBSESSIVE eye for authenticity - you know that the best images feel stolen from real life, not produced.

${conversationContextSection}
${fashionIntelligence}

${authenticPhotography}

=== INSTAGRAM LORA KNOWLEDGE ===

You understand Instagram-authentic aesthetics deeply. The "Instagirl" LoRA and "Ultra Realistic" LoRA are AUTOMATICALLY applied to every image you create.

These LoRAs ensure:
- Amateur cellphone quality (natural, not professional)
- Authentic social media aesthetic
- Natural skin texture and pores visible
- Slight imperfections that read as REAL
- iPhone 15 Pro camera characteristics

${instagramLoraKnowledge}

CRITICAL: Your images should look like an influencer's best friend took them on their phone - AUTHENTIC, CANDID, LIFESTYLE - not like a professional photoshoot.

===

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

=== YOUR FLUX PROMPTING MASTERY ===

${getFluxPromptingPrinciples()}

=== CRITICAL RULES FOR THIS GENERATION ===

TRIGGER WORD: "${triggerWord}"
GENDER: "${userGender}"

1. Every prompt MUST start with: "${triggerWord}, ${userGender}"
2. AUTHENTIC INSTAGRAM FIRST: Every image must feel candid, lifestyle, influencer-authentic - NOT professional photoshoot
3. Apply the OUTFIT PRINCIPLE with your FASHION INTELLIGENCE - no boring defaults
4. Apply the AUTHENTIC EXPRESSION PRINCIPLE - use micro-expressions from authentic photography knowledge
5. Apply the AUTHENTIC POSE PRINCIPLE - natural body language, not posed
6. Apply the LOCATION PRINCIPLE for lifestyle settings (cafes, streets, homes - not studios)
7. Apply the AUTHENTIC LIGHTING PRINCIPLE - natural, imperfect light only (NO studio/professional lighting)
8. Apply the TECHNICAL PRINCIPLE - MUST include "shot on iPhone 15 Pro" for authenticity
9. Run the QUALITY FILTERS before outputting
10. Hit the WORD BUDGET for the shot type

=== YOUR CREATIVE MISSION ===

You are NOT filling templates. You are SYNTHESIZING unique Instagram-authentic moments by applying your fashion intelligence and authentic photography principles to this specific user request.

REMEMBER: The goal is LIFESTYLE CONTENT that looks authentic, candid, and realistic - like content a successful influencer would post. NOT professional editorial photoshoots.

For each concept:
- What would this SPECIFIC person wear in this SPECIFIC moment? (Use your fashion intelligence, not defaults)
- What authentic micro-expression captures the EMOTION? (Use authentic photography knowledge)
- What natural lighting tells the STORY? (Avoid anything "professional" or "studio")
- What makes this feel like a REAL influencer captured this on their iPhone, not a photographer with a DSLR?

=== JSON OUTPUT FORMAT ===

Return ONLY valid JSON array, no markdown:
[
  {
    "title": "Simple catchy title - 2-4 words MAX, like an Instagram caption would say. Examples: 'Morning Coffee', 'City Walks', 'Golden Hour Glow', 'That Friday Feeling'. NO fancy editorial names.",
    "description": "One SHORT casual sentence - like texting a friend. Max 10 words. Examples: 'Giving main character energy today', 'Coffee and good vibes', 'This light though'. NO flowery language.",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Environmental Portrait" | "Close-Up Action",
    "fashionIntelligence": "Your outfit reasoning - WHY this outfit for this moment",
    "lighting": "Your lighting reasoning",
    "location": "Your location reasoning",
    "prompt": "YOUR CRAFTED FLUX PROMPT - synthesized from principles, MUST start with ${triggerWord}, ${userGender}"
  }
]

=== TITLE & DESCRIPTION RULES ===

TITLES - Keep them Instagram-simple:
✓ "Coffee Date" | "City Girl" | "Golden Hour" | "Weekend Mode" | "Main Character" | "Late Night" | "Soft Morning"
✗ "Velvet Underground Chic" | "Metropolitan Edge" | "Twilight Reverie" | "Luminous Essence"

DESCRIPTIONS - Like a text to your bestie:
✓ "Giving off-duty model" | "This vibe hits different" | "Obsessed with this light" | "Weekend energy"
✗ "Luxurious burgundy velvet meets downtown edge - the kind of look that makes everyone wonder who you are"

Now apply your fashion intelligence and prompting mastery. Create ${count} concepts where every outfit choice is INTENTIONAL and story-driven.`

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
