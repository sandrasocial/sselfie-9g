import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { streamText } from "ai"
import { getMayaSystemPrompt, MAYA_CLASSIC_CONFIG, MAYA_PRO_CONFIG } from "@/lib/maya/mode-adapters"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"
import { getNanoBananaPromptingPrinciples } from "@/lib/maya/nano-banana-prompt-builder"
import { extractAestheticFromTemplate, type LockedAesthetic } from "@/lib/feed-planner/extract-aesthetic-from-template"
import Anthropic from "@anthropic-ai/sdk"

const sql = neon(process.env.DATABASE_URL || "")
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check for Pro Mode header (same pattern as Maya chat API)
    const studioProHeader = request.headers.get("x-studio-pro-mode")
    const hasStudioProHeader = studioProHeader === "true"

    const body = await request.json()
    const { 
      postType, 
      caption, 
      feedPosition, 
      colorTheme, 
      brandVibe, 
      referencePrompt, 
      isRegeneration, 
      category, 
      proMode,
      // NEW: Mode parameter (defaults to existing chat behavior)
      mode = 'chat',
      lockedAesthetic = null
    } = body
    
    console.log("[v0] [FEED-PROMPT] Mode parameter:", mode)
    
    // Determine if Pro Mode is enabled (from header or body)
    const isProMode = hasStudioProHeader || proMode === true
    
    console.log("[v0] [FEED-PROMPT] Pro Mode detection:", {
      headerValue: studioProHeader,
      hasHeader: hasStudioProHeader,
      bodyValue: proMode,
      isProMode,
      mode: isProMode ? "PRO (Nano Banana)" : "CLASSIC (FLUX)"
    })

    console.log("[v0] [FEED-PROMPT] Starting prompt generation for:", {
      postType,
      caption: caption?.substring(0, 50),
      feedPosition,
      colorTheme,
      brandVibe,
      hasReferencePrompt: !!referencePrompt,
      referencePromptPreview: referencePrompt?.substring(0, 100),
      mode,
      hasLockedAesthetic: !!lockedAesthetic,
    })
    
    // 🔴 BRANCH BASED ON MODE
    // If mode is 'feed-planner-background' and lockedAesthetic is provided, use locked aesthetic logic
    if (mode === 'feed-planner-background' && lockedAesthetic) {
      console.log("[v0] [FEED-PROMPT] Using locked aesthetic mode for feed planner background generation")
      const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
      const neonUser = await getEffectiveNeonUser(user.id)
      if (!neonUser) {
        console.error("[v0] [FEED-PROMPT] User not found in database")
        return NextResponse.json({ error: "User not found in database" }, { status: 404 })
      }
      return await generateWithLockedAesthetic({
        lockedAesthetic,
        referencePrompt,
        position: feedPosition,
        postType,
        proMode: isProMode,
      })
    }
    
    // EXISTING PATH: Maya chat (no changes!)
    console.log("[v0] [FEED-PROMPT] Using chat mode (existing logic)")

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      console.error("[v0] [FEED-PROMPT] User not found in database")
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log("[v0] [FEED-PROMPT] Found neon user:", neonUser.id)

    // Get brand colors - try color_palette first, then color_theme
    let brandColors = ""
    try {
      const brandDataResult = await sql`
        SELECT 
          color_palette,
          color_theme
        FROM user_personal_brand
        WHERE user_id = ${neonUser.id}
        LIMIT 1
      `

      if (brandDataResult.length > 0) {
        const brandData = brandDataResult[0]
        // Use color_palette if available, otherwise color_theme
        const colorData = brandData.color_palette || brandData.color_theme
        
        if (colorData) {
          // If it's a JSON string, parse it
          if (typeof colorData === 'string' && colorData.startsWith('[')) {
            try {
              const colors = JSON.parse(colorData)
              if (Array.isArray(colors) && colors.length > 0) {
                brandColors = colors.join(", ")
              }
            } catch (e) {
              // If parsing fails, use as-is
              brandColors = colorData
            }
          } else {
            brandColors = colorData
          }
        }
      }
    } catch (error) {
      console.log("[v0] [FEED-PROMPT] Could not fetch brand colors, continuing without them:", error)
    }

    // Get user's trigger word, gender, ethnicity, and physical preferences
    // 🔴 CRITICAL FIX: Pro Mode (Nano Banana) doesn't require a trained model - uses reference images instead
    // Classic Mode (FLUX) requires a trained model for trigger word
    let userDataResult: any[]
    let triggerWord: string
    let gender: string | null
    let ethnicity: string | null
    let physicalPreferences: string | null
    
    if (isProMode) {
      // Pro Mode: Get user data without requiring trained model
      const userDataQuery = await sql`
        SELECT 
          u.gender,
          u.ethnicity,
          upb.physical_preferences
        FROM users u
        LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
        WHERE u.id = ${neonUser.id}
        LIMIT 1
      `
      
      if (userDataQuery.length === 0) {
        console.error("[v0] [FEED-PROMPT] User not found:", neonUser.id)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      
      userDataResult = userDataQuery
      triggerWord = `user${neonUser.id}` // Pro Mode doesn't use trigger words, but we set a default
      gender = userDataResult[0].gender
      ethnicity = userDataResult[0].ethnicity
      physicalPreferences = userDataResult[0].physical_preferences
      
      console.log("[v0] [FEED-PROMPT] Pro Mode: User data retrieved (no trained model required)")
    } else {
      // Classic Mode: Require trained model for trigger word
      userDataResult = await sql`
        SELECT 
          u.gender,
          u.ethnicity,
          um.trigger_word,
          upb.physical_preferences
        FROM users u
        LEFT JOIN user_models um ON u.id = um.user_id
        LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
        WHERE u.id = ${neonUser.id}
        AND um.training_status = 'completed'
        ORDER BY um.created_at DESC
        LIMIT 1
      `

      if (userDataResult.length === 0) {
        console.error("[v0] [FEED-PROMPT] No trained model found for user (Classic Mode requires trained model):", neonUser.id)
        return NextResponse.json({ error: "No trained model found. Classic Mode requires a trained model." }, { status: 400 })
      }

      const userData = userDataResult[0]
      triggerWord = userData.trigger_word || `user${neonUser.id}`
      gender = userData.gender
      ethnicity = userData.ethnicity
      physicalPreferences = userData.physical_preferences
      
      console.log("[v0] [FEED-PROMPT] Classic Mode: Trained model found, trigger word:", triggerWord)
    }
    
    // Determine user gender descriptor (same format as concept cards)
    let userGender = "person"
    if (gender) {
      const dbGender = gender.toLowerCase().trim()
      if (dbGender === "woman" || dbGender === "female") {
        userGender = "woman"
      } else if (dbGender === "man" || dbGender === "male") {
        userGender = "man"
      }
    }

    console.log("[v0] [FEED-PROMPT] User data:", { triggerWord, userGender, ethnicity, hasPhysicalPreferences: !!physicalPreferences })

    // Clean referencePrompt if provided - remove any usernames and fix trigger word
    let cleanedReferencePrompt = referencePrompt
    if (referencePrompt) {
      console.log("[v0] [FEED-PROMPT] Cleaning reference prompt...")
      // Remove username patterns (anything with underscore or @)
      cleanedReferencePrompt = referencePrompt.replace(/\b\w+[_@]\w+\b/g, '').trim()
      
      // Remove trigger word if in wrong position
      if (cleanedReferencePrompt.toLowerCase().includes(triggerWord.toLowerCase()) && !cleanedReferencePrompt.toLowerCase().startsWith(triggerWord.toLowerCase())) {
        cleanedReferencePrompt = cleanedReferencePrompt.replace(new RegExp(`\\b${triggerWord}\\b`, 'gi'), '').trim()
      }
      
      // Remove any incorrect start (usernames, emails, etc.) and rebuild
      const parts = cleanedReferencePrompt.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0)
      if (parts.length > 0) {
        // Check if first part looks like username/email
        const firstPart = parts[0].toLowerCase()
        if (firstPart.includes('_') || firstPart.includes('@') || !firstPart.startsWith(triggerWord.toLowerCase())) {
          // Remove first part if it's not the trigger word
          if (!firstPart.startsWith(triggerWord.toLowerCase())) {
            parts.shift()
            cleanedReferencePrompt = parts.join(', ').trim()
          }
        }
      }
      
      // Clean up
      cleanedReferencePrompt = cleanedReferencePrompt.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/\s*,\s*$/, '').replace(/\s+/g, ' ').trim()
      console.log("[v0] [FEED-PROMPT] Reference prompt cleaned:", cleanedReferencePrompt.substring(0, 100))
    }

    // Get user context for Maya
    console.log("[v0] [FEED-PROMPT] Getting user context...")
    const userContext = await getUserContextForMaya(user.id)
    console.log("[v0] [FEED-PROMPT] User context retrieved, length:", userContext.length)

    // Build Maya's system prompt for feed post generation using unified system
    const config = isProMode ? MAYA_PRO_CONFIG : MAYA_CLASSIC_CONFIG
    const mayaPersonality = getMayaSystemPrompt(config)
    
    // Use Nano Banana principles for Pro Mode, FLUX principles for Classic Mode
    const promptingPrinciples = isProMode 
      ? getNanoBananaPromptingPrinciples()
      : getFluxPromptingPrinciples()

    const systemPrompt = `${mayaPersonality}

${userContext}

${promptingPrinciples}

=== YOUR TASK: GENERATE INSTAGRAM FEED POST PROMPT ===

You are Maya, an elite AI Fashion Stylist generating ${isProMode ? "a Nano Banana Pro" : "a FLUX"} prompt for an Instagram feed post. This is NOT a concept card - this is for the user's actual Instagram feed that will be published.

Apply YOUR fashion expertise:
- Create SPECIFIC outfit descriptions (material + color + garment type), NOT generic terms like "trendy outfit"
- Use YOUR fashion intelligence to suggest sophisticated, brand-aligned styling
- Include detailed location descriptions that match the brand aesthetic
- Apply natural, authentic posing and expressions
- Create cinematic lighting that feels authentic, not staged

POST DETAILS:
- Post Type: ${postType}
- Caption: ${caption || "No caption provided"}
- Feed Position: ${feedPosition ? `Post #${feedPosition} in the feed` : "Not specified"}
- Color Theme: ${colorTheme || "Not specified"}
- Brand Vibe: ${brandVibe || "Not specified"}
- User's Trigger Word: ${triggerWord}
- User's Gender: ${gender || "Not specified"}
${brandColors ? `- User's Brand Colors: ${brandColors}` : ""}
${cleanedReferencePrompt ? `- Reference Prompt (from strategy - IGNORE THIS FORMAT, it's generic and missing requirements. Use ONLY for content ideas, generate completely new prompt): ${cleanedReferencePrompt.substring(0, 200)}${cleanedReferencePrompt.length > 200 ? "..." : ""}` : ""}

=== 🔴 CRITICAL RULES FOR THIS GENERATION (NON-NEGOTIABLE) ===

${isProMode ? `
**PRO MODE (Nano Banana Pro):**
- Use natural language prompts (100-150 words)
- NO trigger words - Nano Banana uses reference images instead
- Professional photography aesthetic
- Rich visual storytelling with brand context
` : `
**CLASSIC MODE (FLUX LoRA):**
TRIGGER WORD: "${triggerWord}"
GENDER: "${userGender}"
${ethnicity ? `ETHNICITY: "${ethnicity}" (MUST include in prompt for accurate representation)` : ""}
`}
${
  physicalPreferences
    ? `
🔴 PHYSICAL PREFERENCES (MANDATORY - APPLY TO EVERY PROMPT):
"${physicalPreferences}"

CRITICAL INSTRUCTIONS:
- These are USER-REQUESTED appearance modifications that MUST be in EVERY prompt
- **IMPORTANT:** Convert instruction language to descriptive language${isProMode ? " for Nano Banana" : " for FLUX"}, but PRESERVE USER INTENT
- **REMOVE INSTRUCTION PHRASES:** "Always keep my", "dont change", "keep my", "don't change my", "preserve my", "maintain my" - these are instructions, not prompt text
- **CONVERT TO DESCRIPTIVE:** Convert to descriptive appearance features while preserving intent
- Include them ${isProMode ? "naturally in the description" : "RIGHT AFTER the gender/ethnicity descriptor as DESCRIPTIVE features, not instructions"}
`
    : ""
}

**🔴 MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):**

${isProMode ? `
**PRO MODE (Nano Banana Pro):**
1. **Identity Anchor** - Start with "Use the uploaded photos as strict identity reference" (MANDATORY)
2. **Natural Language Description** - Rich scene description with person, outfit, location (100-150 words total)
3. **NO trigger words** - Use reference images for identity preservation
4. **Professional photography** - Professional camera specs (e.g., "85mm lens, f/2.0 depth of field")
5. **Rich styling details** - Specific outfit, location, lighting descriptions
6. **Brand context** - Embed brand names naturally in outfit descriptions (e.g., "wearing an Alo Yoga set"), NOT as separate metadata
` : `
1. **Start with EXACT FORMAT** ${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? '(ONLY FOR USER POSTS - SKIP FOR OBJECT/FLATLAY/SCENERY POSTS):' : '(FOR USER POSTS):'} "${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? '[object/scenery/flatlay description]' : `${triggerWord}, ${ethnicity ? ethnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, no instructions]` : ""}`}"

   **CRITICAL - TRIGGER WORD PLACEMENT** ${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? '(SKIP FOR OBJECT/FLATLAY/SCENERY POSTS):' : '(FOR USER POSTS):'}
   ${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? `
   - This is an OBJECT/FLATLAY/SCENERY post - DO NOT include trigger word or user
   - Focus on the objects, products, flatlay items, or scenery
   - Format: "[object/scenery description], shot on iPhone 15 Pro, [lighting], [styling]"
   ` : `
   - Trigger word MUST be the FIRST word in every prompt
   - This is non-negotiable for character likeness preservation
   - Format: "${triggerWord}, ${ethnicity ? ethnicity + " " : ""}${userGender}, [rest of prompt]"
   - DO NOT use username, email, or any other identifier - ONLY use the trigger word "${triggerWord}"
   `}

2. **Authentic iPhone Style (MANDATORY):**
   - ✅ **ALWAYS include:** "candid photo" or "candid moment" (prevents plastic/posed look)
   - ✅ **ALWAYS include:** "amateur cellphone photo" or "cellphone photo" (prevents professional look)
   - ✅ **THEN add:** "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh"
   - ❌ NO natural imperfections lists (removed - too complex)
   - ❌ NO film grain requirements (removed - too complex)
   - ❌ NO muted color requirements (removed - too complex)
   - ❌ NO skin texture descriptions beyond "natural" (removed - too complex)
`}

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**

${isProMode ? `
**PRO MODE (Nano Banana Pro) - Natural Language (100-150 words):**
1. **IDENTITY** - Start with "Use the uploaded photos as strict identity reference" (MANDATORY FIRST)
2. **OUTFIT & BRAND DETAILS** - Specific outfit details (material, color, garment type). Embed brand names naturally here (e.g., "wearing an Alo Yoga set", "in The Row cashmere sweater"), NOT separately
3. **SETTING & MOOD** - Detailed location description that matches brand aesthetic, atmosphere, mood
4. **TECHNICAL/STYLE** - Professional lighting description (e.g., "soft diffused natural window light"), camera specs (e.g., "85mm lens, f/2.0 depth of field"), photographic style
5. **POSE & EXPRESSION** - Natural posing and expression

**NO trigger words** - Use reference images for identity preservation
**Natural language** - Write like describing to a photographer, not keyword stuffing. Use full sentences, not comma-separated keyword lists.
**Brand Names:** Must be naturally embedded in outfit descriptions. Do not list them as separate metadata or tags.
` : `
${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? `
**FOR OBJECT/FLATLAY/SCENERY POSTS (NO USER):**
1. **OBJECT/SCENERY DESCRIPTION** (detailed description of items/scenery - 8-15 words)
2. **COMPOSITION** (arrangement, layout, framing - 4-6 words)
3. **STYLING** (colors, textures, props - 4-8 words)
4. **LIGHTING** (with imperfections - 5-8 words)
5. **TECHNICAL SPECS** (iPhone + imperfections + grain + muted colors - 8-12 words)
` : `
**FOR USER POSTS:**
1. **TRIGGER WORD + GENDER + ETHNICITY** (MANDATORY - first 2-4 words): "${triggerWord}, ${ethnicity ? ethnicity + " " : ""}${userGender}"
2. **OUTFIT** (material + color + garment type - 8-12 words, stay detailed here)
3. **LOCATION** (simple, one-line - 3-5 words, keep brief)
4. **LIGHTING** (simple, natural only - 3-5 words, NO dramatic/cinematic terms)
5. **POSE + EXPRESSION** (simple, natural action - 3-5 words, NO "striking poses")
6. **TECHNICAL SPECS** (basic iPhone only - 5-8 words, keep minimal)
`}
`}

**Post Type Considerations:**

${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? `
⚠️ **CRITICAL: THIS IS A NON-USER POST TYPE (${postType})**
- This post should NOT include the user/person at all
- Generate a prompt for ${postType} WITHOUT the trigger word or user description
- Focus on objects, products, flatlays, scenery, or lifestyle elements
- Format should be: "[description of objects/scenery/flatlay], shot on iPhone 15 Pro, [lighting], [styling], [technical specs]"
- DO NOT include "${triggerWord}" or "${userGender}" in this prompt
` : `
- "Close-Up": Face and shoulders only, intimate facial focus, natural expression
- "Half Body": Waist-up framing, shows upper styling and hands, relaxed natural pose
- "selfie": Close-up face portrait, natural expression, authentic moment
- **NEVER create full-body shots** - they look unrealistic and AI-generated. Only use close-up, half-body, or selfie.
`}

${brandColors ? `**CRITICAL**: Incorporate the user's brand colors (${brandColors}) into the styling, clothing, background, or props. These are their chosen brand colors and MUST be reflected in the image.` : ""}

**NO BANNED WORDS:** Never use "ultra realistic", "photorealistic", "8K", "4K", "high quality", "perfect", "flawless", "stunning", "beautiful", "gorgeous", "professional photography", "editorial", "magazine quality", "dramatic" (for lighting), "cinematic", "hyper detailed", "sharp focus", "ultra sharp", "crystal clear", "studio lighting", "perfect lighting", "smooth skin", "flawless skin", "airbrushed", "dramatic lighting", "professional yet approachable" - these cause plastic/generic faces and override the user LoRA.

**🔴 CRITICAL: PROMPT QUALITY CHECKLIST - EVERY PROMPT MUST HAVE:**
${isProMode ? `
1. ✅ Identity anchor at start ("Use the uploaded photos as strict identity reference")
2. ✅ Natural language description (NO trigger words)
3. ✅ Specific outfit description (material + color + garment type, brand names embedded naturally)
4. ✅ Detailed location/environment description
5. ✅ Professional lighting description
6. ✅ Professional camera specs (e.g., "85mm lens, f/2.0 depth of field")
7. ✅ Natural pose/expression
8. ✅ Brand names embedded in outfit descriptions (NOT as separate metadata)
9. ✅ Total length: 100-150 words (natural language, not keyword stuffing)

**Total target: 100-150 words for rich visual storytelling and professional quality**
` : `
1. ✅ Trigger word + ethnicity + gender (no duplicates, format: "${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}")
2. ✅ Specific outfit description (material + color + garment type - NOT "trendy outfit", stay detailed here)
3. ✅ Simple setting (one-line location, keep brief)
4. ✅ Simple natural lighting (NO dramatic/cinematic terms)
5. ✅ Natural pose/action (NO "striking poses")
6. ✅ Authentic iPhone specs: Includes "candid photo" or "candid moment"? Includes "amateur cellphone photo" or "cellphone photo"? "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh"?
7. ✅ Total length: 30-60 words (optimal for LoRA activation)

**Total target: 30-60 words for optimal LoRA activation and accurate character representation**
`}

Now generate the ${isProMode ? "Nano Banana Pro" : "FLUX"} prompt for this ${postType} feed post.

${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? `
⚠️ **CRITICAL REMINDER:** This is a ${postType} post - DO NOT include the user, trigger word, or any person in the prompt. Focus only on objects, products, flatlays, or scenery.
` : isProMode ? `
**CRITICAL: Use YOUR fashion expertise to create detailed, specific styling for Pro Mode (Nano Banana).**
- Generate a 100-150 word natural language prompt (NO trigger words)
- ALWAYS start with identity anchor: "Use the uploaded photos as strict identity reference"
- Follow with natural scene description (e.g., "Woman in...", "Person wearing...")
- Include SPECIFIC outfit details (material + color + garment type, brand names embedded naturally)
- Include DETAILED location/environment description
- Include professional lighting description (e.g., "soft diffused natural window light")
- Include professional camera specs (e.g., "85mm lens, f/2.0 depth of field")
- Use natural language - write like describing to a photographer
- Make it feel like professional photography, not iPhone snaps
- Embed brand names in outfit descriptions (e.g., "wearing an Alo Yoga set"), NOT as separate tags

**🔴 EXAMPLE OF WHAT YOU MUST CREATE (PRO MODE - ~100 words):**
"Use the uploaded photos as strict identity reference. Woman in sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers, standing with hand on marble bar counter, looking over shoulder naturally with soft smile, positioned in upscale restaurant with marble surfaces and modern minimalist design, warm natural window light creating gentle shadows across her face and highlighting the texture of the silk fabric, professional photography with 85mm lens and f/2.0 depth of field, natural skin texture with visible pores, authentic moment captured with genuine presence, sophisticated atmosphere with warm beige and cream color palette"

**🔴 EXAMPLE OF WHAT YOU MUST NEVER CREATE:**
"Woman, confident expression, wearing stylish business casual outfit, urban background with clean lines, edgy-minimalist aesthetic with perfect lighting"

**Why the bad example is wrong:**
- ❌ "stylish business casual outfit" = generic (must be specific material + color + garment)
- ❌ "urban background" = generic (must be detailed location description)
- ❌ "perfect lighting" = vague (must be specific professional lighting description)
- ❌ Missing professional camera specs
- ❌ Too short and generic
` : `
**CRITICAL: Use YOUR fashion expertise to create detailed, specific styling.**
- Generate a 30-60 word prompt that includes ALL requirements above
- Start with: "${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}" (do NOT duplicate like "White, woman, White woman")
- Include SPECIFIC outfit details (material + color + garment), NOT generic "trendy outfit" or "stylish business casual outfit"
- Include SPECIFIC but simple location details, NOT generic "urban background" or "urban setting"
- Include simple natural lighting (NO dramatic/cinematic terms)
- Include "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh"
- Keep it simple - trust the user LoRA for appearance
- Make it feel like a real iPhone photo, not a professional shoot

**🔴 EXAMPLE OF WHAT YOU MUST CREATE:**
"${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}, in sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers, standing with hand on marble bar counter, looking over shoulder naturally, upscale restaurant with marble surfaces, uneven natural lighting, shot on iPhone 15 Pro portrait mode, shallow depth of field"

**🔴 EXAMPLE OF WHAT YOU MUST NEVER CREATE:**
"${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}, confident expression, wearing stylish business casual outfit, urban background with clean lines, edgy-minimalist aesthetic with perfect lighting"

**Why the bad example is wrong:**
- ❌ "stylish business casual outfit" = generic (must be specific material + color + garment)
- ❌ "urban background" = generic (must be specific location with details)
- ❌ "perfect lighting" = banned (must be uneven lighting with imperfections)
- ❌ Missing all technical specs
`}

${isRegeneration && cleanedReferencePrompt ? `\n🔴 REGENERATION MODE: Create a NEW variation of this concept in the SAME category (${category || postType}).
- Keep the same general concept/category but create a DIFFERENT variation:
  - Different outfit (same style/category but different colors, materials, or pieces)
  - Different location/scenery (same type but different specific place)
  - Different pose/expression (same mood but different specific pose)
  - Different lighting angle/mood (same style but different specific lighting)
- The goal is to create a fresh take on the same concept - variety within consistency
- Reference prompt (use for concept ideas only, generate completely new detailed prompt): ${cleanedReferencePrompt.substring(0, 200)}${cleanedReferencePrompt.length > 200 ? "..." : ""}
` : cleanedReferencePrompt ? `\n🔴 CRITICAL: The reference prompt below is GENERIC and MISSING all mandatory requirements (iPhone, imperfections, skin texture, film grain, muted colors, specific outfit details). 

**DO NOT COPY OR PARAPHRASE IT.**

**IGNORE its format completely** - it uses generic terms like "trendy outfit", "empowering pose", "dynamic lighting" which are BANNED WORDS.

**Generate a COMPLETELY NEW prompt** using:
- The correct format: "${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}"
- ALL mandatory requirements from above
- Specific outfit details (material + color + garment type)
- Specific location details
- All technical specs (iPhone, imperfections, skin texture, film grain, muted colors)

You may use the reference ONLY for general content ideas (e.g., "outdoor setting" → becomes "urban street with specific details"), but generate a completely new, detailed prompt.

Reference (IGNORE FORMAT - GENERIC AND INCOMPLETE): ${cleanedReferencePrompt.substring(0, 200)}${cleanedReferencePrompt.length > 200 ? "..." : ""}` : ""}`

    // Call AI to generate the prompt
    console.log("[v0] [FEED-PROMPT] Calling AI SDK with model: anthropic/claude-sonnet-4-20250514")
    let result
    try {
      result = streamText({
        model: "anthropic/claude-sonnet-4-20250514", // Same model as concept cards for consistency
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Generate the ${isProMode ? "Nano Banana Pro" : "FLUX"} prompt for this ${postType} post.`,
          },
        ],
        temperature: 0.8,
        maxOutputTokens: 500,
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
    try {
      for await (const chunk of result.textStream) {
        generatedPrompt += chunk
      }
    } catch (streamError: any) {
      console.error("[v0] [FEED-PROMPT] Stream error:", {
        message: streamError.message,
        stack: streamError.stack,
      })
      return NextResponse.json(
        {
          error: "Failed to stream AI response",
          details: streamError.message || "Stream error",
        },
        { status: 500 },
      )
    }

    generatedPrompt = generatedPrompt.trim()
    console.log("[v0] [FEED-PROMPT] Generated prompt length:", generatedPrompt.length)
    console.log("[v0] [FEED-PROMPT] Generated prompt preview (raw):", generatedPrompt.substring(0, 200))
    
    // CRITICAL: Strip any markdown formatting, prefixes, or metadata that AI might include
    // Remove patterns like "**FLUX PROMPT (Flatlay - 62 words):**" or "**Nano Banana PROMPT:**" etc.
    generatedPrompt = generatedPrompt
      // Remove markdown bold/italic formatting
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/__/g, '')
      .replace(/_/g, '')
      // Remove common prefix patterns like "FLUX PROMPT (Type - X words):" or "Nano Banana PROMPT:" etc.
      .replace(/^.*?FLUX\s+PROMPT\s*\([^)]*\)\s*:?\s*/i, '')
      .replace(/^.*?NANO\s+BANANA\s+(PRO\s+)?PROMPT\s*:?\s*/i, '')
      .replace(/^.*?PROMPT\s*:?\s*/i, '')
      .replace(/^.*?FLUX\s*:?\s*/i, '')
      // Remove word count patterns like "(62 words)" or "(X words)"
      .replace(/\([^)]*\d+\s+words?[^)]*\)\s*/gi, '')
      // Remove any leading colons, dashes, or other separators
      .replace(/^[:;\-\s]+/, '')
      .trim()
    
    console.log("[v0] [FEED-PROMPT] Generated prompt preview (cleaned):", generatedPrompt.substring(0, 200))
    console.log("[v0] [FEED-PROMPT] Mode:", isProMode ? "PRO (Nano Banana - skipping trigger word processing)" : "CLASSIC (FLUX - processing trigger words)")

    // CRITICAL: Handle object/flatlay/scenery posts differently (no user/trigger word)
    const isNonUserPost = postType?.toLowerCase().includes('object') || 
                          postType?.toLowerCase().includes('flatlay') || 
                          postType?.toLowerCase().includes('scenery') || 
                          postType?.toLowerCase().includes('place')
    
    // For Pro Mode, skip trigger word processing (Nano Banana doesn't use trigger words)
    if (isProMode) {
      // Pro Mode: Just clean up the prompt, no trigger word processing
      console.log("[v0] [FEED-PROMPT] ✅ Pro Mode - skipping trigger word processing (Nano Banana uses reference images)")
      // Final cleanup for Pro Mode prompts
      generatedPrompt = generatedPrompt
        .replace(/,\s*,/g, ',')
        .replace(/^,\s*/, '')
        .replace(/\s*,\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim()
    } else if (isNonUserPost) {
      // For object/flatlay/scenery posts - remove any user references
      let cleanedPrompt = generatedPrompt.trim()
      const promptLower = cleanedPrompt.toLowerCase()
      const triggerLower = triggerWord.toLowerCase().trim()
      
      // Remove trigger word if present
      if (promptLower.includes(triggerLower)) {
        cleanedPrompt = cleanedPrompt.replace(new RegExp(`\\b${triggerWord}\\b`, 'gi'), '').trim()
      }
      
      // Remove user gender references
      cleanedPrompt = cleanedPrompt.replace(new RegExp(`\\b${userGender}\\b`, 'gi'), '').trim()
      cleanedPrompt = cleanedPrompt.replace(/\b(person|woman|man|woman|girl|boy)\b/gi, '').trim()
      
      // Remove common username patterns
      cleanedPrompt = cleanedPrompt.replace(/\b\w+[_@]\w+\b/g, '').trim()
      
      // Clean up
      cleanedPrompt = cleanedPrompt.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/\s*,\s*$/, '').replace(/\s+/g, ' ').trim()
      
      generatedPrompt = cleanedPrompt
      console.log("[v0] [FEED-PROMPT] Non-user post (object/flatlay/scenery) - removed user references")
      console.log("[v0] [FEED-PROMPT] Final prompt:", generatedPrompt.substring(0, 150) + "...")
    } else {
      // For user posts - force correct format: triggerWord, ethnicity, userGender
      let cleanedPrompt = generatedPrompt.trim()
      let promptLower = cleanedPrompt.toLowerCase() // Changed to let for later reassignment
      const triggerLower = triggerWord.toLowerCase().trim()
      
      // Remove common username patterns (anything with underscore or @) - MORE AGGRESSIVE
      cleanedPrompt = cleanedPrompt.replace(/\b\w+[_@]\w+\b/g, '').trim()
      // Also remove patterns like "ssandra_social" more explicitly
      cleanedPrompt = cleanedPrompt.replace(/\b[a-zA-Z]+[_@][a-zA-Z0-9_]+\b/g, '').trim()
      // Remove any word that contains underscore (likely username)
      cleanedPrompt = cleanedPrompt.replace(/\b\w*_\w*\b/g, '').trim()
      
      // Fix duplicate ethnicity/gender pattern (e.g., "White, woman, White woman")
      cleanedPrompt = cleanedPrompt.replace(/(\w+),?\s*(woman|man|person),?\s*\1\s*\2/gi, '$1 $2').trim()
      // Fix patterns like "White, woman, White woman" or "White woman, White woman"
      cleanedPrompt = cleanedPrompt.replace(/(White|Black|Asian|Latino|Hispanic|Native|Pacific|Middle Eastern),?\s*(woman|man|person),?\s*\1\s*\2/gi, '$1 $2').trim()
      
      // Remove trigger word if it appears in wrong position
      if (promptLower.includes(triggerLower) && !promptLower.startsWith(triggerLower)) {
        cleanedPrompt = cleanedPrompt.replace(new RegExp(`\\b${triggerWord}\\b`, 'gi'), '').trim()
      }
      
      // Remove any incorrect format that might be at start (username, email, etc.)
      // Split by comma and remove first part if it doesn't match trigger word
      let parts = cleanedPrompt.split(',').map(p => p.trim())
      if (parts.length > 0 && !parts[0].toLowerCase().startsWith(triggerLower)) {
        parts.shift() // Remove first part if it's not the trigger word
        cleanedPrompt = parts.join(', ').trim()
      }
      
      // Clean up double commas and spaces
      cleanedPrompt = cleanedPrompt.replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim()
      
      // Build correct format: triggerWord, ethnicity, userGender, [rest]
      // Remove any duplicate trigger word, ethnicity, or gender patterns
      parts = cleanedPrompt.split(',').map(p => p.trim()).filter(p => p.length > 0)
      
      // Remove ALL instances of trigger word, ethnicity, and gender from the middle/end
      // We'll add them back at the start in the correct format
      // Note: triggerLower already defined above, reuse it
      const ethnicityLower = ethnicity ? ethnicity.toLowerCase().trim() : ""
      const genderLower = userGender.toLowerCase().trim()
      
      const filteredParts: string[] = []
      let hasTriggerAtStart = false
      let hasEthnicity = false
      let hasGender = false
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const partLower = part.toLowerCase().trim()
        
        // Check if this is the trigger word
        if (partLower === triggerLower || partLower.startsWith(triggerLower + ",") || partLower.startsWith(triggerLower + " ")) {
          if (i === 0) {
            hasTriggerAtStart = true
            // Keep only the first occurrence at the start
            filteredParts.push(part)
          }
          // Skip all other occurrences
          continue
        }
        
        // Check if this is ethnicity
        if (ethnicityLower && (partLower === ethnicityLower || partLower.includes(ethnicityLower))) {
          if (!hasEthnicity) {
            hasEthnicity = true
            filteredParts.push(part)
          }
          // Skip duplicates
          continue
        }
        
        // Check if this is gender
        if (partLower === genderLower || partLower.includes(genderLower)) {
          if (!hasGender) {
            hasGender = true
            filteredParts.push(part)
          }
          // Skip duplicates
          continue
        }
        
        // Check for combined patterns like "White woman" that should be split
        if (ethnicityLower && genderLower && partLower.includes(ethnicityLower) && partLower.includes(genderLower)) {
          // This is a combined pattern, skip it if we already have both separately
          if (hasEthnicity && hasGender) {
            continue
          }
        }
        
        // Keep all other parts
        filteredParts.push(part)
      }
      
      cleanedPrompt = filteredParts.join(', ').trim()
      
      // Remove duplicate patterns like "White, woman, White woman" or "user42585527, White, woman, user42585527"
      cleanedPrompt = cleanedPrompt.replace(new RegExp(`\\b${triggerWord}\\b`, 'gi'), '').trim()
      cleanedPrompt = cleanedPrompt.replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim()
      
      // Remove duplicate ethnicity/gender patterns
      if (ethnicity) {
        const ethnicityPattern = new RegExp(`\\b${ethnicity}\\b`, 'gi')
        const matches = cleanedPrompt.match(ethnicityPattern)
        if (matches && matches.length > 1) {
          // Keep only the first occurrence
          let firstMatch = true
          cleanedPrompt = cleanedPrompt.replace(ethnicityPattern, (match) => {
            if (firstMatch) {
              firstMatch = false
              return match
            }
            return ''
          })
        }
      }
      
      const genderPattern = new RegExp(`\\b${userGender}\\b`, 'gi')
      const genderMatches = cleanedPrompt.match(genderPattern)
      if (genderMatches && genderMatches.length > 1) {
        // Keep only the first occurrence
        let firstMatch = true
        cleanedPrompt = cleanedPrompt.replace(genderPattern, (match) => {
          if (firstMatch) {
            firstMatch = false
            return match
          }
          return ''
        })
      }
      
      // Clean up after removals
      cleanedPrompt = cleanedPrompt.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/\s*,\s*$/, '').trim()
      
      // Build the correct start format
      const expectedStart = `${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}`
      const expectedStartLower = expectedStart.toLowerCase()
      
      // Remove the expected start from cleanedPrompt if it exists (to avoid duplication)
      if (cleanedPrompt.toLowerCase().startsWith(expectedStartLower)) {
        cleanedPrompt = cleanedPrompt.substring(expectedStart.length).trim().replace(/^,\s*/, '').trim()
      }
      
      // Always rebuild with correct format at the start
      generatedPrompt = `${expectedStart}, ${cleanedPrompt}`.trim()
      
      // Final cleanup - remove duplicate commas and spaces
      generatedPrompt = generatedPrompt.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
      
      // Final pass: Remove ALL duplicates of trigger word, ethnicity, and gender
      // Split and rebuild, ensuring each appears only once at the start
      let finalParts = generatedPrompt.split(',').map(p => p.trim()).filter(p => p.length > 0)
      
      // Track what we've seen
      const seenTrigger = new Set<string>()
      const seenEthnicity = new Set<string>()
      const seenGender = new Set<string>()
      const uniqueParts: string[] = []
      
      // First, ensure we have the correct start format
      const correctStart = `${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}`
      uniqueParts.push(triggerWord)
      seenTrigger.add(triggerLower)
      
      if (ethnicity) {
        uniqueParts.push(ethnicity)
        seenEthnicity.add(ethnicityLower)
      }
      
      uniqueParts.push(userGender)
      seenGender.add(genderLower)
      
      // Now add the rest, skipping any duplicates
      for (const part of finalParts) {
        const partLower = part.toLowerCase().trim()
        
        // Skip if it's a duplicate trigger word
        if (partLower === triggerLower || partLower.startsWith(triggerLower + ",") || partLower.startsWith(triggerLower + " ")) {
          continue
        }
        
        // Skip if it's a duplicate ethnicity
        if (ethnicityLower && (partLower === ethnicityLower || partLower.includes(ethnicityLower))) {
          continue
        }
        
        // Skip if it's a duplicate gender
        if (partLower === genderLower || partLower.includes(genderLower)) {
          continue
        }
        
        // Skip combined patterns like "White woman" if we already have both
        if (ethnicityLower && partLower.includes(ethnicityLower) && partLower.includes(genderLower)) {
          continue
        }
        
        // Keep everything else
        uniqueParts.push(part)
      }
      
      generatedPrompt = uniqueParts.join(', ').trim()
      
      // Final validation - ensure it starts correctly (reuse expectedStart from above)
      if (!generatedPrompt.toLowerCase().startsWith(expectedStartLower)) {
        // Remove the start if it's wrong and rebuild
        const rest = generatedPrompt.replace(new RegExp(`^${expectedStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), '').trim().replace(/^,\s*/, '').trim()
        generatedPrompt = `${expectedStart}, ${rest}`.trim()
      }
      
      // One final cleanup
      generatedPrompt = generatedPrompt.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
      
      // Validate and enforce quality requirements
      // Recalculate promptLower after all cleanup
      promptLower = generatedPrompt.toLowerCase()
      const missingRequirements: string[] = []
      
      // Check for iPhone
      if (!promptLower.includes('iphone 15 pro') && !promptLower.includes('amateur cellphone')) {
        missingRequirements.push('iPhone 15 Pro')
      }
      
      // Check for simple natural lighting (not dramatic/cinematic)
      if (promptLower.includes('dramatic lighting') || promptLower.includes('cinematic') || promptLower.includes('perfect lighting') || promptLower.includes('professional lighting') || promptLower.includes('editorial lighting')) {
        generatedPrompt = generatedPrompt.replace(/\b(dramatic|cinematic|perfect|professional|editorial)\s+lighting\b/gi, 'uneven natural lighting')
        promptLower = generatedPrompt.toLowerCase() // Recalculate after lighting fix
      }
      
      // Check for simple natural lighting description
      const hasSimpleLighting = promptLower.match(/\b(soft|natural|warm|overcast)\s+(afternoon|morning|window|golden hour|daylight)\s*(light|lighting)?/i) ||
                                 promptLower.includes('natural window light') ||
                                 promptLower.includes('uneven natural lighting') ||
                                 promptLower.includes('mixed color temperatures') ||
                                 promptLower.includes('overcast daylight')
      
      if (!hasSimpleLighting) {
        missingRequirements.push('simple natural lighting')
      }
      
      // Check for and replace generic/banned terms
      const genericTerms = [
        // Outfit terms
        { pattern: /\bcasual\s+trendy\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\bstylish\s+(business\s+)?casual\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\bbusiness\s+casual\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\bstylish\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\btrendy\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\bprofessional\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\bwearing\s+(casual\s+)?(trendy|stylish)\s+outfit\b/gi, replacement: 'wearing specific outfit with material and color details' },
        { pattern: /\bwearing\s+stylish\s+outfit\b/gi, replacement: 'wearing specific outfit with material and color details' },
        // Location terms
        { pattern: /\bminimal\s+background\b/gi, replacement: 'specific location with detailed description' },
        { pattern: /\bminimalist\s+background\b/gi, replacement: 'specific location with detailed description' },
        { pattern: /\bclean\s+background\b/gi, replacement: 'specific location with detailed description' },
        { pattern: /\bsimple\s+background\b/gi, replacement: 'specific location with detailed description' },
        { pattern: /\burban\s+background\b/gi, replacement: 'specific urban location with detailed description' },
        { pattern: /\burban\s+setting\b/gi, replacement: 'specific urban location with detailed description' },
        { pattern: /\bcity\s+backdrop\b/gi, replacement: 'specific urban location with detailed description' },
        { pattern: /\bclean\s+lines\b/gi, replacement: 'specific architectural details' },
        // Lighting terms
        { pattern: /\bsoft\s+natural\s+lighting\b/gi, replacement: 'natural lighting with uneven illumination and mixed color temperatures' },
        { pattern: /\bperfect\s+lighting\b/gi, replacement: 'uneven lighting with mixed color temperatures' },
        { pattern: /\bclean\s+lighting\b/gi, replacement: 'uneven lighting with mixed color temperatures' },
        { pattern: /\bprofessional\s+lighting\b/gi, replacement: 'uneven lighting with mixed color temperatures' },
        { pattern: /\beven\s+lighting\b/gi, replacement: 'uneven lighting with mixed color temperatures' },
        { pattern: /\bdynamic\s+lighting\b/gi, replacement: 'uneven lighting with mixed color temperatures' },
        // Expression/pose terms
        { pattern: /\bempowering\b/gi, replacement: 'confident' },
        { pattern: /\binspiring\b/gi, replacement: 'natural' },
        { pattern: /\bmotivational\b/gi, replacement: 'authentic' },
        // Aesthetic terms
        { pattern: /\bedgy\s*[-]?\s*minimalist\s+(aesthetic|composition)\b/gi, replacement: 'natural composition with authentic details' },
        { pattern: /\bemphasizing\s+expertise\s+and\s+success\b/gi, replacement: 'natural authentic moment' },
      ]
      
      let hasGenericTerms = false
      genericTerms.forEach(({ pattern, replacement }) => {
        if (pattern.test(generatedPrompt)) {
          generatedPrompt = generatedPrompt.replace(pattern, replacement)
          hasGenericTerms = true
          console.log(`[v0] [FEED-PROMPT] ⚠️ Replaced generic term with: ${replacement}`)
        }
      })
      
      if (hasGenericTerms) {
        promptLower = generatedPrompt.toLowerCase() // Recalculate after replacements
      }
      
      // Final check: If prompt still has generic terms after replacement, do a second pass
      let needsSecondPass = false
      const secondPassPatterns = [
        { pattern: /\bcasual\s+trendy\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\bminimal\s+background\b/gi, replacement: 'specific location with detailed description' },
        { pattern: /\bminimalist\s+background\b/gi, replacement: 'specific location with detailed description' },
        { pattern: /\bclean\s+background\b/gi, replacement: 'specific location with detailed description' },
        { pattern: /\bsimple\s+background\b/gi, replacement: 'specific location with detailed description' },
        { pattern: /\bplain\s+background\b/gi, replacement: 'specific location with detailed description' },
      ]
      
      secondPassPatterns.forEach(({ pattern, replacement }) => {
        if (pattern.test(generatedPrompt)) {
          generatedPrompt = generatedPrompt.replace(pattern, replacement)
          needsSecondPass = true
          console.log(`[v0] [FEED-PROMPT] ⚠️ Second pass: Replaced "${pattern.source}" with: ${replacement}`)
        }
      })
      
      if (needsSecondPass) {
        promptLower = generatedPrompt.toLowerCase() // Recalculate after second pass
      }
      
      // Final validation: Check if prompt still has generic terms
      const stillHasGenericOutfit = promptLower.match(/\b(casual|trendy|stylish|business|professional)\s+(outfit|clothing|wear)\b/i)
      const stillHasGenericLocation = promptLower.match(/\b(minimal|clean|simple|plain|basic)\s+(background|setting|location)\b/i)
      
      if (stillHasGenericOutfit || stillHasGenericLocation) {
        console.error(`[v0] [FEED-PROMPT] ❌ CRITICAL: Prompt STILL contains generic terms after all replacements!`)
        console.error(`[v0] [FEED-PROMPT] Generic outfit: ${stillHasGenericOutfit ? stillHasGenericOutfit[0] : 'none'}`)
        console.error(`[v0] [FEED-PROMPT] Generic location: ${stillHasGenericLocation ? stillHasGenericLocation[0] : 'none'}`)
        console.error(`[v0] [FEED-PROMPT] Full prompt: ${generatedPrompt}`)
        console.error(`[v0] [FEED-PROMPT] This prompt will produce generic-looking images. The AI did not follow instructions.`)
      }
      
      // Check word count
      const wordCount = generatedPrompt.split(/\s+/).length
      if (wordCount < 80) {
        missingRequirements.push(`length (currently ${wordCount} words, need 100-150)`)
      } else if (wordCount > 160) {
        console.log(`[v0] [FEED-PROMPT] ⚠️ Prompt is ${wordCount} words (target: 100-150) - may lose focus on character features`)
      }
      
      if (missingRequirements.length > 0) {
        console.warn(`[v0] [FEED-PROMPT] ⚠️ Missing requirements: ${missingRequirements.join(', ')}`)
        // Don't fail, but log the warning
      }
      
      // Auto-add missing critical requirements if needed
      // Recalculate promptLower since generatedPrompt may have been modified (e.g., line 519)
      promptLower = generatedPrompt.toLowerCase()
      const additions: string[] = []
      
      // Add basic iPhone specs if missing (most critical)
      if (!promptLower.includes('iphone 15 pro') && !promptLower.includes('iphone') && !promptLower.includes('amateur cellphone')) {
        additions.push('shot on iPhone 15 Pro portrait mode, shallow depth of field')
      } else if (promptLower.includes('iphone') && !promptLower.includes('portrait mode') && !promptLower.includes('bokeh')) {
        // Ensure basic iPhone spec is complete
        if (!promptLower.includes('portrait mode')) {
          additions.push('portrait mode, shallow depth of field')
        }
      }
      
      // Add simple natural lighting if missing
      if (!hasSimpleLighting) {
        additions.push('uneven natural lighting')
      }
      
      // Add missing requirements naturally into the prompt
      if (additions.length > 0) {
        // Find a good place to add them (after location/lighting, before end)
        const insertPoint = generatedPrompt.lastIndexOf(',')
        if (insertPoint > 0) {
          generatedPrompt = generatedPrompt.substring(0, insertPoint + 1) + ' ' + additions.join(', ') + generatedPrompt.substring(insertPoint + 1)
        } else {
          generatedPrompt = generatedPrompt + ', ' + additions.join(', ')
        }
        console.log(`[v0] [FEED-PROMPT] ✅ Added missing requirements: ${additions.join(', ')}`)
      }
      
      // Fix problematic poses that cause extra limbs
      if (/\blegs\s+tucked\s+under\b/i.test(generatedPrompt)) {
        generatedPrompt = generatedPrompt.replace(/\blegs\s+tucked\s+under\b/gi, "sitting with legs crossed")
        console.log(`[v0] [FEED-PROMPT] ⚠️ Replaced "legs tucked under" with "sitting with legs crossed" to prevent extra limbs`)
      }
      if (/\bcurled\s+up\b/i.test(generatedPrompt)) {
        generatedPrompt = generatedPrompt.replace(/\bcurled\s+up\b/gi, "lounging comfortably")
        console.log(`[v0] [FEED-PROMPT] ⚠️ Replaced "curled up" with "lounging comfortably" to prevent extra limbs`)
      }
      if (/\bknees\s+to\s+chest\b/i.test(generatedPrompt)) {
        generatedPrompt = generatedPrompt.replace(/\bknees\s+to\s+chest\b/gi, "sitting with one knee up")
        console.log(`[v0] [FEED-PROMPT] ⚠️ Replaced "knees to chest" with "sitting with one knee up" to prevent extra limbs`)
      }
      if (/\blegs\s+folded\s+under\b/i.test(generatedPrompt)) {
        generatedPrompt = generatedPrompt.replace(/\blegs\s+folded\s+under\b/gi, "sitting with legs crossed")
        console.log(`[v0] [FEED-PROMPT] ⚠️ Replaced "legs folded under" with "sitting with legs crossed" to prevent extra limbs`)
      }
      
      // Final cleanup
      generatedPrompt = generatedPrompt.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
      
      // Re-check word count after additions
      const finalWordCount = generatedPrompt.split(/\s+/).length
      
      console.log("[v0] [FEED-PROMPT] Final prompt (with trigger word):", generatedPrompt.substring(0, 150) + "...")
      console.log("[v0] [FEED-PROMPT] Trigger word verification:", generatedPrompt.toLowerCase().startsWith(triggerLower) ? "✅ CORRECT" : "❌ MISSING")
      console.log("[v0] [FEED-PROMPT] Word count:", finalWordCount, finalWordCount >= 100 && finalWordCount <= 150 ? "✅" : "⚠️")
      console.log("[v0] [FEED-PROMPT] Expected start:", expectedStart)
      console.log("[v0] [FEED-PROMPT] Actual start:", generatedPrompt.substring(0, Math.min(expectedStart.length + 20, generatedPrompt.length)))
    }

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

/**
 * Generate prompt with locked aesthetic (feed planner background mode)
 * 
 * This function is used when generating individual images for paid blueprint users.
 * It maintains the exact aesthetic from the preview template while varying pose/angle/composition.
 */
async function generateWithLockedAesthetic(params: {
  lockedAesthetic: LockedAesthetic
  referencePrompt: string | null | undefined
  position: number | null | undefined
  postType: string | null | undefined
  proMode: boolean
}): Promise<NextResponse> {
  const { lockedAesthetic, referencePrompt, position, postType, proMode } = params
  
  console.log("[v0] [FEED-PROMPT] [LOCKED-AESTHETIC] Generating with locked aesthetic:", lockedAesthetic)
  console.log("[v0] [FEED-PROMPT] [LOCKED-AESTHETIC] Position:", position, "Post Type:", postType, "Pro Mode:", proMode)
  
  // For Pro Mode (NanoBanana Pro), generate ONLY creative variation, then assemble three-part prompt
  if (proMode) {
    return await generateNanoBananaProPrompt({
      lockedAesthetic,
      position,
      postType,
    })
  }
  
  // For Classic Mode (FLUX LoRA), use existing logic
  const systemPrompt = `You are a professional photographer's AI assistant generating prompts for a cohesive Instagram feed.

## CRITICAL: LOCKED AESTHETIC ELEMENTS

The user has already seen and approved a preview with this exact aesthetic. You MUST maintain these elements EXACTLY:

- **Vibe/Mood:** ${lockedAesthetic.vibe}
- **Color Grade:** ${lockedAesthetic.colorGrade}
- **Setting/Location:** ${lockedAesthetic.setting}
- **Outfit/Wardrobe:** ${lockedAesthetic.outfit}
- **Lighting Quality:** ${lockedAesthetic.lightingQuality}

These are FIXED and CANNOT be changed or modified in any way.

## VARIABLE ELEMENTS (You CAN change):

- Camera angle (eye-level, low, high, over shoulder, etc.)
- Composition (rule of thirds, centered, etc.)
- Pose (standing, sitting, leaning, gesturing, etc.)
- Framing (full body, waist up, close-up, detail, etc.)
- Camera distance (wide, medium, close-up)
- Subject positioning

## YOUR TASK:

Generate a prompt for position ${position || 'N/A'} in the grid (${postType || 'portrait'} shot).

Think: "Same photoshoot, same person, same place, same outfit, same lighting - just a different shot angle/pose."

## CLASSIC MODE (FLUX LoRA):
- Start with trigger word format
- Use FLUX prompting principles
- Authentic iPhone style

Output ONLY the prompt text, nothing else.`

  const userPrompt = `Generate prompt for position ${position || 'N/A'}, type: ${postType || 'portrait'}.

Remember: EXACT same vibe, colors, setting, outfit, lighting. ONLY vary the pose/angle/composition.`

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    
    const generatedPrompt = completion.content[0].type === 'text' 
      ? completion.content[0].text.trim()
      : ''
    
    // Clean up any markdown or formatting
    const cleanedPrompt = generatedPrompt
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/__/g, '')
      .replace(/_/g, '')
      .replace(/^.*?PROMPT\s*:?\s*/i, '')
      .replace(/^[:;\-\s]+/, '')
      .trim()
    
    console.log("[v0] [FEED-PROMPT] [LOCKED-AESTHETIC] Generated prompt:", cleanedPrompt.substring(0, 200))
    console.log("[v0] [FEED-PROMPT] [LOCKED-AESTHETIC] Locked aesthetic maintained:", {
      hasVibe: cleanedPrompt.toLowerCase().includes(lockedAesthetic.vibe.toLowerCase().split(' ')[0]),
      hasSetting: cleanedPrompt.toLowerCase().includes(lockedAesthetic.setting.toLowerCase().split(',')[0]),
      hasOutfit: cleanedPrompt.toLowerCase().includes(lockedAesthetic.outfit.toLowerCase().split(',')[0]),
    })
    
    return NextResponse.json({
      success: true,
      prompt: cleanedPrompt,
      postType: postType || 'portrait',
    })
  } catch (error) {
    console.error("[v0] [FEED-PROMPT] [LOCKED-AESTHETIC] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate prompt with locked aesthetic",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * Generate NanoBanana Pro prompt with three-part structure:
 * 1. Base identity preservation (FIXED)
 * 2. Maya's creative variation (pose, angle, composition)
 * 3. Technical assembly/quality modifiers (from template)
 */
async function generateNanoBananaProPrompt(params: {
  lockedAesthetic: LockedAesthetic
  position: number | null | undefined
  postType: string | null | undefined
}): Promise<NextResponse> {
  const { lockedAesthetic, position, postType } = params
  
  console.log("[v0] [FEED-PROMPT] [NANOBANANA-PRO] Generating creative variation only...")
  
  // Maya generates ONLY the creative variation (pose, angle, composition)
  const systemPrompt = `You are generating ONLY the creative variation section of a photo prompt for NanoBanana Pro.

## YOUR JOB

Generate ONLY the pose, angle, composition, and framing description.

DO NOT include:
- Subject description ("a woman in...", "a person wearing...")
- Quality keywords ("professional photography...", "8k...", "high detail...")
- Assembly modifiers ("Assembly: luxury_minimal...")
- Identity preservation text (that's added separately)

## LOCKED AESTHETIC (Use in your variation)

Your variation must match this aesthetic:
- Setting: ${lockedAesthetic.setting}
- Outfit: ${lockedAesthetic.outfit}
- Lighting: ${lockedAesthetic.lightingQuality}
- Vibe: ${lockedAesthetic.vibe}
- Color Grade: ${lockedAesthetic.colorGrade}

## OUTPUT FORMAT

Generate a short description (1-2 sentences) of:
- Pose (standing, sitting, leaning, walking, etc.)
- Camera angle (eye level, low angle, high angle, over shoulder, etc.)
- Composition (centered, off-center, rule of thirds, etc.)
- Framing (full body, 3/4 body, waist up, close-up, detail, etc.)
- Gesture/action (hands position, gaze direction, etc.)
- Subject positioning (foreground, against wall, in doorway, etc.)

## EXAMPLE OUTPUT

Good: "Standing against marble wall with one hand touching the surface, captured from a low angle looking up, off-center composition with subject on left third, waist-up framing, gazing thoughtfully into the distance"

Bad: "A woman in a camel coat stands..." (NO! Don't describe the person)
Bad: "Professional photography, 8k" (NO! That's added separately)
Bad: "Assembly: luxury_minimal" (NO! That's added separately)

Output ONLY the creative variation. Nothing else.`

  const userPrompt = `Generate creative variation for position ${position || 'N/A'}, type: ${postType || 'portrait'}.

Remember: Setting is ${lockedAesthetic.setting}, outfit is ${lockedAesthetic.outfit}, lighting is ${lockedAesthetic.lightingQuality}.

Generate creative variation ONLY (pose, angle, composition, framing).`

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150, // Shorter since we only want variation
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    
    const mayaVariation = completion.content[0].type === 'text' 
      ? completion.content[0].text.trim()
      : ''
    
    // Clean up any markdown or formatting
    const cleanedVariation = mayaVariation
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/__/g, '')
      .replace(/_/g, '')
      .replace(/^.*?VARIATION\s*:?\s*/i, '')
      .replace(/^[:;\-\s]+/, '')
      .trim()
    
    console.log("[v0] [FEED-PROMPT] [NANOBANANA-PRO] Maya variation:", cleanedVariation)
    
    // Assemble the complete NanoBanana Pro prompt (three-part structure)
    const finalPrompt = assembleNanoBananaPrompt({
      baseIdentity: lockedAesthetic.baseIdentityPrompt,
      variation: cleanedVariation,
      setting: lockedAesthetic.setting,
      outfit: lockedAesthetic.outfit,
      lighting: lockedAesthetic.lightingQuality,
      colorGrade: lockedAesthetic.colorGrade,
      assembly: lockedAesthetic.assembly,
      quality: lockedAesthetic.qualityModifiers,
    })
    
    console.log("[v0] [FEED-PROMPT] [NANOBANANA-PRO] Final assembled prompt:", finalPrompt.substring(0, 300))
    
    // Enhanced validation logging for three-part prompt structure
    console.log("=== NANOBANANA PRO PROMPT STRUCTURE VALIDATION ===")
    
    // Validate Part 1: Base Identity
    const hasBaseIdentity = lockedAesthetic.baseIdentityPrompt && lockedAesthetic.baseIdentityPrompt.length > 0
    console.log("[1] BASE IDENTITY:", hasBaseIdentity ? "✅ PRESENT" : "❌ MISSING")
    if (hasBaseIdentity) {
      console.log("    Content:", lockedAesthetic.baseIdentityPrompt.substring(0, 100) + "...")
    }
    
    // Validate Part 2: Creative Variation
    const hasVariation = cleanedVariation && cleanedVariation.length > 0
    console.log("[2] MAYA VARIATION:", hasVariation ? "✅ PRESENT" : "❌ MISSING")
    if (hasVariation) {
      console.log("    Content:", cleanedVariation.substring(0, 100) + (cleanedVariation.length > 100 ? "..." : ""))
      console.log("    Length:", cleanedVariation.length, "characters")
    }
    
    // Validate Part 3: Technical Assembly
    const hasAssembly = lockedAesthetic.assembly && lockedAesthetic.assembly.length > 0
    const hasQuality = lockedAesthetic.qualityModifiers && lockedAesthetic.qualityModifiers.length > 0
    console.log("[3] TECHNICAL ASSEMBLY:")
    console.log("    Assembly:", hasAssembly ? "✅ PRESENT" : "❌ MISSING", hasAssembly ? `(${lockedAesthetic.assembly})` : "")
    console.log("    Quality Modifiers:", hasQuality ? "✅ PRESENT" : "❌ MISSING", hasQuality ? `(${lockedAesthetic.qualityModifiers.substring(0, 50)}...)` : "")
    
    // Overall validation
    const isValid = hasBaseIdentity && hasVariation && hasAssembly && hasQuality
    console.log()
    console.log("[VALIDATION] Three-part structure:", isValid ? "✅ VALID" : "❌ INVALID")
    if (!isValid) {
      console.warn("[VALIDATION] ⚠️ Missing required parts:")
      if (!hasBaseIdentity) console.warn("  - Base Identity Prompt")
      if (!hasVariation) console.warn("  - Creative Variation")
      if (!hasAssembly) console.warn("  - Assembly")
      if (!hasQuality) console.warn("  - Quality Modifiers")
    }
    
    console.log()
    console.log("[FINAL] COMPLETE PROMPT:")
    console.log(finalPrompt)
    console.log("=".repeat(50))
    
    return NextResponse.json({
      success: true,
      prompt: finalPrompt,
      postType: postType || 'portrait',
    })
  } catch (error) {
    console.error("[v0] [FEED-PROMPT] [NANOBANANA-PRO] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate NanoBanana Pro prompt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * Assemble the complete NanoBanana Pro prompt from parts
 * Three-part structure:
 * 1. Base identity preservation (FIXED)
 * 2. Creative variation + aesthetic context
 * 3. Technical assembly/quality modifiers
 */
function assembleNanoBananaPrompt(parts: {
  baseIdentity: string
  variation: string
  setting: string
  outfit: string
  lighting: string
  colorGrade: string
  assembly: string
  quality: string
}): string {
  // Three-part structure for NanoBanana Pro
  return `${parts.baseIdentity}

${parts.variation}, in ${parts.setting}, wearing ${parts.outfit}, ${parts.lighting}, ${parts.colorGrade}.

Assembly: ${parts.assembly}
${parts.quality}`
}
