import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateText } from "ai"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Refreshing concept cards (keeping generated images)")

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

    // Get concept-only posts (not generated yet)
    const conceptPostsResult = await sql`
      SELECT id, position FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      AND generation_status = 'pending'
      AND image_url IS NULL
      ORDER BY position
    `

    if (conceptPostsResult.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All posts have been generated. No concepts to refresh.",
        refreshedCount: 0,
      })
    }

    // Get brand profile
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

    console.log("[v0] Refreshing", conceptPostsResult.length, "concept cards")

    const conceptPrompt = `You are Maya, a world-class Instagram feed designer.

Generate ${conceptPostsResult.length} NEW concept cards to replace existing concepts that the user didn't like.

**USER'S BRAND:**
- Brand Name: ${brandProfile.name || "Personal Brand"}
- Business Type: ${brandProfile.business_type || "Content Creator"}
- Visual Aesthetic: ${brandProfile.visual_aesthetic || "Minimalist"}
- Color Theme: ${brandProfile.color_theme || "Neutral"}

${userContext}

**USER GENDER: ${userGender}**

Create ${conceptPostsResult.length} fresh, diverse concept cards. Each concept must include:

${
  userGender === "woman" || userGender === "female"
    ? '- ALWAYS use "woman" or "she/her" in prompts'
    : userGender === "man" || userGender === "male"
      ? '- ALWAYS use "man" or "he/him" in prompts'
      : '- Use "person" and "they/them" in prompts'
}

Return ONLY a valid JSON array of ${conceptPostsResult.length} concepts:
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

    // Update concept posts with new concepts
    for (let i = 0; i < Math.min(concepts.length, conceptPostsResult.length); i++) {
      const concept = concepts[i]
      const postId = conceptPostsResult[i].id

      await sql`
        UPDATE feed_posts
        SET
          prompt = ${concept.prompt},
          post_type = ${concept.category},
          caption = ${concept.description},
          generation_status = 'pending',
          updated_at = NOW()
        WHERE id = ${postId}
      `
    }

    console.log("[v0] Successfully refreshed", concepts.length, "concept cards")

    return NextResponse.json({
      success: true,
      feedId,
      refreshedCount: concepts.length,
      message: `Refreshed ${concepts.length} concept cards`,
    })
  } catch (error) {
    console.error("[v0] Error refreshing concepts:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh concepts" },
      { status: 500 },
    )
  }
}
