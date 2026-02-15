import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateText } from "ai"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

type PostStatus = "draft" | "ready" | "scheduled" | "posted"

interface PlannerPost {
  id: string
  dayLabel: string
  format: string
  pillar: string
  hook: string
  cta: string
  productionNotes: string
  postingTime: string
  captionTheme: string
  status: PostStatus
  assignedAssetUrl?: string
}

interface JournalContext {
  features_built?: string | null
  personal_story?: string | null
  struggles?: string | null
  wins?: string | null
  weekly_goals?: string | null
  future_self_vision?: string | null
}

function sanitizePosts(input: unknown): PlannerPost[] {
  if (!Array.isArray(input)) return []

  return input
    .map((raw, index) => {
      const post = raw as Record<string, unknown>
      const statusRaw = post.status
      const status: PostStatus =
        statusRaw === "ready" || statusRaw === "scheduled" || statusRaw === "posted" ? statusRaw : "draft"

      return {
        id: typeof post.id === "string" ? post.id : `post-${index + 1}`,
        dayLabel: typeof post.dayLabel === "string" ? post.dayLabel : `DAY ${index + 1}`,
        format: typeof post.format === "string" ? post.format : "POST",
        pillar: typeof post.pillar === "string" ? post.pillar : "Educational",
        hook: typeof post.hook === "string" ? post.hook : "",
        cta: typeof post.cta === "string" ? post.cta : "",
        productionNotes: typeof post.productionNotes === "string" ? post.productionNotes : "",
        postingTime: typeof post.postingTime === "string" ? post.postingTime : "TBD",
        captionTheme: typeof post.captionTheme === "string" ? post.captionTheme : "",
        status,
        assignedAssetUrl: typeof post.assignedAssetUrl === "string" ? post.assignedAssetUrl : undefined,
      }
    })
    .slice(0, 60)
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { userId: String(neonUser.id) }
}

async function getLatestJournalContext(userId: string): Promise<JournalContext | null> {
  const result = await sql`
    SELECT
      features_built,
      personal_story,
      struggles,
      wins,
      weekly_goals,
      future_self_vision
    FROM weekly_journal
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `

  if (!result || result.length === 0) {
    return null
  }

  return result[0] as JournalContext
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const body = (await request.json()) as { posts?: unknown }
    const posts = sanitizePosts(body.posts)

    if (posts.length === 0) {
      return NextResponse.json({ error: "No posts provided" }, { status: 400 })
    }

    const journal = await getLatestJournalContext(auth.userId)

    const voiceRules = [
      "Warm, real, clear, encouraging, actionable",
      "Use short sentences and concrete wording",
      "Speak directly to one person as 'you'",
      "Avoid hype or corporate jargon",
      "Use low-pressure practical CTA language",
      "Do not use banned words: unlock, game-changer, level up, transform, elevate, synergy",
    ]

    const journalContextText = journal
      ? `\nJournal context:\n- Features built: ${journal.features_built || ""}\n- Personal story: ${journal.personal_story || ""}\n- Struggles: ${journal.struggles || ""}\n- Wins: ${journal.wins || ""}\n- Weekly goals: ${journal.weekly_goals || ""}\n- Future vision: ${journal.future_self_vision || ""}\n`
      : "\nJournal context: none available. Keep voice grounded and practical.\n"

    const prompt = `Rewrite the following content planner posts so they sound like Sandra's authentic voice.

Voice rules:
${voiceRules.map((line, index) => `${index + 1}. ${line}`).join("\n")}
${journalContextText}
Rewrite each post but preserve its intent, format, and business objective.
For each post, improve these fields only:
- hook
- cta
- captionTheme
- productionNotes

Return strict JSON ONLY with this exact shape:
{
  "posts": [
    {
      "id": "...",
      "hook": "...",
      "cta": "...",
      "captionTheme": "...",
      "productionNotes": "..."
    }
  ]
}

Input posts JSON:
${JSON.stringify(posts)}`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
    })

    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "")
    const parsed = JSON.parse(cleaned) as {
      posts?: Array<{
        id: string
        hook?: string
        cta?: string
        captionTheme?: string
        productionNotes?: string
      }>
    }

    const rewrites = Array.isArray(parsed.posts) ? parsed.posts : []
    const rewriteMap = new Map(rewrites.map((item) => [item.id, item]))

    const rewrittenPosts = posts.map((post) => {
      const rewrite = rewriteMap.get(post.id)
      if (!rewrite) return post

      return {
        ...post,
        hook: typeof rewrite.hook === "string" && rewrite.hook.length > 0 ? rewrite.hook : post.hook,
        cta: typeof rewrite.cta === "string" && rewrite.cta.length > 0 ? rewrite.cta : post.cta,
        captionTheme:
          typeof rewrite.captionTheme === "string" && rewrite.captionTheme.length > 0
            ? rewrite.captionTheme
            : post.captionTheme,
        productionNotes:
          typeof rewrite.productionNotes === "string" && rewrite.productionNotes.length > 0
            ? rewrite.productionNotes
            : post.productionNotes,
      }
    })

    return NextResponse.json({ posts: rewrittenPosts })
  } catch (error: unknown) {
    console.error("[content-engine] rewrite error", error)
    const message = error instanceof Error ? error.message : "Failed to rewrite planner content"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
