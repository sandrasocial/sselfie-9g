import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { fluxPrompt, description, category, imageUrl } = await request.json()

    if (!fluxPrompt) {
      return NextResponse.json({ error: "FLUX prompt is required" }, { status: 400 })
    }

    console.log("[v0] === GENERATING INSTAGRAM B-ROLL MOTION PROMPT ===")
    console.log("[v0] FLUX Prompt:", fluxPrompt)
    console.log("[v0] Description:", description)
    console.log("[v0] Category:", category)
    console.log("[v0] Image URL:", imageUrl)

    if (imageUrl) {
      console.log("[v0] 🔍 Image provided - using vision analysis for accurate motion prompt")

      const visionPrompt = `Analyze this image and create a natural Instagram B-roll motion prompt optimized for Wan 2.2 video model.

**CRITICAL: Only suggest movements that match what you SEE in the image.**

**WAN 2.2 OPTIMIZATION REQUIREMENTS:**
Formula: Subject + Scene + Motion Description + Amplitude/Speed modifiers
- **Ideal length: 12-16 words** (Wan 2.2's sweet spot for smooth motion)
- Include amplitude descriptors: subtle, slight, gentle, moderate, natural, smooth
- Include speed modifiers: slowly, gradually, smoothly, gently, casually, naturally
- Add depth cues when relevant: "while background stays still", "with soft focus behind"

**ANALYZE THE IMAGE:**
1. What is the person's exact pose and position?
2. What direction are they facing?
3. What objects are nearby or in hand?
4. What movement would be NATURAL from this position?
5. What's the depth/background context?

**ONLY suggest movements that are PHYSICALLY POSSIBLE:**
- If facing forward → subtle head turn, weight shift, breathing
- If holding coffee → brings cup to lips with smooth motion
- If walking pose → takes gradual steps forward with natural stride
- If static pose → minimal movement, gentle breathing, slight adjustment
- If looking down → looks up naturally with fluid motion
- NEVER suggest "looks over shoulder" unless already in that position!

**WAN 2.2 OPTIMIZED PROMPT STRUCTURE (12-16 words):**
[Scene context 2-3 words] + [amplitude word] + [speed modifier] + [ONE action] + [optional: depth cue]

**PERFECT EXAMPLES (12-16 words):**
- "Standing in bright kitchen, subtle and smooth head turn toward window with soft expression" (14 words)
- "Walking casually on sidewalk, gradual glance back over shoulder with natural confident smile" (13 words)
- "Sitting relaxed at table, gentle and slow lift of coffee cup toward lips" (13 words)
- "By sunny window, slight natural turn to face light with smooth fluid motion" (13 words)
- "Leaning on wall, subtle hand adjustment to sunglasses with gradual confident movement" (12 words)

**AMPLITUDE DESCRIPTORS (choose ONE that fits):**
- subtle, slight, gentle (for minimal movements)
- moderate, natural, smooth (for medium movements)  
- fluid, gradual, continuous (for flowing movements)

**SPEED MODIFIERS (choose ONE):**
- slowly, gradually, smoothly, gently, casually, naturally, fluidly

Return ONLY the motion prompt (12-16 words), no explanation.

FLUX description for context: "${fluxPrompt}"
${description ? `Scene description: "${description}"` : ""}`

      const { text: motionPrompt } = await generateText({
        model: "anthropic/claude-sonnet-4",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: visionPrompt,
              },
              {
                type: "image",
                image: imageUrl,
              },
            ],
          },
        ],
      })

      const trimmedPrompt = motionPrompt.trim()
      const wordCount = trimmedPrompt.split(/\s+/).length

      console.log("[v0] 🎨 Vision-generated motion prompt:", trimmedPrompt)
      console.log("[v0] Word count:", wordCount)
      console.log("[v0] Wan 2.2 optimization:", wordCount >= 12 && wordCount <= 16 ? "✅ OPTIMAL" : "⚠️ Suboptimal")

      if (wordCount < 12) {
        console.warn("[v0] ⚠️ Motion prompt too short, expanding for natural flow")
        const expandedPrompt = `Standing naturally in scene, gentle and smooth ${trimmedPrompt} with fluid motion`
        return NextResponse.json({
          motionPrompt: expandedPrompt,
          success: true,
        })
      }

      if (wordCount > 16) {
        console.warn("[v0] ⚠️ Motion prompt too long, using fallback")
        return NextResponse.json({
          motionPrompt: "Standing in natural pose, subtle and smooth head turn with gentle fluid movement",
          success: true,
        })
      }

      return NextResponse.json({
        motionPrompt: trimmedPrompt,
        success: true,
      })
    }

    console.log("[v0] ⚠️ No image URL - generating motion prompt from FLUX text only")

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You create natural, smooth motion prompts optimized for Instagram B-roll video generation using Wan 2.2 model.

**WAN 2.2 OPTIMIZATION:**
The Wan 2.2 video model performs best with prompts that include:
1. Scene context (2-3 words about setting)
2. Amplitude descriptor (subtle, slight, gentle, moderate, natural, smooth, fluid, gradual)
3. Speed modifier (slowly, gradually, smoothly, gently, casually, naturally, fluidly, softly)
4. Single clear action description
5. Optional: depth/parallax cues

**IDEAL PROMPT LENGTH: 12-16 words**
- Wan 2.2 handles 12-16 words optimally (creates smooth, natural motion)
- Not too short (causes abrupt motion)
- Not too long (causes janky multi-action)

**THE OPTIMIZED FORMULA:**
[Scene context] + [amplitude] + [speed] + [one action] + [optional depth cue]

**PERFECT Examples (12-16 words, Wan 2.2 optimized):**
- "Standing in cozy kitchen, gentle and slow lift of coffee mug toward lips" (13 words)
- "Walking casually on city street, gradual glance back over shoulder with slight smile" (13 words)
- "Sitting relaxed on cafe chair, subtle and smooth look up from phone toward window" (14 words)
- "Leaning against brick wall, moderate and casual adjustment of sunglasses with confident motion" (13 words)
- "Standing by window with morning light, gentle and gradual tuck of hair behind ear" (14 words)
- "Strolling through urban sidewalk, smooth and natural two steps forward with slight smile" (13 words)

**AMPLITUDE DESCRIPTORS (essential for Wan 2.2):**
- **Minimal motion:** subtle, slight, gentle, soft, delicate
- **Medium motion:** moderate, natural, smooth, easy, casual
- **Flowing motion:** fluid, gradual, continuous, seamless

**SPEED MODIFIERS (essential for Wan 2.2):**
- slowly, gradually, smoothly, gently, casually, naturally, fluidly, softly

**DEPTH/PARALLAX CUES (when relevant):**
- "while background stays still"
- "with soft focus behind"
- "as foreground blurs slightly"

**ACTION CATEGORIES WITH WAN 2.2 OPTIMIZATION:**

**Coffee/Drink scenes:**
- "Holding coffee in cozy cafe, gentle and slow lift of cup toward lips" (13 words)
- "Standing in kitchen with mug, smooth and gradual raise of coffee while looking outside" (14 words)
- "Sitting at table with latte, subtle and natural bring cup up with calm expression" (14 words)

**Walking/Street scenes:**
- "Walking casually down urban sidewalk, gradual glance back over shoulder with slight smile" (13 words)
- "Strolling through city street, smooth and natural stride with confident look to side" (13 words)
- "Taking slow steps on pavement, gentle and fluid head turn to look back" (14 words)

**Window/Light scenes:**
- "Standing by bright window, subtle and smooth turn of head toward natural light" (13 words)
- "Near window with soft glow, gentle and gradual look outside with calm expression" (13 words)
- "By sunny window, natural and fluid shift of gaze from down to light outside" (15 words)

**Sitting scenes:**
- "Sitting relaxed on chair, subtle and casual weight shift with natural upward look" (13 words)
- "Seated on steps with coffee, smooth and gentle lift of cup toward lips" (13 words)
- "Sitting on bed cross-legged, gradual and natural position adjustment with camera look" (12 words)

**Adjusting outfit/accessories:**
- "Standing in full outfit, casual and smooth adjustment of sunglasses with confident motion" (12 words)
- "In stylish coat, gentle and gradual slide of hand into pocket naturally" (12 words)
- "Wearing statement necklace, delicate and soft touch of jewelry with natural hand gesture" (13 words)

**Minimal/Breathing scenes:**
- "Standing still in natural pose, subtle breathing visible with gentle minimal movement" (12 words)
- "Facing camera in calm stance, slight and gradual weight shift with soft expression" (13 words)
- "Static position by wall, soft breathing and delicate natural body adjustments visible" (12 words)

**YOUR PROCESS:**
1. Read the FLUX prompt: identify setting, pose, objects, mood
2. Choose ONE natural movement
3. Add scene context (2-3 words)
4. Pick amplitude descriptor (subtle/gentle/moderate/natural/smooth/fluid/gradual)
5. Add speed modifier (slowly/gradually/smoothly/gently/casually/naturally)
6. Describe the action clearly
7. Optional: Add depth cue if scene has layered background
8. Count words: 12-16 is IDEAL for Wan 2.2
9. Verify NO forbidden words (camera, she/he, dramatic)

Return ONLY the motion prompt. No explanation. Just the 12-16 word optimized prompt.`,
      prompt: `FLUX Prompt: "${fluxPrompt}"
${description ? `Description: "${description}"` : ""}
${category ? `Category: ${category}` : ""}

Create ONE natural Instagram B-roll motion prompt optimized for Wan 2.2 (12-16 words ideal, include amplitude + speed descriptors).`,
    })

    const trimmedPrompt = motionPrompt.trim()
    const wordCount = trimmedPrompt.split(/\s+/).length

    console.log("[v0] Generated motion prompt:", trimmedPrompt)
    console.log("[v0] Word count:", wordCount)
    console.log("[v0] Wan 2.2 optimization:", wordCount >= 12 && wordCount <= 16 ? "✅ OPTIMAL" : "⚠️ Suboptimal")

    if (wordCount < 12) {
      console.warn("[v0] ⚠️ Motion prompt too short, expanding for natural flow")
      const expandedPrompt = `Standing naturally in scene, gentle and smooth ${trimmedPrompt} with fluid motion`
      return NextResponse.json({
        motionPrompt: expandedPrompt,
        success: true,
      })
    }

    if (wordCount > 16) {
      console.warn("[v0] ⚠️ Motion prompt too long, using fallback")
      return NextResponse.json({
        motionPrompt: "Standing in natural pose, subtle and smooth head turn with gentle fluid movement",
        success: true,
      })
    }

    return NextResponse.json({
      motionPrompt: trimmedPrompt,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error generating motion prompt:", error)
    return NextResponse.json(
      { error: "Failed to generate motion prompt" },
      { status: 500 }
    )
  }
}
