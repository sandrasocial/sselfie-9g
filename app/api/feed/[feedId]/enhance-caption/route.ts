import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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
        fl.user_id
      FROM feed_posts fp
      INNER JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
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
        } catch (e) {
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

    const { text: enhancedCaption } = await generateText({
      model: "anthropic/claude-haiku-4.5",
      prompt: `You're Maya, a warm and friendly personal branding expert who helps people create engaging Instagram captions.

Current caption:
"${currentCaption}"${postContext}${brandContext}

Your task: ENHANCE and EXPAND this caption significantly. Make it 2-3x LONGER while keeping the same core message.

## What to do:
1. **Make it MUCH longer** - Expand from ${currentCaption.length} characters to ${Math.round(currentCaption.length * 2.5)}-${Math.round(currentCaption.length * 3)} characters
2. **Use SIMPLE, EVERYDAY LANGUAGE** - Write like texting a friend, not like a business
3. **Add more story details** - Expand on the personal moments, add specific examples, share more context
4. **Better hook** - Make the first line more compelling to stop the scroll
5. **More personal** - Add relatable details, real moments, authentic feelings
6. **Stronger storytelling** - Build the narrative with more depth and emotion
7. **Better call-to-action** - Make the question more engaging and specific
8. **Keep hashtags** - Preserve existing hashtags, don't add new ones

## Writing style (CRITICAL):
- Write like texting a friend - casual, conversational, real
- Use simple words everyone understands
- NO corporate buzzwords or jargon
- NO phrases like "Let's dive in" or "Drop a comment"
- Sound like a REAL person, not AI
- Show personality and imperfections
- Use natural sentence breaks (double line breaks between sections)

## Structure to follow:
- **Hook** (1-2 lines): Bold statement or question that stops the scroll
- **Story** (4-6 sentences): Personal moment with more detail and context
- **Value/Insight** (2-4 sentences): What you learned or what matters
- **CTA** (1 engaging question): Something that invites real conversation

## IMPORTANT: 
- Keep the SAME core message and story
- Make it SIGNIFICANTLY longer (2-3x the original)
- Use simple, everyday language throughout
- Don't make it sound corporate or fake
- Keep it authentic and genuine
- If hashtags exist, keep them at the end

Just write the enhanced, longer version with simple everyday language. No explanations.`,
    })

    // Update the caption in the database
    await sql`
      UPDATE feed_posts
      SET caption = ${enhancedCaption.trim()}
      WHERE id = ${postId}
      AND feed_layout_id = ${Number.parseInt(feedId, 10)}
    `

    return NextResponse.json({ enhancedCaption: enhancedCaption.trim() })
  } catch (error) {
    console.error("[v0] Enhance caption error:", error)
    return NextResponse.json({ error: "Failed to enhance caption" }, { status: 500 })
  }
}

