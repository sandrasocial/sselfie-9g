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

    console.log("[v0] === GENERATING SHORT MOTION PROMPT ===")
    console.log("[v0] FLUX Prompt:", fluxPrompt)
    console.log("[v0] Description:", description)
    console.log("[v0] Category:", category)

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You create SHORT, SIMPLE motion prompts for video generation. Your prompts MUST be under 15 words and describe ONE action only.

**CRITICAL RULES:**
1. MAXIMUM 15 WORDS - Count them. If over 15, start over.
2. ONE ACTION ONLY - Pick one thing. Not two. Not three. ONE.
3. NO NARRATIVE - Never use "she", "her", "he", "his"
4. NO CAMERA WORDS - Never: camera, drift, zoom, pan, arc, following, tracking, capturing
5. NO ATMOSPHERE - Never: glow, vibe, energy, moment, aesthetic, creating, effortless, naturally, gently
6. DIRECTIVE VERBS - Use commands: "brings", "turns", "looks", "shifts", "adjusts"

**THE FORMULA:**
[Action Verb] + [Object/Direction] + [Optional: Simple Detail]

**CORRECT Examples (Copy These):**
- "Brings coffee cup to lips" (5 words)
- "Turns head to look out window" (6 words)
- "Sitting on bed, shifts weight naturally" (6 words)
- "Takes two steps, glances back" (5 words)
- "Hand adjusts necklace briefly" (4 words)
- "Standing still, slight breathing visible" (5 words)

**WRONG Examples (NEVER Do This):**
❌ "She gently turns her head to gaze thoughtfully out the window" (narrative, too long)
❌ "The camera drifts smoothly capturing the intimate moment" (camera words)
❌ "Creating that perfect cozy lifestyle content vibe" (atmosphere words)

**YOUR PROCESS:**
Step 1: Look at the FLUX prompt - what ONE thing can move?
Step 2: Choose that ONE action
Step 3: Write it in 4-8 words using directive verbs
Step 4: Count words. Over 15? Start over.
Step 5: Check for forbidden words. Any present? Start over.

Return ONLY the short motion prompt. No preamble. No explanation. Just the prompt.`,
      prompt: `FLUX Prompt: "${fluxPrompt}"
${description ? `Description: "${description}"` : ""}
${category ? `Category: ${category}` : ""}

Analyze and create ONE short motion prompt (max 15 words, ONE action only).`,
    })

    const trimmedPrompt = motionPrompt.trim()
    const wordCount = trimmedPrompt.split(/\s+/).length

    console.log("[v0] Generated motion prompt:", trimmedPrompt)
    console.log("[v0] Word count:", wordCount)

    // Validate prompt length
    if (wordCount > 15) {
      console.warn("[v0] ⚠️ Motion prompt too long, using fallback")
      return NextResponse.json({
        motionPrompt: "Standing naturally, subtle breathing visible",
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
