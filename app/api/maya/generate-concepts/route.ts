import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"
import { getFashionIntelligencePrinciples } from "@/lib/maya/fashion-knowledge-2025"
import {
  getAuthenticPhotographyContext,
  getLifestyleDetailShotContext,
} from "@/lib/maya/authentic-photography-knowledge"
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
      count = 5,
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
    const lifestyleDetailContext = getLifestyleDetailShotContext()

    console.log("[v0] Step 1: Researching current fashion trends with web search...")

    const trendSearchQuery =
      userGender === "woman"
        ? `${userRequest} outfit inspiration 2025 celebrity street style Hailey Bieber Kendall Jenner Instagram influencer fashion`
        : `${userRequest} outfit inspiration 2025 celebrity street style men fashion Instagram influencer`

    let trendResearchResults = ""

    try {
      const { text: trendText } = await generateText({
        model: "openai/gpt-4o-mini",
        prompt: `You are a fashion research assistant. Search for the latest fashion trends and outfit inspiration for: "${userRequest}"
        
Focus on:
1. What are celebrities and influencers wearing RIGHT NOW for this type of look?
2. What specific outfit combinations are trending on Instagram/Pinterest?
3. What are the key styling details (accessories, layering, color combinations)?
4. What makes these outfits look expensive/high-end yet effortless?

Be specific with garment names, fabrics, colors, and how items are styled together.`,
        tools: {
          web_search: openai.tools.webSearch({}),
        },
        maxSteps: 3,
      })

      trendResearchResults = trendText
      console.log("[v0] Fashion trend research complete:", trendResearchResults.substring(0, 500))
    } catch (searchError) {
      console.log("[v0] Web search unavailable, using static fashion knowledge:", searchError)
      trendResearchResults = "Web search unavailable - using built-in fashion intelligence."
    }

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

    const trendResearchSection = trendResearchResults
      ? `
=== LIVE FASHION TREND RESEARCH (just searched the web for you) ===

I just researched the latest trends for "${userRequest}". Here's what's HOT right now:

${trendResearchResults}

USE THIS RESEARCH! Apply these REAL current trends to create outfits that look like what celebrities and influencers are ACTUALLY wearing right now.
===

`
      : ""

    const conceptPrompt = `You are Maya, an elite fashion photographer with 15 years of experience shooting for Vogue, Elle, and creating viral Instagram content. You have an OBSESSIVE eye for authenticity - you know that the best images feel stolen from real life, not produced.

=== CRITICAL: THE USER'S REQUEST IS YOUR NORTH STAR ===

USER REQUEST: "${userRequest}"
${aesthetic ? `AESTHETIC VIBE: ${aesthetic}` : ""}
${context ? `ADDITIONAL CONTEXT: ${context}` : ""}

EVERY SINGLE CONCEPT YOU CREATE MUST DIRECTLY RELATE TO THIS REQUEST.
- User asks for "coffee run" → ALL concepts involve coffee, cafes, or the coffee run aesthetic
- User asks for "city street style" → ALL concepts are in city settings with urban vibes
- User asks for "beach day" → ALL concepts are beach/coastal themed
- DO NOT drift to random other themes. Stay focused on what the user asked for.

${trendResearchSection}
${conversationContextSection}
${fashionIntelligence}

${authenticPhotography}

${lifestyleDetailContext}

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

${
  mode === "photoshoot"
    ? `MODE: PHOTOSHOOT - Create ${count} variations of ONE cohesive look (same outfit and location, different poses/angles/moments)`
    : `MODE: CONCEPTS - Create ${count} concepts total that ALL relate to "${userRequest}":
    - First ${count - 1} concepts: Person-focused lifestyle shots - EACH must match the user's theme
    - LAST concept (concept ${count}): LIFESTYLE DETAIL SHOT that MATCHES THE USER'S REQUEST THEME
      * NO face - focus on accessories, objects, or luxury moments
      * MUST be thematically connected to the user's request
      
IMPORTANT: ALL ${count} concepts must feel like they belong to the SAME story/theme the user requested. Don't create one matching concept then drift to random other themes.`
}

=== YOUR FLUX PROMPTING MASTERY ===

${getFluxPromptingPrinciples()}

=== CRITICAL RULES FOR THIS GENERATION ===

TRIGGER WORD: "${triggerWord}"
GENDER: "${userGender}"

1. Every prompt MUST start with: "${triggerWord}, ${userGender}" (EXCEPT Lifestyle Detail shots which have no person)
2. STAY ON THEME: Every concept must directly relate to "${userRequest}" - don't drift!
3. USE THE TREND RESEARCH: Apply the real current trends I just researched to create celebrity-level outfits
4. AUTHENTIC INSTAGRAM FIRST: Every image must feel candid, lifestyle, influencer-authentic - NOT professional photoshoot
5. Apply the OUTFIT PRINCIPLE with your FASHION INTELLIGENCE - use SPECIFIC current trends from the research
6. Apply the AUTHENTIC EXPRESSION PRINCIPLE - use micro-expressions from authentic photography knowledge
7. Apply the AUTHENTIC POSE PRINCIPLE - natural body language, not posed
8. Apply the LOCATION PRINCIPLE for lifestyle settings that MATCH THE USER'S REQUEST
9. Apply the AUTHENTIC LIGHTING PRINCIPLE - natural, imperfect light only (NO studio/professional lighting)
10. Apply the TECHNICAL PRINCIPLE - MUST include "shot on iPhone 15 Pro" for authenticity
11. Run the QUALITY FILTERS before outputting
12. Hit the WORD BUDGET for the shot type

=== OUTFIT STYLING: USE THE TREND RESEARCH ===

You just received LIVE fashion research above. Use it!

Create outfits that:
- Match what celebrities/influencers are ACTUALLY wearing RIGHT NOW (from the research)
- Include specific current trends (not generic "blazer" but "oversized vintage linen blazer worn open over ribbed tank")
- Feel effortlessly cool and expensive
- Have the styling details that make Instagram outfits go viral (layering, accessory stacking, unexpected combinations)

=== LIFESTYLE AUTHENTICITY MARKERS ===

Add these to make images feel REAL and CANDID (use naturally, not forced):
- "everyday moment" - the image captures a real life moment
- "caught candidly" - natural, not posed
- "between poses" - that relaxed moment when someone isn't trying
- "natural pause" - authentic stillness
- "unstaged moment" - feels discovered, not arranged
- "genuine casual moment" - real life energy
- "mid-thought" - authentic mental state
- "organic movement" - natural body language

=== JSON OUTPUT FORMAT ===

Return ONLY valid JSON array, no markdown:
[
  {
    "title": "Simple catchy title - 2-4 words MAX, like an Instagram caption would say. Examples: 'Morning Coffee', 'City Walks', 'Golden Hour Glow', 'That Friday Feeling'. NO fancy editorial names.",
    "description": "One SHORT casual sentence - like texting a friend. Max 10 words. Examples: 'Giving main character energy today', 'Coffee and good vibes', 'This light though'. NO flowery language.",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Environmental Portrait" | "Close-Up Action" | "Lifestyle Detail",
    "fashionIntelligence": "Your outfit reasoning - WHY this outfit for this moment, reference the trend research",
    "lighting": "Your lighting reasoning",
    "location": "Your location reasoning - MUST match user's request theme",
    "prompt": "YOUR CRAFTED FLUX PROMPT - synthesized from principles and trend research, MUST start with ${triggerWord}, ${userGender} for person shots. For Lifestyle Detail shots: describe hands/accessories/objects with NO face, and MUST match the user's request theme"
  }
]

=== TITLE & DESCRIPTION RULES ===

TITLES - Keep them Instagram-simple:
✓ "Coffee Date" | "City Girl" | "Golden Hour" | "Weekend Mode" | "Main Character" | "Late Night" | "Soft Morning"
✗ "Velvet Underground Chic" | "Metropolitan Edge" | "Twilight Reverie" | "Luminous Essence"

DESCRIPTIONS - Like a text to your bestie:
✓ "Giving off-duty model" | "This vibe hits different" | "Obsessed with this light" | "Weekend energy"
✗ "Luxurious burgundy velvet meets downtown edge - the kind of look that makes everyone wonder who you are"

=== DETAIL SHOT RULES (for the LAST concept) ===

The LAST concept MUST be a Lifestyle Detail shot that MATCHES THE USER'S REQUEST:
- Category: "Lifestyle Detail"
- NO face in the prompt - focus on hands, objects, accessories, environment
- MUST be thematically connected to what user asked for (city = city objects, beach = beach objects, etc.)
- Show luxury lifestyle elements that belong to the SAME STORY as the other concepts
- Think: "What would this person photograph between selfies in THIS specific location/aesthetic?"

**Example - User asks for "coffee run":**
- Good detail shot: "hands wrapped around paper coffee cup, gold rings catching morning light, busy city street in background, shot on iPhone 15 Pro"
- Bad detail shot: "cozy home candles" (wrong theme - coffee run is OUTDOORS!)

**Example - User asks for "luxury Miami":**
- Good detail shot: "champagne flute on yacht deck railing, turquoise ocean background, afternoon sun sparkle, gold bracelet on wrist, shot on iPhone 15 Pro"
- Bad detail shot: "coffee cup at cozy cabin" (wrong theme!)

=== FINAL CHECK BEFORE OUTPUT ===

Ask yourself for EACH concept:
1. Does this directly relate to "${userRequest}"?
2. Would this feel out of place in a series about "${userRequest}"?
3. Does the outfit reflect CURRENT trends from the research (not generic basics)?
4. Is the styling celebrity/influencer-level specific?

If any answer is wrong, revise that concept before outputting.

Now apply your fashion intelligence, trend research, and prompting mastery. Create ${count} concepts where EVERY concept matches the user's request, every outfit choice reflects CURRENT celebrity trends, and the detail shot COMPLETES the story the user asked for.`

    console.log("[v0] Step 2: Calling generateText for concept generation with trend research")

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

    console.log("[v0] Successfully generated", concepts.length, "sophisticated concepts with live trend research")

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
