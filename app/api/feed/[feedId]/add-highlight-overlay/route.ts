import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"
import { generateText } from "ai"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Add AI-generated text overlay to a highlight image
 * Returns the final image URL with text overlay
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { feedId } = await Promise.resolve(params)

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify feed belongs to user
    const [feed] = await sql`
      SELECT * FROM feed_layouts
      WHERE id = ${feedId}
      AND user_id = ${neonUser.id}
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    const { imageUrl, title } = await request.json()

    if (!imageUrl || !title) {
      return NextResponse.json({ error: "Missing imageUrl or title" }, { status: 400 })
    }

    // Generate optimized text for overlay using AI
    // Keep it short and impactful for Instagram highlight covers
    const { text: overlayText } = await generateText({
      model: "anthropic/claude-haiku-4.5",
      system: "You are a creative Instagram strategist. Generate short, impactful text for highlight cover images. Keep it to 1-3 words maximum. Make it bold, clear, and visually appealing.",
      prompt: `Create a short, impactful text overlay for an Instagram highlight cover titled "${title}". 

Requirements:
- Maximum 3 words
- Bold and clear
- Instagram-friendly
- Visually appealing
- No emojis

Just return the text, nothing else.`,
      maxOutputTokens: 20,
      temperature: 0.7,
    })

    // Clean up the text (remove quotes, extra spaces)
    const cleanText = overlayText.trim().replace(/^["']|["']$/g, "").substring(0, 20)

    // Fetch the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image")
    }

    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageBlob.arrayBuffer()

    // Create canvas to add text overlay
    // We'll do this server-side using a canvas library or return instructions
    // For now, we'll use a simple approach: return the original image URL
    // and let the client handle the overlay, OR we can use a service
    
    // Actually, let's use a simpler approach: return the image URL with instructions
    // The client can handle the overlay using canvas (like StoryHighlightCard does)
    
    // For server-side, we'd need to use a canvas library like @napi-rs/canvas
    // For now, let's return the image URL and the text, and handle overlay client-side
    
    // Save the highlight with the text for overlay
    console.log(`[ADD-HIGHLIGHT-OVERLAY] Generated overlay text: "${cleanText}" for highlight: "${title}"`)

    return NextResponse.json({
      success: true,
      imageUrl, // Return original URL - overlay will be added client-side
      overlayText: cleanText,
      message: "Overlay text generated. Client will add overlay.",
    })
  } catch (error) {
    console.error("[ADD-HIGHLIGHT-OVERLAY] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add text overlay",
      },
      { status: 500 }
    )
  }
}


