import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { generateText } from "ai"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { nanoBananaPromptBuilder } from "@/lib/maya/nano-banana-prompt-builder"

export async function POST(req: NextRequest) {
  try {
    console.log("[STUDIO-PRO-PROMPTS] Generate Studio Pro prompts API called")

    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get effective user
    const effectiveUser = await getEffectiveNeonUser(authUser.id)
    if (!effectiveUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse request body
    const body = await req.json()
    const {
      userRequest,
      count = 3,
      conversationContext,
      contentType, // e.g., "reel-cover", "ugc-product", "carousel", etc.
    } = body

    console.log("[STUDIO-PRO-PROMPTS] Generating prompts:", {
      userRequest,
      count,
      contentType,
      hasConversationContext: !!conversationContext,
    })

    // Get user context
    const userContext = await getUserContextForMaya(effectiveUser.id)
    
    // Get user gender
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL!)
    const userDataResult = await sql`
      SELECT u.gender
      FROM users u
      WHERE u.id = ${effectiveUser.id}
      LIMIT 1
    `
    const userGender = userDataResult[0]?.gender || "person"

    // Import Nano Banana principles
    const { getNanoBananaPromptingPrinciples } = await import('@/lib/maya/nano-banana-prompt-builder')
    const nanoBananaPrinciples = getNanoBananaPromptingPrinciples()
    
    // Build prompt generation request
    const promptGenerationPrompt = `You are Maya, an expert at creating Studio Pro prompts for Nano Banana Pro image generation.

**CRITICAL: ALL prompts MUST be in Nano Banana Pro format. NEVER use Flux format, trigger words, or LoRA references.**

${nanoBananaPrinciples}

**USER REQUEST:**
${userRequest}

${conversationContext ? `**CONVERSATION CONTEXT:**\n${conversationContext}\n` : ''}

${userContext ? `**USER CONTEXT:**\n${userContext}\n` : ''}

**USER GENDER:** ${userGender}

**TASK:**
Generate ${count} complete Studio Pro prompts for Nano Banana Pro. Each prompt should be a natural language description ready for image generation.

**CONTENT TYPE:** ${contentType || 'general'}

**IMPORTANT - NANO BANANA PRO FORMAT (MANDATORY FOR ALL CONTENT TYPES):**
- Use natural language, NOT legacy Flux-style trigger words
- NO LoRA references (no training trigger tokens or internal model tags)
- NO Flux-specific camera formatting (no explicit phone model names, no "candid photo" or "amateur cellphone photo" boilerplate)
- Describe what you want to see, not technical AI terms
- Be explicit about composition, style, lighting, colors
- If text is needed, specify EXACT text in quotes
- Keep it like a photography brief: clear and grounded

**CRITICAL - QUOTE GRAPHICS (if contentType is "quote-graphic"):**
- Describe the final graphic design, NOT user instructions
- Include the exact quote text in quotes
- Describe layout, typography, colors, background style
- Describe any visual elements (patterns, shapes, images if included)
- Format: "Quote graphic with text '[exact quote]' in [font style] typography. [Layout description]. [Color scheme]. [Background style]. [Any visual elements]. [Aspect ratio if specified]."
- Example: "Quote graphic with text 'Success is not final, failure is not fatal' in bold sans-serif typography, centered layout. Text in deep navy blue on soft cream background with subtle geometric pattern overlay. Minimalist design with ample white space. Square format 1:1 for Instagram post."

**CRITICAL - PROMPT FORMAT:**
These prompts are for NANO BANANA PRO IMAGE GENERATION, NOT user instructions.

❌ WRONG (User Instructions - DO NOT DO THIS):
"Use 1-2 photos of yourself in casual morning wear from your gallery - pajamas, oversized t-shirt, or comfy loungewear. Select clear product photos showing the packaging. Create an authentic UGC photo showing you..."

✅ CORRECT (Image Generation Prompt):
"Woman in casual morning wear - pajamas or oversized t-shirt - standing in front of a bathroom mirror applying skincare product. She's looking at herself in the mirror with a natural, relaxed expression. The bathroom has soft morning lighting coming through a window. The counter has everyday items scattered around - toothbrush, other skincare products, maybe a coffee mug. Shot from a slight angle showing both her and her reflection. Soft natural lighting with warm tones. Muted morning color palette - whites, creams, soft grays. Casual iPhone photo aesthetic with authentic UGC feel. Instagram reel cover format 9:16 vertical."

✅ CORRECT (Quote Graphic Prompt):
"Quote graphic with text 'Success is not final, failure is not fatal' in bold sans-serif typography, centered layout. Text in deep navy blue on soft cream background with subtle geometric pattern overlay. Minimalist design with ample white space. Square format 1:1 for Instagram post."

**PROMPT STRUCTURE (Image Generation Only):**
Each prompt should describe what the FINAL IMAGE will look like:
- Subject (who/what - describe the person/object as they appear in the final image)
- Action/Pose (what they're doing in the image)
- Environment (where the scene takes place)
- Composition (framing, shot type, camera angle)
- Style (aesthetic, mood, visual feel)
- Lighting (natural description of how light appears)
- Color Palette (specific colors visible in the image)
- Technical Details (format, aspect ratio if needed)
- Final Use (what this image is for - e.g., "Instagram reel cover", "UGC product photo")

**DO NOT INCLUDE:**
- Instructions like "Use photos from your gallery"
- Directions like "Select images" or "Upload photos"
- User guidance like "Choose photos that show..."
- Any text that tells the user what to do

**ONLY DESCRIBE THE FINAL IMAGE** - what Nano Banana Pro should generate.

**FORBIDDEN FORMATS (DO NOT USE):**
- ❌ Flux-style trigger words or training tokens (any short all-caps tags or pseudo-identifiers)
- ❌ Flux camera specs: phone model names like "shot on iPhone 15 Pro", or stock phrases like "candid photo" / "amateur cellphone photo"
- ❌ Flux lighting boilerplate like "uneven natural lighting with mixed color temperatures"
- ❌ Flux technical boilerplate like "portrait mode, shallow depth of field" or "film grain, muted colors"
- ❌ LoRA references: Any mention of trigger words, LoRA, or model training
- ❌ User instructions: "Use photos from your gallery", "Select images"

**REQUIRED FORMAT:**
- ✅ Natural language description of the final image
- ✅ Clear composition, style, lighting, colors
- ✅ For quote graphics: Exact quote text in quotes, layout description, typography, colors
- ✅ Photography brief style: "A [subject] [action] in [location]. [Composition]. [Style]. [Lighting]. [Colors]. [Format]."

**OUTPUT FORMAT:**
Return a JSON array with this structure:
[
  {
    "title": "Short descriptive title (2-4 words)",
    "description": "Brief description of what this prompt creates",
    "prompt": "Full detailed prompt in natural language, ready for Nano Banana Pro"
  },
  ...
]

Return ONLY the JSON array, no markdown, no explanations, no code blocks.`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      prompt: promptGenerationPrompt,
      maxTokens: 4000,
    })

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error("[STUDIO-PRO-PROMPTS] No JSON array found in AI response:", text.substring(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: "AI response format invalid - no JSON array found",
        },
        { status: 500 }
      )
    }

    // Parse JSON with error handling
    let prompts
    try {
      prompts = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("[STUDIO-PRO-PROMPTS] JSON parse error:", parseError)
      console.error("[STUDIO-PRO-PROMPTS] Attempted to parse:", jsonMatch[0].substring(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse AI response as JSON",
        },
        { status: 500 }
      )
    }

    // Validate prompts array
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      console.error("[STUDIO-PRO-PROMPTS] Invalid prompts array:", prompts)
      return NextResponse.json(
        {
          success: false,
          error: "No prompts generated - AI returned empty or invalid array",
        },
        { status: 500 }
      )
    }

    // Validate and format prompts
    const formattedPrompts = prompts.map((p: any, idx: number) => ({
      id: `prompt-${Date.now()}-${idx}`,
      title: p.title || `Option ${idx + 1}`,
      description: p.description || "",
      prompt: p.prompt || "",
      category: contentType || "General"
    }))

    // Validate that at least one prompt has content
    const validPrompts = formattedPrompts.filter(p => p.prompt && p.prompt.trim().length > 0)
    if (validPrompts.length === 0) {
      console.error("[STUDIO-PRO-PROMPTS] No valid prompts with content:", formattedPrompts)
      return NextResponse.json(
        {
          success: false,
          error: "All generated prompts are empty",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      state: "ready",
      prompts: validPrompts, // Use validated prompts
    })

  } catch (error) {
    console.error("[STUDIO-PRO-PROMPTS] Error generating prompts:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to generate prompts"
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
