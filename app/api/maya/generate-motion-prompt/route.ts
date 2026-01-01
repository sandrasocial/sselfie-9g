import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
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

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { fluxPrompt, description, category, imageUrl } = await request.json()

    if (!fluxPrompt) {
      return NextResponse.json({ error: "FLUX prompt is required" }, { status: 400 })
    }

    console.log("[v0] === GENERATING MOTION PROMPT FOR WAN-2.5 I2V ===")
    console.log("[v0] FLUX Prompt:", fluxPrompt)
    console.log("[v0] Description:", description)
    console.log("[v0] Category:", category)
    console.log("[v0] Image URL:", imageUrl ? `✅ Provided: ${imageUrl.substring(0, 100)}...` : "❌ NOT PROVIDED")

    if (imageUrl) {
      // Validate image URL format
      const isValidUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")
      if (!isValidUrl) {
        console.log("[v0] ⚠️ WARNING: Invalid image URL format:", imageUrl.substring(0, 50))
      }
      
      console.log("[v0] ✅ Using Claude vision analysis for motion generation")
    }

    // Build context from available information
    const contextParts: string[] = []
    if (description) {
      contextParts.push(`Mood: "${description}"`)
    }
    if (category) {
      contextParts.push(`Category: "${category}"`)
    }
    const contextText = contextParts.length > 0 ? `\n${contextParts.join("\n")}` : ""

    if (imageUrl) {
      // Simplified prompt that trusts Maya's intelligence
      const visionPrompt = `You're Maya, an expert at creating motion prompts for the Wan 2.5 I2V video model.

Analyze this image and create a natural motion prompt that will make a compelling 5-second video.

**Your expertise with Wan 2.5:**
- The model works best with natural, subtle movements
- Describe what you see and how it could move naturally
- Think about what would make engaging B-roll content
- Consider the context, mood, and energy of the image
- Keep facial expressions minimal and natural (avoid artificial smiling)
- Use your knowledge of what creates professional-looking video content

Create a motion prompt that brings this image to life. Use your creative intelligence - there are no rigid rules or templates to follow.

Scene: "${fluxPrompt}"${contextText}`

      console.log("[v0] 🔍 Sending image to Claude Sonnet 4 for vision analysis...")

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
      
      console.log("[v0] ✅ Claude vision analysis complete")
      console.log("[v0] 📝 Raw motion prompt from Claude:", motionPrompt.substring(0, 200))

      // Minimal cleanup - just formatting, no word deletion
      let finalPrompt = motionPrompt.trim()

      // Split into lines first to handle cases where first line is just a markdown header
      const lines = finalPrompt.split("\n")

      // Find the first non-empty line after cleanup
      for (const line of lines) {
        let cleanedLine = line.trim()

        // Remove markdown headers
        cleanedLine = cleanedLine.replace(/\*\*[^*]+:\*\*/g, "")

        // Remove bullet points
        cleanedLine = cleanedLine.replace(/^[-*•]\s*/g, "")

        // Remove quotes
        cleanedLine = cleanedLine.replace(/^["'`]|["'`]$/g, "")

        // Remove asterisks
        cleanedLine = cleanedLine.replace(/\*/g, "")

        // Remove any prefixes like "Motion:" or "Prompt:"
        cleanedLine = cleanedLine.replace(/^(motion|prompt|description):\s*/i, "")

        // Clean up extra whitespace
        cleanedLine = cleanedLine.replace(/\s+/g, " ").trim()

        // Use the first non-empty line
        if (cleanedLine && cleanedLine.length > 0) {
          finalPrompt = cleanedLine
          break
        }
      }

      // Final trim
      finalPrompt = finalPrompt.trim()

      // Validate prompt is not empty after cleanup
      if (!finalPrompt || finalPrompt.length === 0) {
        console.error("[v0] ❌ ERROR: Motion prompt is empty after cleanup")
        return NextResponse.json(
          { error: "Generated motion prompt is empty. Please try again." },
          { status: 500 }
        )
      }

      console.log("[v0] ========================================")
      console.log("[v0] Wan-2.5 I2V motion prompt:")
      console.log("[v0]", finalPrompt)
      console.log("[v0] Word count:", finalPrompt.split(" ").length)
      console.log("[v0] ========================================")

      return NextResponse.json({
        motionPrompt: finalPrompt,
        success: true,
      })
    }

    // Fallback for text-only generation (no image)
    console.log("[v0] No image - generating from FLUX prompt only")

    const textPrompt = `You're Maya, an expert at creating motion prompts for the Wan 2.5 I2V video model.

Create a natural motion prompt that will make a compelling 5-second video for this scene.

**Your expertise with Wan 2.5:**
- The model works best with natural, subtle movements
- Think about what would make engaging B-roll content
- Consider the context, mood, and energy
- Keep facial expressions minimal and natural (avoid artificial smiling)
- Use your knowledge of what creates professional-looking video content

Create a motion prompt that brings this scene to life. Use your creative intelligence - there are no rigid rules or templates to follow.

Scene: "${fluxPrompt}"${contextText}`

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: textPrompt,
            },
          ],
        },
      ],
      temperature: 0.85,
    })

    // Minimal cleanup - just formatting, no word deletion
    let finalPrompt = motionPrompt.trim()

    // Split into lines first to handle cases where first line is just a markdown header
    const lines = finalPrompt.split("\n")

    // Find the first non-empty line after cleanup
    for (const line of lines) {
      let cleanedLine = line.trim()

      // Remove markdown headers
      cleanedLine = cleanedLine.replace(/\*\*[^*]+:\*\*/g, "")

      // Remove bullet points
      cleanedLine = cleanedLine.replace(/^[-*•]\s*/g, "")

      // Remove quotes
      cleanedLine = cleanedLine.replace(/^["'`]|["'`]$/g, "")

      // Remove asterisks
      cleanedLine = cleanedLine.replace(/\*/g, "")

      // Remove any prefixes like "Motion:" or "Prompt:"
      cleanedLine = cleanedLine.replace(/^(motion|prompt|description):\s*/i, "")

      // Clean up extra whitespace
      cleanedLine = cleanedLine.replace(/\s+/g, " ").trim()

      // Use the first non-empty line
      if (cleanedLine && cleanedLine.length > 0) {
        finalPrompt = cleanedLine
        break
      }
    }

    // Final trim
    finalPrompt = finalPrompt.trim()

    // Validate prompt is not empty after cleanup
    if (!finalPrompt || finalPrompt.length === 0) {
      console.error("[v0] ❌ ERROR: Motion prompt is empty after cleanup")
      return NextResponse.json(
        { error: "Generated motion prompt is empty. Please try again." },
        { status: 500 }
      )
    }

    console.log("[v0] ========================================")
    console.log("[v0] Wan-2.5 I2V motion prompt:")
    console.log("[v0]", finalPrompt)
    console.log("[v0] Word count:", finalPrompt.split(" ").length)
    console.log("[v0] ========================================")

    return NextResponse.json({
      motionPrompt: finalPrompt,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error generating motion prompt:", error)
    return NextResponse.json({ error: "Failed to generate motion prompt" }, { status: 500 })
  }
}
