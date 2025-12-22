/**
 * System Prompt Builder
 * 
 * Builds the system prompt for Claude in a simplified, modular way.
 * Reduces complexity and makes it easier to maintain.
 */

import { SHARED_MAYA_PERSONALITY } from "../personality/shared-personality"

export interface SystemPromptContext {
  studioProMode: boolean
  detectedGuidePrompt?: string
  conversationContext?: string
  fashionIntelligence?: string
  brandGuidance?: string
  lifestyleContext?: string
  trendResearch?: string
  trendFilterInstruction?: string
  templateExamples: string[]
  userRequest?: string
  userGender: string
  userEthnicity?: string
  physicalPreferences?: string
  triggerWord?: string
  shouldIncludeSkinTexture: boolean
  enhancedAuthenticity?: boolean
  workflowType?: string | null
  count: number
  imageAnalysis?: string
}

/**
 * Build the studio pro mode section
 */
function buildStudioProSection(): string {
  return `=== STUDIO PRO MODE - REFERENCE ATTACHMENT ONLY ===

**NEVER assume or specify physical characteristics like hair color, ethnicity, or body type.**

**ALWAYS reference the attachment/reference image instead:**

✅ CORRECT FORMAT (MUST INCLUDE BRAND NAME WHEN DETECTED):
- "Vertical 2:3 photo in UGC influencer style from Alo captured in movement. Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo."
- "Maintain exactly the characteristics of the person in the attachment (face, body, skin tone, hair and visual identity). Do not copy the original photo. [Brand name] brand outfit clearly visible with subtle logo integration."

**Brand Name Inclusion:**
When user requests a specific brand (Alo, Lululemon, Chanel, Dior, Glossier, etc.):
- Always mention the brand name in the prompt
- Include brand in opening line or early in the prompt (e.g., "from Alo", "Alo brand outfit", "official campaign of the ALO brand")
- Use brand-specific language (e.g., "Alo Yoga aesthetic", "Chanel editorial style", "Glossier clean girl vibe")

❌ WRONG FORMAT (NEVER DO THIS):
- "A White woman, long dark brown hair" (assuming characteristics)
- "A woman with brown hair" (assuming hair color)
- "Athletic woman" (assuming body type without reference)
- "Woman in cream sports bra..." (missing brand name when user asked for Alo)

**The user's reference image contains ALL physical characteristics. Your job is to reference it, not assume them.**

**ONLY describe changeable elements:** styling, pose, lighting, environment, makeup, expressions, outfits.

===`
}

/**
 * Build guide prompt section
 */
function buildGuidePromptSection(guidePrompt: string): string {
  return `\n=== GUIDE PROMPT MODE ===

${SHARED_MAYA_PERSONALITY.guidePromptPriority}

**Concept #1:** Use this exact prompt:
"${guidePrompt}"

**Concepts #2-6:** Create variations that maintain:
- The same outfit from the guide prompt
- The same location/scene from the guide prompt
- The same lighting style from the guide prompt
- The same camera specs from the guide prompt

Vary only: poses, angles, moments, expressions, and small compositional details.

**Important:** Ignore any instructions below about varying outfits, Scandinavian defaults, or template examples. The guide prompt is what the user wants - respect it completely.

===\n\n`
}

/**
 * Build the main system prompt for concept generation
 */
export function buildSystemPrompt(context: SystemPromptContext): string {
  const parts: string[] = []
  
  // 1. Core personality (always first)
  parts.push(SHARED_MAYA_PERSONALITY.core)
  parts.push(SHARED_MAYA_PERSONALITY.languageRules)
  
  // 2. Studio Pro mode section (if applicable)
  if (context.studioProMode) {
    parts.push(buildStudioProSection())
  }
  
  // 3. Guide prompt section (if applicable - takes priority)
  if (context.detectedGuidePrompt) {
    parts.push(buildGuidePromptSection(context.detectedGuidePrompt))
  }
  
  // 4. Trend research (if applicable and no guide prompt)
  if (context.trendResearch && !context.detectedGuidePrompt) {
    parts.push(`=== CURRENT INSTAGRAM TRENDS (Jan 2025) ===

${context.trendResearch}

${context.trendFilterInstruction || ""}
===`)
  }
  
  // 5. Conversation context
  if (context.conversationContext) {
    parts.push(`=== CONVERSATION CONTEXT ===
${context.conversationContext}
===`)
  }
  
  // 6. Fashion intelligence (only for classic mode)
  if (context.fashionIntelligence) {
    parts.push(context.fashionIntelligence)
  }
  
  // 7. Brand guidance
  if (context.brandGuidance) {
    parts.push(context.brandGuidance)
  }
  
  // 8. Lifestyle context
  if (context.lifestyleContext) {
    parts.push(`=== LIFESTYLE CONTEXT: WHAT THIS REALLY MEANS ===

The user said "${context.userRequest || ""}" - here's what they ACTUALLY want:

${context.lifestyleContext}

This is the vibe check. Don't just read these - embody them in your outfit choices, location selection, and mood. This is what makes concepts feel authentic and Instagram-worthy.
===`)
  }
  
  // Join all parts
  return parts.join("\n\n")
}



















