import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { sql } from "@/lib/db/client"
import { INSTAGRAM_STRATEGIST_SYSTEM_PROMPT } from "@/lib/instagram-strategist/personality"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"
import {
  enforceCaptionPublishingRules,
  hasBannedCaptionLanguage,
  hasGenericAiCaptionLanguage,
} from "@/lib/feed-planner/caption-writer"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Resolve params (Next.js 16 pattern)
    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId

    if (!feedId || feedId === "null" || feedId === "undefined") {
      return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
    }

    const { postId, currentCaption } = await req.json()

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    if (!currentCaption || currentCaption.trim().length === 0) {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 })
    }

    // Verify the post belongs to the user and feed
    const [post] = await sql`
      SELECT 
        fp.id,
        fp.caption,
        fp.position,
        fp.content_pillar,
        ai.generated_prompt AS selected_image_generated_prompt,
        ai.prompt AS selected_image_prompt,
        fl.user_id
      FROM feed_posts fp
      INNER JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
      LEFT JOIN ai_images ai ON fp.ai_image_id = ai.id AND ai.user_id = fl.user_id
      WHERE fp.id = ${postId}
      AND fp.feed_layout_id = ${Number.parseInt(feedId, 10)}
      AND fl.user_id = ${neonUser.id}
      LIMIT 1
    `

    if (!post) {
      return NextResponse.json({ error: "Post not found or access denied" }, { status: 404 })
    }

    // Get user's brand profile data
    const [brandProfile] = await sql`
      SELECT 
        brand_voice,
        brand_vibe,
        business_type,
        target_audience,
        content_pillars
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
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
          const pillars = typeof brandProfile.content_pillars === "string" 
            ? JSON.parse(brandProfile.content_pillars) 
            : brandProfile.content_pillars
          if (Array.isArray(pillars) && pillars.length > 0) {
            const pillarNames = pillars.map((p: any) => typeof p === "object" ? p.name || p : p).join(", ")
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

    const postContext = post.content_pillar 
      ? `\n\nThis caption is for a post in the "${post.content_pillar}" content pillar (Post ${post.position} of 9).`
      : `\n\nThis caption is for Post ${post.position} of 9.`

    const selectedPhotoContext = String(
      post.selected_image_generated_prompt || post.selected_image_prompt || ""
    )
      .trim()
      .slice(0, 1200)

    const { text: enhancedCaption } = await generateText({
      model: createMayaOpenRouterModel("feed_enhance_caption"),
      system: INSTAGRAM_STRATEGIST_SYSTEM_PROMPT,
      prompt: `You're Maya, the creative director helping a member finish one exact Calendar post.

Current caption:
"${currentCaption}"${postContext}${brandContext}

Selected photo context:
${selectedPhotoContext || "No reliable visual description is available."}

Rewrite it into a stronger 90-160 word caption in this member's voice.

Rules:
- Keep only the factual meaning already present. Do not invent a personal moment, feeling, client story, quote, number, timeline, result, or vulnerability.
- If selected photo context is available, connect the opening or central idea to one observable setting, action, expression, or mood. Do not write alt text or list visual details.
- The photo context is not proof that an event happened.
- Replace generic filler with a concrete observation or useful point that fits the content pillar.
- Never use these stock AI phrases: "Real talk", "Here's the thing", "This is your sign", "What if I told you", "Plot twist", "Let's be honest", or "Your feed doesn't need to be".
- Never use leverage, synergy, transform, game-changer, skyrocket, unlock your potential, elevate, or an em dash.
- Use simple everyday language, varied sentence rhythm, and one natural closing question or invitation.
- Preserve existing hashtags, with no more than five at the end.

Return only the finished caption.`,
    })

    const finalCaption = enforceCaptionPublishingRules({ caption: enhancedCaption.trim() })
    if (
      hasBannedCaptionLanguage(finalCaption) ||
      hasGenericAiCaptionLanguage(finalCaption)
    ) {
      return NextResponse.json(
        { error: "Maya could not make that caption specific enough. Please try again." },
        { status: 422 }
      )
    }

    // Update the caption in the database
    await sql`
      UPDATE feed_posts
      SET caption = ${finalCaption}
      WHERE id = ${postId}
      AND feed_layout_id = ${Number.parseInt(feedId, 10)}
    `

    return NextResponse.json({ enhancedCaption: finalCaption })
  } catch (error) {
    console.error("[v0] Enhance caption error:", error)
    return NextResponse.json({ error: "Failed to enhance caption" }, { status: 500 })
  }
}
