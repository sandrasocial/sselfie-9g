import { streamText } from "ai"
import { getUserByAuthId } from "@/lib/user-mapping"
import { PERSONAL_BRAND_STRATEGIST_PROMPT } from "@/lib/personal-brand-strategist/personality"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { hasStudioMembership } from "@/lib/subscription"

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { prompt, brandProfile } = await request.json()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] Brand Strategist: Auth error", authError)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const featureEnabled = process.env.ENABLE_STRATEGIST_AI === "true"
    if (!featureEnabled) {
      const isMember = await hasStudioMembership(neonUser.id)
      if (!isMember) {
        return new Response("Endpoint disabled", { status: 410 })
      }
    }

    // Build context from brand profile
    const brandContext = brandProfile
      ? `
## User's Brand Profile:

**Brand Identity:**
- Name: ${brandProfile.brand_name || "Not specified"}
- Industry: ${brandProfile.industry || "Not specified"}
- Target Audience: ${brandProfile.target_audience || "Not specified"}

**Brand Story:**
${brandProfile.brand_story || "Not provided"}

**Unique Value:**
${brandProfile.unique_value || "Not provided"}

**Content Pillars:**
${brandProfile.content_pillars ? JSON.stringify(brandProfile.content_pillars) : "Not defined"}

**Brand Voice:**
${brandProfile.brand_voice || "Not specified"}

**Goals:**
${brandProfile.goals || "Not specified"}
`
      : ""

    console.log("[v0] Calling Brand Strategist with context")

    // Stream response from Brand Strategist
    const result = streamText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: PERSONAL_BRAND_STRATEGIST_PROMPT + brandContext,
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 2000,
    })

    console.log("[v0] Brand Strategist streaming response")

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Brand Strategist API error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to generate strategy",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
