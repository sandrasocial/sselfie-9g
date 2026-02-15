import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { SANDRA_BRAND_DNA } from "@/lib/content-engine/brand-dna"

const ADMIN_EMAIL = "ssa@ssasocial.com"

type DraftType = "caption" | "story" | "carousel" | "reel"

interface BrainEntry {
  id: string
  topic: string
  brainDump: string
  happenedWeek: string
  painPoint: string
  desiredOutcome: string
  createdAt: string
}

interface DraftResult {
  title: string
  body: string
  cta: string
  hashtags: string[]
  storyFrames: string[]
  carouselSlides: Array<{ slide: number; title: string; body: string }>
  reelBeats: Array<{ beat: string; script: string }>
  claudePrompt: string
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

  return { ok: true as const }
}

function isGeneric(result: DraftResult) {
  const text = `${result.title} ${result.body} ${result.storyFrames.join(" ")} ${result.carouselSlides
    .map((s) => `${s.title} ${s.body}`)
    .join(" ")} ${result.reelBeats.map((b) => b.script).join(" ")}`.toLowerCase()

  const genericSignals = [
    "be authentic",
    "just show up",
    "stay consistent",
    "believe in yourself",
    "transform your",
    "game changer",
    "level up",
  ]

  const hits = genericSignals.filter((signal) => text.includes(signal)).length
  const painHit = SANDRA_BRAND_DNA.audience.pains.some((pain) => {
    const token = pain.toLowerCase().split(/[^a-z0-9]+/).find((t) => t.length > 4)
    return token ? text.includes(token) : false
  })
  const desireHit = SANDRA_BRAND_DNA.audience.desires.some((desire) => {
    const token = desire.toLowerCase().split(/[^a-z0-9]+/).find((t) => t.length > 4)
    return token ? text.includes(token) : false
  })

  return hits >= 2 || !painHit || !desireHit
}

function parseDraft(rawText: string): DraftResult {
  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/```$/, "")
  const parsed = JSON.parse(cleaned) as Partial<DraftResult>

  return {
    title: typeof parsed.title === "string" ? parsed.title : "",
    body: typeof parsed.body === "string" ? parsed.body : "",
    cta: typeof parsed.cta === "string" ? parsed.cta : "",
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((v) => typeof v === "string").slice(0, 16) : [],
    storyFrames: Array.isArray(parsed.storyFrames)
      ? parsed.storyFrames.filter((v) => typeof v === "string").slice(0, 8)
      : [],
    carouselSlides: Array.isArray(parsed.carouselSlides)
      ? parsed.carouselSlides
          .map((s) => ({
            slide: typeof s?.slide === "number" ? s.slide : 0,
            title: typeof s?.title === "string" ? s.title : "",
            body: typeof s?.body === "string" ? s.body : "",
          }))
          .filter((s) => s.slide > 0)
          .slice(0, 10)
      : [],
    reelBeats: Array.isArray(parsed.reelBeats)
      ? parsed.reelBeats
          .map((b) => ({
            beat: typeof b?.beat === "string" ? b.beat : "",
            script: typeof b?.script === "string" ? b.script : "",
          }))
          .filter((b) => b.beat && b.script)
          .slice(0, 8)
      : [],
    claudePrompt: typeof parsed.claudePrompt === "string" ? parsed.claudePrompt : "",
  }
}

function buildPrompt(input: {
  draftType: DraftType
  topic: string
  brainDump: string
  happenedWeek: string
  painPoint: string
  desiredOutcome: string
  memories: BrainEntry[]
  harden?: boolean
}) {
  const memoryContext = input.memories
    .slice(0, 8)
    .map((entry, index) => {
      return `${index + 1}. topic=${entry.topic}; pain=${entry.painPoint}; desired=${entry.desiredOutcome}; notes=${entry.brainDump}`
    })
    .join("\n")

  return `You are Sandra's second brain inside SSELFIE. Create one strong ${input.draftType} draft only.

Voice DNA:
- Traits: ${SANDRA_BRAND_DNA.voice.traits.join(", ")}
- Sentence style: ${SANDRA_BRAND_DNA.voice.sentenceStyle}
- Preferred phrases: ${SANDRA_BRAND_DNA.voice.preferredPhrases.join(" | ")}
- Banned words: ${SANDRA_BRAND_DNA.voice.bannedWords.join(", ")}
- Origin beats: ${SANDRA_BRAND_DNA.originStoryBeats.join(" | ")}
- Audience pains: ${SANDRA_BRAND_DNA.audience.pains.join(" | ")}
- Audience desires: ${SANDRA_BRAND_DNA.audience.desires.join(" | ")}

Input:
- Draft type: ${input.draftType}
- Topic: ${input.topic}
- Brain dump: ${input.brainDump}
- What happened this week: ${input.happenedWeek}
- Pain point to address: ${input.painPoint}
- Desired audience outcome: ${input.desiredOutcome}
- Relevant memory snippets:\n${memoryContext || "none"}

Output strict JSON only with shape:
{
  "title": "string",
  "body": "string",
  "cta": "string",
  "hashtags": ["#tag"],
  "storyFrames": ["string"],
  "carouselSlides": [{"slide":1,"title":"string","body":"string"}],
  "reelBeats": [{"beat":"0-3s","script":"string"}],
  "claudePrompt": "string"
}

Rules:
- Must include one pain and one desire explicitly.
- Must include a clear story turn (before -> shift -> now).
- Keep it practical and specific, not broad advice.
- claudePrompt should be a ready-to-paste prompt that expands this same draft style.
${input.harden ? "- Avoid generic coaching lines and abstract advice. Be concrete and personal." : ""}`
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const body = (await request.json()) as {
      draftType?: DraftType
      topic?: string
      brainDump?: string
      happenedWeek?: string
      painPoint?: string
      desiredOutcome?: string
      memories?: BrainEntry[]
    }

    const draftType = body.draftType || "caption"
    const topic = (body.topic || "").trim()
    const brainDump = (body.brainDump || "").trim()
    const happenedWeek = (body.happenedWeek || "").trim()
    const painPoint = (body.painPoint || "").trim()
    const desiredOutcome = (body.desiredOutcome || "").trim()
    const memories = Array.isArray(body.memories) ? body.memories : []

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }

    const first = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: buildPrompt({
        draftType,
        topic,
        brainDump,
        happenedWeek,
        painPoint,
        desiredOutcome,
        memories,
      }),
    })

    let draft = parseDraft(first.text)

    if (isGeneric(draft)) {
      const second = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        prompt: buildPrompt({
          draftType,
          topic,
          brainDump,
          happenedWeek,
          painPoint,
          desiredOutcome,
          memories,
          harden: true,
        }),
      })
      draft = parseDraft(second.text)
    }

    return NextResponse.json({ draft })
  } catch (error: unknown) {
    console.error("[content-engine] draft error", error)
    const message = error instanceof Error ? error.message : "Failed to generate draft"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
