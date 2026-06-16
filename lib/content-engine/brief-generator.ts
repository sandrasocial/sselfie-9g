import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import {
  collectInstagramPerformance,
  type InstagramPerformanceSnapshot,
} from "@/lib/content-engine/instagram-performance"
import { collectAudienceSignals, type AudienceSignals } from "@/lib/content-engine/audience-signals"
import {
  BANNED_WORDS,
  audienceBlock,
  funnelBlock,
  noFakeBlock,
  proofBlock,
  sanitizeGroundedText,
  voiceBlock,
} from "@/lib/content/grounding"
import { getAcademyProductCatalog } from "@/lib/academy-entitlements"
import { getStaticVaultInventory } from "@/lib/ai-prompts/prompt-data"
import { getPublishedVaultCollections } from "@/lib/vault/published-collections"

const RESEARCH_MODEL = "claude-sonnet-4-5"
const BRIEF_MODEL = "claude-sonnet-4-5"

type VaultBriefContext = {
  staticCollectionCount: number
  staticPromptCount: number
  publishedDropCount: number
  publishedDropPromptCount: number
  totalCollectionCount: number
  totalPromptCount: number
  newestPublishedDrops: Array<{
    title: string
    promptCount: number
    moodLine: string
    publishedAt: string
  }>
}

type SuiteBriefContext = {
  includedProducts: Array<{
    id: string
    name: string
    tagline: string
  }>
}

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

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")
  return new Anthropic({ apiKey })
}

async function getVaultBriefContext(): Promise<VaultBriefContext> {
  const staticCollections = getStaticVaultInventory()
  const publishedDrops = await getPublishedVaultCollections()
  const staticPromptCount = staticCollections.reduce((sum, collection) => sum + collection.shotCount, 0)
  const publishedDropPromptCount = publishedDrops.reduce(
    (sum, collection) => sum + collection.cards.length,
    0
  )

  return {
    staticCollectionCount: staticCollections.length,
    staticPromptCount,
    publishedDropCount: publishedDrops.length,
    publishedDropPromptCount,
    totalCollectionCount: staticCollections.length + publishedDrops.length,
    totalPromptCount: staticPromptCount + publishedDropPromptCount,
    newestPublishedDrops: publishedDrops.slice(0, 5).map(collection => ({
      title: collection.title,
      promptCount: collection.cards.length,
      moodLine: collection.moodLine,
      publishedAt: collection.publishedAt,
    })),
  }
}

async function getSuiteBriefContext(): Promise<SuiteBriefContext> {
  const catalog = await getAcademyProductCatalog()
  return {
    includedProducts: catalog
      .filter(product => product.active && product.membershipIncluded)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(product => ({
        id: product.id,
        name: product.name,
        tagline: product.tagline,
      })),
  }
}

const BANNED_COPY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\belevated\b/gi, "high-end"],
  [/\belevate\b/gi, "make clearer"],
  [/\btransform(?:s|ed|ing|ation)?\b/gi, "turn"],
  [/\bcurated\b/gi, "chosen"],
  [/\bleverage\b/gi, "use"],
  [/\bamplify\b/gi, "strengthen"],
  [/\bempower\b/gi, "help"],
  [/\bjourney\b/gi, "path"],
  [/\bgame-changer\b/gi, "useful shift"],
  [/\bskyrocket\b/gi, "grow"],
  [/\bunlock your potential\b/gi, "start with what you have"],
  [/\bunlock\b/gi, "open"],
  [/\bstrategic visibility\b/gi, "being seen by the right people"],
]

function sanitizeBriefText(text: string, vault: VaultBriefContext): string {
  let next = sanitizeGroundedText(String(text || ""))
  next = next.replace(
    /\b(?:92|98|104|150)\s+(copy-paste\s+)?prompts?\b/gi,
    `${vault.totalPromptCount} $1prompts`
  )
  next = next.replace(
    /\b(?:10|11|12|13|14|15)\s+(collections?|shoot worlds?|shoots?)\b/gi,
    `${vault.totalCollectionCount} $1`
  )
  for (const [pattern, replacement] of BANNED_COPY_REPLACEMENTS) {
    next = next.replace(pattern, replacement)
  }
  for (const banned of BANNED_WORDS) {
    const escaped = banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    next = next.replace(new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "gi"), "$1$2")
  }
  return next.replace(/[ \t]{2,}/g, " ").trim()
}

function captionLooksLikePromptLeak(caption: string): boolean {
  const markers = [
    "Use the uploaded reference photos",
    "Identity lock:",
    "Scene:",
    "Outfit:",
    "Camera + lens:",
    "Color grading:",
    "Avoid:",
    "Create image",
  ]
  const hits = markers.filter(marker => caption.toLowerCase().includes(marker.toLowerCase()))
  return hits.length >= 3 || caption.length > 1300
}

function safeTeaserCaption(piece: Pick<ContentBriefPiece, "hook" | "title">): string {
  return [
    piece.hook || piece.title,
    "",
    "Show the result first.",
    "Name the tiny method.",
    "Keep the full copy-paste prompt inside the Vault.",
    "",
    "Comment PROMPT and I will send you the free starter pack.",
  ].join("\n")
}

function sanitizeContentBriefOutput<T extends Omit<ContentBrief, "periodStart" | "periodEnd" | "accountSnapshot" | "researchNotes">>(
  brief: T,
  vault: VaultBriefContext
): T {
  const sanitizePiece = (piece: ContentBriefPiece): ContentBriefPiece => {
    const caption = sanitizeBriefText(piece.caption, vault)
    return {
      ...piece,
      day: sanitizeBriefText(piece.day, vault),
      title: sanitizeBriefText(piece.title, vault),
      hook: sanitizeBriefText(piece.hook, vault),
      caption: captionLooksLikePromptLeak(caption)
        ? sanitizeBriefText(safeTeaserCaption(piece), vault)
        : caption,
      carouselOutline: piece.carouselOutline.map(line => sanitizeBriefText(line, vault)),
      reelCoverText: sanitizeBriefText(piece.reelCoverText, vault),
      photoshootPrompt: sanitizeBriefText(piece.photoshootPrompt, vault),
      hashtags: piece.hashtags.map(tag => sanitizeBriefText(tag, vault)),
      whyThisWorks: sanitizeBriefText(piece.whyThisWorks, vault),
    }
  }

  return {
    ...brief,
    performanceRecap: brief.performanceRecap.map(item => ({
      ...item,
      hookLine: sanitizeBriefText(item.hookLine, vault),
      whyItWorked: sanitizeBriefText(item.whyItWorked, vault),
    })),
    audienceDemand: {
      topPrompts: brief.audienceDemand.topPrompts.map(prompt => ({
        ...prompt,
        title: sanitizeBriefText(prompt.title, vault),
      })),
      dmThemes: brief.audienceDemand.dmThemes.map(theme => ({
        theme: sanitizeBriefText(theme.theme, vault),
        evidence: sanitizeBriefText(theme.evidence, vault),
      })),
    },
    hookIntelligence: brief.hookIntelligence.map(hook => ({
      ...hook,
      hook: sanitizeBriefText(hook.hook, vault),
      pattern: sanitizeBriefText(hook.pattern, vault),
      evidence: sanitizeBriefText(hook.evidence, vault),
    })),
    contentPlan: brief.contentPlan.map(sanitizePiece),
    storySequence: {
      theme: sanitizeBriefText(brief.storySequence.theme, vault),
      frames: brief.storySequence.frames.map(frame => ({
        ...frame,
        content: sanitizeBriefText(frame.content, vault),
        interaction: sanitizeBriefText(frame.interaction, vault),
      })),
    },
  }
}

async function researchCurrentHooks(
  performance: InstagramPerformanceSnapshot | null,
  signals: AudienceSignals
): Promise<string> {
  const client = getAnthropicClient()

  const ownWinners = (performance?.topPosts || [])
    .slice(0, 5)
    .map(
      post =>
        `- [${post.format}] "${post.hookLine}" (${post.likes} likes, ${post.comments} comments)`
    )
    .join("\n")

  const topPrompts = signals.promptDemand
    .slice(0, 5)
    .map(p => `- "${p.title}" copied ${p.copies}x`)
    .join("\n")

  const response = await client.messages.create({
    model: RESEARCH_MODEL,
    max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 } as any],
    messages: [
      {
        role: "user",
        content: `You research Instagram content strategy for @${performance?.username || "sandra.social"} (${performance?.followers ?? "100k+"} followers). Her niche: AI-assisted brand imagery from one selfie, personal branding for women entrepreneurs, "Look like yourself, at your best."

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
  required: [
    "performanceRecap",
    "audienceDemand",
    "hookIntelligence",
    "contentPlan",
    "storySequence",
  ],
} as const

export async function generateContentBrief(): Promise<ContentBrief> {
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd)
  periodStart.setDate(periodStart.getDate() - 7)

  const [performance, signals, vault, suite] = await Promise.all([
    collectInstagramPerformance(),
    collectAudienceSignals(30),
    getVaultBriefContext(),
    getSuiteBriefContext(),
  ])

  const researchNotes = await researchCurrentHooks(performance, signals)

  const client = getAnthropicClient()

  const dataPacket = {
    account: {
      username: performance?.username || "sandra.social",
      followers: performance?.followers ?? null,
      insightsLevel: performance?.insightsLevel || "basic",
    },
    topPosts: (performance?.topPosts || []).map(post => ({
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
    vault,
    suite,
    researchMemo: researchNotes,
  }

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 8000,
    system: `You are Sandra's content strategist for SSELFIE (@sandra.social). You produce her weekly content brief. Every suggestion must be traceable to the data you're given: her top posts, what her audience copies, what they DM her, and the research memo. Never invent statistics. If a claim comes from research, say so.

${voiceBlock()}

${noFakeBlock()}

${audienceBlock()}

${proofBlock()}

${funnelBlock()}

CONTENT PLAN RULES:
- Exactly 5 pieces, spread across the week (e.g. Mon/Tue/Thu/Fri/Sun).
- At least 2 reels, at least 1 carousel.
- Each piece must connect to a real demand signal (a top-copied prompt, a DM theme, or a proven hook from her own winners). Name the signal in whyThisWorks.
- Read audience.dmSamples and audience.dmIntents. Every dmThemes entry MUST quote or paraphrase a real DM. Anchor at least 2 content pieces to a specific pain point found in the DMs.
- Her own viral DNA and top posts win over the research memo when they conflict. Treat researchMemo as a tiebreaker only.
- Every recommended reel must satisfy all 5 viral DNA elements. Do not recommend known flop formats.
- Teach the full ladder: Free AI Prompts -> Prompt Vault $27 -> SSELFIE SUITE EUR 97/month. If vaultActivity shows strong copies but weak purchase behavior, include a clear conversion move.
- Vault count is LIVE in dataPacket.vault. Never hardcode "92", "150", "10 collections", or any fixed count. If you need a number, use dataPacket.vault.totalPromptCount and dataPacket.vault.totalCollectionCount only. Prefer "every shoot world I've built" or "new drops added all the time" unless the exact live number improves clarity.
- Newly published Shoot Studio drops in dataPacket.vault.newestPublishedDrops are fresh content inputs. Feature the newest relevant drop as a content angle when it fits the week's demand.
- SUITE claims may only use dataPacket.suite.includedProducts. Do not invent "Real You Method training", "monthly brand shoot themes", "live editing sessions", or any feature not listed in the product catalog.
- Captions are complete and ready to paste: hook line, body in short lines, one clear CTA. CTA options: comment keyword PROMPT, link in bio to the free prompts page, or the $27 Prompt Vault. Never more than one CTA per piece.
- Do not give away the full copy-paste Vault prompt in any free reel/feed caption. Tease the result and the method. The full prompt is the Vault payoff. The photoshootPrompt field is for Sandra's internal planning only.
- reelCoverText: 3-6 words, works as on-image text.
- carouselOutline: only for carousels, one line per slide, 6-8 slides, slide 1 is the hook. For non-carousels return an empty array.
- photoshootPrompt: ChatGPT-ready in the Prompt Vault style. Lean on the top-copied prompt aesthetics (her audience already voted with their copies).
- hashtags: 8-12, mix of niche and reach, no banned or spammy tags.
- storySequence: one sequence, 4-6 frames, at least one interaction (poll, question box, or link) per sequence, designed to lead into one of the 5 pieces.
- No banned words and no m-dashes anywhere in the structured output.`,
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

  const brief = sanitizeContentBriefOutput(toolBlock.input as Omit<
    ContentBrief,
    "periodStart" | "periodEnd" | "accountSnapshot" | "researchNotes"
  >, vault)

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
    researchNotes: sanitizeBriefText(researchNotes, vault),
  }
}
