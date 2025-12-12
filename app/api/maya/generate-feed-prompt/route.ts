import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { streamText } from "ai"
import { getMayaPersonality } from "@/lib/maya/personality-enhanced"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"

const sql = neon(process.env.DATABASE_URL || "")

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postType, caption, feedPosition, colorTheme, brandVibe, referencePrompt, isRegeneration, category } = body

    console.log("[v0] [FEED-PROMPT] Starting prompt generation for:", {
      postType,
      caption: caption?.substring(0, 50),
      feedPosition,
      colorTheme,
      brandVibe,
      hasReferencePrompt: !!referencePrompt,
      referencePromptPreview: referencePrompt?.substring(0, 100),
    })

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

    // Get user's trigger word, gender, ethnicity, and physical preferences (same as concept cards)
    const userDataResult = await sql`
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
      console.error("[v0] [FEED-PROMPT] No trained model found for user:", neonUser.id)
      return NextResponse.json({ error: "No trained model found" }, { status: 400 })
    }

    const userData = userDataResult[0]
    const triggerWord = userData.trigger_word || `user${neonUser.id}`
    const gender = userData.gender
    const ethnicity = userData.ethnicity
    const physicalPreferences = userData.physical_preferences
    
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
      const parts = cleanedReferencePrompt.split(',').map(p => p.trim()).filter(p => p.length > 0)
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

    // Build Maya's system prompt for feed post generation
    const mayaPersonality = getMayaPersonality()
    const fluxPrinciples = getFluxPromptingPrinciples()

    const systemPrompt = `${mayaPersonality}

${userContext}

${fluxPrinciples}

=== YOUR TASK: GENERATE INSTAGRAM FEED POST PROMPT ===

You are Maya, an elite AI Fashion Stylist generating a FLUX prompt for an Instagram feed post. This is NOT a concept card - this is for the user's actual Instagram feed that will be published.

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

TRIGGER WORD: "${triggerWord}"
GENDER: "${userGender}"
${ethnicity ? `ETHNICITY: "${ethnicity}" (MUST include in prompt for accurate representation)` : ""}
${
  physicalPreferences
    ? `
🔴 PHYSICAL PREFERENCES (MANDATORY - APPLY TO EVERY PROMPT):
"${physicalPreferences}"

CRITICAL INSTRUCTIONS:
- These are USER-REQUESTED appearance modifications that MUST be in EVERY prompt
- **IMPORTANT:** Convert instruction language to descriptive language for FLUX, but PRESERVE USER INTENT
- **REMOVE INSTRUCTION PHRASES:** "Always keep my", "dont change", "keep my", "don't change my", "preserve my", "maintain my" - these are instructions, not prompt text
- **CONVERT TO DESCRIPTIVE:** Convert to descriptive appearance features while preserving intent
- Include them RIGHT AFTER the gender/ethnicity descriptor as DESCRIPTIVE features, not instructions
`
    : ""
}

**🔴 MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):**

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

2. **iPhone 15 Pro (MANDATORY):** MUST include "shot on iPhone 15 Pro" OR "amateur cellphone photo"

3. **Natural Imperfections (MANDATORY - AT LEAST 3):** MUST include AT LEAST 3 of: "visible sensor noise", "slight motion blur from handheld", "uneven lighting", "mixed color temperatures", "handheld feel", "natural camera imperfections"

4. **Natural Skin Texture (MANDATORY):** MUST include "natural skin texture with pores visible"

5. **Film Grain (MANDATORY):** MUST include one: "visible film grain", "fine film grain texture", "grainy texture", or "subtle grain visible"

6. **Muted Colors (MANDATORY):** MUST include one: "muted color palette", "soft muted tones", "desaturated realistic colors", or "vintage color temperature"

7. **Lighting with Imperfections (MANDATORY):** MUST include "uneven lighting", "mixed color temperatures", or "slight uneven illumination"

8. **Casual Moment Language (RECOMMENDED):** Include "candid moment", "looks like a real phone camera photo", or "amateur cellphone quality"

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**

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
2. **OUTFIT** (material + color + garment type - 6-10 words)
3. **POSE + EXPRESSION** (simple, natural - 4-6 words)
4. **LOCATION** (brief, atmospheric - 3-6 words)
5. **LIGHTING** (with imperfections - 5-8 words)
6. **TECHNICAL SPECS** (iPhone + imperfections + skin texture + grain + muted colors - 8-12 words)
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

**NO BANNED WORDS:** Never use "stunning", "perfect", "beautiful", "high quality", "8K", "professional photography", "DSLR", "cinematic", "studio lighting", "even lighting", "perfect lighting", "smooth skin", "flawless skin", "airbrushed", "dramatic lighting", "professional yet approachable" - these create AI-looking/plastic results.

**🔴 CRITICAL: PROMPT QUALITY CHECKLIST - EVERY PROMPT MUST HAVE:**
1. ✅ Trigger word + ethnicity + gender (no duplicates, format: "${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}")
2. ✅ Specific outfit description (material + color + garment type - NOT "trendy outfit")
3. ✅ iPhone 15 Pro specification
4. ✅ At least 3 natural imperfections
5. ✅ Natural skin texture with pores
6. ✅ Film grain
7. ✅ Muted/desaturated colors
8. ✅ Uneven/mixed lighting (NOT "dramatic" or "even")
9. ✅ Total length: 50-80 words

**Total target: 50-80 words for optimal quality and detail**

Now generate the FLUX prompt for this ${postType} feed post.

${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? `
⚠️ **CRITICAL REMINDER:** This is a ${postType} post - DO NOT include the user, trigger word, or any person in the prompt. Focus only on objects, products, flatlays, or scenery.
` : `
**CRITICAL: Use YOUR fashion expertise to create detailed, specific styling.**
- Generate a 50-80 word prompt that includes ALL requirements above
- Start with: "${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}" (do NOT duplicate like "White, woman, White woman")
- Include SPECIFIC outfit details (material + color + garment), NOT generic "trendy outfit" or "stylish business casual outfit"
- Include SPECIFIC location details, NOT generic "urban background" or "urban setting"
- Include "shot on iPhone 15 Pro"
- Include natural imperfections, skin texture, film grain, muted colors, uneven lighting
- Make it feel like a real iPhone photo, not a professional shoot

**🔴 EXAMPLE OF WHAT YOU MUST CREATE:**
"${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}, in sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers, standing with hand on marble bar counter, looking over shoulder naturally, upscale restaurant with marble surfaces and floor-to-ceiling windows, bright natural light with clean illumination, subtle directional shadows, uneven ambient light, shot on iPhone 15 Pro, natural bokeh, slight lens distortion, visible sensor noise, natural skin texture with visible peach fuzz, organic skin texture, film grain, muted tones"

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
    console.log("[v0] [FEED-PROMPT] Generated prompt preview:", generatedPrompt.substring(0, 200))

    // CRITICAL: Handle object/flatlay/scenery posts differently (no user/trigger word)
    const isNonUserPost = postType?.toLowerCase().includes('object') || 
                          postType?.toLowerCase().includes('flatlay') || 
                          postType?.toLowerCase().includes('scenery') || 
                          postType?.toLowerCase().includes('place')
    
    if (isNonUserPost) {
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
      
      // Check for natural imperfections (at least 3)
      const imperfectionCount = [
        'sensor noise',
        'motion blur',
        'uneven lighting',
        'mixed color temperatures',
        'handheld',
        'natural camera imperfections'
      ].filter(term => promptLower.includes(term)).length
      
      if (imperfectionCount < 3) {
        missingRequirements.push(`${3 - imperfectionCount} more natural imperfections`)
      }
      
      // Check for skin texture
      if (!promptLower.includes('natural skin texture') && !promptLower.includes('pores visible')) {
        missingRequirements.push('natural skin texture')
      }
      
      // Check for film grain
      if (!promptLower.includes('film grain') && !promptLower.includes('grainy')) {
        missingRequirements.push('film grain')
      }
      
      // Check for muted colors
      if (!promptLower.includes('muted') && !promptLower.includes('desaturated')) {
        missingRequirements.push('muted/desaturated colors')
      }
      
      // Check for uneven lighting (not dramatic/even)
      if (promptLower.includes('dramatic lighting') || promptLower.includes('even lighting') || promptLower.includes('perfect lighting')) {
        generatedPrompt = generatedPrompt.replace(/\b(dramatic|even|perfect)\s+lighting\b/gi, 'uneven lighting')
        promptLower = generatedPrompt.toLowerCase() // Recalculate after lighting fix
      }
      if (!promptLower.includes('uneven lighting') && !promptLower.includes('mixed color temperatures')) {
        missingRequirements.push('uneven/mixed lighting')
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
      if (wordCount < 50) {
        missingRequirements.push(`length (currently ${wordCount} words, need 50-80)`)
      }
      
      if (missingRequirements.length > 0) {
        console.warn(`[v0] [FEED-PROMPT] ⚠️ Missing requirements: ${missingRequirements.join(', ')}`)
        // Don't fail, but log the warning
      }
      
      // Auto-add missing critical requirements if needed
      // Recalculate promptLower since generatedPrompt may have been modified (e.g., line 519)
      promptLower = generatedPrompt.toLowerCase()
      const additions: string[] = []
      
      // Add iPhone 15 Pro if missing (most critical)
      if (!promptLower.includes('iphone 15 pro') && !promptLower.includes('amateur cellphone')) {
        additions.push('shot on iPhone 15 Pro')
      }
      
      // Add natural imperfections if missing (need at least 3)
      const currentImperfections = [
        'sensor noise',
        'motion blur',
        'uneven lighting',
        'mixed color temperatures',
        'handheld',
        'natural camera imperfections'
      ].filter(term => promptLower.includes(term)).length
      
      if (currentImperfections < 3) {
        if (!promptLower.includes('sensor noise')) additions.push('visible sensor noise')
        if (!promptLower.includes('motion blur') && currentImperfections < 2) additions.push('slight motion blur')
        if (!promptLower.includes('handheld') && currentImperfections < 2) additions.push('handheld feel')
      }
      
      // Add skin texture if missing
      if (!promptLower.includes('natural skin texture') && !promptLower.includes('pores visible')) {
        additions.push('natural skin texture with pores visible')
      }
      
      // Add film grain if missing
      if (!promptLower.includes('film grain') && !promptLower.includes('grainy')) {
        additions.push('visible film grain')
      }
      
      // Add muted colors if missing
      if (!promptLower.includes('muted') && !promptLower.includes('desaturated')) {
        additions.push('muted color palette')
      }
      
      // Fix lighting if it's "dramatic" or "even"
      if (promptLower.includes('dramatic lighting') || promptLower.includes('even lighting') || promptLower.includes('perfect lighting')) {
        generatedPrompt = generatedPrompt.replace(/\b(dramatic|even|perfect)\s+lighting\b/gi, 'uneven lighting with mixed color temperatures')
        // Update promptLower again after this modification
        promptLower = generatedPrompt.toLowerCase() // Recalculate after lighting fix
      } else if (!promptLower.includes('uneven lighting') && !promptLower.includes('mixed color temperatures')) {
        // Try to add near existing lighting mention
        const lightingMatch = generatedPrompt.match(/\b(lighting|illumination|lit)\b/i)
        if (lightingMatch) {
          const idx = lightingMatch.index || 0
          generatedPrompt = generatedPrompt.substring(0, idx) + 'uneven lighting, ' + generatedPrompt.substring(idx)
        } else {
          additions.push('uneven lighting with mixed color temperatures')
        }
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
      
      // Final cleanup
      generatedPrompt = generatedPrompt.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
      
      // Re-check word count after additions
      const finalWordCount = generatedPrompt.split(/\s+/).length
      
      console.log("[v0] [FEED-PROMPT] Final prompt (with trigger word):", generatedPrompt.substring(0, 150) + "...")
      console.log("[v0] [FEED-PROMPT] Trigger word verification:", generatedPrompt.toLowerCase().startsWith(triggerLower) ? "✅ CORRECT" : "❌ MISSING")
      console.log("[v0] [FEED-PROMPT] Word count:", finalWordCount, finalWordCount >= 50 && finalWordCount <= 80 ? "✅" : "⚠️")
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
