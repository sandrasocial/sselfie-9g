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
      console.log("[v0] 🔍 Image provided - using vision analysis for detailed motion prompt")

      const visionPrompt = `You are creating a detailed Instagram B-roll/Reel motion prompt for the Wan 2.2 video model.

**YOU HAVE ACCESS TO:**
1. The actual image (analyze it carefully)
2. The FLUX prompt that generated this image (maintain consistency with this styling)

**YOUR TASK:**
Create a 50-70 word motion prompt following this EXACT structure:

**STRUCTURE:**
[Shot type] of a [gender] in [specific outfit details from FLUX prompt], [location/position you see in image], [ONE primary slow action]. [Secondary static detail about hands/face/posture]. [Specific lighting description from image]. [Background/environment details with clean aesthetic]. The camera [gentle movement], capturing this [mood/aesthetic] moment.

**REQUIREMENTS:**
✅ 50-70 words (not 12-16!)
✅ Start with shot type (Medium shot, Close-up, Wide shot, etc.)
✅ Use specific clothing details FROM THE FLUX PROMPT (fabrics, colors, fit)
✅ Describe ONLY what you see in the location (indoor kitchen, outdoor terrace, etc.)
✅ ONE primary slow action (slowly bringing coffee to lips, gently tucking hair, casually adjusting sunglasses)
✅ Secondary static details (hands relaxed, slight smile, natural posture)
✅ Specific lighting (golden hour, soft morning light, overcast natural light, window light)
✅ Clean aesthetic backgrounds (minimal Scandinavian interior, modern architectural setting, clean urban backdrop)
✅ Camera movement (slowly pushes in, gentle drift, subtle zoom, steady hold)
✅ Mood descriptor (quiet contemplative, confident casual, effortless chic)

**EXAMPLE OF CORRECT FORMAT (62 words):**
"Medium shot of a woman in an oversized cream cashmere sweater and high-waisted denim, standing at a modern kitchen counter by a large window, slowly bringing a ceramic coffee mug to her lips. Her other hand rests naturally on the marble counter. Soft morning light streams through the window, illuminating the minimal Scandinavian interior with white walls. The camera slowly pushes in, capturing this quiet contemplative morning moment."

**WHAT YOU MUST DO:**
1. LOOK at the image - is it indoors or outdoors? What's the actual setting?
2. READ the FLUX prompt - extract exact clothing details, colors, fabrics
3. IDENTIFY one natural slow action visible or appropriate from their pose
4. DESCRIBE the lighting you see in the image
5. WRITE 50-70 words following the structure exactly

**WHAT YOU MUST NEVER DO:**
❌ Say "outdoor terrace" if the image shows indoors
❌ Invent clothing details not in the FLUX prompt
❌ Write less than 50 or more than 70 words
❌ Skip any required elements (shot type, outfit details, lighting, camera, mood)
❌ Use generic descriptions - be SPECIFIC

**ORIGINAL FLUX PROMPT (maintain these style details):**
"${fluxPrompt}"

${description ? `Scene description: "${description}"` : ""}

**YOUR OUTPUT:**
Return ONLY the 50-70 word motion prompt. No explanation. Just the prompt.`

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

      console.log("[v0] ========================================")
      console.log("[v0] 🎨 VISION-GENERATED DETAILED MOTION PROMPT:")
      console.log("[v0]", trimmedPrompt)
      console.log("[v0] Word count:", wordCount)
      console.log("[v0] Target range: 50-70 words")
      console.log("[v0] Status:", wordCount >= 50 && wordCount <= 70 ? "✅ PERFECT" : "⚠️ Needs adjustment")
      console.log("[v0] ========================================")

      return NextResponse.json({
        motionPrompt: trimmedPrompt,
        success: true,
      })
    }

    console.log("[v0] ⚠️ No image URL - generating detailed motion prompt from FLUX text only")

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You create detailed Instagram B-roll motion prompts for Wan 2.2 video model.

**PROMPT STRUCTURE (50-70 words):**
[Shot type] of a [gender] in [specific outfit details from FLUX prompt], [location/position], [ONE primary slow action]. [Secondary static detail about hands/face/posture]. [Specific lighting description]. [Background/environment details with clean aesthetic]. The camera [gentle movement], capturing this [mood/aesthetic] moment.

**REQUIREMENTS:**
- 50-70 words (this is critical!)
- Start with shot type (Medium shot, Close-up, Wide shot, etc.)
- Extract specific clothing from FLUX prompt (fabrics, colors, fit)
- ONE primary slow action (slowly bringing, gently tucking, casually adjusting)
- Static secondary details (hands relaxed, slight smile, natural posture)
- Specific lighting (golden hour, soft morning light, window light, overcast)
- Clean aesthetic backgrounds (minimal, modern, Scandinavian, architectural)
- Camera movement (slowly pushes in, gentle drift, subtle zoom)
- Mood descriptor (quiet contemplative, confident casual, effortless chic)

**PERFECT EXAMPLES:**

Coffee scene (58 words):
"Medium shot of a woman in an oversized cream cashmere sweater and high-waisted denim, standing at a modern kitchen counter by a large window, slowly bringing a ceramic coffee mug to her lips. Her other hand rests naturally on the marble counter. Soft morning light streams through the window, illuminating the minimal Scandinavian interior. The camera slowly pushes in, capturing this quiet contemplative moment."

Walking scene (61 words):
"Wide shot of a woman in a camel wool trench coat and white silk blouse, walking casually along a clean urban sidewalk with modern architecture in the background, taking two slow steps forward while glancing back over her shoulder with a slight confident smile. Her hands are tucked naturally into coat pockets. Golden hour light creates soft shadows. The camera tracks alongside smoothly, capturing this effortlessly chic stroll."

Window light scene (57 words):
"Close-up of a woman in a soft beige knit turtleneck, standing by a large bright window in a minimal white bedroom, gently tucking a strand of hair behind her ear while looking outside with a calm expression. Natural diffused light illuminates her face beautifully. The clean background features simple modern furniture. The camera holds steady, capturing this serene morning moment."

Sitting/cafe scene (64 words):
"Medium shot of a woman in a vintage leather jacket over a white tee and black jeans, sitting relaxed on a wooden chair in a modern cafe with industrial design elements, slowly lifting a latte cup while maintaining eye contact with the camera with a subtle knowing smile. Her other hand rests on her crossed leg. Soft window light creates a warm atmosphere. The camera subtly zooms in, capturing this confident casual vibe."

**YOUR PROCESS:**
1. Read FLUX prompt - identify ALL clothing details
2. Choose appropriate setting matching the aesthetic
3. Select ONE natural slow action
4. Add secondary static details
5. Describe specific lighting appropriate for the scene
6. Mention clean aesthetic background
7. Add camera movement
8. Close with mood descriptor
9. Count words - must be 50-70

Return ONLY the motion prompt. No explanation.`,
      prompt: `FLUX Prompt: "${fluxPrompt}"
${description ? `Description: "${description}"` : ""}
${category ? `Category: ${category}` : ""}

Create a detailed Instagram B-roll motion prompt (50-70 words, following exact structure).`,
    })

    const trimmedPrompt = motionPrompt.trim()
    const wordCount = trimmedPrompt.split(/\s+/).length

    console.log("[v0] ========================================")
    console.log("[v0] Generated detailed motion prompt:", trimmedPrompt)
    console.log("[v0] Word count:", wordCount)
    console.log("[v0] Target: 50-70 words")
    console.log("[v0] Status:", wordCount >= 50 && wordCount <= 70 ? "✅ PERFECT" : "⚠️ Needs adjustment")
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
