import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import {
  collectInstagramPerformance,
  type InstagramPerformanceSnapshot,
} from "@/lib/content-engine/instagram-performance"
import { collectAudienceSignals, type AudienceSignals } from "@/lib/content-engine/audience-signals"

const RESEARCH_MODEL = "claude-sonnet-4-5"
const BRIEF_MODEL = "claude-sonnet-4-5"

export type ContentBriefPiece = {
  day: string
  format: "reel" | "carousel" | "feed"
  title: string
  hook: string
  caption: string
  carouselOutline: string[]
  reelCoverText: string
  photoshootPrompt: string
  hashtags: string[]
  whyThisWorks: string
}

export type ContentBrief = {
  periodStart: string
  periodEnd: string
  accountSnapshot: {
    username: string
    followers: number | null
    postsAnalyzed: number
    insightsLevel: "basic" | "full"
  }
  performanceRecap: Array<{
    permalink: string
    format: string
    hookLine: string
    likes: number
    comments: number
    whyItWorked: string
  }>
  audienceDemand: {
    topPrompts: Array<{ title: string; copies: number }>
    dmThemes: Array<{ theme: string; evidence: string }>
  }
  hookIntelligence: Array<{
    hook: string
    pattern: string
    source: "your-data" | "research"
    evidence: string
  }>
  contentPlan: ContentBriefPiece[]
  storySequence: {
    theme: string
    frames: Array<{ frame: number; content: string; interaction: string }>
  }
  researchNotes: string
}

export const SANDRA_VOICE_RULES = `
VOICE (non-negotiable):
- Sandra's voice: like texting a close friend. Warm, honest, short sentences. Contractions always.
- NEVER use these words: leverage, synergy, transform, game-changer, skyrocket, unlock your potential.
- NEVER use em-dashes (—) anywhere. Use a period, a colon, or a middle dot instead.

NO-FAKE DOCTRINE (locked, governs all copy):
- Her audience's core fear is "people will think I'm fake." The promise is "look elevated without feeling fake."
- AI = creative direction around the real her, never deception.
- NEVER write copy implying viewers are fooled. Banned: "no one will know", "look rich", "fake photoshoot", "perfect face", "flawless skin".
- ALWAYS frame as: AI-assisted, realistic, recognizable, tasteful, true-to-you, "keeps your face".
- Signature line allowed: "AI should not erase you. It should frame you."

PHOTOSHOOT PROMPTS:
- ChatGPT-ready, following the Prompt Vault style: start with "Use my selfie as the identity reference." then describe an editorial scene (location, light, outfit, mood, camera feel). Keep the face recognizable. No face-altering instructions.
`.trim()

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")
  return new Anthropic({ apiKey })
}

async function researchCurrentHooks(
  performance: InstagramPerformanceSnapshot | null,
  signals: AudienceSignals,
): Promise<string> {
  const client = getAnthropicClient()

  const ownWinners = (performance?.topPosts || [])
    .slice(0, 5)
    .map((post) => `- [${post.format}] "${post.hookLine}" (${post.likes} likes, ${post.comments} comments)`)
    .join("\n")

  const topPrompts = signals.promptDemand
    .slice(0, 5)
    .map((p) => `- "${p.title}" copied ${p.copies}x`)
    .join("\n")

  const response = await client.messages.create({
    model: RESEARCH_MODEL,
    max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 } as any],
    messages: [
      {
        role: "user",
        content: `You research Instagram content strategy for @${performance?.username || "sandra.social"} (${performance?.followers ?? "100k+"} followers). Her niche: AI photoshoots from one selfie, personal branding for women entrepreneurs, "look elevated without feeling fake".

Her own recent winners (real data):
${ownWinners || "- (no data this run)"}

What her audience copies most (real demand data):
${topPrompts || "- (no data this run)"}

Research what hook formats and reel/carousel structures are working on Instagram RIGHT NOW in this niche (AI photos, ChatGPT photo prompts, personal branding for women). Look for current, evidenced patterns, not recycled 2023 advice.

Return a concise research memo:
1. 5-8 hook patterns currently working, each with why it works and a one-line example adapted to her niche
2. Format notes (reel length, carousel structure, cover text patterns)
3. Anything in her own winners that matches or contradicts current trends

Plain text. No fluff.`,
      },
    ],
  })

  const text = response.content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n")

  return text.trim()
}

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    performanceRecap: {
      type: "array",
      items: {
        type: "object",
        properties: {
          permalink: { type: "string" },
          format: { type: "string" },
          hookLine: { type: "string" },
          likes: { type: "number" },
          comments: { type: "number" },
          whyItWorked: { type: "string" },
        },
        required: ["permalink", "format", "hookLine", "likes", "comments", "whyItWorked"],
      },
    },
    audienceDemand: {
      type: "object",
      properties: {
        topPrompts: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, copies: { type: "number" } },
            required: ["title", "copies"],
          },
        },
        dmThemes: {
          type: "array",
          items: {
            type: "object",
            properties: { theme: { type: "string" }, evidence: { type: "string" } },
            required: ["theme", "evidence"],
          },
        },
      },
      required: ["topPrompts", "dmThemes"],
    },
    hookIntelligence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          hook: { type: "string" },
          pattern: { type: "string" },
          source: { type: "string", enum: ["your-data", "research"] },
          evidence: { type: "string" },
        },
        required: ["hook", "pattern", "source", "evidence"],
      },
    },
    contentPlan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "string" },
          format: { type: "string", enum: ["reel", "carousel", "feed"] },
          title: { type: "string" },
          hook: { type: "string" },
          caption: { type: "string" },
          carouselOutline: { type: "array", items: { type: "string" } },
          reelCoverText: { type: "string" },
          photoshootPrompt: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          whyThisWorks: { type: "string" },
        },
        required: [
          "day",
          "format",
          "title",
          "hook",
          "caption",
          "carouselOutline",
          "reelCoverText",
          "photoshootPrompt",
          "hashtags",
          "whyThisWorks",
        ],
      },
    },
    storySequence: {
      type: "object",
      properties: {
        theme: { type: "string" },
        frames: {
          type: "array",
          items: {
            type: "object",
            properties: {
              frame: { type: "number" },
              content: { type: "string" },
              interaction: { type: "string" },
            },
            required: ["frame", "content", "interaction"],
          },
        },
      },
      required: ["theme", "frames"],
    },
  },
  required: ["performanceRecap", "audienceDemand", "hookIntelligence", "contentPlan", "storySequence"],
} as const

export async function generateContentBrief(): Promise<ContentBrief> {
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd)
  periodStart.setDate(periodStart.getDate() - 7)

  const [performance, signals] = await Promise.all([
    collectInstagramPerformance(),
    collectAudienceSignals(30),
  ])

  const researchNotes = await researchCurrentHooks(performance, signals)

  const client = getAnthropicClient()

  const dataPacket = {
    account: {
      username: performance?.username || "sandra.social",
      followers: performance?.followers ?? null,
      insightsLevel: performance?.insightsLevel || "basic",
    },
    topPosts: (performance?.topPosts || []).map((post) => ({
      permalink: post.permalink,
      format: post.format,
      postedAt: post.postedAt,
      hookLine: post.hookLine,
      caption: post.caption.slice(0, 300),
      likes: post.likes,
      comments: post.comments,
      reach: post.reach,
      saves: post.saves,
      shares: post.shares,
    })),
    audience: signals,
    researchMemo: researchNotes,
  }

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 8000,
    system: `You are Sandra's content strategist for SSELFIE (@sandra.social). You produce her weekly content brief. Every suggestion must be traceable to the data you're given: her top posts, what her audience copies, what they DM her, and the research memo. Never invent statistics. If a claim comes from research, say so.

${SANDRA_VOICE_RULES}

CONTENT PLAN RULES:
- Exactly 5 pieces, spread across the week (e.g. Mon/Tue/Thu/Fri/Sun).
- At least 2 reels, at least 1 carousel.
- Each piece must connect to a real demand signal (a top-copied prompt, a DM theme, or a proven hook from her own winners). Name the signal in whyThisWorks.
- Captions are complete and ready to paste: hook line, body in short lines, one clear CTA. CTA options: comment keyword PROMPT, link in bio to the free prompts page, or the $27 Prompt Vault. Never more than one CTA per piece.
- reelCoverText: 3-6 words, works as on-image text.
- carouselOutline: only for carousels, one line per slide, 6-8 slides, slide 1 is the hook. For non-carousels return an empty array.
- photoshootPrompt: ChatGPT-ready in the Prompt Vault style. Lean on the top-copied prompt aesthetics (her audience already voted with their copies).
- hashtags: 8-12, mix of niche and reach, no banned or spammy tags.
- storySequence: one sequence, 4-6 frames, at least one interaction (poll, question box, or link) per sequence, designed to lead into one of the 5 pieces.`,
    messages: [
      {
        role: "user",
        content: `Here is this week's data. Build the brief.\n\n${JSON.stringify(dataPacket, null, 2)}`,
      },
    ],
    tools: [
      {
        name: "deliver_content_brief",
        description: "Deliver the finished weekly content brief as structured data.",
        input_schema: BRIEF_SCHEMA as any,
      },
    ],
    tool_choice: { type: "tool", name: "deliver_content_brief" },
  })

  const toolBlock = response.content.find((block: any) => block.type === "tool_use") as any
  if (!toolBlock?.input) {
    throw new Error("Brief generation returned no structured output")
  }

  const brief = toolBlock.input as Omit<
    ContentBrief,
    "periodStart" | "periodEnd" | "accountSnapshot" | "researchNotes"
  >

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    accountSnapshot: {
      username: performance?.username || "sandra.social",
      followers: performance?.followers ?? null,
      postsAnalyzed: performance?.postsAnalyzed ?? 0,
      insightsLevel: performance?.insightsLevel || "basic",
    },
    ...brief,
    researchNotes,
  }
}
