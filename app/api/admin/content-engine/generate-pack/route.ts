import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateText } from "ai"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

interface JournalContext {
  features_built?: string | null
  personal_story?: string | null
  struggles?: string | null
  wins?: string | null
  weekly_goals?: string | null
  future_self_vision?: string | null
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

    const body = (await request.json()) as {
      topic?: string
      brainDump?: string
      currentContext?: string
      shareGoal?: string
    }

    const topic = (body.topic || "").trim()
    const brainDump = (body.brainDump || "").trim()
    const currentContext = (body.currentContext || "").trim()
    const shareGoal = (body.shareGoal || "").trim()

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }

    const journal = await getLatestJournalContext(auth.userId)

    const journalContext = journal
      ? `
Latest journal context:
- Features built: ${journal.features_built || ""}
- Personal story: ${journal.personal_story || ""}
- Struggles: ${journal.struggles || ""}
- Wins: ${journal.wins || ""}
- Weekly goals: ${journal.weekly_goals || ""}
- Future vision: ${journal.future_self_vision || ""}
`
      : "\nNo journal context found. Keep voice practical and human.\n"

    const prompt = `You are Sandra's in-app content engine. Create one complete social content pack from this input.

Brand voice requirements:
- Warm, real, clear, encouraging, actionable
- Short sentences, no jargon, no fake hype
- Talk to one person directly
- No corporate tone
- No banned words: unlock, game-changer, level up, transform, elevate, synergy

Input:
- Topic: ${topic}
- Brain dump: ${brainDump}
- Current context: ${currentContext}
- What she wants to share: ${shareGoal}
${journalContext}

Output strict JSON only, no markdown:
{
  "caption": "string",
  "storySequence": ["string", "string", "string", "string", "string"],
  "carouselOutline": [
    {"slide": 1, "title": "string", "body": "string"}
  ],
  "reelScript": [
    {"beat": "0-3s", "script": "string"},
    {"beat": "3-12s", "script": "string"},
    {"beat": "12-30s", "script": "string"},
    {"beat": "30-45s", "script": "string"}
  ],
  "hashtags": ["string"],
  "cta": "string"
}

Rules:
- caption should be practical and post-ready
- storySequence should feel like 5 story frames
- carouselOutline should have 6-8 slides total
- reelScript should feel shootable with iPhone
- hashtags should be 8-14, relevant and non-spammy
- cta should be specific and low-pressure`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
    })

    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "")
    const parsed = JSON.parse(cleaned) as {
      caption?: string
      storySequence?: string[]
      carouselOutline?: Array<{ slide: number; title: string; body: string }>
      reelScript?: Array<{ beat: string; script: string }>
      hashtags?: string[]
      cta?: string
    }

    const pack = {
      caption: typeof parsed.caption === "string" ? parsed.caption : "",
      storySequence: Array.isArray(parsed.storySequence) ? parsed.storySequence.slice(0, 8) : [],
      carouselOutline: Array.isArray(parsed.carouselOutline) ? parsed.carouselOutline.slice(0, 10) : [],
      reelScript: Array.isArray(parsed.reelScript) ? parsed.reelScript.slice(0, 8) : [],
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 20) : [],
      cta: typeof parsed.cta === "string" ? parsed.cta : "",
    }

    return NextResponse.json({ pack })
  } catch (error: unknown) {
    console.error("[content-engine] generate-pack error", error)
    const message = error instanceof Error ? error.message : "Failed to generate content pack"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
