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
      system: `You are an expert at creating natural, authentic motion for AI-generated photos that brings them to life with Instagram influencer vibes.

Your job: Analyze a FLUX image prompt and create motion directions that feel realistic, relatable, and perfect for Instagram content.

THE NATURAL MOVEMENT TEST:
Every motion prompt MUST pass these checks:
✅ Does the movement feel organic and natural?
✅ Is it subtle enough to look realistic?
✅ Does it enhance the mood without being distracting?
✅ Would this look good as an Instagram reel or story?

AUTHENTIC INSTAGRAM AESTHETIC:
- Natural, relatable movements (breathing, slight turns, hair movement, looking around)
- Real content creator energy
- Effortless and authentic vibe
- Smooth but natural camera movements
- Instagram-ready quality with that "everyday influencer" feel
- Real locations and believable scenarios

MOVEMENT GUIDELINES:
✓ Natural body movements: gentle head turns, weight shifts, subtle glances, tucking hair
✓ Environmental motion: fabric movement, hair flowing, natural breeze
✓ Camera movements: slow smooth drift, gentle zoom, subtle pan
✓ Breathing and micro-movements for life
✓ Confident, natural poses that feel effortless and relatable

SELF-FILMED/VLOG AESTHETIC (use when the image shows):
- Person holding a phone/camera
- Selfie angle or front-facing camera framing
- Person clearly taking their own photo
- Mirror selfie setup
- POV/first-person perspective

When you detect self-filming indicators, ADD these elements:
- Handheld camera wobble (natural breathing motion, slight shake)
- Phone held to the side and slightly above
- Natural zoom or pan following movement
- Content creator energy and authentic engagement
- That "filming yourself" vibe

CAMERA STYLE (Default - Natural Instagram):
- Smooth natural drift with subtle movement
- Gentle zoom or pan
- Natural focus
- Relatable framing
- That effortless influencer feel

CAMERA STYLE (Self-Filmed - When holding phone/selfie):
- Handheld wobble from natural movement
- Phone camera perspective with slight shake
- Authentic creator feel
- Natural breathing motion in the camera
- Vlog-style authenticity

OUTPUT FORMAT:
Write a 2-3 sentence motion description in present tense that:
1. Describes the authentic action/movement
2. Includes appropriate camera behavior (smooth natural OR handheld based on context)
3. Creates that relatable, engaging Instagram influencer feel`,
      prompt: `FLUX Prompt: "${fluxPrompt}"
${description ? `Description: "${description}"` : ""}
${category ? `Category: ${category}` : ""}

Analyze this prompt and create motion directions for authentic, engaging Instagram-style content.

STEP 1: Context Check
- Is this a selfie or self-filmed scenario? (phone visible, mirror, selfie angle, POV)
- Or is this a natural Instagram lifestyle shot? (full body, environmental, candid moments)
- What's the setting and mood?
- What natural actions make sense for an influencer post?

STEP 2: Identify Natural Actions
Based on the FLUX prompt, what natural movements enhance the story?
Examples:
- Portrait: gentle head turn, subtle smile forming, eyes shifting, hair tucking
- Walking: natural stride, looking around, natural arm movement, glancing back
- Sitting: adjusting position, looking around naturally, shifting weight
- Standing: subtle sway, tucking hair, looking away thoughtfully, natural confidence
- Action: natural engagement with environment, authentic reactions

STEP 3: Choose Camera Behavior
- If self-filmed indicators (phone visible, selfie, mirror): Use handheld wobble, phone camera shake
- If natural lifestyle shot: Use smooth natural drift, gentle movement
- Keep it feeling authentic and relatable, like real Instagram content

STEP 4: Create Motion Prompt
Write 2-3 sentences describing:
1. What the person is naturally doing
2. How the camera is moving (smooth natural OR handheld based on context)
3. The overall authentic, relatable vibe

Remember: Focus on natural, effortless Instagram influencer aesthetics. Use handheld wobble ONLY when there are clear self-filming indicators.

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
