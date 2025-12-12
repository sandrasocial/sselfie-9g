import { generateText } from "ai"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getMayaPersonality } from "@/lib/maya/personality-enhanced"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"

interface VisualDirectionParams {
  postPosition: number
  shotType: string
  purpose: string
  visualDirection: string
  brandVibe: string
  authUserId: string // Added to get full user context
  triggerWord?: string
}

export interface VisualComposition {
  shotSetup: {
    type: string
    angle: string
    distance: string
    framing: string
  }
  subjectDirection: {
    pose: string
    hands: string
    face: string
    movement: string
  }
  settingMood: {
    location: string
    lighting: string
    props: string[]
    colors: string[]
  }
  styling: {
    outfit: string
    hair: string
    accessories: string[]
    aesthetic: string
  }
  emotionalTone: string
  fluxPrompt: string
}

export async function generateVisualComposition(params: VisualDirectionParams): Promise<VisualComposition> {
  const { postPosition, shotType, purpose, visualDirection, brandVibe, authUserId, triggerWord } = params

  console.log(`[v0] Maya: Creating Flux prompt for post ${postPosition} (${shotType})`)

  // Get user data for proper prompt format (same as concept cards)
  const { neon } = await import("@neondatabase/serverless")
  const sql = neon(process.env.DATABASE_URL!)
  const { getUserByAuthId } = await import("@/lib/user-mapping")
  
  const user = await getUserByAuthId(authUserId)
  if (!user) {
    throw new Error("User not found")
  }

  const userDataResult = await sql`
    SELECT u.gender, u.ethnicity, um.trigger_word, upb.physical_preferences
    FROM users u
    LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
    LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
    WHERE u.id = ${user.id} 
    LIMIT 1
  `

  let userGender = "person"
  if (userDataResult[0]?.gender) {
    const dbGender = userDataResult[0].gender.toLowerCase().trim()
    if (dbGender === "woman" || dbGender === "female") {
      userGender = "woman"
    } else if (dbGender === "man" || dbGender === "male") {
      userGender = "man"
    }
  }

  const userEthnicity = userDataResult[0]?.ethnicity || null
  const physicalPreferences = userDataResult[0]?.physical_preferences || null
  const actualTriggerWord = userDataResult[0]?.trigger_word || triggerWord || `user${user.id}`

  // Check if this is a non-user post (object/flatlay/scenery)
  const isNonUserPost = shotType === "object" || shotType === "flatlay" || shotType === "scenery" || shotType === "place"

  const userContext = await getUserContextForMaya(authUserId)
  const mayaPersonality = getMayaPersonality()
  const fluxPrinciples = getFluxPromptingPrinciples()

  const systemPrompt = `${mayaPersonality}

${userContext}

${fluxPrinciples}

=== FEED PLANNER MODE ===

You're creating Flux prompts for a 9-post Instagram feed. This requires visual COHESION across all images.

Key differences from concept cards:
- Concept cards = maximize diversity (different outfits, locations, vibes)
- Feed posts = visual harmony (cohesive colors, consistent lighting, unified aesthetic)

Your prompts should create images that look like they belong in the same professional photoshoot or brand campaign.

COHESION REQUIREMENTS:
1. Use the user's brand colors consistently across all 9 posts (from their brand profile above)
2. Maintain similar lighting style (if post 1 is golden hour, others should be too)
3. Keep aesthetic mood unified (same level of sophistication, similar color grading)
4. Create complementary visuals that enhance each other

${!isNonUserPost && actualTriggerWord ? `⚠️ CRITICAL: For USER posts, always start Flux prompts with: "${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}"` : ""}
${isNonUserPost ? `
=== 🔴 OBJECT/FLATLAY/SCENERY POST REQUIREMENTS ===

⚠️ CRITICAL: This is an ${shotType} post - DO NOT include user, trigger word, or person. Focus only on objects/products/scenery.

Follow the same mandatory requirements as user posts (iPhone, imperfections, film grain, muted colors) but describe specific items, composition, and surface instead of person/outfit.
` : ""}

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
- Format: "${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}, [converted physical preferences - descriptive only, no instructions], [rest of prompt]"
- Examples of CORRECT conversion:
  - "Always keep my natural features, dont change the face" → Omit instruction (face is preserved by trigger word), but keep any specific feature descriptions
  - "keep my natural hair color" → "natural hair color" OR actual color if specified (preserves intent, don't just omit)
  - "curvier body type" → "curvier body type" (descriptive, keep as-is)
  - "long blonde hair" → "long blonde hair" (descriptive, keep as-is)
- **PRESERVE USER INTENT:** Don't just remove everything - convert instructions to descriptive language that preserves what the user wants
`
    : ""
}

**🔴 MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):**

1. **Start with:** "${actualTriggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, no instructions]` : ""}"

   **CRITICAL - TRIGGER WORD PLACEMENT:**
   - Trigger word MUST be the FIRST word in every prompt
   - This is non-negotiable for character likeness preservation
   - Format: "${actualTriggerWord}, [rest of prompt]"

2. **iPhone 15 Pro (MANDATORY - 95% of prompts):** MUST include "shot on iPhone 15 Pro" OR "amateur cellphone photo". Only use focal length alternatives for specific editorial requests.

3. **Natural Imperfections (MANDATORY - AT LEAST 3):** MUST include AT LEAST 3 of: "visible sensor noise", "slight motion blur from handheld", "uneven lighting", "mixed color temperatures", "handheld feel", "natural camera imperfections".

4. **Natural Skin Texture (MANDATORY - CRITICAL FOR AUTHENTICITY):** MUST include "natural skin texture with pores visible" AND 1–2 of: "not plastic-looking", "organic skin texture", "visible peach fuzz", "slight shine on forehead", "natural blemishes", "subtle facial asymmetry".

5. **Film Grain (MANDATORY):** MUST include one: "visible film grain", "fine film grain texture", "grainy texture", or "subtle grain visible"

6. **Muted Colors (MANDATORY):** MUST include one: "muted color palette", "soft muted tones", "desaturated realistic colors", or "vintage color temperature"

7. **Lighting with Imperfections (MANDATORY):** NEVER use "soft morning daylight, diffused natural lighting" or "even lighting" without imperfection language. MUST include "uneven lighting", "mixed color temperatures", or "slight uneven illumination". You MAY add "natural light falloff", "realistic shadow gradient", "slightly overexposed highlights", "warm/cool white balance mix".

8. **Specific Outfit (MANDATORY for user posts):** Material + color + garment type (6-10 words), NOT generic "trendy outfit" or "professional outfit". Use YOUR fashion intelligence to create specific, brand-aligned styling.

9. **Prompt Length:** 50-80 words (optimal range for detailed, high-quality results) - SAME AS CONCEPT CARDS

10. **NO BANNED WORDS:** Never use "stunning", "perfect", "beautiful", "high quality", "8K", "professional photography", "DSLR", "cinematic", "studio lighting", "even lighting", "perfect lighting", "smooth skin", "flawless skin", "airbrushed", "triumphant", "empowering", "confident smile", "trendy outfit", "professional outfit" - these create AI-looking/plastic results.

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER - SAME AS CONCEPT CARDS):**
1. **TRIGGER WORD** (first position - MANDATORY)
2. **GENDER/ETHNICITY** (2-3 words)
3. **OUTFIT** (material + color + garment type - 6-10 words)
4. **POSE + EXPRESSION** (simple, natural - 4-6 words)
5. **LOCATION** (brief, atmospheric - 3-6 words)
6. **LIGHTING** (with imperfections - 5-8 words)
7. **TECHNICAL SPECS** (iPhone + imperfections + skin texture + grain + muted colors - 8-12 words)
8. **CASUAL MOMENT** (optional - 2-4 words)

**Total target: 50-80 words for optimal quality and detail**

**IF ANY MANDATORY REQUIREMENT IS MISSING, THE PROMPT WILL PRODUCE AI-LOOKING RESULTS.**
`

  const prompt = `Maya, create a detailed visual composition for Instagram post #${postPosition}.

**Layout Strategist's Decision:**
Shot Type: ${shotType}
Purpose: ${purpose}
Visual Direction: ${visualDirection}
Brand Vibe: ${brandVibe}

${isNonUserPost ? `
⚠️ **CRITICAL: This is a ${shotType} post - NO USER/PERSON**
- Generate prompt for objects/products/flatlay/scenery ONLY
- DO NOT include trigger word, user, or person
- Follow the OBJECT/FLATLAY/SCENERY POST REQUIREMENTS listed above
- Include SPECIFIC items with materials/colors (not generic "styled objects")
- Describe the composition, surface, lighting with imperfections
- Include all mandatory requirements: iPhone, imperfections, film grain, muted colors
- Target: 50-80 words with detailed, specific descriptions
` : `
**CRITICAL PROMPT FORMAT:**
- MUST start with: "${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}"
- This format is non-negotiable for character likeness preservation
- DO NOT use username, brand name, or email - ONLY use trigger word "${actualTriggerWord}"
`}

**Your Task:**
Create a Flux prompt for this ${shotType} shot that achieves: ${purpose}

🔴 **CRITICAL - YOUR FLUX PROMPT MUST BE 50-80 WORDS AND INCLUDE ALL OF THESE:**

1. **OUTFIT (MANDATORY - NO EXCEPTIONS):**
   - ❌ NEVER use: "stylish outfit", "business casual outfit", "trendy outfit", "professional outfit", "wearing stylish business casual outfit"
   - ❌ NEVER use placeholders: "specific outfit", "outfit with material and color"
   - ✅ ALWAYS use: ACTUAL specific material + color + garment type (you must invent the specific outfit)
   - ✅ Example: "sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers"
   - ✅ Example: "butter-soft black leather blazer with oversized boyfriend cut, white ribbed tank underneath"
   - ✅ Example: "chunky cable-knit charcoal cashmere sweater with relaxed fit, sleeves pushed to elbows"
   - ✅ Example: "cream cashmere turtleneck with relaxed fit, sleeves pushed to elbows, high-waisted black straight-leg trousers"
   - 🔴 CRITICAL: You MUST create a REAL, SPECIFIC outfit description. Do NOT use generic terms or placeholders.

2. **LOCATION (MANDATORY - NO EXCEPTIONS):**
   - ❌ NEVER use: "urban background", "urban setting", "city backdrop", "clean lines", "urban background with clean lines"
   - ❌ NEVER use placeholders: "specific urban location", "location with details"
   - ✅ ALWAYS use: ACTUAL specific location with real details (you must invent the specific location)
   - ✅ Example: "upscale restaurant with marble bar counter and floor-to-ceiling windows"
   - ✅ Example: "rain-slicked city pavement, moody overcast grey skies"
   - ✅ Example: "sunlit minimalist kitchen, marble countertops, soft morning glow"
   - ✅ Example: "modern office space with floor-to-ceiling windows, minimalist furniture, natural light streaming in"
   - 🔴 CRITICAL: You MUST create a REAL, SPECIFIC location description. Do NOT use generic terms or placeholders.

3. **LIGHTING (MANDATORY - NO EXCEPTIONS):**
   - ❌ NEVER use: "perfect lighting", "clean lighting", "professional lighting", "even lighting"
   - ✅ ALWAYS use: Lighting with imperfections
   - ✅ Example: "bright natural light with clean illumination, subtle directional shadows, uneven ambient light"
   - ✅ Example: "golden hour sunlight from left, warm side lighting, soft shadows, uneven ambient light, mixed color temperatures"
   - ✅ Example: "overcast daylight, diffused but uneven lighting, mixed warm and cool tones, visible sensor noise"

4. **TECHNICAL SPECS (MANDATORY - ALL MUST BE INCLUDED):**
   - ✅ "shot on iPhone 15 Pro" (MANDATORY)
   - ✅ At least 3 natural imperfections: "visible sensor noise", "slight motion blur from handheld", "uneven lighting", "mixed color temperatures"
   - ✅ "natural skin texture with pores visible" (MANDATORY)
   - ✅ "visible film grain" or "fine film grain texture" (MANDATORY)
   - ✅ "muted color palette" or "soft muted tones" (MANDATORY)

5. **WORD COUNT:**
   - ✅ MUST be 50-80 words (count carefully!)
   - ❌ Too short (<50 words) = missing detail
   - ❌ Too long (>80 words) = loses focus

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS EXACT ORDER - SAME AS CONCEPT CARDS):**
1. **TRIGGER WORD** (first position - MANDATORY): "${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}"
2. **OUTFIT** (6-10 words - MANDATORY): Specific material + color + garment type (e.g., "sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers")
3. **POSE + EXPRESSION** (4-6 words): Simple, natural (e.g., "standing with hand on marble bar counter, looking over shoulder naturally")
4. **LOCATION** (3-6 words - MANDATORY): Specific location with details (e.g., "upscale restaurant with marble surfaces and floor-to-ceiling windows")
5. **LIGHTING** (5-8 words - MANDATORY): With imperfections (e.g., "bright natural light with clean illumination, subtle directional shadows, uneven ambient light")
6. **TECHNICAL SPECS** (8-12 words - MANDATORY): "shot on iPhone 15 Pro, visible sensor noise, natural skin texture with pores visible, visible film grain, muted color palette"
7. **CASUAL MOMENT** (optional - 2-4 words): "looks like real phone camera photo"

**Total target: 50-80 words for optimal quality and detail**

Remember:
- Use YOUR fashion expertise and brand knowledge (from user context above)
- Apply user's brand colors naturally (you already know them from their profile)
- Create visual harmony with the other 8 posts in the feed
- Make it feel authentic and Instagram-worthy
- **EVERY element above is MANDATORY - do not skip any**

**🔴 CRITICAL: PROMPT QUALITY CHECKLIST - EVERY PROMPT MUST HAVE:**
1. ✅ Trigger word + ethnicity + gender (no duplicates, format: "${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}")
2. ✅ Specific outfit description (material + color + garment type - NOT "trendy outfit")
3. ✅ iPhone 15 Pro specification
4. ✅ At least 3 natural imperfections
5. ✅ Natural skin texture with pores
6. ✅ Film grain
7. ✅ Muted/desaturated colors
8. ✅ Uneven/mixed lighting (NOT "dramatic" or "even")
9. ✅ Total length: 50-80 words

**🔴 EXAMPLE OF PERFECT PROMPT (FOLLOW THIS FORMAT):**
"${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}, in sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers, standing with hand on marble bar counter, looking over shoulder naturally, upscale restaurant with marble surfaces and floor-to-ceiling windows, bright natural light with clean illumination, subtle directional shadows, uneven ambient light, shot on iPhone 15 Pro, natural bokeh, slight lens distortion, visible sensor noise, natural skin texture with visible peach fuzz, organic skin texture, film grain, muted tones"

**🔴 EXAMPLE OF BAD PROMPT (DO NOT CREATE LIKE THIS):**
"${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}, confident expression, wearing stylish business casual outfit, urban background with clean lines, edgy-minimalist aesthetic with perfect lighting"

**Why the bad example is wrong:**
- ❌ "stylish business casual outfit" = generic (should be specific material + color + garment)
- ❌ "urban background" = generic (should be specific location with details)
- ❌ "perfect lighting" = banned word (should be uneven lighting with imperfections)
- ❌ Missing: iPhone 15 Pro, imperfections, skin texture, film grain, muted colors
- ❌ Too short: ~20 words (needs 50-80)

Return JSON with this structure:
{
  "shotSetup": { "type": "", "angle": "", "distance": "", "framing": "" },
  "subjectDirection": { "pose": "", "hands": "", "face": "", "movement": "" },
  "settingMood": { "location": "", "lighting": "", "props": [], "colors": [] },
  "styling": { "outfit": "", "hair": "", "accessories": [], "aesthetic": "" },
  "emotionalTone": "",
  "fluxPrompt": "${isNonUserPost ? "50-80 word object/flatlay/scenery prompt WITHOUT user or trigger word, including SPECIFIC items with materials/colors, composition details, surface description, lighting with imperfections, iPhone 15 Pro, natural imperfections, film grain, muted colors - follow OBJECT/FLATLAY/SCENERY POST REQUIREMENTS above" : `YOUR CRAFTED FLUX PROMPT - synthesized from principles, MUST start with ${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}, MUST be 50-80 words (count carefully!), MUST include ALL of these in this exact order: (1) "${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}" at the start, (2) specific outfit with material + color + garment type (6-10 words, e.g., "sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers"), (3) pose + expression (4-6 words), (4) specific location with details (3-6 words, e.g., "upscale restaurant with marble surfaces and floor-to-ceiling windows"), (5) lighting with imperfections (5-8 words, e.g., "bright natural light with clean illumination, subtle directional shadows, uneven ambient light"), (6) technical specs: "shot on iPhone 15 Pro, visible sensor noise, natural skin texture with pores visible, visible film grain, muted color palette" (8-12 words). Total must be 50-80 words.`}"
}

🔴 **CRITICAL - YOUR FLUX PROMPT MUST:**
- Start with: "${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}"
- Be 50-80 words total
- Include ALL 8 mandatory requirements listed above
- Follow the PROMPT STRUCTURE ARCHITECTURE order (trigger → outfit → pose → location → lighting → technical specs)
- Use specific details, NOT generic terms

**EXAMPLE OF WHAT YOUR FLUX PROMPT SHOULD LOOK LIKE:**
"${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}, in sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers, standing with hand on marble bar counter, looking over shoulder naturally, upscale restaurant with marble surfaces and floor-to-ceiling windows, bright natural light with clean illumination, subtle directional shadows, uneven ambient light, shot on iPhone 15 Pro, natural bokeh, slight lens distortion, visible sensor noise, natural skin texture with visible peach fuzz, organic skin texture, film grain, muted tones"

Return ONLY valid JSON. No markdown.`

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4-20250514", // Using sonnet for better instruction following (same as concept cards)
    system: systemPrompt,
    prompt,
    temperature: 0.7, // Slightly lower for better consistency with requirements
  })

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in Maya's response")
    }

    const composition = JSON.parse(jsonMatch[0]) as VisualComposition

    // Basic validation: Check if prompt is too short or missing critical elements
    const promptWordCount = composition.fluxPrompt.split(/\s+/).length
    const promptLower = composition.fluxPrompt.toLowerCase()
    
    if (promptWordCount < 40) {
      console.error(`[v0] Maya: ❌ CRITICAL: Generated prompt is too short (${promptWordCount} words, needs 50-80). Prompt: ${composition.fluxPrompt}`)
      // If prompt is way too short, it's likely the AI didn't follow instructions - log full prompt for debugging
      console.error(`[v0] Maya: Full prompt received: ${JSON.stringify(composition, null, 2)}`)
    }
    
    if (!isNonUserPost) {
      // Check for basic requirements
      const hasOutfit = promptLower.match(/\b(in|wearing|outfit|blouse|shirt|dress|trousers|pants|sweater|jacket|blazer|silk|linen|cashmere|leather|wool|cotton)\b/i)
      const hasLocation = promptLower.match(/\b(restaurant|cafe|kitchen|office|street|park|room|space|location|setting|bar|counter|window|terrace|rooftop)\b/i)
      const hasIphone = promptLower.includes('iphone 15 pro') || promptLower.includes('amateur cellphone')
      
      if (!hasOutfit) {
        console.error(`[v0] Maya: ❌ CRITICAL: Generated prompt is missing OUTFIT. Prompt: ${composition.fluxPrompt}`)
      }
      if (!hasLocation) {
        console.error(`[v0] Maya: ❌ CRITICAL: Generated prompt is missing LOCATION. Prompt: ${composition.fluxPrompt}`)
      }
      if (!hasIphone) {
        console.error(`[v0] Maya: ❌ CRITICAL: Generated prompt is missing iPhone 15 Pro. Prompt: ${composition.fluxPrompt}`)
      }
      
      // If critical elements are missing, the prompt will be enhanced by generate-feed-prompt route
      // But we should log this clearly for debugging
      if (promptWordCount < 40 || !hasOutfit || !hasLocation || !hasIphone) {
        console.error(`[v0] Maya: ⚠️ WARNING: Prompt does not meet minimum requirements. It will be enhanced by generate-feed-prompt route before image generation.`)
      }
    }

    // For non-user posts, ensure no user/trigger word and validate requirements
    if (isNonUserPost) {
      let cleanedPrompt = composition.fluxPrompt.trim()
      // Remove trigger word if present
      if (actualTriggerWord && cleanedPrompt.toLowerCase().includes(actualTriggerWord.toLowerCase())) {
        cleanedPrompt = cleanedPrompt.replace(new RegExp(`\\b${actualTriggerWord}\\b`, 'gi'), '').trim()
      }
      // Remove user gender/ethnicity references
      cleanedPrompt = cleanedPrompt.replace(new RegExp(`\\b${userGender}\\b`, 'gi'), '').trim()
      cleanedPrompt = cleanedPrompt.replace(/\b(person|woman|man|girl|boy)\b/gi, '').trim()
      // Clean up
      cleanedPrompt = cleanedPrompt.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/\s*,\s*$/, '').trim()
      composition.fluxPrompt = cleanedPrompt
      
      // Validate and enforce quality requirements for non-user posts
      let promptLower = composition.fluxPrompt.toLowerCase()
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
        composition.fluxPrompt = composition.fluxPrompt.replace(/\b(dramatic|even|perfect)\s+lighting\b/gi, 'uneven lighting')
        promptLower = composition.fluxPrompt.toLowerCase()
      }
      if (!promptLower.includes('uneven lighting') && !promptLower.includes('mixed color temperatures')) {
        missingRequirements.push('uneven/mixed lighting')
      }
      
      // Check for specific items (not generic)
      if (promptLower.includes('styled objects') || promptLower.includes('arranged items') || promptLower.includes('objects arranged')) {
        console.log("[v0] Maya: ⚠️ Item description is generic - should be specific items with materials/colors")
      }
      
      // Check for surface description (not generic "white background" or "table")
      if (promptLower.includes('white background') || (promptLower.includes('table') && !promptLower.match(/(marble|wood|concrete|linen|surface)/))) {
        console.log("[v0] Maya: ⚠️ Surface description is generic - should be specific material")
      }
      
      // Check word count
      const wordCount = composition.fluxPrompt.split(/\s+/).length
      if (wordCount < 50) {
        missingRequirements.push(`length (currently ${wordCount} words, need 50-80)`)
      } else if (wordCount > 80) {
        console.log(`[v0] Maya: ⚠️ Prompt is ${wordCount} words (target: 50-80)`)
      }
      
      if (missingRequirements.length > 0) {
        console.warn(`[v0] Maya: ⚠️ Missing requirements: ${missingRequirements.join(', ')}`)
      }
      
      // Auto-add missing critical requirements if needed
      const additions: string[] = []
      promptLower = composition.fluxPrompt.toLowerCase()
      
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
        if (!promptLower.includes('motion blur') && currentImperfections < 2) additions.push('slight motion blur from handheld')
        if (!promptLower.includes('handheld') && currentImperfections < 2) additions.push('handheld feel')
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
        composition.fluxPrompt = composition.fluxPrompt.replace(/\b(dramatic|even|perfect)\s+lighting\b/gi, 'uneven lighting with mixed color temperatures')
        promptLower = composition.fluxPrompt.toLowerCase()
      } else if (!promptLower.includes('uneven lighting') && !promptLower.includes('mixed color temperatures')) {
        // Try to add near existing lighting mention
        const lightingMatch = composition.fluxPrompt.match(/\b(lighting|illumination|lit)\b/i)
        if (lightingMatch) {
          const idx = lightingMatch.index || 0
          composition.fluxPrompt = composition.fluxPrompt.substring(0, idx) + 'uneven lighting, ' + composition.fluxPrompt.substring(idx)
        } else {
          additions.push('uneven lighting with mixed color temperatures')
        }
      }
      
      // Add missing requirements naturally into the prompt
      if (additions.length > 0) {
        // Find a good place to add them (after surface/lighting, before end)
        const insertPoint = composition.fluxPrompt.lastIndexOf(',')
        if (insertPoint > 0) {
          composition.fluxPrompt = composition.fluxPrompt.substring(0, insertPoint + 1) + ' ' + additions.join(', ') + composition.fluxPrompt.substring(insertPoint + 1)
        } else {
          composition.fluxPrompt = composition.fluxPrompt + ', ' + additions.join(', ')
        }
        console.log(`[v0] Maya: ✅ Added missing requirements: ${additions.join(', ')}`)
      }
      
      // Final cleanup
      composition.fluxPrompt = composition.fluxPrompt.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
      
      // Re-check word count after additions
      const finalWordCount = composition.fluxPrompt.split(/\s+/).length
      
      console.log(`[v0] Maya: Non-user post (${shotType}) - prompt: ${composition.fluxPrompt.substring(0, 100)}...`)
      console.log(`[v0] Maya: Word count: ${finalWordCount} ${finalWordCount >= 50 && finalWordCount <= 80 ? "✅" : "⚠️"}`)
    } else {
      // For user posts, enforce correct format: triggerWord, ethnicity, userGender
      const expectedStart = `${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}`
      let promptLower = composition.fluxPrompt.toLowerCase().trim()
      const expectedStartLower = expectedStart.toLowerCase()
      
      // FIRST: Replace generic/banned terms BEFORE format check
      const genericTerms = [
        { pattern: /\bstylish\s+(business\s+)?casual\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\bbusiness\s+casual\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\bstylish\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\btrendy\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\bprofessional\s+outfit\b/gi, replacement: 'specific outfit with material and color details' },
        { pattern: /\burban\s+background\b/gi, replacement: 'specific urban location with detailed description' },
        { pattern: /\burban\s+setting\b/gi, replacement: 'specific urban location with detailed description' },
        { pattern: /\bcity\s+backdrop\b/gi, replacement: 'specific urban location with detailed description' },
        { pattern: /\bclean\s+lines\b/gi, replacement: 'specific architectural details' },
        { pattern: /\bperfect\s+lighting\b/gi, replacement: 'uneven lighting with mixed color temperatures' },
        { pattern: /\bclean\s+lighting\b/gi, replacement: 'uneven lighting with mixed color temperatures' },
        { pattern: /\bprofessional\s+lighting\b/gi, replacement: 'uneven lighting with mixed color temperatures' },
        { pattern: /\beven\s+lighting\b/gi, replacement: 'uneven lighting with mixed color temperatures' },
        { pattern: /\bedgy-minimalist\s+aesthetic\b/gi, replacement: 'natural composition with authentic details' },
        { pattern: /\bedgy\s+minimalist\b/gi, replacement: 'natural composition with authentic details' },
        { pattern: /\bemphasizing\s+expertise\s+and\s+success\b/gi, replacement: 'natural authentic moment' },
      ]
      
      let hasGenericTerms = false
      genericTerms.forEach(({ pattern, replacement }) => {
        if (pattern.test(composition.fluxPrompt)) {
          composition.fluxPrompt = composition.fluxPrompt.replace(pattern, replacement)
          hasGenericTerms = true
          console.log(`[v0] Maya: ⚠️ Replaced generic term with: ${replacement}`)
        }
      })
      
      if (hasGenericTerms) {
        promptLower = composition.fluxPrompt.toLowerCase() // Recalculate after replacements
      }
      
      if (!promptLower.startsWith(expectedStartLower)) {
        // Remove any username patterns
        let cleanedPrompt = composition.fluxPrompt.replace(/\b\w+[_@]\w+\b/g, '').trim()
        
        // Remove trigger word if in wrong position
        if (cleanedPrompt.toLowerCase().includes(actualTriggerWord.toLowerCase()) && !cleanedPrompt.toLowerCase().startsWith(actualTriggerWord.toLowerCase())) {
          cleanedPrompt = cleanedPrompt.replace(new RegExp(`\\b${actualTriggerWord}\\b`, 'gi'), '').trim()
        }
        
        // Remove incorrect start (username, etc.)
        const parts = cleanedPrompt.split(',').map(p => p.trim())
        if (parts.length > 0 && !parts[0].toLowerCase().startsWith(actualTriggerWord.toLowerCase())) {
          parts.shift()
          cleanedPrompt = parts.join(', ').trim()
        }
        
        // Build correct format
        cleanedPrompt = cleanedPrompt.replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim()
        composition.fluxPrompt = `${expectedStart}, ${cleanedPrompt}`
        promptLower = composition.fluxPrompt.toLowerCase() // Recalculate after format fix
      }
      
      // Validate and enforce quality requirements (similar to generate-feed-prompt route)
      // Generic terms already replaced above, promptLower already set
      
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
        composition.fluxPrompt = composition.fluxPrompt.replace(/\b(dramatic|even|perfect)\s+lighting\b/gi, 'uneven lighting')
        promptLower = composition.fluxPrompt.toLowerCase()
      }
      if (!promptLower.includes('uneven lighting') && !promptLower.includes('mixed color temperatures')) {
        missingRequirements.push('uneven/mixed lighting')
      }
      
      // Check word count
      const wordCount = composition.fluxPrompt.split(/\s+/).length
      if (wordCount < 50) {
        missingRequirements.push(`length (currently ${wordCount} words, need 50-80)`)
      } else if (wordCount > 80) {
        console.log(`[v0] Maya: ⚠️ Prompt is ${wordCount} words (target: 50-80)`)
      }
      
      if (missingRequirements.length > 0) {
        console.warn(`[v0] Maya: ⚠️ Missing requirements: ${missingRequirements.join(', ')}`)
      }
      
      // Auto-add missing critical requirements if needed
      const additions: string[] = []
      promptLower = composition.fluxPrompt.toLowerCase()
      
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
        if (!promptLower.includes('motion blur') && currentImperfections < 2) additions.push('slight motion blur from handheld')
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
        composition.fluxPrompt = composition.fluxPrompt.replace(/\b(dramatic|even|perfect)\s+lighting\b/gi, 'uneven lighting with mixed color temperatures')
        promptLower = composition.fluxPrompt.toLowerCase()
      } else if (!promptLower.includes('uneven lighting') && !promptLower.includes('mixed color temperatures')) {
        // Try to add near existing lighting mention
        const lightingMatch = composition.fluxPrompt.match(/\b(lighting|illumination|lit)\b/i)
        if (lightingMatch) {
          const idx = lightingMatch.index || 0
          composition.fluxPrompt = composition.fluxPrompt.substring(0, idx) + 'uneven lighting, ' + composition.fluxPrompt.substring(idx)
        } else {
          additions.push('uneven lighting with mixed color temperatures')
        }
      }
      
      // Add missing requirements naturally into the prompt
      if (additions.length > 0) {
        // Find a good place to add them (after location/lighting, before end)
        const insertPoint = composition.fluxPrompt.lastIndexOf(',')
        if (insertPoint > 0) {
          composition.fluxPrompt = composition.fluxPrompt.substring(0, insertPoint + 1) + ' ' + additions.join(', ') + composition.fluxPrompt.substring(insertPoint + 1)
        } else {
          composition.fluxPrompt = composition.fluxPrompt + ', ' + additions.join(', ')
        }
        console.log(`[v0] Maya: ✅ Added missing requirements: ${additions.join(', ')}`)
      }
      
      // Final cleanup
      composition.fluxPrompt = composition.fluxPrompt.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
      
      // FINAL VALIDATION: Check if prompt still has generic placeholder text or banned terms
      const finalPromptLower = composition.fluxPrompt.toLowerCase()
      const hasPlaceholderText = 
        finalPromptLower.includes('specific outfit with material and color') ||
        finalPromptLower.includes('specific urban location with detailed') ||
        finalPromptLower.includes('stylish outfit') ||
        finalPromptLower.includes('business casual outfit') ||
        finalPromptLower.includes('urban background') ||
        finalPromptLower.includes('perfect lighting') ||
        finalPromptLower.includes('edgy-minimalist')
      
      if (hasPlaceholderText) {
        console.error(`[v0] Maya: ❌ CRITICAL WARNING: Prompt still contains generic/placeholder text!`)
        console.error(`[v0] Maya: Prompt: ${composition.fluxPrompt.substring(0, 200)}...`)
        console.error(`[v0] Maya: This prompt will be further enhanced by generate-feed-prompt route, but the AI should have generated specific details.`)
      }
      
      // Re-check word count after additions
      const finalWordCount = composition.fluxPrompt.split(/\s+/).length
      
      // Final validation summary
      const finalCheck = {
        hasTriggerWord: finalPromptLower.startsWith(actualTriggerWord.toLowerCase()),
        hasIphone: finalPromptLower.includes('iphone 15 pro') || finalPromptLower.includes('amateur cellphone'),
        hasImperfections: ['sensor noise', 'motion blur', 'uneven lighting', 'mixed color temperatures', 'handheld'].filter(t => finalPromptLower.includes(t)).length >= 3,
        hasSkinTexture: finalPromptLower.includes('natural skin texture') || finalPromptLower.includes('pores visible'),
        hasFilmGrain: finalPromptLower.includes('film grain') || finalPromptLower.includes('grainy'),
        hasMutedColors: finalPromptLower.includes('muted') || finalPromptLower.includes('desaturated'),
        wordCount: finalWordCount,
        wordCountOk: finalWordCount >= 50 && finalWordCount <= 80,
      }
      
      console.log(`[v0] Maya: User post (${shotType}) - prompt: ${composition.fluxPrompt.substring(0, 100)}...`)
      console.log(`[v0] Maya: Final validation:`, finalCheck)
      console.log(`[v0] Maya: Trigger word check: ${finalCheck.hasTriggerWord ? "✅" : "❌"}`)
      console.log(`[v0] Maya: Word count: ${finalWordCount} ${finalCheck.wordCountOk ? "✅" : "⚠️"}`)
      
      // If critical requirements are still missing, log a strong warning
      if (!finalCheck.hasIphone || !finalCheck.hasImperfections || !finalCheck.hasSkinTexture || !finalCheck.hasFilmGrain || !finalCheck.hasMutedColors) {
        console.error(`[v0] Maya: ❌ CRITICAL: Prompt is missing mandatory requirements even after auto-enhancement!`)
        console.error(`[v0] Maya: Missing:`, {
          iPhone: !finalCheck.hasIphone,
          imperfections: !finalCheck.hasImperfections,
          skinTexture: !finalCheck.hasSkinTexture,
          filmGrain: !finalCheck.hasFilmGrain,
          mutedColors: !finalCheck.hasMutedColors,
        })
      }
    }

    return composition
  } catch (error) {
    console.error("[v0] Maya: Failed to parse visual composition:", error)
    return await createFallbackComposition(shotType, purpose, authUserId, actualTriggerWord)
  }
}

async function createFallbackComposition(shotType: string, purpose: string, authUserId: string, triggerWord?: string): Promise<VisualComposition> {
  // Get user data for fallback
  const { neon } = await import("@neondatabase/serverless")
  const sql = neon(process.env.DATABASE_URL!)
  const { getUserByAuthId } = await import("@/lib/user-mapping")
  
  const user = await getUserByAuthId(authUserId)
  if (!user) {
    throw new Error("User not found")
  }

  const userDataResult = await sql`
    SELECT u.gender, u.ethnicity, um.trigger_word
    FROM users u
    LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
    WHERE u.id = ${user.id} 
    LIMIT 1
  `

  let userGender = "person"
  if (userDataResult[0]?.gender) {
    const dbGender = userDataResult[0].gender.toLowerCase().trim()
    if (dbGender === "woman" || dbGender === "female") {
      userGender = "woman"
    } else if (dbGender === "man" || dbGender === "male") {
      userGender = "man"
    }
  }

  const userEthnicity = userDataResult[0]?.ethnicity || null
  const actualTriggerWord = userDataResult[0]?.trigger_word || triggerWord || `user${user.id}`

  const isNonUserPost = shotType === "object" || shotType === "flatlay" || shotType === "scenery" || shotType === "place"
  
  // Fallback should still include all mandatory requirements
  // For non-user posts: specific items, composition, surface, lighting, technical specs
  // For user posts: trigger word, outfit, location, lighting, technical specs
  const basePrompt = isNonUserPost 
    ? `carefully arranged ${shotType} with specific items, materials and colors visible, overhead view on marble surface, natural light from window creating soft shadows, uneven ambient light, shot on iPhone 15 Pro, visible sensor noise, fine film grain texture, muted color palette, authentic iPhone aesthetic`
    : `${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}, in specific outfit with material and color details, natural pose, specific location with atmospheric details, natural lighting with uneven illumination, mixed color temperatures, shot on iPhone 15 Pro, natural bokeh, visible sensor noise, natural skin texture with pores visible, visible film grain, muted color palette, looks like real phone camera photo`

  const fluxPrompt = basePrompt

  return {
    shotSetup: {
      type: shotType,
      angle: "eye-level, natural perspective",
      distance: "medium shot, perfectly framed",
      framing: "rule of thirds, balanced composition",
    },
    subjectDirection: {
      pose: "natural, relaxed, confident",
      hands: "naturally positioned",
      face: "authentic expression, engaging",
      movement: "slight natural energy",
    },
    settingMood: {
      location: "naturally lit environment",
      lighting: "natural light, authentic atmosphere",
      props: ["minimal, authentic styling"],
      colors: ["brand-appropriate tones"],
    },
    styling: {
      outfit: "effortlessly chic, brand-aligned",
      hair: "natural, polished",
      accessories: ["minimal, elegant"],
      aesthetic: "authentic influencer aesthetic",
    },
    emotionalTone: "confident, approachable, aspirational",
    fluxPrompt,
  }
}
