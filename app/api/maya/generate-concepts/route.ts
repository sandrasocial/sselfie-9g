import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { generateText } from "ai"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"
import { getFashionIntelligencePrinciples } from "@/lib/maya/fashion-knowledge-2025"
import { getLifestyleContextIntelligence } from "@/lib/maya/lifestyle-contexts"
import INFLUENCER_POSING_KNOWLEDGE from "@/lib/maya/influencer-posing-knowledge"
import { getNanoBananaPromptingPrinciples } from "@/lib/maya/nano-banana-prompt-builder"

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

    // Get effective user (impersonated if admin is impersonating)
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const effectiveUser = await getEffectiveNeonUser(authUser.id)
    if (!effectiveUser) {
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
      studioProMode = false, // Studio Pro mode flag - uses Nano Banana prompting instead of Flux
      enhancedAuthenticity = false, // Enhanced authenticity toggle - only for Classic mode
    } = body

    console.log("[v0] Generating concepts:", {
      userRequest,
      aesthetic,
      mode,
      count,
      studioProMode,
      enhancedAuthenticity,
      hasConversationContext: !!conversationContext,
      hasReferenceImage: !!referenceImageUrl,
      referenceImageUrl: referenceImageUrl ? referenceImageUrl.substring(0, 100) + "..." : undefined,
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
      WHERE u.id = ${effectiveUser.id} 
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

    const triggerWord = userDataResult[0]?.trigger_word || `user${effectiveUser.id}`

    const fashionIntelligence = getFashionIntelligencePrinciples(userGender, userEthnicity)

    // Analyze reference image if provided
    let imageAnalysis = ""
    if (referenceImageUrl) {
      console.log("[v0] Analyzing reference image:", referenceImageUrl)

      const visionAnalysisPrompt = `Look at this image carefully and tell me everything I need to know to recreate this EXACT vibe.

CRITICAL - DETECT THESE FIRST:
1. **Is this BLACK & WHITE or MONOCHROME?** - If yes, this MUST be in the prompt as "black and white" or "monochrome"
2. **Is this a STUDIO shot?** - Look for: studio lighting, professional setup, clean backgrounds, controlled environment
3. **Is this EDITORIAL/HIGH-FASHION?** - Look for: magazine-style, high-end fashion, dramatic, professional photography
4. **Camera type** - Is this clearly shot on a professional camera (not phone)? Look for: sharp focus, professional quality, studio equipment

Then focus on:
5. **The outfit** - What are they wearing? Be super specific (fabrics, fit, colors, style)
6. **The pose** - How are they standing/sitting? What are their hands doing?
7. **The setting** - Where is this? What's the vibe of the location?
8. **The lighting** - What kind of light is this? (studio lighting, natural window light, dramatic side lighting, soft diffused, etc.)
9. **The mood** - What feeling does this give off? (confident, relaxed, mysterious, playful, etc.)
10. **Color palette** - What colors dominate? (If B&W, explicitly say "black and white" or "monochrome")

IMPORTANT: If you detect B&W, studio, or editorial - these are MANDATORY requirements that MUST be in every prompt. Don't suggest "natural iPhone photos" if this is clearly a professional studio shot.

Keep it conversational and specific. I need to recreate this EXACT vibe.`

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

    // PRIORITY 1 FIX #3: Make Scandinavian filter conditional - default but allow override
    // Check if user specified a different aesthetic (before trend research)
    const userAestheticLower = (aesthetic || "").toLowerCase()
    const userRequestLower = (userRequest || "").toLowerCase()
    const combinedStyle = userAestheticLower + " " + userRequestLower
    const wantsScandinavian = /scandi|scandinavian|minimal|minimalist|nordic|hygge/i.test(combinedStyle)
    const wantsNonScandi = /vintage|y2k|dark.?academia|maximalist|mob.?wife|bold|colorful|vibrant|editorial|high.?fashion/i.test(combinedStyle) && !wantsScandinavian

    let trendResearch = ""
    if (!aesthetic || aesthetic.toLowerCase().includes("instagram") || aesthetic.toLowerCase().includes("trend")) {
      console.log("[v0] Researching current Instagram trends for concept generation")

      // Build trend research prompt with conditional Scandinavian filter
      let trendResearchPrompt = `Research current Instagram fashion trends for personal brand content creators. Focus on:

1. What aesthetics are performing well RIGHT NOW on Instagram (Jan 2025)
2. Color palettes that are trending for fashion content
3. Outfit styling that's getting high engagement
4. Settings and locations that feel current

Keep it brief (2-3 paragraphs) and actionable for a fashion photographer creating content.`

      // Add conditional filter instruction
      if (wantsNonScandi) {
        const aestheticName = userAestheticLower || "the requested"
        trendResearchPrompt += `\n\nCRITICAL: Filter trends through ${aestheticName} aesthetic lens.`
      } else {
        // Default: Scandinavian minimalism (beautiful default aesthetic)
        trendResearchPrompt += `\n\nCRITICAL: Filter trends through a SCANDINAVIAN MINIMALISM lens - we want Nordic-appropriate trends only (natural tones, clean lines, quality fabrics).`
      }

      const { text: researchText } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: trendResearchPrompt,
          },
        ],
        maxTokens: 500,
        temperature: 0.7,
      })

      trendResearch = researchText
      console.log("[v0] Trend research complete")
    }

    let trendFilterInstruction = ""
    if (trendResearch) {
      if (wantsNonScandi) {
        // User explicitly wants non-Scandinavian aesthetic - respect their choice
        const aestheticName = userAestheticLower || "the requested"
        trendFilterInstruction = `Use these insights to inform your concept creation, filtered through ${aestheticName} aesthetic.`
      } else if (wantsScandinavian) {
        // User explicitly wants Scandinavian - apply filter
        trendFilterInstruction = `Use these insights to inform your concept creation, filtered through Scandinavian minimalism (natural tones, clean lines, quality).`
      } else {
        // Default: Scandinavian minimalism (beautiful default aesthetic)
        trendFilterInstruction = `Use these insights to inform your concept creation, but ALWAYS filter through Scandinavian minimalism (natural tones, clean lines, quality) as the default aesthetic.`
      }
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

${trendFilterInstruction}
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
    ? `🔴 REFERENCE IMAGE ANALYSIS (MANDATORY - RECREATE THIS EXACT VIBE):
${imageAnalysis}

CRITICAL INSTRUCTIONS FOR REFERENCE IMAGES:
- If the reference image is BLACK & WHITE or MONOCHROME → EVERY prompt MUST include "black and white" or "monochrome" - this is MANDATORY
- If the reference image is a STUDIO shot → Use "studio lighting" or "professional studio lighting" - NOT "uneven natural lighting" or "iPhone"
- If the reference image is EDITORIAL/HIGH-FASHION → Use professional camera specs, dramatic lighting, NOT "shot on iPhone" or "amateur cellphone photo"
- If the reference image shows professional photography → Use "shot on professional camera" or "DSLR" - NOT "shot on iPhone 15 Pro"
- The reference image's aesthetic (B&W, studio, editorial) OVERRIDES default requirements
- Match the EXACT lighting style, color treatment, and camera quality shown in the reference image
- If reference is B&W → DO NOT add "muted colors" - use "black and white" or "monochrome" instead
- If reference is studio → DO NOT add "uneven natural lighting" - use the studio lighting style shown
- If reference is editorial → DO NOT add "candid photo" or "amateur cellphone photo" - use professional photography terms

Capture this EXACT vibe - the styling, mood, lighting, color treatment, and composition must match the reference image.`
    : ""
}

${
  studioProMode
    ? `=== YOUR NANO BANANA PRO PROMPTING MASTERY ===

${getNanoBananaPromptingPrinciples()}

**CRITICAL FOR NANO BANANA PRO:**
- NO trigger words (Nano Banana doesn't use LoRA trigger words)
- Natural language descriptions (50-80 words optimal)
- Focus on scene composition, mood, and visual storytelling
- Include brand context and user preferences naturally
- Professional quality descriptions (not iPhone/cellphone photo style)
- Rich, detailed scene descriptions with lighting, environment, and mood`
    : `=== YOUR FLUX PROMPTING MASTERY ===

${getFluxPromptingPrinciples()}`
}

=== 🔴 CRITICAL RULES FOR THIS GENERATION (NON-NEGOTIABLE) ===

**🔴 CRITICAL SYSTEM RULES:**
- **Include hair color/style as safety net guidance even if LoRA should know it** - Mention key features (hair color/style, distinctive traits) concisely as a safety net
- **User's physical preferences from settings are MANDATORY - never remove them** - If user specified "keep my natural hair color", convert to "natural hair color" (preserve intent)
- **Natural, authentic skin texture is required** - Avoid anything that sounds plastic/smooth/airbrushed. MUST include natural skin texture with pores visible and anti-plastic phrases.

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
- **USER'S PHYSICAL PREFERENCES FROM SETTINGS ARE MANDATORY - NEVER REMOVE THEM**
- **IMPORTANT:** Convert instruction language to descriptive language for FLUX, but PRESERVE USER INTENT
- **REMOVE INSTRUCTION PHRASES:** "Always keep my", "dont change", "keep my", "don't change my", "preserve my", "maintain my" - these are instructions, not prompt text
- **CONVERT TO DESCRIPTIVE:** Convert to descriptive appearance features while preserving intent:
  - "natural features" → describe what they are
  - "natural hair color" → keep as "natural hair color" to preserve intent (DON'T just remove)
  - "keep my natural hair color" → Convert to "natural hair color" (PRESERVE the intent, don't just omit)
  - "dont change the face" → keep as guidance, don't remove (face is preserved by trigger word, but user intent matters)
- Include them RIGHT AFTER the gender/ethnicity descriptor as DESCRIPTIVE features, not instructions
- Format: "${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}, [descriptive appearance features from user preferences], [rest of prompt]"
- Examples of CORRECT conversion:
  - "Always keep my natural features, dont change the face" → Keep as guidance, preserve any specific feature descriptions
  - "keep my natural hair color" → "natural hair color" (PRESERVE intent, don't just omit)
  - "curvier body type" → "curvier body type" (descriptive, keep as-is)
  - "long blonde hair" → "long blonde hair" (descriptive, keep as-is)
  - "dont change my body" → preserve any body descriptions mentioned
- **PRESERVE USER INTENT:** Don't just remove everything - convert instructions to descriptive language that preserves what the user wants. User's physical preferences are MANDATORY.
`
    : ""
}

**🔴 MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):**

${
  studioProMode
    ? `1. **NO TRIGGER WORDS** - Nano Banana Pro doesn't use LoRA trigger words
   - Start with natural scene description
   - Include user's appearance naturally in the description
   - Format: "A ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, ${physicalPreferences}` : ""} [rest of scene description]"`
    : `1. **Start with:** "${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, no instructions]` : ""}"

   **CRITICAL - TRIGGER WORD PLACEMENT:**
   - Trigger word MUST be the FIRST word in every prompt
   - This is non-negotiable for character likeness preservation
   - Format: "${triggerWord}, [rest of prompt]"`
}

   **CRITICAL - CHARACTER FEATURE GUIDANCE (BALANCED APPROACH):**
   - **INCLUDE HAIR COLOR/STYLE AS SAFETY NET:** Mention key features (hair color/style, distinctive traits) concisely as a safety net, even if LoRA should know them. It's better to include subtle feature descriptions than to omit them and get wrong results.
   - **USER PREFERENCES ARE MANDATORY:** If user specified hair/body/age in their physical preferences, these MUST be included in EVERY prompt - they are intentional user modifications. Never remove them.
   - **INCLUDE WHEN NEEDED:** 
     - If user preferences mention hair color/style → ALWAYS include it (e.g., "keep my natural hair color" → "natural hair color")
     - If user preferences mention body type/age → ALWAYS include it
     - Include hair color/style as safety net guidance even if LoRA should know it
   - **FOCUS ON CHANGEABLE ELEMENTS:** Prioritize describing styling, pose, lighting, environment, makeup, expressions:
     - "natural makeup" (makeup is changeable)
     - "relaxed expression" (expression is changeable)
     - "confident look" (mood is changeable)
   - **BALANCE:** Trust the LoRA but reinforce critical features (especially from user preferences) to ensure consistency. Include hair color/style as safety net.

   **CRITICAL:** If physical preferences contain instruction language ("Always keep my", "dont change", "keep my"), you MUST:
   - Remove the instruction phrases but PRESERVE THE INTENT
   - Convert to descriptive appearance features
   - If it says "keep my natural features" or "dont change the face" → Keep as guidance, don't remove (face is preserved by trigger word, but user intent matters)
   - If it says "keep my natural hair color" → Convert to "natural hair color" (PRESERVE the intent, don't just remove)
   - **PRESERVE USER INTENT:** Always include actual descriptive modifications like "curvier body type", "long blonde hair", "athletic build", "darker hair", etc.
   - **DO NOT REMOVE:** User's physical preferences should be in the prompt as descriptive features, not instructions. User's physical preferences from settings are MANDATORY - never remove them.

2. **Camera Specs (CONDITIONAL - Based on Reference Image/User Request):**
   ${
     studioProMode
       ? `- **Nano Banana Pro:** Use professional photography descriptions
   - "Professional photography", "high-quality image", "editorial style"
   - NO iPhone/cellphone references (Nano Banana is professional quality)
   - Focus on composition and visual quality`
       : `- **IF reference image shows professional/studio/editorial OR user requests studio/magazine/editorial:** Use "shot on professional camera" or "DSLR" or "professional photography" - NOT iPhone
   - **IF no professional request AND no reference image:** Use "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh"
   - Keep it simple - NO complex technical details (no f-stops, ISO, focal lengths)`
   }

3. **Lighting (CONDITIONAL - Based on Reference Image/User Request):**
   - **IF reference image shows studio lighting OR user requests studio/editorial:** Use "studio lighting" or "professional studio lighting" or "dramatic studio lighting" - NOT "uneven natural lighting"
   - **IF reference image shows specific lighting style:** Match that EXACT lighting style from the reference
   - **IF no specific request AND no reference image:** Use authentic, realistic lighting descriptions that look like real phone photos:
     - ✅ "Uneven natural lighting"
     - ✅ "Mixed color temperatures"
     - ✅ "Natural window light with shadows"
     - ✅ "Overcast daylight, soft shadows"
     - ✅ "Ambient lighting, mixed sources"
   - ❌ NEVER use (unless reference image shows it): "soft afternoon sunlight", "warm golden hour lighting" (too idealized), "dramatic rim lighting", "cinematic quality", "perfect lighting", "soft diffused natural lighting"

4. **Natural Skin Texture (MANDATORY - ANTI-PLASTIC REQUIREMENTS):** 
   ${
     studioProMode
       ? `- **Nano Banana Pro:** Include natural, realistic skin texture
   - "Natural skin texture", "realistic appearance", "authentic look"
   - Professional quality but not overly processed
   - Avoid "airbrushed", "plastic", "smooth" descriptors`
       : `- **REQUIRED:** MUST include "natural skin texture with pores visible, not smooth or airbrushed, not plastic-looking, realistic texture"
   - **REQUIRED:** MUST include at least 3+ natural imperfection phrases from: "visible pores", "natural skin texture", "subtle imperfections", "not airbrushed", "not plastic-looking", "realistic texture", "organic skin texture"
   - **REQUIRED:** MUST include at least 2+ anti-plastic phrases from: "not smooth", "not airbrushed", "not plastic-looking", "realistic texture", "natural imperfections"
   - This is CRITICAL to prevent AI-looking, plastic images. Natural, authentic skin texture is required - avoid anything that sounds plastic/smooth/airbrushed.`
   }

5. **Film Grain and Color Treatment (CONDITIONAL - Based on Reference Image/User Request):**
   - **IF reference image is BLACK & WHITE or MONOCHROME OR user requests B&W:** MUST include "black and white" or "monochrome" - DO NOT add "muted colors"
   - **IF reference image shows vibrant/editorial colors OR user requests vibrant/editorial:** Use appropriate color description (vibrant, editorial, etc.) - NOT "muted colors"
   - **IF no specific request AND no reference image:** Include "film grain" and "muted colors" for authentic iPhone aesthetic
   ${enhancedAuthenticity && !studioProMode ? `
   - **ENHANCED AUTHENTICITY MODE (ON):** When this mode is enabled, you MUST include:
     * **More muted colors:** Use "heavily muted colors", "desaturated color palette", "muted tones" (stronger than normal)
     * **More iPhone quality:** Emphasize "amateur cellphone photo", "raw iPhone photo", "authentic iPhone camera quality"
     * **More film grain:** Use "visible film grain", "prominent film grain", "grainy texture" (stronger than normal)
     * These keywords help prevent plastic/fake-looking images by emphasizing authentic, phone-camera aesthetic
   ` : ''}
   - Keep prompts detailed (30-60 words, target 40-55) for better LoRA activation

6. **NO Natural Imperfections Lists:** Do NOT include lists of imperfections like "visible sensor noise", "slight motion blur", etc. Keep camera specs basic, but ALWAYS include natural skin texture requirements above.

11. **Prompt Length:** ${
  studioProMode
    ? `50-80 words (optimal for Nano Banana Pro - rich scene descriptions with detail)`
    : `30-60 words (optimal range 40-55 for LoRA activation and accurate character representation, with room for safety net descriptions)`
}

12. **NO BANNED WORDS:** Never use "ultra realistic", "photorealistic", "8K", "4K", "high quality", "perfect", "flawless", "stunning", "beautiful", "gorgeous", "professional photography", "editorial", "magazine quality", "dramatic" (for lighting), "cinematic", "hyper detailed", "sharp focus", "ultra sharp", "crystal clear", "studio lighting", "perfect lighting", "smooth skin", "flawless skin", "airbrushed" - these cause plastic/generic faces and override the user LoRA.

9. Apply the OUTFIT PRINCIPLE with your FASHION INTELLIGENCE - no boring defaults
10. Apply the EXPRESSION PRINCIPLE for authentic facial details (expressions, not fixed features)
11. Apply the POSE PRINCIPLE for natural body positioning
12. Apply the LOCATION PRINCIPLE for evocative settings
13. Apply the LIGHTING PRINCIPLE for realistic, authentic lighting (NO idealized terms)

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**
1. **TRIGGER WORD** (first position - MANDATORY)
2. **GENDER/ETHNICITY** (2-3 words)
3. **OUTFIT** (material + color + garment type - 8-12 words, stay detailed here)
4. **LOCATION** (simple, one-line - 3-5 words, keep brief)
5. **LIGHTING** (realistic, authentic - 3-6 words, NO idealized terms like "soft afternoon sunlight" or "warm golden hour")
6. **POSE + EXPRESSION** (simple, natural action - 3-5 words, NO "striking poses")
7. **TECHNICAL SPECS** (basic iPhone only - 5-8 words, keep minimal)

**Total target: 30-60 words (optimal 40-55) for optimal LoRA activation and accurate character representation, with room for safety net descriptions**

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
    "prompt": "${
      studioProMode
        ? `YOUR CRAFTED NANO BANANA PRO PROMPT - natural language scene description (50-80 words), NO trigger words, rich visual storytelling with brand context, professional quality`
        : `YOUR CRAFTED FLUX PROMPT - synthesized from principles, MUST start with ${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, NO instruction phrases like 'dont change' or 'keep my']` : ""}`
    }"
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
      temperature: 0.85, // Restored from 0.75 for more creative, varied concept generation
    })

    console.log("[v0] Generated concept text (first 300 chars):", text.substring(0, 300))

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("No JSON array found in response")
    }

    const concepts: MayaConcept[] = JSON.parse(jsonMatch[0])

    // Post-process prompts to remove old requirements and ensure new simplified format
    // First, remove any old requirements that shouldn't be there
    concepts.forEach((concept) => {
      let prompt = concept.prompt
      
      // Remove old requirements that are no longer needed
      prompt = prompt.replace(/,\s*(film\s+grain|muted\s+tones|muted\s+color\s+palette|candid\s+moment|natural\s+skin\s+texture\s+with\s+pores\s+visible|not\s+airbrushed|not\s+plastic-looking|motion\s+blur|visible\s+sensor\s+noise|slight\s+motion\s+blur)/gi, "")
      
      // Fix problematic poses that cause extra limbs
      // Replace "legs tucked under" with safer alternatives
      if (/\blegs\s+tucked\s+under\b/i.test(prompt)) {
        prompt = prompt.replace(/\blegs\s+tucked\s+under\b/gi, "sitting with legs crossed")
      }
      if (/\bcurled\s+up\b/i.test(prompt)) {
        prompt = prompt.replace(/\bcurled\s+up\b/gi, "lounging comfortably")
      }
      if (/\bknees\s+to\s+chest\b/i.test(prompt)) {
        prompt = prompt.replace(/\bknees\s+to\s+chest\b/gi, "sitting with one knee up")
      }
      if (/\blegs\s+folded\s+under\b/i.test(prompt)) {
        prompt = prompt.replace(/\blegs\s+folded\s+under\b/gi, "sitting with legs crossed")
      }
      
      // For Studio Pro mode: Remove ALL iPhone/cellphone references
      if (studioProMode) {
        prompt = prompt.replace(/,\s*shot\s+on\s+iPhone[^,]*/gi, "")
        prompt = prompt.replace(/,\s*(amateur\s+cellphone\s+photo|cellphone\s+photo|amateur\s+photography|candid\s+photo|candid\s+moment)/gi, "")
        prompt = prompt.replace(/authentic\s+iPhone\s+photo\s+aesthetic/gi, "")
      } else {
        // Remove duplicate "shot on iPhone" mentions (keep only one at the end)
        const iphoneMatches = prompt.match(/(shot\s+on\s+iPhone[^,]*)/gi)
        if (iphoneMatches && iphoneMatches.length > 1) {
          // Remove all iPhone mentions
          prompt = prompt.replace(/,\s*shot\s+on\s+iPhone[^,]*/gi, "")
          // Add one at the end in the new format
          prompt = `${prompt}, shot on iPhone 15 Pro portrait mode, shallow depth of field`
        }
      }
      
      // Clean up double commas and extra spaces
      prompt = prompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()
      
      concept.prompt = prompt
    })
    
    const bannedWords = [
      "ultra realistic",
      "photorealistic",
      "8K",
      "4K",
      "high quality",
      "high resolution",
      "perfect",
      "flawless",
      "stunning",
      "beautiful",
      "gorgeous",
      "professional photography",
      "editorial",
      "magazine quality",
      "dramatic",
      "cinematic",
      "cinematic quality",
      "hyper detailed",
      "sharp focus",
      "ultra sharp",
      "crystal clear",
      "DSLR",
      "studio lighting",
      "professional lighting",
      "perfect lighting",
      "even lighting",
      "ideal lighting",
      "beautiful lighting",
      "smooth skin",
      "flawless skin",
      "airbrushed",
      "perfect skin",
      "silk-like skin",
    ]

    // CRITICAL FIX: Function to ensure all mandatory anti-plastic requirements are present
    // Now with conditional logic to respect user style requests AND reference image analysis
    function ensureRequiredElements(
      prompt: string,
      currentWordCount: number,
      MAX_WORDS: number,
      userRequest?: string,
      aesthetic?: string,
      imageAnalysisText?: string,
      isStudioPro?: boolean,
      isEnhancedAuthenticity?: boolean,
    ): string {
      let enhanced = prompt
      let addedCount = 0

      // Combine user request, aesthetic, and image analysis for style detection
      const styleContext = `${userRequest || ""} ${aesthetic || ""} ${imageAnalysisText || ""}`.toLowerCase()

      // Detect if user wants professional/studio/magazine aesthetic (skip amateur requirements)
      const wantsProfessional = /studio|magazine|cover|high.?end|high.?fashion|editorial|professional|luxury|fashion.?editorial|vogue|elle|runway/i.test(styleContext)
      
      // Detect if reference image or user request is B&W/monochrome
      const wantsBAndW = /black.?and.?white|monochrome|b&w|grayscale|black and white/i.test(styleContext)
      
      // Detect if reference image shows studio lighting
      const imageShowsStudio = /studio|professional.?lighting|studio.?lighting|controlled.?lighting/i.test(imageAnalysisText || "")

      console.log("[v0] Validating prompt for required anti-plastic elements...")
      console.log("[v0] Style context:", styleContext.substring(0, 100))
      console.log("[v0] Professional/Studio request detected:", wantsProfessional)
      console.log("[v0] B&W/Monochrome detected:", wantsBAndW)
      console.log("[v0] Image shows studio:", imageShowsStudio)

      // Check for natural skin texture (ALWAYS required - no exceptions)
      if (!/natural\s+skin\s+texture|pores\s+visible|visible\s+pores/i.test(enhanced)) {
        console.log("[v0] Missing: natural skin texture - adding")
        enhanced += ", natural skin texture with pores visible"
        addedCount += 6
      }

      // Check for anti-plastic phrases (need at least 2) (ALWAYS required - no exceptions)
      const antiPlasticMatches = enhanced.match(/not\s+(?:smooth|airbrushed|plastic-looking)|realistic\s+texture|natural\s+imperfections/gi) || []
      const antiPlasticCount = antiPlasticMatches.length

      if (antiPlasticCount < 2) {
        console.log(`[v0] Anti-plastic phrases: ${antiPlasticCount}/2 - adding more`)
        if (antiPlasticCount === 0) {
          enhanced += ", not airbrushed, not plastic-looking"
          addedCount += 4
        } else {
          enhanced += ", not plastic-looking"
          addedCount += 2
        }
      }

      // Check for film grain (ALWAYS required - no exceptions)
      // Enhanced Authenticity mode: Use stronger film grain descriptions
      const hasFilmGrain = /film\s+grain|visible\s+film\s+grain|subtle\s+film\s+grain|prominent\s+film\s+grain/i.test(enhanced)
      if (!hasFilmGrain) {
        console.log("[v0] Missing: film grain - adding")
        if (enhancedAuthenticity && !isStudioPro) {
          enhanced += ", visible film grain, grainy texture"
          addedCount += 5
        } else {
          enhanced += ", subtle film grain"
          addedCount += 3
        }
      } else if (enhancedAuthenticity && !isStudioPro && !/visible\s+film\s+grain|prominent\s+film\s+grain|grainy\s+texture/i.test(enhanced)) {
        // Upgrade to stronger film grain if enhanced authenticity is enabled
        enhanced = enhanced.replace(/subtle\s+film\s+grain/i, "visible film grain, grainy texture")
        console.log("[v0] Upgraded film grain for enhanced authenticity")
      }

      // PRIORITY 1 FIX #1: Make muted colors conditional on user request AND reference image
      // Check if user wants vibrant, pastel, high-contrast, B&W, or other non-muted styles
      const userWantsVibrant = /vibrant|bright|saturated|high.?contrast|bold.?colors|colorful|neon/i.test(styleContext)
      const userWantsPastel = /pastel|soft.?tones|gentle.?colors|light.?colors/i.test(styleContext)
      const userWantsMonochrome = /monochrome|black.?and.?white|b&w|grayscale/i.test(styleContext)
      const userWantsEditorial = /editorial|high.?fashion|fashion.?editorial|magazine/i.test(styleContext)

      // Check if prompt already has B&W/monochrome
      const hasBAndW = /black.?and.?white|monochrome|b&w|grayscale/i.test(enhanced)

      if (!/muted\s+(?:colors?|color\s+palette|tones?)/i.test(enhanced)) {
        if (wantsBAndW || hasBAndW) {
          // Reference image or prompt is B&W - DO NOT add muted colors, ensure B&W is present
          console.log("[v0] B&W/Monochrome detected - skipping muted colors, ensuring B&W is in prompt")
          if (!hasBAndW) {
            enhanced += ", black and white"
            addedCount += 3
            console.log("[v0] Added 'black and white' to prompt")
          }
        } else if (wantsProfessional) {
          // User wants vibrant - use "muted vibrant palette" as compromise (still authentic but respects request)
          console.log("[v0] User wants vibrant colors - using muted vibrant palette")
          enhanced += ", muted vibrant color palette"
          addedCount += 4
        } else if (userWantsPastel) {
          // User wants pastel - use "muted pastel tones" as compromise
          console.log("[v0] User wants pastel colors - using muted pastel tones")
          enhanced += ", muted pastel tones"
          addedCount += 3
        } else if (userWantsMonochrome) {
          // User wants monochrome - skip muted colors (monochrome is already muted)
          console.log("[v0] User wants monochrome - skipping muted colors")
        } else if (userWantsEditorial) {
          // User wants editorial - use "muted editorial palette" as compromise
          console.log("[v0] User wants editorial - using muted editorial color palette")
          enhanced += ", muted editorial color palette"
          addedCount += 4
        } else {
          // Default: add muted colors (Scandinavian minimalism default)
          // Enhanced Authenticity mode: Use stronger muted color descriptions
          console.log("[v0] Missing: muted colors - adding (default)")
          if (enhancedAuthenticity && !isStudioPro) {
            enhanced += ", heavily muted colors, desaturated color palette"
            addedCount += 4
          } else {
            enhanced += ", muted colors"
            addedCount += 2
          }
        }
      }

      // PRIORITY 1 FIX #2: Make uneven lighting conditional on user request AND reference image
      // Check if user wants dramatic, soft, golden hour, studio, or other specific lighting styles
      const userWantsDramatic = /dramatic|cinematic|editorial|high.?fashion|fashion.?editorial|striking/i.test(styleContext)
      const userWantsSoft = /soft|dreamy|gentle|diffused|soft.?glow|dreamy.?light/i.test(styleContext)
      const userWantsGoldenHour = /golden.?hour|warm.?glow|sunset|sunrise|warm.?light/i.test(styleContext)
      const userWantsMoody = /moody|dark|shadowy|deep.?shadows|low.?light/i.test(styleContext)
      const userWantsStudio = /studio|professional.?lighting|studio.?lighting/i.test(styleContext)
      
      // Check if prompt already has studio lighting
      const hasStudioLighting = /studio\s+lighting|professional\s+studio\s+lighting|dramatic\s+studio/i.test(enhanced)

      if (!/uneven\s+(?:natural\s+)?lighting|uneven\s+illumination/i.test(enhanced)) {
        // Check if user requested specific lighting style OR reference image shows studio
        if (wantsProfessional || userWantsStudio || imageShowsStudio) {
          // User wants professional/studio OR reference shows studio - skip uneven requirement, ensure studio lighting
          console.log("[v0] Professional/studio lighting detected - skipping uneven requirement")
          if (!hasStudioLighting && !/studio/i.test(enhanced)) {
            // If no studio lighting mentioned, add it
            enhanced += ", studio lighting"
            addedCount += 2
            console.log("[v0] Added 'studio lighting' to prompt")
          }
        } else if (userWantsDramatic) {
          // User wants dramatic lighting - check if it's already in prompt or needs to be preserved
          if (/\b(?:dramatic|cinematic|editorial)\s+lighting/i.test(enhanced)) {
            // Already in prompt - keep it as-is, just ensure it's not "perfect"
            console.log("[v0] User wants dramatic lighting - keeping as-is (not perfect)")
            enhanced = enhanced.replace(/\bperfect\s+lighting\b/gi, "dramatic lighting")
          } else {
            // User wants dramatic but not in prompt yet - don't add "uneven", let Maya add dramatic
            console.log("[v0] User wants dramatic lighting - skipping uneven requirement")
          }
        } else if (userWantsSoft) {
          // User wants soft lighting - check if it's already in prompt
          if (/\b(?:soft|dreamy|gentle|diffused)\s+lighting/i.test(enhanced)) {
            // Already in prompt - keep it, but add natural shadows for authenticity
            console.log("[v0] User wants soft lighting - keeping with natural shadows")
            if (!/shadows|uneven/i.test(enhanced)) {
              enhanced = enhanced.replace(/\b(soft|dreamy|gentle|diffused)\s+lighting\b/gi, "$1 lighting with natural shadows")
              addedCount += 3
            }
          } else {
            // User wants soft but not in prompt yet - don't add "uneven", let Maya add soft
            console.log("[v0] User wants soft lighting - skipping uneven requirement")
          }
        } else if (userWantsGoldenHour) {
          // User wants golden hour - check if it's already in prompt
          if (/\b(?:golden.?hour|warm.?glow|sunset|sunrise)\s+lighting/i.test(enhanced)) {
            // Already in prompt - keep it, but add natural variation
            console.log("[v0] User wants golden hour lighting - keeping with natural variation")
            if (!/uneven|variation|mixed/i.test(enhanced)) {
              enhanced = enhanced.replace(/\b(golden.?hour|warm.?glow|sunset|sunrise)\s+lighting\b/gi, "$1 lighting with natural variation")
              addedCount += 3
            }
          } else {
            // User wants golden hour but not in prompt yet - don't add "uneven", let Maya add golden hour
            console.log("[v0] User wants golden hour lighting - skipping uneven requirement")
          }
        } else if (userWantsMoody) {
          // User wants moody lighting - check if it's already in prompt
          if (/\b(?:moody|dark|shadowy)\s+lighting/i.test(enhanced)) {
            // Already in prompt - keep it as-is (moody already implies uneven)
            console.log("[v0] User wants moody lighting - keeping as-is")
          } else {
            // User wants moody but not in prompt yet - don't add "uneven", let Maya add moody
            console.log("[v0] User wants moody lighting - skipping uneven requirement")
          }
        } else {
          // Default: add uneven for natural lighting (Scandinavian minimalism default)
          console.log("[v0] Checking for lighting to make uneven...")
          // Only modify if lighting description exists but doesn't have "uneven"
          if (/\b(?:natural\s+)?lighting\b/i.test(enhanced) && !/uneven/i.test(enhanced)) {
            enhanced = enhanced.replace(/\b(natural\s+)?lighting\b/gi, "uneven $1lighting")
            console.log("[v0] Modified lighting to be 'uneven' (default)")
          }
        }
      }

      // Add authentic iPhone aesthetic at the end if not present (skip for professional/studio requests AND Studio Pro mode)
      // Enhanced Authenticity mode: Use stronger iPhone quality descriptions
      if (!isStudioPro && !wantsProfessional && !/authentic\s+iPhone\s+photo|iPhone\s+photo\s+aesthetic|amateur\s+iPhone/i.test(enhanced)) {
        console.log("[v0] Missing: authentic iPhone aesthetic - adding")
        if (enhancedAuthenticity) {
          enhanced += ", raw iPhone photo, authentic iPhone camera quality, amateur cellphone aesthetic"
          addedCount += 7
        } else {
          enhanced += ", authentic iPhone photo aesthetic"
          addedCount += 4
        }
      } else if (isStudioPro) {
        console.log("[v0] Studio Pro mode - skipping authentic iPhone aesthetic")
      } else if (wantsProfessional) {
        console.log("[v0] Professional/studio request - skipping authentic iPhone aesthetic")
      } else if (enhancedAuthenticity && !isStudioPro && !wantsProfessional) {
        // Upgrade existing iPhone aesthetic to stronger version if enhanced authenticity is enabled
        if (/authentic\s+iPhone\s+photo\s+aesthetic/i.test(enhanced)) {
          enhanced = enhanced.replace(/authentic\s+iPhone\s+photo\s+aesthetic/i, "raw iPhone photo, authentic iPhone camera quality, amateur cellphone aesthetic")
          console.log("[v0] Upgraded iPhone aesthetic for enhanced authenticity")
        }
      }

      // Clean up any double commas or trailing commas
      enhanced = enhanced
        .replace(/,\s*,/g, ",")
        .replace(/^,\s*/, "")
        .replace(/\s*,\s*$/, "")
        .trim()

      console.log(`[v0] Post-processing validation complete - added ${addedCount} words`)

      return enhanced
    }

    concepts.forEach((concept) => {
      let prompt = concept.prompt

      // Helper function to count words
      const wordCount = (text: string) => text.trim().split(/\s+/).length

      // Remove instruction phrases that shouldn't be in FLUX prompts
      // These are instructions FOR Maya, not part of the image generation prompt
      const instructionPhrases = [
        /\bAlways keep my\b/gi,
        /\bAlways\s+keep\s+my\s+natural\s+features\b/gi,
        /\bdont change\b/gi,
        /\bdon't change\b/gi,
        /\bdont\s+change\s+the\s+face\b/gi,
        /\bdon't\s+change\s+the\s+face\b/gi,
        /\bkeep my\b/gi,
        /\bkeep\s+my\s+natural\s+features\b/gi,
        /\bkeep\s+my\s+natural\s+hair\s+color\b/gi,
        /\bkeep\s+my\s+natural\s+eye\s+color\b/gi,
        /\bkeep\s+my\s+natural\s+hair\b/gi,
        /\bkeep\s+my\s+natural\s+eyes\b/gi,
        /\bpreserve my\b/gi,
        /\bmaintain my\b/gi,
        /\bdo not change\b/gi,
        /\bdo\s+not\s+change\s+the\s+face\b/gi,
      ]
      
      instructionPhrases.forEach((regex) => {
        prompt = prompt.replace(regex, "")
      })
      
      // Remove standalone instruction phrases that might be left as fragments
      prompt = prompt.replace(/,\s*,/g, ",") // Remove double commas
      prompt = prompt.replace(/,\s*,/g, ",") // Remove double commas again (in case of triple)
      prompt = prompt.replace(/^,\s*/, "") // Remove leading comma
      prompt = prompt.replace(/\s*,\s*$/, "") // Remove trailing comma
      prompt = prompt.replace(/\s+/g, " ") // Normalize multiple spaces
      prompt = prompt.trim() // Final trim

      // Check for imperfection language BEFORE removing lighting phrases
      const hasImperfectionLanguage = /uneven\s*lighting|mixed\s*color\s*temperatures|slight\s*uneven\s*illumination|visible\s*sensor\s*noise/i.test(prompt)

      // Remove banned words (case-insensitive)
      bannedWords.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi")
        prompt = prompt.replace(regex, "")
      })

      // Conditionally remove "soft diffused natural lighting" only if no imperfection language exists
      if (!hasImperfectionLanguage) {
        const softDiffusedRegex = /\bsoft\s+diffused\s+natural\s+lighting\b/gi
        prompt = prompt.replace(softDiffusedRegex, "")
      }

      // CRITICAL FIX: Remove hair descriptions that LoRA already knows
      // BUT: Keep hair descriptions if they're in user's physical preferences (user intentionally added them)
      // Only remove hair descriptions that the model generated on its own (not from user settings)
      
      // Check if physical preferences contain hair descriptions
      const hasHairInPreferences = physicalPreferences && /hair|blonde|brown|black|long|short|curly|straight|wavy/i.test(physicalPreferences)
      
      // Only remove hair descriptions if they're NOT in user's physical preferences
      if (!hasHairInPreferences) {
        const hairDescriptions = [
          /\b(long|short|medium)\s+(dark|light|brown|black|blonde|blond|red|auburn|gray|grey)\s+(hair|brown hair|black hair|blonde hair|blond hair|red hair)\b/gi,
          /\b(dark|light|brown|black|blonde|blond|red|auburn|gray|grey)\s+(long|short|medium)\s+(hair|brown hair|black hair|blonde hair|blond hair|red hair)\b/gi,
          /\b(long|short|medium)\s+hair\b/gi,
          /\b(dark|light|brown|black|blonde|blond|red|auburn|gray|grey)\s+hair\b/gi,
          /\bcurly\s+hair\b/gi,
          /\bstraight\s+hair\b/gi,
          /\bwavy\s+hair\b/gi,
        ]
        
        hairDescriptions.forEach((regex) => {
          prompt = prompt.replace(regex, "")
        })
      }

      // Clean up after removals
      prompt = prompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()

      // Get current word count - we want to stay under 80 words (optimal for LoRA activation)
      let currentWordCount = wordCount(prompt)
      const MAX_WORDS = 60 // Hard limit - optimal length (30-60 words, target 40-55) for better LoRA activation and accurate character representation with safety net descriptions

      // CRITICAL FIX: If prompt is over 80 words, trim intelligently
      if (currentWordCount > MAX_WORDS) {
        // Remove less critical elements first (in order of priority to keep)
        // 1. Keep: trigger word, gender, outfit, pose, iPhone, skin texture, imperfections
        // 2. Remove: overly detailed location descriptions
        // 3. Remove: redundant technical terms
        // 4. Remove: casual moment language (lowest priority)
        
        // DO NOT remove authenticity keywords - they prevent plastic look
        // These are now REQUIRED: "candid moment", "candid photo", "amateur cellphone photo", "cellphone photo"
        // Only remove truly unnecessary phrases if over word limit
        if (currentWordCount > MAX_WORDS) {
          // Remove overly verbose phrases but keep authenticity keywords
          prompt = prompt.replace(/,\s*(looks like a real phone camera photo|looks like real phone camera photo|Instagram-native)/gi, "")
          currentWordCount = wordCount(prompt)
        }
        
        // If still over, remove overly detailed location descriptions
        if (currentWordCount > MAX_WORDS) {
          // Simplify location descriptions (keep first part, remove details)
          prompt = prompt.replace(/,\s*(modern architectural space with clean lines|architectural space with|with clean lines)/gi, ", modern space")
          currentWordCount = wordCount(prompt)
        }
        
        // If still over, remove old requirements that are no longer needed
        // BUT: Keep "candid moment" and "candid photo" - these are REQUIRED for authenticity
        if (currentWordCount > MAX_WORDS) {
          // Remove old requirements but NOT candid/amateur keywords
          prompt = prompt.replace(/,\s*(film\s+grain|muted\s+tones|natural\s+skin\s+texture|not\s+airbrushed|motion\s+blur)/gi, "")
          currentWordCount = wordCount(prompt)
        }
        
        // If still over 80 words, trim less critical elements
        if (currentWordCount > MAX_WORDS) {
          // Simplify overly detailed descriptions
          prompt = prompt.replace(/,\s*with\s+soft\s+drape/gi, "")
          prompt = prompt.replace(/,\s*weight\s+shifted\s+to\s+one\s+leg/gi, ", weight on one leg")
          currentWordCount = wordCount(prompt)
        }
        
        // If still over, remove overly detailed outfit descriptions
        if (currentWordCount > MAX_WORDS) {
          // Simplify "with soft drape" type phrases
          prompt = prompt.replace(/,\s*with\s+soft\s+drape/gi, "")
          prompt = prompt.replace(/,\s*weight\s+shifted\s+to\s+one\s+leg/gi, ", weight on one leg")
          currentWordCount = wordCount(prompt)
        }
        
        // Final cleanup
        prompt = prompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()
        currentWordCount = wordCount(prompt)
      }

      // Check if user wants professional/studio/magazine aesthetic (skip iPhone requirements)
      // Also check image analysis for studio/professional indicators
      const wantsProfessional = /studio|magazine|cover|high.?end|high.?fashion|editorial|professional|luxury|fashion.?editorial|vogue|elle|runway/i.test(`${userRequest || ""} ${aesthetic || ""} ${imageAnalysis || ""}`.toLowerCase())
      
      // Check if image analysis or prompt indicates B&W/monochrome
      const wantsBAndW = /black.?and.?white|monochrome|b&w|grayscale/i.test(`${userRequest || ""} ${aesthetic || ""} ${imageAnalysis || ""}`.toLowerCase())
      const hasBAndWInPrompt = /black.?and.?white|monochrome|b&w|grayscale/i.test(prompt)

      // CRITICAL FIX: Remove "muted colors" if B&W is detected
      if (wantsBAndW || hasBAndWInPrompt) {
        prompt = prompt.replace(/,\s*muted\s+colors?/gi, "")
        prompt = prompt.replace(/muted\s+colors?,?\s*/gi, "")
        console.log("[v0] Removed 'muted colors' because B&W/monochrome detected")
        
        // Ensure B&W is in the prompt
        if (!hasBAndWInPrompt) {
          prompt += ", black and white"
          currentWordCount = wordCount(prompt)
          console.log("[v0] Added 'black and white' to prompt")
        }
      }
      
      // CRITICAL FIX: Remove iPhone/cellphone references for Studio Pro mode
      if (studioProMode) {
        // Remove ALL iPhone/cellphone/amateur photo references for Studio Pro
        prompt = prompt.replace(/,\s*shot\s+on\s+iPhone[^,]*/gi, "")
        prompt = prompt.replace(/,\s*(amateur\s+cellphone\s+photo|cellphone\s+photo|amateur\s+photography|candid\s+photo|candid\s+moment)/gi, "")
        prompt = prompt.replace(/authentic\s+iPhone\s+photo\s+aesthetic/gi, "")
        console.log("[v0] Removed all iPhone/cellphone references for Studio Pro mode")
      }
      
      // CRITICAL FIX: Remove "uneven natural lighting" if studio/professional is detected
      if (wantsProfessional) {
        // Remove "uneven" from lighting descriptions for studio requests
        prompt = prompt.replace(/uneven\s+(?:natural\s+)?lighting/gi, "studio lighting")
        prompt = prompt.replace(/uneven\s+illumination/gi, "studio lighting")
        console.log("[v0] Replaced 'uneven lighting' with 'studio lighting' for professional request")
        
        // Remove iPhone specs if they exist (should be replaced with professional camera)
        prompt = prompt.replace(/,\s*shot\s+on\s+iPhone[^,]*/gi, "")
        console.log("[v0] Removed iPhone specs for professional/studio request")
      }

      // CRITICAL FIX #1: Ensure basic iPhone specs at the end (new simplified format)
      // Skip for professional/studio requests AND Studio Pro mode - allow professional camera specs instead
      if (!studioProMode && !wantsProfessional) {
        // Remove any duplicate iPhone mentions first
        const iphoneMatches = prompt.match(/(shot on iPhone[^,]*)/gi)
        if (iphoneMatches && iphoneMatches.length > 1) {
          // Keep only the last one, remove others
          prompt = prompt.replace(/(shot on iPhone[^,]*),/gi, "")
          // Re-add at the end if we removed all
          if (!/shot on iPhone/i.test(prompt)) {
            prompt = `${prompt}, shot on iPhone 15 Pro portrait mode, shallow depth of field`
          }
        }
        
        const hasIPhone = /shot\s+on\s+iPhone/i.test(prompt)
        const hasFocalLength = /\d+mm\s*(lens|focal)/i.test(prompt)

        if (!hasIPhone && !hasFocalLength && currentWordCount < MAX_WORDS) {
          // Add basic iPhone specs at the end (new format)
          // Enhanced Authenticity mode: Use stronger iPhone quality descriptors
          const iphoneSpecs = enhancedAuthenticity 
            ? "shot on iPhone 15 Pro portrait mode, shallow depth of field, raw iPhone camera quality"
            : "shot on iPhone 15 Pro portrait mode, shallow depth of field"
          prompt = `${prompt}, ${iphoneSpecs}`
          currentWordCount = wordCount(prompt)
        } else if (hasFocalLength && !hasIPhone && currentWordCount < MAX_WORDS) {
          // If focal length but no iPhone, replace with basic iPhone specs
          // Enhanced Authenticity mode: Use stronger iPhone quality descriptors
          const iphoneSpecs = enhancedAuthenticity 
            ? "shot on iPhone 15 Pro portrait mode, shallow depth of field, raw iPhone camera quality"
            : "shot on iPhone 15 Pro portrait mode, shallow depth of field"
          prompt = prompt.replace(/\d+mm\s*(lens|focal)[^,]*/i, iphoneSpecs)
          currentWordCount = wordCount(prompt)
        } else if (hasIPhone) {
          // Ensure it's in the new simplified format (at the end, basic specs only)
          // Enhanced Authenticity mode: Upgrade to stronger iPhone quality if enabled
          prompt = prompt.replace(/shot\s+on\s+iPhone\s*15\s*Pro[^,]*(?:,\s*[^,]+)*/gi, (match) => {
            // If it has complex specs, simplify to basic format
            if (/\d+mm|f\/\d+|ISO\s*\d+/i.test(match)) {
              return enhancedAuthenticity 
                ? "shot on iPhone 15 Pro portrait mode, shallow depth of field, raw iPhone camera quality"
                : "shot on iPhone 15 Pro portrait mode, shallow depth of field"
            }
            // Enhanced Authenticity: Upgrade existing simple format
            if (enhancedAuthenticity && !/raw\s+iPhone\s+camera\s+quality/i.test(match)) {
              return match.replace(/shot\s+on\s+iPhone\s*15\s*Pro[^,]*/i, "shot on iPhone 15 Pro portrait mode, shallow depth of field, raw iPhone camera quality")
            }
            // If it's already simple, keep it but ensure it's at the end
            return match
          })
          currentWordCount = wordCount(prompt)
        }
      } else {
        console.log("[v0] Professional/studio request - skipping iPhone requirement, allowing professional camera specs")
      }

      // CRITICAL FIX #2: Ensure authenticity keywords are present (research-backed)
      // These keywords prevent plastic look: "candid photo", "candid moment", "amateur cellphone photo", "cellphone photo"
      // BUT: Skip for professional/studio/magazine requests AND Studio Pro mode
      if (!studioProMode && !wantsProfessional) {
        const hasCandid = /candid\s+(photo|moment)/i.test(prompt)
        const hasAmateur = /(amateur\s+cellphone\s+photo|cellphone\s+photo|amateur\s+photography)/i.test(prompt)
        
        if (!hasCandid && currentWordCount < MAX_WORDS) {
          // Add "candid photo" or "candid moment" before iPhone specs
          // Enhanced Authenticity mode: Use stronger candid descriptions
          const iphoneIndex = prompt.search(/shot\s+on\s+iPhone/i)
          const candidText = enhancedAuthenticity ? "candid moment, raw photo" : "candid photo"
          if (iphoneIndex > 0) {
            prompt = prompt.slice(0, iphoneIndex).trim() + `, ${candidText}, ` + prompt.slice(iphoneIndex)
          } else {
            prompt = prompt + `, ${candidText}`
          }
          currentWordCount = wordCount(prompt)
        }
        
        if (!hasAmateur && currentWordCount < MAX_WORDS) {
          // Add "amateur cellphone photo" or "cellphone photo" before iPhone specs
          // Enhanced Authenticity mode: Use stronger amateur descriptions
          const iphoneIndex = prompt.search(/shot\s+on\s+iPhone/i)
          const amateurText = enhancedAuthenticity ? "amateur cellphone photo, raw iPhone quality" : "amateur cellphone photo"
          if (iphoneIndex > 0) {
            prompt = prompt.slice(0, iphoneIndex).trim() + `, ${amateurText}, ` + prompt.slice(iphoneIndex)
          } else {
            prompt = prompt + `, ${amateurText}`
          }
          currentWordCount = wordCount(prompt)
        }
      } else if (studioProMode) {
        console.log("[v0] Studio Pro mode - skipping candid/amateur keywords")
      } else {
        console.log("[v0] Professional/studio request - skipping candid/amateur keywords")
      }

      // Apply complete anti-plastic validation (with user request context AND image analysis for conditional requirements)
      // Skip for Studio Pro mode - use professional quality instead
      if (!studioProMode) {
        prompt = ensureRequiredElements(prompt, currentWordCount, MAX_WORDS, userRequest, aesthetic, imageAnalysis, studioProMode, enhancedAuthenticity)
      }
      currentWordCount = wordCount(prompt)

      console.log("[v0] Final prompt after all validation:", prompt)
      console.log("[v0] Final word count:", currentWordCount)

      // Final cleanup
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
