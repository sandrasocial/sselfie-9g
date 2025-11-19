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
      console.log("[v0] 🔍 Image provided - using Maya's vision analysis for authentic motion")

      const visionPrompt = `Hey! Look at this photo and help me create a natural motion prompt for Instagram B-roll.

**What makes great Instagram B-roll?**

Natural, subtle movements that feel authentic - like someone's actually living in the moment. Not staged, not over-the-top.

**The sweet spot: 10-15 words**

Why? Shorter prompts = smoother, more natural movement. Too long = chaotic multi-action mess.

**Look at this image and figure out:**

1. What's the setting? (kitchen, street, cafe, bedroom, etc.)
2. What are they wearing? (keep it simple from the FLUX prompt)
3. What natural movement would fit their exact pose?
4. What's the vibe? (calm, confident, relaxed, playful)

**Natural Movement Examples:**

If they're holding something:
- "In cozy kitchen, slowly brings coffee mug to lips for gentle sip"
- "Sitting at cafe table, casually lifts latte cup with natural gesture"

If near a window/light:
- "Standing by bright window, slowly turns head toward morning light"
- "Near window with soft glow, gently looks outside with calm expression"

If walking/standing on street:
- "Walking casually down sidewalk, glances back over shoulder with slight smile"
- "Leaning against brick wall, casually adjusts sunglasses with confident movement"

If sitting/relaxed:
- "Sitting relaxed on chair, naturally looks up from phone toward window"
- "Seated on steps with coffee, brings cup to lips with calm motion"

If static/minimal:
- "Standing still in natural pose, subtle breathing and minimal head movement"
- "Facing camera in calm stance, slight weight shift with gentle expression"

**Rules for Natural Motion:**

✅ Match the actual pose in the photo (don't suggest walking if they're sitting!)
✅ One clear action with pacing word (slowly, gently, casually, naturally)
✅ Brief context (2-3 words: "in kitchen", "by window", "on sidewalk")
✅ Natural expressions ("slight smile", "calm look" - nothing exaggerated)
✅ Zero camera talk (no "camera pans" or "zooms in")
✅ Zero narrative voice (no "she", "he", "the woman")

**FLUX Prompt for style reference:**
"${fluxPrompt}"

${description ? `Scene vibe: "${description}"` : ""}

Look at the image and create a 10-15 word motion prompt that fits what you actually see. Keep it natural and Instagram-authentic.

Just give me the prompt - no explanation needed!`

      const { text: motionPrompt } = await generateText({
        model: "anthropic/claude-sonnet-4.5",
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
        temperature: 0.8,
      })

      const trimmedPrompt = motionPrompt.trim()
      const wordCount = trimmedPrompt.split(/\s+/).length

      console.log("[v0] ========================================")
      console.log("[v0] 🎨 Maya-generated natural motion prompt:")
      console.log("[v0]", trimmedPrompt)
      console.log("[v0] Word count:", wordCount)
      console.log("[v0] Target: 10-15 words (8-17 acceptable)")
      console.log("[v0] Status:", wordCount >= 8 && wordCount <= 17 ? "✅ Perfect" : "⚠️ Adjust if needed")
      console.log("[v0] ========================================")

      return NextResponse.json({
        motionPrompt: trimmedPrompt,
        success: true,
      })
    }

    console.log("[v0] ⚠️ No image URL - generating from FLUX prompt with Maya's intuition")

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4.5",
      system: `You're Maya! You create natural Instagram B-roll motion prompts.

**Your job:** Turn image descriptions into authentic movement (10-15 words).

**What makes great B-roll:**
- Natural, subtle movements
- One clear action
- Feels authentic, not staged
- Instagram-ready vibes

**Prompt formula:**

[Context 2-3 words] + [pacing word] + [one action] + [subtle detail]

Pacing words: slowly, gently, casually, naturally, smoothly

**Quick examples:**

Coffee vibes:
- "In cozy kitchen, slowly brings coffee mug to lips for warm sip"
- "At cafe table, casually lifts latte with natural relaxed gesture"

Walking/street:
- "Walking down sidewalk, glances back over shoulder with slight smile"
- "Strolling through city, turns head to look back briefly naturally"

Window light:
- "Standing by window, slowly turns head toward soft morning light"
- "Near bright window, gently looks outside with calm expression"

Sitting/relaxed:
- "Sitting on chair, naturally looks up from phone toward camera"
- "Relaxed on steps, brings coffee to lips with calm motion"

Static/minimal:
- "Standing in natural pose, subtle breathing and minimal movement"
- "Facing camera calmly, slight weight shift with gentle expression"

Accessories:
- "Leaning on wall, casually adjusts sunglasses with confident movement"
- "In stylish coat, smoothly slides hand through hair naturally"

**Rules:**
- 10-15 words ideal (8-17 acceptable)
- Brief context first
- Add pacing word
- One natural action
- Optional subtle detail
- No camera instructions
- No "she/he/the person"
- Natural expressions only

Return ONLY the motion prompt. No explanation.`,
      prompt: `FLUX Prompt: "${fluxPrompt}"
${description ? `Scene vibe: "${description}"` : ""}
${category ? `Shot type: ${category}` : ""}

Create a natural 10-15 word Instagram B-roll motion prompt.`,
      temperature: 0.8,
    })

    const trimmedPrompt = motionPrompt.trim()
    const wordCount = trimmedPrompt.split(/\s+/).length

    console.log("[v0] ========================================")
    console.log("[v0] Generated motion prompt:", trimmedPrompt)
    console.log("[v0] Word count:", wordCount)
    console.log("[v0] Target: 10-15 words")
    console.log("[v0] Status:", wordCount >= 10 && wordCount <= 15 ? "✅ Perfect" : wordCount >= 8 && wordCount <= 17 ? "✅ Acceptable" : "⚠️ Adjust")
    console.log("[v0] ========================================")

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
