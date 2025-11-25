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

    console.log("[v0] === GENERATING AUTHENTIC MOTION PROMPT ===")
    console.log("[v0] FLUX Prompt:", fluxPrompt)
    console.log("[v0] Description:", description)
    console.log("[v0] Category:", category)
    console.log("[v0] Image URL:", imageUrl ? "provided" : "not provided")

    if (imageUrl) {
      console.log("[v0] Using Maya's creative vision for authentic motion")

      const visionPrompt = `You're Maya - a creative director who understands that great Instagram B-roll is about capturing authentic micro-moments, not manufactured movement.

**Study this image carefully.** Notice:
- The exact body position and pose
- What the hands are doing or touching
- The environment and objects nearby
- The lighting and mood
- The person's apparent energy level

**Your Philosophy:**
Real people don't move in predictable, templated ways. They have micro-fidgets, subtle weight shifts, unconscious gestures. The best B-roll captures that "caught in the moment" feeling - like someone happened to be filming when something real happened.

**Movement Categories (pick what fits this specific image):**

1. **Micro-adjustments** - The tiny movements we all do unconsciously:
   - Slight weight shift from one foot to another
   - Fingers grazing fabric, adjusting a strap
   - Small head tilt responding to a thought
   - Subtle shoulder roll or relaxation

2. **Environmental reactions** - Responding to surroundings:
   - Turning toward a sound or movement
   - Closing eyes momentarily in warm light
   - Looking up at something overhead
   - Breath catching at a beautiful view

3. **Object interactions** - Natural engagement with items:
   - Bringing cup to lips with genuine intention (not "for the camera")
   - Fingers absentmindedly tracing an edge
   - Adjusting glasses/jewelry with one hand while thinking
   - Phone check that feels habitual, not staged

4. **Emotional micro-expressions** - Subtle feeling shifts:
   - A thought crossing the face that causes a slight smile
   - Eyes softening as they focus on something meaningful
   - The beginning of a laugh not fully released
   - Peaceful exhale visible in shoulders dropping

**Rules for Authenticity:**

✓ Match the exact pose in this image - don't suggest walking if they're sitting
✓ One genuine movement - not a performance, a moment
✓ Add a motivation - why would they move? (a sound, a thought, noticing something)
✓ Natural pacing - most authentic movements are slow and unhurried
✓ Keep it 10-15 words maximum

**What makes movement feel FAKE (avoid these):**
✗ "Poses for camera" or "shows off outfit"
✗ Multiple sequential actions like choreography
✗ Exaggerated hair flips or model walks
✗ Movements that require awareness of being filmed
✗ Generic descriptions that could apply to any image

**Style reference from FLUX prompt:**
"${fluxPrompt}"

${description ? `Scene context: "${description}"` : ""}

${userContext ? `\n**About this creator:** ${userContext.substring(0, 500)}...` : ""}

**Now look at the image and create ONE authentic movement that feels like a captured moment, not a directed action. What micro-moment would make this feel like real life caught on film?**

Return only the motion prompt. 10-15 words. No quotes, no explanation.`

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
        temperature: 0.9, // Higher temperature for more creative, less templated output
      })

      const trimmedPrompt = motionPrompt.trim().replace(/^["']|["']$/g, "") // Remove any quotes
      const wordCount = trimmedPrompt.split(/\s+/).length

      console.log("[v0] ========================================")
      console.log("[v0] Maya's authentic motion prompt:")
      console.log("[v0]", trimmedPrompt)
      console.log("[v0] Word count:", wordCount)
      console.log("[v0] ========================================")

      return NextResponse.json({
        motionPrompt: trimmedPrompt,
        success: true,
      })
    }

    console.log("[v0] No image - generating from FLUX prompt with Maya's intuition")

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: `You're Maya, a creative director who creates motion prompts that feel like stolen moments from real life.

**Your Philosophy:**
Templates kill authenticity. Every motion prompt should feel like it was created specifically for THIS image, THIS person, THIS moment. Never generate something that could work for "any" photo.

**Movement Psychology:**

People move for REASONS:
- A sound catches attention → head turns naturally
- Sunlight feels warm → eyes close briefly, face tilts
- Coffee smells good → deep inhale, shoulders relax
- A memory surfaces → slight smile spreads slowly
- Hair tickles face → hand reaches to tuck it away
- Cold breeze → arms cross, shoulders draw in slightly

**Authentic Motion Formula:**
[setting context] + [motivation trigger] + [natural response]

Instead of: "slowly turns head to look at camera"
Write: "hearing distant music, glances toward the sound with soft curiosity"

Instead of: "casually lifts coffee cup"  
Write: "steam rising from cup, closes eyes for the first warm sip"

Instead of: "walks forward naturally"
Write: "spotting something ahead, pace quickens with quiet excitement"

**10-15 words. One moment. Make it SPECIFIC to the scene described.**

${userContext ? `\n**Creator context:** ${userContext.substring(0, 400)}` : ""}`,
      prompt: `Scene: "${fluxPrompt}"
${description ? `Mood: "${description}"` : ""}
${category ? `Shot type: ${category}` : ""}

Create an authentic motion prompt that feels like a caught moment, not a directed action.`,
      temperature: 0.9,
    })

    const trimmedPrompt = motionPrompt.trim().replace(/^["']|["']$/g, "")
    const wordCount = trimmedPrompt.split(/\s+/).length

    console.log("[v0] ========================================")
    console.log("[v0] Generated authentic motion:", trimmedPrompt)
    console.log("[v0] Word count:", wordCount)
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
