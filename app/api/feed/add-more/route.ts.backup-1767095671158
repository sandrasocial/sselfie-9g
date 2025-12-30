import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateText } from "ai"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Adding more concept cards to feed")

    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Get existing feed
    const existingFeedResult = await sql`
      SELECT id FROM feed_layouts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existingFeedResult.length === 0) {
      return NextResponse.json({ error: "No feed found" }, { status: 404 })
    }

    const feedId = existingFeedResult[0].id

    // Count existing posts
    const existingPostsResult = await sql`
      SELECT COUNT(*) as count FROM feed_posts
      WHERE feed_layout_id = ${feedId}
    `

    const existingCount = Number.parseInt(existingPostsResult[0].count)
    const newStartPosition = existingCount + 1

    // Get brand profile for context
    const brandProfileResult = await sql`
      SELECT * FROM user_personal_brand
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    if (brandProfileResult.length === 0) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 })
    }

    const brandProfile = brandProfileResult[0]
    const authId = user.stack_auth_id || user.supabase_user_id || user.id
    const userContext = await getUserContextForMaya(authId)

    let userGender = "person"
    const userDataResult = await sql`
      SELECT gender FROM users WHERE id = ${user.id} LIMIT 1
    `
    if (userDataResult.length > 0 && userDataResult[0].gender) {
      userGender = userDataResult[0].gender
    }

    console.log("[v0] Generating 9 additional concept cards starting at position", newStartPosition)

    const conceptPrompt = `You are Maya, a world-class Instagram feed designer.

Generate 9 NEW concept cards that complement the existing ${existingCount} posts in the user's feed.

**USER'S BRAND:**
- Brand Name: ${brandProfile.name || "Personal Brand"}
- Business Type: ${brandProfile.business_type || "Content Creator"}
- Visual Aesthetic: ${brandProfile.visual_aesthetic || "Minimalist"}
- Color Theme: ${brandProfile.color_theme || "Neutral"}

${userContext}

**USER GENDER: ${userGender}**

Create 9 diverse concept cards following feed design best practices. Each concept must include:

${
  userGender === "woman" || userGender === "female"
    ? '- ALWAYS use "woman" or "she/her" in prompts'
    : userGender === "man" || userGender === "male"
      ? '- ALWAYS use "man" or "he/him" in prompts'
      : '- Use "person" and "they/them" in prompts'
}

Return ONLY a valid JSON array of 9 concepts:
{
  "title": "string",
  "description": "string",
  "category": "Close-Up" | "Half Body" | "Full Body" | "Lifestyle" | "Action" | "Environmental",
  "fashionIntelligence": "string",
  "lighting": "string",
  "location": "string",
  "prompt": "string - FLUX prompt starting with '${userGender === "woman" || userGender === "female" ? "a woman" : userGender === "man" || userGender === "male" ? "a man" : "a person"}'"
}`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      prompt: conceptPrompt,
      maxOutputTokens: 4000,
    })

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("No JSON array found in response")
    }

    const concepts = JSON.parse(jsonMatch[0])

    // Add new concept cards
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i]
      await sql`
        INSERT INTO feed_posts (
          feed_layout_id,
          user_id,
          position,
          prompt,
          post_type,
          caption,
          generation_status
        )
        VALUES (
          ${feedId},
          ${user.id},
          ${newStartPosition + i},
          ${concept.prompt},
          ${concept.category},
          ${concept.description},
          'pending'
        )
      `
    }

    console.log("[v0] Successfully added", concepts.length, "new concept cards")

    return NextResponse.json({
      success: true,
      feedId,
      conceptCount: concepts.length,
      totalPosts: existingCount + concepts.length,
      message: "Added 9 more concept cards to your feed",
    })
  } catch (error) {
    console.error("[v0] Error adding more concepts:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add concepts" },
      { status: 500 },
    )
  }
}
