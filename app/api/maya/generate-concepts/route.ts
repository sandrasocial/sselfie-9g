import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
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
- **IMPORTANT:** Convert instruction language to descriptive language for FLUX, but PRESERVE USER INTENT
- **REMOVE INSTRUCTION PHRASES:** "Always keep my", "dont change", "keep my", "don't change my", "preserve my", "maintain my" - these are instructions, not prompt text
- **CONVERT TO DESCRIPTIVE:** Convert to descriptive appearance features while preserving intent:
  - "natural features" → describe what they are
  - "natural hair color" → actual hair color description if known, OR keep as "natural hair color" to preserve intent
  - "keep my natural hair color" → Convert to actual color (e.g., "brown hair") OR "natural hair color" (preserves intent)
- Include them RIGHT AFTER the gender/ethnicity descriptor as DESCRIPTIVE features, not instructions
- Format: "${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}, [descriptive appearance features from user preferences], [rest of prompt]"
- Examples of CORRECT conversion:
  - "Always keep my natural features, dont change the face" → Omit instruction (face is preserved by trigger word), but keep any specific feature descriptions
  - "keep my natural hair color" → "natural hair color" OR actual color if specified (preserves intent, don't just omit)
  - "curvier body type" → "curvier body type" (descriptive, keep as-is)
  - "long blonde hair" → "long blonde hair" (descriptive, keep as-is)
  - "dont change my body" → "natural body type" OR preserve any body descriptions mentioned
- **PRESERVE USER INTENT:** Don't just remove everything - convert instructions to descriptive language that preserves what the user wants
`
    : ""
}

**🔴 MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):**

1. **Start with:** "${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, no instructions]` : ""}"

   **CRITICAL - TRIGGER WORD PLACEMENT:**
   - Trigger word MUST be the FIRST word in every prompt
   - This is non-negotiable for character likeness preservation
   - Format: "${triggerWord}, [rest of prompt]"

   **CRITICAL - CHARACTER FEATURE GUIDANCE (BALANCED APPROACH):**
   - **USER PREFERENCES ARE MANDATORY:** If user specified hair/body/age in their physical preferences, these MUST be included in EVERY prompt - they are intentional user modifications
   - **SAFETY NET APPROACH:** It's better to include subtle feature descriptions than to omit them and get wrong results
   - **INCLUDE WHEN NEEDED:** 
     - If user preferences mention hair color/style → ALWAYS include it
     - If user preferences mention body type/age → ALWAYS include it
     - If unsure about LoRA quality → Include subtle descriptions as safety net
   - **FOCUS ON CHANGEABLE ELEMENTS:** Prioritize describing styling, pose, lighting, environment, makeup, expressions:
     - "natural makeup" (makeup is changeable)
     - "relaxed expression" (expression is changeable)
     - "confident look" (mood is changeable)
   - **BALANCE:** Trust the LoRA but reinforce critical features (especially from user preferences) to ensure consistency

   **CRITICAL:** If physical preferences contain instruction language ("Always keep my", "dont change", "keep my"), you MUST:
   - Remove the instruction phrases but PRESERVE THE INTENT
   - Convert to descriptive appearance features
   - If it says "keep my natural features" or "dont change the face" → OMIT instruction phrase (face is preserved by trigger word)
   - If it says "keep my natural hair color" → Convert to actual hair color description if known, OR keep as "natural hair color" to preserve intent
   - **PRESERVE USER INTENT:** Always include actual descriptive modifications like "curvier body type", "long blonde hair", "athletic build", "darker hair", etc.
   - **DO NOT REMOVE:** User's physical preferences should be in the prompt as descriptive features, not instructions

2. **Basic iPhone Specs (MANDATORY):** MUST include "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh". Keep it simple - NO complex technical details (no f-stops, ISO, focal lengths).

3. **Simple Natural Lighting (MANDATORY):** MUST use simple, natural lighting descriptions only:
   - ✅ "Soft afternoon sunlight"
   - ✅ "Natural window light"
   - ✅ "Warm golden hour lighting"
   - ✅ "Overcast daylight"
   - ❌ NEVER use: "dramatic rim lighting", "cinematic quality", "professional studio lighting", "editorial photography lighting", "perfect lighting"

4. **NO Skin Quality Descriptions:** Do NOT describe skin quality beyond "natural". The user LoRA handles appearance. NO "natural skin texture with pores visible", "not plastic-looking", etc.

5. **NO Film Grain or Muted Colors:** These are NO LONGER mandatory. Keep prompts detailed (50-80 words) for better LoRA activation.

6. **NO Natural Imperfections Lists:** Do NOT include lists of imperfections like "visible sensor noise", "slight motion blur", etc. Keep camera specs basic.

11. **Prompt Length:** 50-80 words (optimal range for LoRA activation and accurate character representation)

12. **NO BANNED WORDS:** Never use "ultra realistic", "photorealistic", "8K", "4K", "high quality", "perfect", "flawless", "stunning", "beautiful", "gorgeous", "professional photography", "editorial", "magazine quality", "dramatic" (for lighting), "cinematic", "hyper detailed", "sharp focus", "ultra sharp", "crystal clear", "studio lighting", "perfect lighting", "smooth skin", "flawless skin", "airbrushed" - these cause plastic/generic faces and override the user LoRA.

9. Apply the OUTFIT PRINCIPLE with your FASHION INTELLIGENCE - no boring defaults
10. Apply the EXPRESSION PRINCIPLE for authentic facial details (expressions, not fixed features)
11. Apply the POSE PRINCIPLE for natural body positioning
12. Apply the LOCATION PRINCIPLE for evocative settings
13. Apply the LIGHTING PRINCIPLE for simple, natural lighting (NO dramatic/cinematic terms)

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**
1. **TRIGGER WORD** (first position - MANDATORY)
2. **GENDER/ETHNICITY** (2-3 words)
3. **OUTFIT** (material + color + garment type - 8-12 words, stay detailed here)
4. **LOCATION** (simple, one-line - 3-5 words, keep brief)
5. **LIGHTING** (simple, natural only - 3-5 words, NO dramatic/cinematic terms)
6. **POSE + EXPRESSION** (simple, natural action - 3-5 words, NO "striking poses")
7. **TECHNICAL SPECS** (basic iPhone only - 5-8 words, keep minimal)

**Total target: 50-80 words for optimal LoRA activation and accurate character representation**

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
    "prompt": "YOUR CRAFTED FLUX PROMPT - synthesized from principles, MUST start with ${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, NO instruction phrases like 'dont change' or 'keep my']` : ""}"
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
      
      // Remove duplicate "shot on iPhone" mentions (keep only one at the end)
      const iphoneMatches = prompt.match(/(shot\s+on\s+iPhone[^,]*)/gi)
      if (iphoneMatches && iphoneMatches.length > 1) {
        // Remove all iPhone mentions
        prompt = prompt.replace(/,\s*shot\s+on\s+iPhone[^,]*/gi, "")
        // Add one at the end in the new format
        prompt = `${prompt}, shot on iPhone 15 Pro portrait mode, shallow depth of field`
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
      const MAX_WORDS = 80 // Hard limit - optimal length (50-80 words) for better LoRA activation and accurate character representation

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

      // CRITICAL FIX #1: Ensure basic iPhone specs at the end (new simplified format)
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
        prompt = `${prompt}, shot on iPhone 15 Pro portrait mode, shallow depth of field`
        currentWordCount = wordCount(prompt)
      } else if (hasFocalLength && !hasIPhone && currentWordCount < MAX_WORDS) {
        // If focal length but no iPhone, replace with basic iPhone specs
        prompt = prompt.replace(/\d+mm\s*(lens|focal)[^,]*/i, "shot on iPhone 15 Pro portrait mode, shallow depth of field")
        currentWordCount = wordCount(prompt)
      } else if (hasIPhone) {
        // Ensure it's in the new simplified format (at the end, basic specs only)
        // Remove complex technical details if present
        prompt = prompt.replace(/shot\s+on\s+iPhone\s*15\s*Pro[^,]*(?:,\s*[^,]+)*/gi, (match) => {
          // If it has complex specs, simplify to basic format
          if (/\d+mm|f\/\d+|ISO\s*\d+/i.test(match)) {
            return "shot on iPhone 15 Pro portrait mode, shallow depth of field"
          }
          // If it's already simple, keep it but ensure it's at the end
          return match
        })
        currentWordCount = wordCount(prompt)
      }

      // CRITICAL FIX #2: Ensure authenticity keywords are present (research-backed)
      // These keywords prevent plastic look: "candid photo", "candid moment", "amateur cellphone photo", "cellphone photo"
      const hasCandid = /candid\s+(photo|moment)/i.test(prompt)
      const hasAmateur = /(amateur\s+cellphone\s+photo|cellphone\s+photo|amateur\s+photography)/i.test(prompt)
      
      if (!hasCandid && currentWordCount < MAX_WORDS) {
        // Add "candid photo" or "candid moment" before iPhone specs
        const iphoneIndex = prompt.search(/shot\s+on\s+iPhone/i)
        if (iphoneIndex > 0) {
          prompt = prompt.slice(0, iphoneIndex).trim() + ", candid photo, " + prompt.slice(iphoneIndex)
        } else {
          prompt = prompt + ", candid photo"
        }
        currentWordCount = wordCount(prompt)
      }
      
      if (!hasAmateur && currentWordCount < MAX_WORDS) {
        // Add "amateur cellphone photo" or "cellphone photo" before iPhone specs
        const iphoneIndex = prompt.search(/shot\s+on\s+iPhone/i)
        if (iphoneIndex > 0) {
          prompt = prompt.slice(0, iphoneIndex).trim() + ", amateur cellphone photo, " + prompt.slice(iphoneIndex)
        } else {
          prompt = prompt + ", amateur cellphone photo"
        }
        currentWordCount = wordCount(prompt)
      }

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
