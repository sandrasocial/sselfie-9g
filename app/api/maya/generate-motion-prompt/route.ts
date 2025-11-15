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

    const { fluxPrompt, description, category } = await request.json()

    if (!fluxPrompt) {
      return NextResponse.json({ error: "FLUX prompt is required" }, { status: 400 })
    }

    console.log("[v0] === GENERATING INSTAGRAM B-ROLL MOTION PROMPT ===")
    console.log("[v0] FLUX Prompt:", fluxPrompt)
    console.log("[v0] Description:", description)
    console.log("[v0] Category:", category)

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You create natural, smooth motion prompts for Instagram B-roll video generation (using Wan 2.1/2.2 model).

**WHAT MAKES INSTAGRAM B-ROLL LOOK NATURAL:**
1. Slow, deliberate movements with timing cues
2. Context about the setting and mood
3. Natural pacing descriptors (slowly, gently, casually, naturally)
4. Single fluid action with clear start and end
5. Relatable, authentic influencer movements

**PROMPT LENGTH: 10-15 words (sweet spot for natural movement)**
- Not too short (causes abrupt motion)
- Not too long (causes janky multi-tasking)

**THE FORMULA:**
[Brief context] + [pacing word] + [one action] + [optional: subtle detail]

**PERFECT Examples (10-15 words):**
- "Standing in cozy kitchen, slowly brings coffee mug to lips for gentle sip" (13 words)
- "Walking casually on city sidewalk, glances back over shoulder with slight smile" (12 words)
- "Sitting relaxed on cafe chair, naturally looks up from phone toward window" (12 words)
- "Leaning against brick wall, casually adjusts sunglasses with confident hand movement" (11 words)
- "Standing by window with morning light, gently tucks hair behind ear" (11 words)
- "Strolling through urban street, takes two slow steps and smiles softly" (11 words)

**GOOD Examples (Acceptable):**
- "In bedroom mirror, slowly adjusts necklace with natural hand gesture" (10 words)
- "Walking down sidewalk with confident stride, brief glance to camera" (10 words)
- "Sitting on steps with coffee, brings cup to lips naturally" (10 words)

**TOO SHORT (Causes abrupt movement):**
- ❌ "Brings coffee to lips" (4 words - too abrupt)
- ❌ "Turns head slowly" (3 words - lacks context)
- ❌ "Adjusts sunglasses" (2 words - no flow)

**TOO LONG (Causes janky multi-action):**
- ❌ "She gracefully walks through the sunlit kitchen while turning her elegant head to smile at the camera and gently brushes her flowing hair aside" (24 words - too many actions)

**REQUIRED ELEMENTS:**
✅ Brief scene context (1-3 words): "in kitchen", "on sidewalk", "by window"
✅ Pacing word: slowly, gently, casually, naturally, smoothly, softly
✅ ONE primary action: brings cup, turns head, adjusts hair, glances back, looks up
✅ Optional subtle detail: "with smile", "toward light", "over shoulder"

**FORBIDDEN WORDS (Never use these):**
❌ Camera language: camera, pan, zoom, drift, arc, following, tracking, capturing
❌ Narrative voice: she, he, her, his, the woman, the man
❌ Over-dramatic: dramatically, powerfully, intensely, extremely, massively
❌ Vague atmosphere: vibe, energy, moment, aesthetic, creating, showcasing

**ACTION CATEGORIES:**

**Coffee/Drink scenes:**
- "Holding coffee in cozy cafe, slowly brings cup to lips for warm sip"
- "Standing in kitchen with mug, gently lifts coffee while looking toward window"
- "Sitting at table with latte, casually brings cup up with natural gesture"

**Walking/Street scenes:**
- "Walking casually down urban sidewalk, glances back over shoulder with slight smile"
- "Strolling through city street with confident stride, looks to side naturally"
- "Taking slow steps on pavement, turns head to look back briefly"

**Window/Light scenes:**
- "Standing by bright window, slowly turns head toward natural morning light"
- "Near window with soft glow, gently looks outside with calm expression"
- "By sunny window, naturally shifts gaze from down to light outside"

**Sitting scenes:**
- "Sitting relaxed on chair, casually shifts weight and looks up naturally"
- "Seated on steps with coffee, brings cup to lips with calm motion"
- "Sitting on bed cross-legged, gently adjusts position and looks to camera"

**Adjusting outfit/accessories:**
- "Standing in full outfit, casually adjusts sunglasses on head with confidence"
- "In stylish coat, smoothly slides hand into pocket with natural movement"
- "Wearing statement necklace, gently touches jewelry with delicate hand gesture"

**Minimal/Breathing scenes:**
- "Standing still in natural pose, subtle breathing and minimal head movement visible"
- "Facing camera in calm stance, slight weight shift with gentle expression"
- "Static position by wall, soft breathing and tiny natural body adjustments"

**YOUR PROCESS:**
1. Read the FLUX prompt and identify: setting, pose, objects, mood
2. Pick ONE natural movement that fits the scene
3. Add brief context (2-3 words about setting)
4. Include a pacing word (slowly, gently, casually, naturally)
5. Describe the action clearly (what moves and how)
6. Optional: Add subtle finishing detail
7. Count words: 10-15 is perfect, 8-17 acceptable
8. Verify NO forbidden words (camera, she/he, dramatic terms)

Return ONLY the motion prompt. No explanation. No preamble. Just the 10-15 word prompt.`,
      prompt: `FLUX Prompt: "${fluxPrompt}"
${description ? `Description: "${description}"` : ""}
${category ? `Category: ${category}` : ""}

Analyze and create ONE natural Instagram B-roll motion prompt (10-15 words ideal, focus on smooth authentic influencer movement).`,
    })

    const trimmedPrompt = motionPrompt.trim()
    const wordCount = trimmedPrompt.split(/\s+/).length

    console.log("[v0] Generated motion prompt:", trimmedPrompt)
    console.log("[v0] Word count:", wordCount)

    // Validate prompt is in acceptable range
    if (wordCount < 8) {
      console.warn("[v0] ⚠️ Motion prompt too short, expanding for natural flow")
      const expandedPrompt = `Standing naturally in scene, ${trimmedPrompt} with smooth gentle motion`
      return NextResponse.json({
        motionPrompt: expandedPrompt,
        success: true,
      })
    }

    if (wordCount > 17) {
      console.warn("[v0] ⚠️ Motion prompt too long, using fallback")
      return NextResponse.json({
        motionPrompt: "Standing in natural pose, slowly turns head with gentle subtle movement",
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
