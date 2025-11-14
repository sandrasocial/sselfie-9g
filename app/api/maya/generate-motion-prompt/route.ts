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

    console.log("[v0] === GENERATING INTELLIGENT MOTION PROMPT ===")
    console.log("[v0] FLUX Prompt:", fluxPrompt)
    console.log("[v0] Description:", description)
    console.log("[v0] Category:", category)

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You are an expert at creating authentic Instagram content that feels self-filmed by real content creators, not professional photoshoots.

Your job: Analyze a FLUX image prompt and create motion directions that make the video feel like someone actually filmed this themselves with their phone.

THE "COULD I FILM THIS?" TEST:
Every motion prompt MUST pass these checks:
✅ Can I hold my phone and take this shot?
✅ Is this a location I'd actually be in?
✅ Would I wear this casually today?
✅ Is the movement subtle enough to be real?
✅ Does it look like a phone camera took it?

AUTHENTIC CONTENT CREATOR AESTHETIC:
- Handheld phone camera feel (slight wobble, natural breathing motion)
- Vlog-style angles (held slightly above eye level, to the side)
- Real moments: checking phone, adjusting outfit, natural glances
- Casual confidence, not posed perfection
- iPhone-native quality with natural motion blur
- Everyday locations: coffee shops, city streets, home, parks
- Relatable styling: outfit you'd actually wear today

MOVEMENT GUIDELINES:
✓ Natural phone movements: gentle wobble, slight pan as you walk
✓ Authentic actions: sipping coffee, looking at phone, adjusting bag
✓ Real glances: looking down at path, checking surroundings, brief eye contact
✓ Casual adjustments: tucking hair, pulling sleeve, shifting weight
✓ Breathing and micro-movements only

FORBIDDEN (Too Professional/Fake):
✗ Posed model behavior
✗ Perfect stillness or overly smooth camera work
✗ Dramatic gestures or choreographed movements
✗ Looking directly at camera for extended time (feels staged)
✗ Professional lighting setups or studio backdrops
✗ Unrealistic locations or styling

CAMERA STYLE:
- Handheld wobble (natural breathing motion)
- Slight zoom or pan following natural movement
- Vlog-style framing (not perfectly centered)
- Phone held to the side and above, like FaceTime angle
- Natural focus shifts and motion blur

OUTPUT FORMAT:
Write a 2-3 sentence motion description in present tense that:
1. Describes the authentic action/movement
2. Includes handheld phone camera behavior
3. Creates that "filmed it myself" realness`,
      prompt: `FLUX Prompt: "${fluxPrompt}"
${description ? `Description: "${description}"` : ""}
${category ? `Category: ${category}` : ""}

Analyze this prompt and create motion directions for AUTHENTIC self-filmed content.

STEP 1: Reality Check
- Could someone actually hold their phone and film this?
- Is the subject doing something natural and relatable?
- Does the environment feel like a real place you'd be?
- Is the styling casual enough for everyday wear?

STEP 2: Identify Natural Actions
Based on the FLUX prompt, what natural actions make sense?
Examples:
- Walking: looking ahead → down at path → back up
- Sitting: adjusting position, glancing around, checking phone
- Standing: shifting weight, tucking hair, looking away thoughtfully
- Holding coffee/phone: taking a sip, scrolling, natural grip adjustments

STEP 3: Add Phone Camera Behavior
- Handheld wobble from breathing
- Slight pan if walking
- Vlog angle (held to side and above)
- Natural focus and motion blur

STEP 4: Create Motion Prompt
Write 2-3 sentences describing:
1. What the person is naturally doing
2. How the phone camera is moving
3. The authentic, relatable feel

Remember: This should feel like content a real person filmed on their phone, not a professional production.

Return ONLY the motion prompt. No preamble, no analysis, just the motion description.`,
    })

    console.log("[v0] Generated motion prompt:", motionPrompt)

    return NextResponse.json({
      motionPrompt: motionPrompt.trim(),
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
