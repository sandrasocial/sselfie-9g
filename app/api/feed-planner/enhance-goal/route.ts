import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { sql } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"
import { auditPromptRoute } from "@/lib/generation/prompt/route-audit"

async function handleEnhanceGoal({
  request,
  user,
}: {
  request: Request | NextRequest
  user: { id: string | number }
}) {
  try {
    const { goalText } = await request.json()

    if (!goalText || goalText.trim().length === 0) {
      return NextResponse.json({ error: "Goal text is required" }, { status: 400 })
    }

    // Get user's brand profile data
    const [brandProfile] = await sql`
      SELECT
        brand_voice,
        brand_vibe,
        business_type,
        target_audience,
        content_pillars,
        color_palette
      FROM user_personal_brand
      WHERE user_id = ${user.id}
      AND is_completed = true
      LIMIT 1
    `

    // Build brand context for the enhancement
    let brandContext = ""
    if (brandProfile) {
      brandContext = `\n\nHere's what we know about their brand:\n`

      if (brandProfile.brand_voice) {
        brandContext += `- Brand Voice: ${brandProfile.brand_voice}\n`
      }
      if (brandProfile.brand_vibe) {
        brandContext += `- Brand Vibe: ${brandProfile.brand_vibe}\n`
      }
      if (brandProfile.business_type) {
        brandContext += `- Business Type: ${brandProfile.business_type}\n`
      }
      if (brandProfile.target_audience) {
        brandContext += `- Target Audience: ${brandProfile.target_audience}\n`
      }
      if (brandProfile.content_pillars) {
        try {
          const pillars =
            typeof brandProfile.content_pillars === "string"
              ? JSON.parse(brandProfile.content_pillars)
              : brandProfile.content_pillars
          if (Array.isArray(pillars) && pillars.length > 0) {
            const pillarNames = pillars.map((p: any) => (typeof p === "object" ? p.name || p : p)).join(", ")
            brandContext += `- Content Pillars: ${pillarNames}\n`
          }
        } catch {
          if (typeof brandProfile.content_pillars === "string") {
            brandContext += `- Content Pillars: ${brandProfile.content_pillars}\n`
          }
        }
      }

      brandContext += `\nUse this brand info to make the enhancement more specific to them and their style.\n`
    }

    const prompt = `You're Maya, a warm and friendly personal branding expert who helps people express themselves.

Someone wrote this about their Instagram feed goal:
"${goalText}"${brandContext}

Make it better! Make it:
- More detailed and strategic
- Clearer about what they want
- More specific about their content
- Use their brand info if you have it (voice, vibe, content pillars)
- Keep it real and authentic
- 2-3x longer with more details

Keep it simple and genuine. Don't make it sound fake or corporate.
Just write the better version, no explanations.`
    const startedAt = Date.now()
    auditPromptRoute({
      routeId: "EP-SHADOW-ENHANCE-GOAL",
      mode: "classic",
      feature: "enhance-goal",
      userId: user.id,
      builder: "anthropic/claude-haiku-4.5",
      prompt,
      input: { goalText, hasBrandProfile: Boolean(brandProfile) },
      startedAt,
    })

    const { text: enhancedGoal } = await generateText({
      model: "anthropic/claude-haiku-4.5",
      prompt,
    })

    return NextResponse.json({ enhancedGoal: enhancedGoal.trim() })
  } catch (error) {
    console.error("[v0] Enhance goal error:", error)
    return NextResponse.json({ error: "Failed to enhance goal" }, { status: 500 })
  }
}

export const POST = withAuth(handleEnhanceGoal)
