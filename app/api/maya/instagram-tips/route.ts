import { type NextRequest, NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserPersonalBrand } from "@/lib/data/maya"
import { generateText } from "ai"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { auditPromptRoute } from "@/lib/generation/prompt/route-audit"
import { createMayaOpenRouterModel, getMayaModelForTask } from "@/lib/maya/openrouter"

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const personalBrand = await getUserPersonalBrand(neonUser.id)

    const niche = personalBrand?.business_type || "general"
    const targetAudience = personalBrand?.target_audience || "general audience"
    const brandVoice = personalBrand?.brand_voice || "authentic and relatable"

    const { postType, caption, position } = await req.json()

    const systemPrompt = `You are Maya, an Instagram strategy expert. Research and provide specific, actionable Instagram tips.
      
Your tips should include:
1. Best posting time for this niche
2. Trending sounds or audio (if applicable for Reels)
3. Engagement strategy specific to this post type
4. Story/Reel ideas to complement this post
5. Hashtag strategy tips

Be specific, actionable, and use simple everyday language. No corporate jargon.`
    const userPrompt = `Generate Instagram tips for this post:

Post Type: ${postType}
Position in Feed: ${position} of 9
Niche: ${niche}
Target Audience: ${targetAudience}
Brand Voice: ${brandVoice}
Caption Preview: ${caption.substring(0, 100)}...

Research current Instagram best practices and provide:
1. Best time to post for ${niche} niche
2. Trending sounds/audio (if this could be a Reel)
3. Engagement tip specific to ${postType} posts
4. Story idea to complement this post
5. Reel suggestion based on this content

Format as a conversational tip from Maya, not a list.`
    const startedAt = Date.now()
    auditPromptRoute({
      routeId: "EP-SHADOW-INSTAGRAM-TIPS",
      mode: "classic",
      feature: "instagram-tips",
      userId: neonUser.id,
      builder: getMayaModelForTask("instagram_tips"),
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      input: { postType, position, niche, targetAudience, brandVoice },
      startedAt,
    })

    const { text: tips } = await generateText({
      model: createMayaOpenRouterModel("instagram_tips"),
      system: systemPrompt,
      prompt: userPrompt,
    })

    return NextResponse.json({ tips })
  } catch (error) {
    console.error("[v0] Error generating Instagram tips:", error)
    return NextResponse.json({ error: "Failed to generate tips" }, { status: 500 })
  }
}
