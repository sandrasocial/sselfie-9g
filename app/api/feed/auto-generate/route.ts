import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateText } from "ai"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Auto-generating feed concepts after brand profile completion")

    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = neon(process.env.DATABASE_URL!)

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

    console.log("[v0] Generating 9 feed concept cards for user:", user.email)

    const conceptPrompt = `You are Maya, a world-class Instagram feed designer and brand stylist.

**USER'S BRAND PROFILE:**
- Brand Name: ${brandProfile.name || "Personal Brand"}
- Business Type: ${brandProfile.business_type || "Content Creator"}
- Visual Aesthetic: ${brandProfile.visual_aesthetic || "Minimalist"}
- Color Theme: ${brandProfile.color_theme || "Neutral"}
- Photo Goals: ${brandProfile.photo_goals || "Social media content"}

${userContext}

**USER GENDER: ${userGender}**

**FEED DESIGN STRATEGY - CRITICAL:**

You must create a cohesive 9-post Instagram feed that tells a visual story. Follow these strategic layout principles:

**THE 80/20 RULE:**
- 80% should feature the person (portraits, lifestyle shots)
- 20% can be objects, flatlays, or environmental shots

**VISUAL RHYTHM & VARIETY:**
For a 9-post feed (3x3 grid), use this strategic layout:

**Row 1 (Top):**
- Post 1: Close-Up Portrait (establishes face/brand)
- Post 2: Lifestyle/Environmental (shows context)
- Post 3: Half Body Portrait (different angle/mood)

**Row 2 (Middle):**
- Post 4: Full Body (shows complete outfit/style)
- Post 5: Object/Flatlay (brand elements, products, details) - THE 20%
- Post 6: Close-Up Portrait (different mood from Post 1)

**Row 3 (Bottom):**
- Post 7: Lifestyle/Action (person in motion/activity)
- Post 8: Half Body (different styling from Post 3)
- Post 9: Environmental Portrait (person in beautiful location)

**COMPOSITION PRINCIPLES:**
- **Whitespace**: Use negative space strategically - don't crowd every shot
- **Color Harmony**: Maintain consistent color palette across all 9 posts
- **Diagonal Flow**: Create visual interest with diagonal lines across the grid
- **Breathing Room**: Alternate between tight crops and wider shots
- **Cohesive Aesthetic**: All posts should feel like they belong together

**WHEN TO USE EACH SHOT TYPE:**

**Close-Up Portraits (Posts 1, 6):**
- Establish personal connection
- Show facial expressions and emotion
- Use for brand personality
- Lighting: Soft, flattering, editorial quality

**Half Body (Posts 3, 8):**
- Show styling and outfit details
- Include hands for natural poses
- Good for showing accessories
- Lighting: Natural or studio with depth

**Full Body (Post 4):**
- Display complete outfit and silhouette
- Show posture and body language
- Use for fashion-forward content
- Lighting: Even, full coverage

**Lifestyle/Environmental (Posts 2, 9):**
- Tell a story about the person's life
- Show them in their element
- Create aspirational content
- Lighting: Natural, authentic, golden hour

**Action/Movement (Post 7):**
- Capture dynamic moments
- Show personality through movement
- Create energy in the feed
- Lighting: Natural, fast shutter speed

**Object/Flatlay (Post 5 - THE 20%):**
- Break up the portraits strategically
- Show products, tools, or brand elements
- Create visual interest with composition
- Lighting: Overhead, even, clean

**GENDER-SPECIFIC STYLING:**
${
  userGender === "woman" || userGender === "female"
    ? `
- Use feminine descriptors: "woman with flowing hair", "elegant feminine style"
- Clothing: dresses, blouses, feminine silhouettes
- Accessories: delicate jewelry, elegant pieces
- Hair & Makeup: styled, natural beauty enhanced
`
    : userGender === "man" || userGender === "male"
      ? `
- Use masculine descriptors: "man with styled hair", "strong masculine presence"
- Clothing: suits, button-downs, masculine cuts
- Accessories: watches, minimal jewelry
- Grooming: clean-shaven or groomed beard
`
      : `
- Use neutral descriptors that don't assume gender
- Focus on personal style and authentic expression
`
}

Generate 9 concept cards following this strategic layout. Each concept must include:

**IMPORTANT**: Use gender-specific language:
${
  userGender === "woman" || userGender === "female"
    ? '- ALWAYS use "woman" or "she/her" in prompts'
    : userGender === "man" || userGender === "male"
      ? '- ALWAYS use "man" or "he/him" in prompts'
      : '- Use "person" and "they/them" in prompts'
}

Return ONLY a valid JSON array of 9 concepts with this structure:
{
  "title": "string - Short, catchy title",
  "description": "string - Simple, friendly description",
  "category": "Close-Up" | "Half Body" | "Full Body" | "Lifestyle" | "Action" | "Environmental",
  "fashionIntelligence": "string - Detailed styling recommendations",
  "lighting": "string - Specific lighting setup",
  "location": "string - Specific location suggestion",
  "prompt": "string - FLUX prompt starting with '${userGender === "woman" || userGender === "female" ? "a woman" : userGender === "man" || userGender === "male" ? "a man" : "a person"}'"
}`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      prompt: conceptPrompt,
      maxOutputTokens: 4000,
    })

    console.log("[v0] Generated concept text:", text.substring(0, 200))

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("No JSON array found in response")
    }

    const concepts = JSON.parse(jsonMatch[0])

    console.log("[v0] Successfully parsed", concepts.length, "concepts")

    const existingFeedResult = await sql`
      SELECT id FROM feed_layouts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    let feedId: number

    if (existingFeedResult.length > 0) {
      feedId = existingFeedResult[0].id
      console.log("[v0] Using existing feed layout:", feedId)
    } else {
      const newFeedResult = await sql`
        INSERT INTO feed_layouts (user_id, brand_name, username, description)
        VALUES (
          ${user.id},
          ${brandProfile.name || "Personal Brand"},
          ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
          ${brandProfile.transformation_story || "Your brand story"}
        )
        RETURNING id
      `
      feedId = newFeedResult[0].id
      console.log("[v0] Created new feed layout:", feedId)
    }

    await sql`
      DELETE FROM feed_posts
      WHERE feed_layout_id = ${feedId}
    `

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
          ${i + 1},
          ${concept.prompt},
          ${concept.category},
          ${concept.description},
          'pending'
        )
      `
    }

    console.log("[v0] Successfully created", concepts.length, "concept cards in feed")

    return NextResponse.json({
      success: true,
      feedId,
      conceptCount: concepts.length,
      message: "Feed concepts generated successfully",
    })
  } catch (error) {
    console.error("[v0] Error auto-generating feed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feed" },
      { status: 500 },
    )
  }
}
