import { generateObject } from "ai"
import { NextResponse } from "next/server"

import { getAuthenticatedUser } from "@/lib/auth-helper"
import {
  calendarAgentRequestSchema,
  calendarAgentGenerationSchema,
  calendarAgentResultSchema,
  proposalPostId,
  proposalRequiresFeed,
} from "@/lib/feed-planner/calendar-agent"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"
import { getMemory } from "@/lib/app-v3/maya/memory-store"
import {
  MAYA_CORE_INTELLIGENCE_SLIM,
  MAYA_PROMPT_PHILOSOPHY,
  MAYA_VOICE,
} from "@/lib/app-v3/maya/persona"
import { sql } from "@/lib/db/client"
import { getUserByAuthId } from "@/lib/user-mapping"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: Request) {
  const { user: authUser, error: authError } = await getAuthenticatedUser()
  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const access = await getFeedPlannerAccess(String(neonUser.id))
  if (!access.isMembership && !access.isPaidBlueprint) {
    return NextResponse.json({ error: "Calendar Maya requires Calendar access" }, { status: 403 })
  }

  const parsed = calendarAgentRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Calendar message" }, { status: 400 })
  }

  const input = parsed.data
  type OwnedFeed = {
    id: number
    brand_name?: string | null
    username?: string | null
    feed_style?: string | null
    feed_style_variation_id?: number | null
    visual_direction_mode?: string | null
    visual_direction_brief?: string | null
    inspiration_image_url?: string | null
  }
  let ownedFeed: OwnedFeed | null = null
  let posts: Array<{
    id: number
    position: number
    caption?: string | null
    content_pillar?: string | null
    scheduled_at?: string | null
    image_url?: string | null
  }> = []
  let bio = ""

  if (input.feedId) {
    const [feed] = await sql`
      SELECT id, brand_name, username, feed_style, feed_style_variation_id,
             visual_direction_mode, visual_direction_brief, inspiration_image_url
      FROM feed_layouts
      WHERE id = ${input.feedId} AND user_id = ${neonUser.id}
      LIMIT 1
    `
    if (!feed) return NextResponse.json({ error: "Grid not found" }, { status: 404 })
    ownedFeed = feed as unknown as OwnedFeed

    const [postRows, bioRows] = await Promise.all([
      sql`
        SELECT id, position, caption, content_pillar, scheduled_at, image_url
        FROM feed_posts
        WHERE feed_layout_id = ${input.feedId} AND user_id = ${neonUser.id}
        ORDER BY position ASC
      `,
      sql`
        SELECT bio_text
        FROM instagram_bios
        WHERE feed_layout_id = ${input.feedId}
        LIMIT 1
      `.catch(() => []),
    ])
    posts = postRows as typeof posts
    bio = typeof bioRows[0]?.bio_text === "string" ? bioRows[0].bio_text : ""
  }

  const [brandContext, memory] = await Promise.all([
    getUserContextForMaya(authUser.id).catch(() => ""),
    getMemory(String(neonUser.id)).catch(() => null),
  ])
  const agentName = memory?.agentName?.trim() || "Maya"
  const selectedPost = input.selectedPostId
    ? (posts.find(post => Number(post.id) === input.selectedPostId) ?? null)
    : null

  const calendarCapability = [
    `You are ${agentName}, the member's warm, decisive Instagram creative director inside her live Calendar.`,
    "You are operating a real visual workspace. Be specific and concise. Never give generic social-media advice.",
    "Return one short useful response and at most one proposed operation. A proposal is only a preview; the member must apply it.",
    "Allowed operations only:",
    "- create_plan when she has no grid and asks you to build or plan it.",
    "- update_caption for a selected or clearly named post. Write the complete replacement caption.",
    "- move_post when she asks to move or reorder a post.",
    "- update_bio when she asks to rewrite her Instagram bio. Keep it within 150 characters.",
    "- generate_image for a selected empty post when she asks you to create its planned image.",
    "- open_photo_picker when she wants to add one of her own photos.",
    "- open_style_picker when she wants to change the whole visual direction.",
    "- open_highlights when she wants to add or edit highlights.",
    "If she asks for an audit, an explanation, or something that needs clarification, return proposal null and answer clearly.",
    "Never invent facts, numbers, customer results, personal history, or proof. Use only the member context and Calendar content provided. If a fact is missing, write around it or ask one short question.",
    "Never say or imply that an imagined image scene really happened. Describe generated imagery as a visual direction, concept, or possibility.",
    "For a personal caption, return update_caption only when the member context or conversation contains the real event to write from. Otherwise ask exactly one focused question and return proposal null.",
    "Never publish, schedule an external post, delete a grid, promise results, or claim a change is already applied.",
    "Do not mention tools, schemas, IDs, or backend systems. Do not use an em dash.",
  ].join("\n")
  const memoryContext = [
    memory?.agentName?.trim() ? `The user named you "${memory.agentName.trim()}".` : "",
    memory?.brandNotes?.trim()
      ? `What you already know about her brand: ${memory.brandNotes.trim()}`
      : "",
    memory?.preferences?.trim() ? `Her lasting preferences: ${memory.preferences.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n")
  const system = [
    MAYA_VOICE,
    MAYA_CORE_INTELLIGENCE_SLIM,
    MAYA_PROMPT_PHILOSOPHY,
    memoryContext,
    "## YOUR CURRENT JOB: LIVE CALENDAR CREATIVE DIRECTION",
    calendarCapability,
  ]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\s*\u2014\s*/g, ", ")

  const gridState = ownedFeed
    ? JSON.stringify({
        grid: {
          id: ownedFeed.id,
          title: ownedFeed.brand_name || input.feedSummary?.title || "Current grid",
          username: ownedFeed.username || null,
          bio,
          visualDirectionMode: ownedFeed.visual_direction_mode || null,
          visualDirectionBrief: ownedFeed.visual_direction_brief || null,
          inspirationImageUrl: ownedFeed.inspiration_image_url || null,
          feedStyle: ownedFeed.feed_style || null,
          feedStyleVariationId: ownedFeed.feed_style_variation_id || null,
        },
        selectedPost,
        posts: posts.map(post => ({
          id: Number(post.id),
          position: Number(post.position),
          caption: post.caption || null,
          contentPillar: post.content_pillar || null,
          scheduledAt: post.scheduled_at || null,
          hasImage: Boolean(post.image_url),
        })),
      })
    : "No grid exists yet."

  try {
    const { object } = await generateObject({
      model: createMayaOpenRouterModel("chat_pro"),
      schema: calendarAgentGenerationSchema,
      temperature: 0.35,
      system,
      messages: [
        {
          role: "user",
          content: [
            brandContext ? `Member context:\n${brandContext}` : "Member context is still light.",
            `Current Calendar state:\n${gridState}`,
            input.history.length
              ? `Recent Calendar conversation:\n${input.history.map(item => `${item.role}: ${item.content}`).join("\n")}`
              : "",
            `Her message now:\n${input.message}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    })

    let result = calendarAgentResultSchema.parse(object)
    const proposal = result.proposal
    if (proposal) {
      const postId = proposalPostId(proposal)
      const invalidFeedState =
        (proposal.kind === "create_plan" && ownedFeed !== null) ||
        (proposalRequiresFeed(proposal) && ownedFeed === null)
      const invalidPost = postId !== null && !posts.some(post => Number(post.id) === postId)
      const invalidPosition =
        proposal.kind === "move_post" &&
        (proposal.targetPosition < 1 || proposal.targetPosition > Math.max(posts.length, 1))
      if (invalidFeedState || invalidPost || invalidPosition) {
        result = {
          message: "I need you to select the grid or post you want me to change first.",
          proposal: null,
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[calendar-agent] failed:", error)
    return NextResponse.json(
      { error: `${agentName} could not review this grid right now. Please try again.` },
      { status: 500 }
    )
  }
}
