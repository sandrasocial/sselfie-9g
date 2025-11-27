import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"

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

    const userContext = await getUserContextForMaya(authUser.id)

    console.log("[v0] === GENERATING MOTION PROMPT FOR WAN-2.5 I2V ===")
    console.log("[v0] FLUX Prompt:", fluxPrompt)
    console.log("[v0] Description:", description)
    console.log("[v0] Category:", category)
    console.log("[v0] Image URL:", imageUrl ? "provided" : "not provided")

    if (imageUrl) {
      console.log("[v0] Using image analysis for pose-accurate motion")

      const visionPrompt = `You're Maya - a creative director specializing in authentic Instagram B-roll motion for WAN-2.5 I2V.

**ANALYZE THE IMAGE CAREFULLY:**
1. What is the exact body position? (sitting, standing, leaning, etc.)
2. Where are the hands/arms positioned?
3. What's the head position and gaze direction?
4. What's the environment? (indoor, outdoor, objects nearby)
5. What's the energy level? (relaxed, alert, contemplative)

**WAN-2.5 I2V MOTION FORMULA:**
Motion Description + Camera Movement (split on purpose)

**5-SECOND STRUCTURE:**
[0-2s] Initial subject motion + camera starts
[2-4s] Motion develops + camera continues
[4-5s] Settle + camera completes

**PROMPT FORMAT:**
"[Subject performs action]; camera [specific movement]"

**PERFECT EXAMPLES:**

Example 1 (Portrait with Breeze):
"Hair lifts gently from breeze, fingers slowly tuck strands behind ear, eyes close briefly in peaceful moment, settles with soft smile; camera gentle push-in emphasizing intimate expression"

Example 2 (Coffee Morning):
"Lifts coffee mug slowly to lips, takes deliberate sip, eyes gaze thoughtfully through window, lowers mug with satisfied exhale; camera subtle dolly-in capturing contemplative mood"

Example 3 (Outdoor Moment):
"Head turns gently toward distant sound, gaze softens in thought, slight smile forms naturally, shoulders relax settling into scene; camera fixed maintaining authentic caught-moment feel"

**SUBJECT MOTION RULES:**
- 30-50 words for subject motion
- Micro-movements: blinks, breaths, subtle shifts, finger movements
- Speed modifiers: slowly, gently, subtly, gradually
- Natural triggers: breeze, light, sound, warmth
- Motion MUST match exact pose (sitting stays sitting)
- ONE continuous fluid sequence

**CAMERA MOVEMENT OPTIONS:**
- "camera gentle push-in" (subtle intimacy)
- "camera fixed" (authentic Instagram, no movement)
- "camera slight tilt up" (reveal more context)
- "camera slow pan right" (environmental reveal)
- "camera subtle dolly-out" (breathing room)

**KEY FOR REALISM:**
- Split motion on purpose: subject performs; camera moves
- Favor gentle camera moves to prevent jitter
- Keep camera mostly static for Instagram authenticity
- Avoid tiny flickering details
- No conflicting movements with pose

❌ AVOID:
- Dramatic gestures or poses
- Walking/running if person is still
- Camera-aware movements
- Multiple simultaneous complex actions
- Fast camera movements that cause jitter

Scene: "${fluxPrompt}"
${description ? `Mood: "${description}"` : ""}

Return ONLY: [Subject motion]; camera [movement]
No headers, quotes, explanations, or bullet points.`

      const { text: motionPrompt } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
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
        temperature: 0.85,
      })

      let trimmedPrompt = motionPrompt.trim()

      // Remove markdown headers
      trimmedPrompt = trimmedPrompt.replace(/\*\*[^*]+:\*\*/g, "")

      // Remove bullet points
      trimmedPrompt = trimmedPrompt.replace(/^[-*•]\s*/gm, "")

      // Take only first line (ignore explanations)
      trimmedPrompt = trimmedPrompt.split("\n")[0]

      // Remove quotes
      trimmedPrompt = trimmedPrompt.replace(/^["'`]|["'`]$/g, "")

      // Remove asterisks
      trimmedPrompt = trimmedPrompt.replace(/\*/g, "")

      // Remove any prefixes like "Motion:" or "Prompt:"
      trimmedPrompt = trimmedPrompt.replace(/^(motion|prompt|description):\s*/i, "")

      // Final trim
      trimmedPrompt = trimmedPrompt.trim()

      console.log("[v0] ========================================")
      console.log("[v0] Wan-2.5 I2V optimized motion prompt:")
      console.log("[v0]", trimmedPrompt)
      console.log("[v0] Word count:", trimmedPrompt.split(" ").length)
      console.log("[v0] ========================================")

      return NextResponse.json({
        motionPrompt: trimmedPrompt,
        success: true,
      })
    }

    console.log("[v0] No image - generating from FLUX prompt with Wan-2.5 best practices")

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: `You're Maya, creating authentic motion prompts for WAN-2.5 I2V (image-to-video) 5-second clips.

**WAN-2.5 FORMULA:**
Motion Description + Camera Movement (split on purpose)

**FORMAT:**
"[Subject performs action]; camera [specific movement]"

**5-SECOND STRUCTURE:**
[0-2s] Initial subject motion + camera starts
[2-4s] Motion develops + camera continues  
[4-5s] Settle + camera completes

**PERFECT EXAMPLES:**

Example 1 (Cozy Indoor):
"Warm light shifts across face, eyes close slowly savoring warmth, fingers wrap around mug lifting to lips, takes deliberate sip, lowers with peaceful smile; camera gentle push-in capturing intimate moment"

Example 2 (Outdoor Breeze):
"Breeze catches hair lifting gently, hand reaches up tucking strands behind ear naturally, eyes close briefly feeling air, head tilts into breeze, shoulders relax; camera fixed maintaining authentic feel"

Example 3 (Contemplative):
"Distant sound catches attention, head turns gently, gaze softens in thought, fingers adjust necklace absently, slow blink as subtle smile forms; camera subtle dolly-in emphasizing emotion"

Example 4 (Morning Energy):
"Stretches arms overhead slowly, deep breath filling chest, releases tension with satisfied exhale, rolls shoulders back settling into posture; camera slight tilt up revealing confident presence"

**SUBJECT MOTION (30-50 words):**
- Use: slowly, gently, subtly, gradually, softly
- Specify: eyes, head, fingers, shoulders, lips, hands
- Natural triggers: breeze, light, sound, warmth
- ONE continuous sequence
- Micro-movements only

**CAMERA MOVEMENT (5-10 words):**
- "camera gentle push-in" (intimacy)
- "camera fixed" (authentic Instagram)
- "camera slight tilt up/down" (context)
- "camera slow pan left/right" (reveal)
- "camera subtle dolly-out" (space)

**KEY PRINCIPLES:**
- Split motion: subject performs; camera moves
- Favor gentle camera moves (no jitter)
- Keep mostly static for Instagram authenticity
- Avoid tiny flickering details

Return ONLY: [Subject motion]; camera [movement]`,
      prompt: `Scene: "${fluxPrompt}"
${description ? `Mood: "${description}"` : ""}

Create the 5-second motion sequence:`,
      temperature: 0.85,
    })

    let trimmedPrompt = motionPrompt.trim()
    trimmedPrompt = trimmedPrompt.replace(/\*\*[^*]+:\*\*/g, "")
    trimmedPrompt = trimmedPrompt.replace(/^[-*•]\s*/gm, "")
    trimmedPrompt = trimmedPrompt.split("\n")[0]
    trimmedPrompt = trimmedPrompt.replace(/^["'`]|["'`]$/g, "")
    trimmedPrompt = trimmedPrompt.replace(/\*/g, "")
    trimmedPrompt = trimmedPrompt.replace(/^(motion|prompt|description):\s*/i, "")
    trimmedPrompt = trimmedPrompt.trim()

    console.log("[v0] ========================================")
    console.log("[v0] Wan-2.5 optimized motion:", trimmedPrompt)
    console.log("[v0] Word count:", trimmedPrompt.split(" ").length)
    console.log("[v0] ========================================")

    return NextResponse.json({
      motionPrompt: trimmedPrompt,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error generating motion prompt:", error)
    return NextResponse.json({ error: "Failed to generate motion prompt" }, { status: 500 })
  }
}
