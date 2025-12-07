import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"
import { getFashionIntelligencePrinciples } from "@/lib/maya/fashion-knowledge-2025"
import { getLifestyleContextIntelligence } from "@/lib/maya/lifestyle-contexts"
import INFLUENCER_POSING_KNOWLEDGE from "@/lib/maya/influencer-posing-knowledge"

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
      count = 6, // Changed default from 3 to 6, Maya can override
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
    let userEthnicity = null
    let physicalPreferences = null
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL!)

    const userDataResult = await sql`
      SELECT u.gender, u.ethnicity, um.trigger_word, upb.physical_preferences
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
      LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
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

    userEthnicity = userDataResult[0]?.ethnicity || null
    physicalPreferences = userDataResult[0]?.physical_preferences || null

    const triggerWord = userDataResult[0]?.trigger_word || `user${user.id}`

    const fashionIntelligence = getFashionIntelligencePrinciples(userGender, userEthnicity)

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

    const lifestyleContext = getLifestyleContextIntelligence(userRequest || aesthetic || "")

    let trendResearch = ""
    if (!aesthetic || aesthetic.toLowerCase().includes("instagram") || aesthetic.toLowerCase().includes("trend")) {
      console.log("[v0] Researching current Instagram trends for concept generation")

      const { text: researchText } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: `Research current Instagram fashion trends for personal brand content creators. Focus on:

1. What aesthetics are performing well RIGHT NOW on Instagram (Jan 2025)
2. Color palettes that are trending for fashion content
3. Outfit styling that's getting high engagement
4. Settings and locations that feel current

Keep it brief (2-3 paragraphs) and actionable for a fashion photographer creating content.

CRITICAL: Filter trends through a SCANDINAVIAN MINIMALISM lens - we want Nordic-appropriate trends only (natural tones, clean lines, quality fabrics).`,
          },
        ],
        maxTokens: 500,
        temperature: 0.7,
      })

      trendResearch = researchText
      console.log("[v0] Trend research complete")
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

${
  trendResearch
    ? `
=== CURRENT INSTAGRAM TRENDS (Jan 2025) ===

${trendResearch}

Use these insights to inform your concept creation, but ALWAYS filter through Scandinavian minimalism (natural tones, clean lines, quality).
===
`
    : ""
}

${conversationContextSection}
${fashionIntelligence}

${
  lifestyleContext
    ? `
=== LIFESTYLE CONTEXT: WHAT THIS REALLY MEANS ===

The user said "${userRequest}" - here's what they ACTUALLY want:

${lifestyleContext}

CRITICAL: This is the VIBE CHECK. Don't just read these - EMBODY them in your outfit choices, location selection, and mood. This is the difference between generic and Instagram-viral.
===
`
    : ""
}

=== NATURAL POSING REFERENCE ===
Use this for inspiration on authentic, Instagram-style poses. These are REAL influencer poses that look natural and candid:

${INFLUENCER_POSING_KNOWLEDGE}

Remember: Describe poses SIMPLY and NATURALLY, like you're telling a friend what someone is doing. Avoid technical photography language.
===

USER REQUEST: "${userRequest}"
${aesthetic ? `AESTHETIC VIBE: ${aesthetic}` : ""}
${context ? `ADDITIONAL CONTEXT: ${context}` : ""}

${
  mode === "photoshoot"
    ? `MODE: PHOTOSHOOT - Create ${count} variations of ONE cohesive look (same outfit and location, different poses/angles/moments)`
    : `MODE: CONCEPTS - Create ${count} THEMATICALLY CONSISTENT concepts that ALL relate to the user's request`
}

🎯 CRITICAL: THEMATIC CONSISTENCY RULE

Your ${count} concepts MUST ALL stay within the theme/vibe of "${userRequest}".

Examples of CORRECT thematic consistency:
- User asks for "Brunch date look" → ALL ${count} concepts are brunch-related:
  • Outdoor café brunch with pastries
  • Rooftop brunch with champagne
  • Cozy indoor brunch spot
  • Garden brunch setting
  • etc.

- User asks for "Luxury lifestyle" → ALL ${count} concepts are luxury-focused:
  • Designer hotel lobby
  • Private rooftop terrace
  • Luxury car setting
  • High-end restaurant
  • etc.

- User asks for "Coffee run" → ALL ${count} concepts include coffee/café elements:
  • Walking with coffee cup downtown
  • Inside modern café
  • Coffee shop window seat
  • Outdoor café table
  • etc.

- User asks for "Street style" → ALL ${count} concepts are urban/street:
  • City sidewalk moment
  • Urban alleyway
  • Street crossing
  • City park bench
  • etc.

❌ WRONG: Creating random variety (1 brunch, 1 gym, 1 street, 1 luxury) when user asked for ONE theme
✅ RIGHT: Creating ${count} variations WITHIN the requested theme

The user wants to tell a COHESIVE STORY across all ${count} images, not a random collection.

${
  imageAnalysis
    ? `REFERENCE IMAGE ANALYSIS:
${imageAnalysis}

Capture this exact vibe - the styling, mood, lighting, and composition.`
    : ""
}

=== YOUR FLUX PROMPTING MASTERY ===

${getFluxPromptingPrinciples()}

=== 🔴 CRITICAL RULES FOR THIS GENERATION (NON-NEGOTIABLE) ===

TRIGGER WORD: "${triggerWord}"
GENDER: "${userGender}"
${userEthnicity ? `ETHNICITY: "${userEthnicity}" (MUST include in prompt for accurate representation)` : ""}
${
  physicalPreferences
    ? `
🔴 PHYSICAL PREFERENCES (MANDATORY - APPLY TO EVERY PROMPT):
"${physicalPreferences}"

CRITICAL INSTRUCTIONS:
- These are USER-REQUESTED appearance modifications that MUST be in EVERY prompt
- Include them RIGHT AFTER the gender/ethnicity descriptor
- Format: "${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}, ${physicalPreferences}, [rest of prompt]"
- DO NOT skip this or the user will be disappointed
- Examples: "long blonde hair", "curvier body type with fuller bust", "athletic build"
`
    : ""
}

**🔴 MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):**

1. **Start with:** "${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, ${physicalPreferences}` : ""}"

2. **iPhone 15 Pro (MANDATORY - 95% of prompts):** MUST include "shot on iPhone 15 Pro, portrait mode" - this creates authentic phone camera aesthetic. Only use focal length alternatives for specific editorial requests.

3. **Natural Skin Texture (MANDATORY):** MUST include "natural skin texture, pores visible" or "realistic skin imperfections" - prevents AI-looking smooth skin.

4. **Film Grain (MANDATORY):** MUST include one: "visible film grain", "fine film grain texture", "grainy texture", or "subtle grain visible"

5. **Muted Colors (MANDATORY):** MUST include one: "muted color palette", "soft muted tones", "desaturated realistic colors", or "vintage color temperature"

6. **Authentic Language (RECOMMENDED):** Include "authentic iPhone photo aesthetic" or "Instagram-native aesthetic" or "looks like real phone camera photo"

7. **Prompt Length:** 40-60 words (shorter = more authentic, better facial consistency)

8. **NO BANNED WORDS:** Never use "stunning", "perfect", "beautiful", "high quality", "8K", "professional photography", "DSLR", "cinematic", "studio lighting" - these create AI-looking results.

9. Apply the OUTFIT PRINCIPLE with your FASHION INTELLIGENCE - no boring defaults
10. Apply the EXPRESSION PRINCIPLE for authentic facial details
11. Apply the POSE PRINCIPLE for natural body positioning
12. Apply the LOCATION PRINCIPLE for evocative settings
13. Apply the LIGHTING PRINCIPLE for cinematic craft

**IF ANY MANDATORY REQUIREMENT IS MISSING, THE PROMPT WILL PRODUCE AI-LOOKING RESULTS.**

=== YOUR CREATIVE MISSION ===

You are NOT filling templates. You are SYNTHESIZING unique photographic moments by applying your fashion intelligence and prompting principles to this specific user request.

For each concept:
- What would this SPECIFIC person wear in this SPECIFIC moment? (Use your fashion intelligence, not defaults)
- What micro-expression captures the EMOTION of this scene?
- What lighting tells the STORY?
- What makes this feel like a REAL stolen moment, not a posed photo?

=== JSON OUTPUT FORMAT ===

Return ONLY valid JSON array, no markdown:
[
  {
    "title": "Simple, catchy title (2-4 words, everyday language)",
    "description": "Quick, exciting one-liner that makes them want to see it",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Environmental Portrait" | "Close-Up Action",
    "fashionIntelligence": "Your outfit reasoning - WHY this outfit for this moment",
    "lighting": "Your lighting reasoning",
    "location": "Your location reasoning",
    "prompt": "YOUR CRAFTED FLUX PROMPT - synthesized from principles, MUST start with ${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, ${physicalPreferences}` : ""}"
  }
]

TITLE EXAMPLES (everyday language, not fashion jargon):
✅ "Coffee Run Glow"
✅ "Rooftop Sunset"
✅ "Cozy Morning"
✅ "City Adventure"
❌ "Architectural Minimalist Elegance" (too fancy)
❌ "Urban Editorial Moment" (too fashion-y)

DESCRIPTION EXAMPLES (warm, brief, exciting):
✅ "That perfect golden hour moment with your coffee"
✅ "Relaxed and chic at your favorite rooftop spot"
✅ "Cozy mornings that feel like a vibe"
❌ "Capturing the interplay of architectural elements and sartorial sophistication" (way too much!)

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
      temperature: 0.75, // Reduced from 0.85 for more consistent, structured outputs that include all mandatory elements
    })

    console.log("[v0] Generated concept text (first 300 chars):", text.substring(0, 300))

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("No JSON array found in response")
    }

    const concepts: MayaConcept[] = JSON.parse(jsonMatch[0])

    // Post-process prompts to ensure authenticity requirements
    const bannedWords = [
      "stunning",
      "perfect",
      "beautiful",
      "high quality",
      "8K",
      "ultra realistic",
      "professional photography",
      "DSLR",
      "cinematic",
      "studio lighting",
      "professional lighting",
      "perfect lighting",
    ]

    concepts.forEach((concept) => {
      let prompt = concept.prompt

      // Remove banned words (case-insensitive)
      bannedWords.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi")
        prompt = prompt.replace(regex, "")
      })

      // Ensure iPhone 15 Pro is present (if not, add it at the start)
      const hasIPhone = /iPhone\s*15\s*Pro/i.test(prompt)
      const hasFocalLength = /\d+mm\s*(lens|focal)/i.test(prompt)

      if (!hasIPhone && !hasFocalLength) {
        // Add iPhone 15 Pro after trigger word if missing
        const triggerMatch = prompt.match(/^([^,]+),/)
        if (triggerMatch) {
          prompt = prompt.replace(/^([^,]+),/, `$1, shot on iPhone 15 Pro,`)
        } else {
          prompt = `shot on iPhone 15 Pro, ${prompt}`
        }
      } else if (hasFocalLength && !hasIPhone) {
        // If focal length but no iPhone, prefer iPhone for authenticity
        prompt = prompt.replace(/\d+mm\s*(lens|focal)/i, "shot on iPhone 15 Pro")
      }

      // Ensure natural skin texture is present
      if (!/natural\s*skin\s*texture|pores\s*visible|realistic\s*skin|skin\s*imperfections/i.test(prompt)) {
        // Add after camera specs
        const cameraMatch = prompt.match(/(shot on iPhone 15 Pro[^,]*)/i)
        if (cameraMatch) {
          prompt = prompt.replace(/(shot on iPhone 15 Pro[^,]*)/i, `$1, natural skin texture with pores visible`)
        } else {
          // Add before film grain if present
          const grainMatch = prompt.match(/(film\s*grain|grainy|grain)/i)
          if (grainMatch) {
            prompt = prompt.replace(/(film\s*grain|grainy|grain)/i, "natural skin texture with pores visible, $1")
          } else {
            // Add at end if no better place
            prompt = `${prompt}, natural skin texture with pores visible`
          }
        }
      }

      // Ensure film grain is present
      if (!/(film\s*grain|grainy|grain|grain\s*texture)/i.test(prompt)) {
        prompt = `${prompt}, visible film grain`
      }

      // Ensure muted colors are present
      if (!/(muted\s*color|muted\s*tones|desaturated|vintage\s*color)/i.test(prompt)) {
        prompt = `${prompt}, muted color palette`
      }

      // Ensure authentic iPhone language is present
      if (!/(authentic\s*iPhone|iPhone\s*photo|Instagram-native|phone\s*camera\s*photo)/i.test(prompt)) {
        prompt = `${prompt}, authentic iPhone photo aesthetic`
      }

      // Clean up multiple commas and spaces
      prompt = prompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()

      concept.prompt = prompt
    })

    console.log("[v0] Post-processed prompts to ensure authenticity requirements")

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
