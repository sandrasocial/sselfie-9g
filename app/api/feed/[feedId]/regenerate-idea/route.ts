// Feed Planner Phase 2b - "Different idea" for one post Maya already auto-drafted.
// Sibling to regenerate-caption (same idea, new words): this swaps the idea itself - a fresh
// contentPillar + caption for one slot, grounded in her brand and aware of what the rest of
// the month already covers so it doesn't repeat a pillar. Deliberately NOT routed through the
// general Maya chat/tool-dispatch mechanism (emit_concepts) - Feed Planner's Pro Mode image
// generation is template-driven (feed_style + position, see generate-single/route.ts), so a
// rich per-post CreativeBrief would never actually be read by generation. Only the planning
// metadata (pillar/caption) is real here, so this stays a small, direct, single-purpose call.

import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createMayaOpenRouterModel, getMayaMaxTokensForTask } from "@/lib/maya/openrouter"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { sql } from "@/lib/db/client"
import { extractJson } from "@/lib/ai/extract-json"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const resolvedParams = await Promise.resolve(params)
  const feedIdInt = Number.parseInt(resolvedParams.feedId, 10)
  if (!Number.isFinite(feedIdInt)) {
    return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
  }

  const { postId } = await req.json()
  if (!postId) return NextResponse.json({ error: "Post ID is required" }, { status: 400 })

  const [post] = await sql`
    SELECT fp.id, fp.position, fp.content_pillar, fl.user_id, fl.overall_vibe
    FROM feed_posts fp
    INNER JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
    WHERE fp.id = ${postId} AND fp.feed_layout_id = ${feedIdInt} AND fl.user_id = ${neonUser.id}
    LIMIT 1
  `
  if (!post) return NextResponse.json({ error: "Post not found or access denied" }, { status: 404 })

  const otherPillars = await sql`
    SELECT DISTINCT content_pillar FROM feed_posts
    WHERE feed_layout_id = ${feedIdInt} AND id != ${postId} AND content_pillar IS NOT NULL AND content_pillar != ''
  `
  const usedPillars = otherPillars.map((r: any) => r.content_pillar).filter(Boolean)

  const brandContext = await getUserContextForMaya(user.id).catch(() => "")

  const system = [
    "You are Maya, a personal content strategist. Give ONE fresh post idea for a single Instagram feed slot - a replacement for an idea she didn't love.",
    "Rules:",
    "- contentPillar is a short creator-specific category grounded in HER brand, never generic ('Motivation', 'Lifestyle').",
    usedPillars.length
      ? `- Do not repeat any of these pillars already used elsewhere this month: ${usedPillars.join(", ")}.`
      : "",
    "- caption is a real, postable Instagram caption in HER voice - warm, direct, human, a few sentences, no hashtag spam, no hype words, never a long dash.",
    "Return ONLY raw JSON, no prose, no code fences, in exactly this shape:",
    `{"contentPillar": string, "caption": string}`,
  ]
    .filter(Boolean)
    .join("\n")

  const userMsg = [
    post.overall_vibe ? `This month's theme: ${post.overall_vibe}` : "",
    brandContext ? `What you know about her:\n${brandContext}` : "You don't have much on her yet; keep it about her business and audience, never generic.",
    `Her previous idea for this slot was "${post.content_pillar || "unset"}" - she wants something different.`,
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const { text } = await generateText({
      model: createMayaOpenRouterModel("chat_pro"),
      system,
      messages: [{ role: "user", content: userMsg }],
      temperature: 0.9,
      maxOutputTokens: getMayaMaxTokensForTask("chat_pro"),
    })

    const parsed = JSON.parse(extractJson(text)) as { contentPillar?: unknown; caption?: unknown }
    const contentPillar = typeof parsed.contentPillar === "string" ? parsed.contentPillar.trim() : ""
    const caption = typeof parsed.caption === "string" ? parsed.caption.trim() : ""
    if (!contentPillar || !caption) {
      return NextResponse.json({ error: "Maya generated an incomplete idea" }, { status: 502 })
    }

    await sql`
      UPDATE feed_posts
      SET content_pillar = ${contentPillar}, caption = ${caption}
      WHERE id = ${postId} AND feed_layout_id = ${feedIdInt}
    `

    return NextResponse.json({ success: true, contentPillar, caption })
  } catch (error) {
    console.error("[regenerate-idea] failed:", error)
    return NextResponse.json({ error: "Failed to regenerate idea" }, { status: 500 })
  }
}
