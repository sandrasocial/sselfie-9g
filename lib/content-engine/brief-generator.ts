import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import type { ContentBlock, TextBlock, Tool, ToolUnion, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages"
import {
  collectInstagramPerformance,
  type InstagramPerformanceSnapshot,
} from "@/lib/content-engine/instagram-performance"
import { getGrowthTruthSnapshot, type GrowthTruthSnapshot } from "@/lib/admin/growth-truth"
import { collectAudienceSignals, type AudienceSignals } from "@/lib/content-engine/audience-signals"
import {
  BANNED_WORDS,
  audienceBlock,
  expertiseBlock,
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

const WEB_SEARCH_TOOL: ToolUnion = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
}

const MARKET_PATTERN_CONTEXT = `
Recent SSELFIE market-pattern notes, verified in June 2026:
- @aivideoskool: useful mechanics are named aesthetic drops, a clear cover system, and showing one concept across multiple recognizable examples. Do not adapt his numbered keyword operating model for SSELFIE; Sandra retired numbered ManyChat keywords because they are too complex.
- @imanoubou: working mechanics are named numbered frameworks, meta-reveal hooks ("I gave AI X and it built Y"), and comment-to-DM CTAs. Her synthetic-avatar direction is Sandra's foil. Sandra's angle is real woman + AI-assisted + still you.
- IG Growth OS watchlist: @aicontentuniversity for "don't just type X, tell AI: specifics" teaching format; @nordic_scott for disciplined tutorial-to-keyword funnel; @prompts.ig for prompt-drop cadence and credibility captions; @marcelaferreiraoficial for female-audience ChatGPT photo-edit formats that travel.
- The usable lesson is not "repeat Sandra's exact visual." It is: keep the proven topic or hook mechanic, then create a fresh scene, object, proof format, framework, or creator-context visual around it.
`

const DEMAND_CREATION_CONTEXT = `
SSELFIE demand doctrine, locked 2026-06-26:
- Attention is not enough. The brief must create demand, not just suggest content.
- People do not buy prompts, selfies, AI photos, Maya, courses, or visuals. Those are the tools.
- The buyer cares about the life/business outcome: she can start building online with her phone, face, story, and one clear visual direction.
- Start from the painful before: she feels visually behind, unclear, random, not ready, hard to trust, or unsure what to post/sell.
- Show the desired after: she looks recognizable, believable, easier to remember, easier to trust, and more ready to show up online.
- Product features only matter after the viewer understands why she should care.
- Every idea must show what painful situation SSELFIE helps remove and what becomes possible after.
- The strongest current ladder is Free AI Prompts -> Prompt Vault -> SSELFIE Studio Membership.
- Prompt Vault demand: stop guessing and choose repeatable visual worlds that make her profile feel intentional.
- Studio demand: a monthly personal-brand creation system that turns her face, story, and ideas into images, covers, captions, and content she can post.
- Starter Kit demand: fix the source-photo problem when she hates every selfie.
- Selfie to Brand Shoot demand is weaker as a public standalone offer right now; treat it as guided first-shoot support, buyer upsell, onboarding path, or membership bonus unless live data says otherwise.
`

const FUNNEL_SEGMENTATION_CONTEXT = `
SSELFIE forward revenue plan, locked 2026-07-01 (docs/business/SSELFIE_FORWARD_REVENUE_PLAN_2026-07-01.md):
- The audience splits into two different jobs. Do not write one undifferentiated content list for both.
- COLD (funnelStage "cold"): the feed/reel audience finding Sandra through selfie tips, iPhone settings, AI transformation reels, mirror selfie content. She is thinking "I want my photos to look better, I want to try AI photos, I do not want it to look fake." Her next paid step is the Selfie To AI Photos Kit ($27-$37), then Prompt Vault. This is the reach engine: feed reels and carousels.
- WARM (funnelStage "warm"): the Story, DM, email, and comment audience already asking deeper questions: how did you make income online, how do I start, how do I know what to post or sell, confidence, time/overwhelm. She already has a skill, service, story, or idea but feels invisible online. Her next paid step is the Visibility To Paid Sprint (apply / reply WORK), not a Kit or the Vault. This content belongs in Stories, DMs, and email, not necessarily the public feed. Anchor every warm piece to a real DM theme or the money/confidence/time poll signal, not a generic "personal branding" angle.
- ACTIVATION (funnelStage "activation"): content for people already inside the funnel (Vault buyers, trial members) that bridges them into SUITE or deepens Suite usage. This is proof, onboarding, and "here is what you get" content.
- Every contentPlan piece must be tagged with exactly one funnelStage. Across the week's plan, include at least one cold piece and at least one warm piece pointing at real DM/poll evidence. Do not force a warm sprint sell into a cold reel, and do not force a Kit/Vault sell into warm Story content.
`

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

export type DemandMap = {
  strongestDemandSignal: string
  painfulBefore: string
  desiredAfter: string
  beliefShift: string
  primaryOfferBridge: string
  contentWarning: string
}

export type ContentBriefPiece = {
  day: string
  format: "reel" | "carousel" | "feed"
  funnelStage: "cold" | "warm" | "activation"
  title: string
  hook: string
  demandSignal?: string
  painfulBefore?: string
  desiredAfter?: string
  beliefShift?: string
  visualProof?: string
  offerBridge?: string
  whyThisCreatesDemand?: string
  visualHook: string
  onScreenText: string[]
  trendMechanic?: string
  competitorPattern?: string
  shortSuggestion?: string
  executionNotes?: string
  whatToAvoid?: string
  chatgptContextPrompt?: string
  audioSuggestion?: string
  caption?: string
  carouselOutline?: string[]
  reelCoverText?: string
  photoshootPrompt?: string
  hashtags?: string[]
  whyThisWorks: string
}

export type ContentBrief = {
  periodStart: string
  periodEnd: string
  growthTruth?: GrowthTruthSnapshot | null
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
  demandMap?: DemandMap
  contentPlan: ContentBriefPiece[]
  storySequence: {
    theme: string
    frames: Array<{ frame: number; content: string; interaction: string }>
  }
  researchNotes: string
}

function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === "text"
}

function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use"
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

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asObject<T>(value: unknown): Partial<T> {
  return value && typeof value === "object" ? (value as Partial<T>) : {}
}

function safeBriefText(value: unknown, vault: VaultBriefContext): string {
  if (typeof value === "string") {
    return sanitizeBriefText(value, vault)
  }
  if (value == null) {
    return ""
  }
  return sanitizeBriefText(String(value), vault)
}

function sanitizeContentBriefOutput<T extends Omit<ContentBrief, "periodStart" | "periodEnd" | "accountSnapshot" | "researchNotes">>(
  brief: T,
  vault: VaultBriefContext
): T {
  const sanitizePiece = (piece: ContentBriefPiece): ContentBriefPiece => {
    const normalizedPiece = asObject<ContentBriefPiece>(piece)
    const caption = safeBriefText(normalizedPiece.caption, vault)
    return {
      ...piece,
      day: safeBriefText(normalizedPiece.day, vault),
      format: normalizedPiece.format === "carousel" || normalizedPiece.format === "feed" ? normalizedPiece.format : "reel",
      funnelStage:
        normalizedPiece.funnelStage === "warm" || normalizedPiece.funnelStage === "activation"
          ? normalizedPiece.funnelStage
          : "cold",
      title: safeBriefText(normalizedPiece.title, vault),
      hook: safeBriefText(normalizedPiece.hook, vault),
      demandSignal: safeBriefText(normalizedPiece.demandSignal, vault),
      painfulBefore: safeBriefText(normalizedPiece.painfulBefore, vault),
      desiredAfter: safeBriefText(normalizedPiece.desiredAfter, vault),
      beliefShift: safeBriefText(normalizedPiece.beliefShift, vault),
      visualProof: safeBriefText(normalizedPiece.visualProof, vault),
      offerBridge: safeBriefText(normalizedPiece.offerBridge, vault),
      whyThisCreatesDemand: safeBriefText(normalizedPiece.whyThisCreatesDemand, vault),
      visualHook: safeBriefText(normalizedPiece.visualHook, vault),
      onScreenText: asArray(normalizedPiece.onScreenText).map(line => safeBriefText(line, vault)),
      trendMechanic: safeBriefText(normalizedPiece.trendMechanic, vault),
      competitorPattern: safeBriefText(normalizedPiece.competitorPattern, vault),
      shortSuggestion: safeBriefText(normalizedPiece.shortSuggestion, vault),
      executionNotes: safeBriefText(normalizedPiece.executionNotes, vault),
      whatToAvoid: safeBriefText(normalizedPiece.whatToAvoid, vault),
      chatgptContextPrompt: safeBriefText(normalizedPiece.chatgptContextPrompt, vault),
      audioSuggestion: safeBriefText(normalizedPiece.audioSuggestion, vault),
      caption: captionLooksLikePromptLeak(caption)
        ? safeBriefText(safeTeaserCaption({
          hook: normalizedPiece.hook || "",
          title: normalizedPiece.title || "",
        }), vault)
        : caption,
      carouselOutline: asArray(normalizedPiece.carouselOutline).map(line => safeBriefText(line, vault)),
      reelCoverText: safeBriefText(normalizedPiece.reelCoverText, vault),
      photoshootPrompt: safeBriefText(normalizedPiece.photoshootPrompt, vault),
      hashtags: asArray(normalizedPiece.hashtags).map(tag => safeBriefText(tag, vault)),
      whyThisWorks: safeBriefText(normalizedPiece.whyThisWorks, vault),
    }
  }
  const normalizedBrief = asObject<ContentBrief>(brief)
  const audienceDemand = asObject<ContentBrief["audienceDemand"]>(normalizedBrief.audienceDemand)
  const demandMap = asObject<DemandMap>(normalizedBrief.demandMap)
  const storySequence = asObject<ContentBrief["storySequence"]>(normalizedBrief.storySequence)

  return {
    ...brief,
    performanceRecap: asArray<ContentBrief["performanceRecap"][number]>(normalizedBrief.performanceRecap).map(item => ({
      ...item,
      hookLine: safeBriefText(item.hookLine, vault),
      whyItWorked: safeBriefText(item.whyItWorked, vault),
    })),
    audienceDemand: {
      topPrompts: asArray<ContentBrief["audienceDemand"]["topPrompts"][number]>(audienceDemand.topPrompts).map(prompt => ({
        ...prompt,
        title: safeBriefText(prompt.title, vault),
      })),
      dmThemes: asArray<ContentBrief["audienceDemand"]["dmThemes"][number]>(audienceDemand.dmThemes).map(theme => ({
        theme: safeBriefText(theme.theme, vault),
        evidence: safeBriefText(theme.evidence, vault),
      })),
    },
    demandMap: normalizedBrief.demandMap ? {
      strongestDemandSignal: safeBriefText(demandMap.strongestDemandSignal, vault),
      painfulBefore: safeBriefText(demandMap.painfulBefore, vault),
      desiredAfter: safeBriefText(demandMap.desiredAfter, vault),
      beliefShift: safeBriefText(demandMap.beliefShift, vault),
      primaryOfferBridge: safeBriefText(demandMap.primaryOfferBridge, vault),
      contentWarning: safeBriefText(demandMap.contentWarning, vault),
    } : undefined,
    hookIntelligence: asArray<ContentBrief["hookIntelligence"][number]>(normalizedBrief.hookIntelligence).map(hook => ({
      ...hook,
      hook: safeBriefText(hook.hook, vault),
      pattern: safeBriefText(hook.pattern, vault),
      evidence: safeBriefText(hook.evidence, vault),
    })),
    contentPlan: asArray<ContentBriefPiece>(normalizedBrief.contentPlan).map(sanitizePiece),
    storySequence: {
      theme: safeBriefText(storySequence.theme, vault),
      frames: asArray<ContentBrief["storySequence"]["frames"][number]>(storySequence.frames).map(frame => ({
        ...frame,
        content: safeBriefText(frame.content, vault),
        interaction: safeBriefText(frame.interaction, vault),
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
    tools: [WEB_SEARCH_TOOL],
    messages: [
      {
        role: "user",
        content: `You research Instagram content strategy for @${performance?.username || "sandra.social"} (${performance?.followers ?? "100k+"} followers). Her niche: AI-assisted brand imagery from one selfie, personal branding for women entrepreneurs, "Look like yourself, at your best."

Her own recent winners (real data):
${ownWinners || "- (no data this run)"}

What her audience copies most (real demand data):
${topPrompts || "- (no data this run)"}

Research what hook formats, reel/carousel structures, and visual presentation mechanics are working on Instagram RIGHT NOW in this niche (AI photos, ChatGPT photo prompts, personal branding for women). Look for current, evidenced patterns, not recycled 2023 advice.

Use this internal market-pattern context as a starting point, then refine it with web search:
${MARKET_PATTERN_CONTEXT}

Use this demand context as the filter. Do not research only "what content gets attention." Research what content mechanics make the viewer care enough to want the outcome:
${DEMAND_CREATION_CONTEXT}

Return a concise research memo:
1. 5-8 hook/content mechanics currently working, each with why it works and a one-line example adapted to her niche
2. Format notes (reel length, carousel structure, cover text patterns, keyword CTA mechanics, and any current trending audio or sound trends working in this niche right now, with the caveat that specific sound names go stale fast)
3. Visual treatment notes: fresh ways to express the same proven pillar without repeating her exact mirror/cafe/window/selfie visuals
4. Anything in her own winners that matches or contradicts current trends

Plain text. No fluff.`,
      },
    ],
  })

  const text = response.content
    .filter(isTextBlock)
    .map(block => block.text)
    .join("\n")

  return text.trim()
}

const BRIEF_SCHEMA: Tool.InputSchema = {
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
    demandMap: {
      type: "object",
      properties: {
        strongestDemandSignal: { type: "string" },
        painfulBefore: { type: "string" },
        desiredAfter: { type: "string" },
        beliefShift: { type: "string" },
        primaryOfferBridge: { type: "string" },
        contentWarning: { type: "string" },
      },
      required: [
        "strongestDemandSignal",
        "painfulBefore",
        "desiredAfter",
        "beliefShift",
        "primaryOfferBridge",
        "contentWarning",
      ],
    },
    contentPlan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "string" },
          format: { type: "string", enum: ["reel", "carousel", "feed"] },
          funnelStage: { type: "string", enum: ["cold", "warm", "activation"] },
          title: { type: "string" },
          hook: { type: "string" },
          demandSignal: { type: "string" },
          painfulBefore: { type: "string" },
          desiredAfter: { type: "string" },
          beliefShift: { type: "string" },
          visualProof: { type: "string" },
          offerBridge: { type: "string" },
          whyThisCreatesDemand: { type: "string" },
          visualHook: { type: "string" },
          onScreenText: { type: "array", items: { type: "string" } },
          trendMechanic: { type: "string" },
          competitorPattern: { type: "string" },
          shortSuggestion: { type: "string" },
          executionNotes: { type: "string" },
          whatToAvoid: { type: "string" },
          chatgptContextPrompt: { type: "string" },
          audioSuggestion: { type: "string" },
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
          "funnelStage",
          "title",
          "hook",
          "demandSignal",
          "painfulBefore",
          "desiredAfter",
          "beliefShift",
          "visualProof",
          "offerBridge",
          "whyThisCreatesDemand",
          "visualHook",
          "onScreenText",
          "trendMechanic",
          "competitorPattern",
          "shortSuggestion",
          "executionNotes",
          "whatToAvoid",
          "chatgptContextPrompt",
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
    "demandMap",
    "contentPlan",
    "storySequence",
  ],
} as const

export async function generateContentBrief(): Promise<ContentBrief> {
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd)
  periodStart.setDate(periodStart.getDate() - 7)

  const [performance, signals, vault, suite, growthTruth] = await Promise.all([
    collectInstagramPerformance(),
    collectAudienceSignals(30),
    getVaultBriefContext(),
    getSuiteBriefContext(),
    getGrowthTruthSnapshot(90).catch((error) => {
      console.error("[content-brief] growth truth snapshot failed:", error)
      return null
    }),
  ])

  const researchNotes = await researchCurrentHooks(performance, signals)

  const client = getAnthropicClient()

  const dataPacket = {
    account: {
      username: growthTruth?.instagram.username || performance?.username || "sandra.social",
      followers: growthTruth?.instagram.followers ?? performance?.followers ?? null,
      insightsLevel: performance?.insightsLevel || "basic",
    },
    growthTruth,
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
    marketPatternContext: MARKET_PATTERN_CONTEXT,
    demandCreationContext: DEMAND_CREATION_CONTEXT,
    researchMemo: researchNotes,
  }

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 8000,
    system: `You are Sandra's content strategist for SSELFIE (@sandra.social). You produce her weekly content brief. Every suggestion must be traceable to the data you're given: her top posts, what her audience copies, what they DM her, and the research memo. Never invent statistics. If a claim comes from research, say so.

${voiceBlock()}

${noFakeBlock()}

${audienceBlock()}

${expertiseBlock()}

${proofBlock()}

${funnelBlock()}

${DEMAND_CREATION_CONTEXT}

${FUNNEL_SEGMENTATION_CONTEXT}

CONTENT PLAN RULES:
- Build the brief as a short strategy memo first, not a finished content pack.
- Do NOT write full posts, full captions, final carousel slides, hashtags, or copy-paste photoshoot prompts. Sandra will take the brief into ChatGPT if she wants finished content. Your job is to give her the strongest direction, context, hooks, visual mechanics, and what to avoid.
- Create demandMap before contentPlan. demandMap must summarize the strongest audience behavior, the painful before, the desired after, the belief shift, the primary offer bridge, and what Sandra should not repeat this week.
- Do not start from "what should Sandra post?" Start from "what is her buyer trying to stop experiencing?"
- Every contentPlan piece must include demandSignal, painfulBefore, desiredAfter, beliefShift, visualProof, offerBridge, and whyThisCreatesDemand.
- whyThisCreatesDemand must explain the life/business situation this idea changes. Do not restate why the hook may perform.
- visualProof must describe what Sandra should show to prove the shift. It must not default to repeating her previous exact visual scene.
- Exactly 5 short suggestions, spread across the week (e.g. Mon/Tue/Thu/Fri/Sun).
- At least 2 reels, at least 1 carousel.
- Each piece must connect to a real demand signal (a top-copied prompt, a DM theme, or a proven hook from her own winners). Name the signal in whyThisWorks.
- Tag every contentPlan piece with funnelStage per FUNNEL_SEGMENTATION_CONTEXT above: "cold" (feed reach -> Kit/Vault), "warm" (Story/DM/email -> Visibility To Paid Sprint), or "activation" (Vault buyers/trial members -> SUITE). Include at least 1 cold piece and at least 1 warm piece. A warm piece's offerBridge must point at the Visibility To Paid Sprint (apply / reply WORK), never at the Kit or Vault.
- Read audience.dmSamples and audience.dmIntents. Every dmThemes entry MUST quote or paraphrase a real DM. Anchor at least 2 content pieces to a specific pain point found in the DMs, and tag those pieces funnelStage "warm".
- Her own viral DNA and top posts win over the research memo for TOPIC, PILLAR, HOOK MECHANIC, and CTA. They do NOT win for repeating the exact same visual scene. If a top post worked, keep the demand signal and create a new execution.
- Do not recommend simply reposting Sandra's existing top visual. Do not keep serving the same mirror selfie, dark cafe arrival, window half-light, or car selfie treatment unless the data includes a new specific reason.
- Every contentPlan piece must include a fresh creative treatment: vary setting, perspective, object/prop, camera distance, proof format, story structure, and content role. Same pillar is fine; same visual execution is not.
- Use dataPacket.marketPatternContext and researchMemo for creator mechanics from similar creators. Adapt mechanics such as named frameworks, side-by-side proof, one concept across multiple examples, meta-reveal, and proof-stacked covers. Do not recommend numbered ManyChat keywords. Do not copy another creator's positioning, exact visual, or audience promise.
- Every recommended reel must satisfy all 5 viral DNA elements. Do not recommend known flop formats.
- Teach the full ladder: for cold pieces, Free AI Prompts -> Selfie To AI Photos Kit -> Prompt Vault $27 -> SSELFIE SUITE EUR 97/month. For warm pieces, the ladder is Story/DM trust -> Visibility To Paid Sprint (apply / reply WORK), not the Kit or Vault. If vaultActivity shows strong copies but weak purchase behavior, include a clear conversion move on a cold piece.
- dataPacket.growthTruth is the audit truth snapshot. Use it for followers, email list, Suite members/trials, ManyChat captures, Prompt Vault sales, and revenue-by-product. Do not use old figures from memory or prior docs.
- If dataPacket.growthTruth.leaks is present, contentPlan and demandMap must address the top leak before generic reach advice. If ManyChat captures are high but Prompt Vault purchases are low, recommend conversion/proof/offer bridge content, not "get more reach."
- If active Suite trials are higher than paid members, include at least one proof or onboarding content angle that helps a trial understand the first selfie upload and first generated result.
- Instagram reach in dataPacket.growthTruth.recentInstagram is summed latest per-post reach, not unique account reach. Say that distinction if you mention it.
- Vault count is LIVE in dataPacket.vault. Never hardcode "92", "150", "10 collections", or any fixed count. If you need a number, use dataPacket.vault.totalPromptCount and dataPacket.vault.totalCollectionCount only. Prefer "every shoot world I've built" or "new drops added all the time" unless the exact live number improves clarity.
- Newly published Shoot Studio drops in dataPacket.vault.newestPublishedDrops are fresh content inputs. Feature the newest relevant drop as a content angle when it fits the week's demand.
- SUITE claims may only use dataPacket.suite.includedProducts. Do not invent "Real You Method training", "monthly brand shoot themes", "live editing sessions", or any feature not listed in the product catalog.
- shortSuggestion: one tight paragraph explaining the idea Sandra should consider and why it is worth testing. No full caption.
- trendMechanic: name the trend, competitor mechanic, or market pattern this borrows from. Be specific: numbered keyword, side-by-side proof, meta-reveal, comment-to-DM, proof-stacked cover, one concept shown three ways, etc.
- competitorPattern: name the closest observed creator/account pattern from marketPatternContext or researchMemo and explain the mechanic to adapt. Do not copy their exact content, visuals, or promise.
- visualHook: describe what is literally on screen in the first 2 seconds that stops the scroll. Concrete and filmable: camera position, what the viewer sees, what moves or changes. Sandra's real face/body in an everyday place, plus a visible change, reveal, or intriguing object. This is what she SEES, not why it works and not the caption. One or two short sentences. Do not repeat her overused scenes (mirror selfie, dark cafe arrival, window half-light, car selfie) unless the data gives a new reason.
- onScreenText: 2 to 5 possible on-screen text lines only. These are hooks and beat labels, not a full script.
- executionNotes: practical filming/build notes. Include what analytics, trend, or audience signal this direction came from.
- whatToAvoid: what would make this feel stale, repetitive, off-brand, or too similar to Sandra's old top post.
- chatgptContextPrompt: a compact prompt Sandra can paste into ChatGPT. It should summarize the analytics signal, trend/competitor mechanic, visual hook, target emotion, CTA, and what not to repeat. It must ask ChatGPT to help develop the idea, not to generate an AI photoshoot image.
- audioSuggestion: for reels, suggest the sound direction that fits this specific piece. Name the TYPE and why it fits (trending upbeat for a fast tutorial, original voiceover over soft background for a story/teaching piece, calm acoustic for a slow reveal, satisfying transition sound for a before/after). If the research memo names a specific current trending sound or audio trend that fits, name it and say to verify it is still trending in the Instagram audio panel before posting, since sound names go stale fast. For carousels and feed posts, either suggest a subtle background track if it is a video carousel or say audio is optional. One or two short sentences. No banned words, no m-dashes.
- reelCoverText, carouselOutline, caption, photoshootPrompt, and hashtags are optional legacy fields. Leave them empty unless absolutely necessary for interpreting an old format. Do not spend tokens filling them.
- storySequence: one short strategic story sequence, 3-5 frames, not a full script. Include the point of each frame and the interaction to test.
- Never invent specific earnings, revenue amounts, client counts, follower gains, or conversion numbers. You may only use money numbers that appear in dataPacket with a clear source. Product prices are allowed.
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
        input_schema: BRIEF_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "deliver_content_brief" },
  })

  const toolBlock = response.content.find(isToolUseBlock)
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
      username: growthTruth?.instagram.username || performance?.username || "sandra.social",
      followers: growthTruth?.instagram.followers ?? performance?.followers ?? null,
      postsAnalyzed: performance?.postsAnalyzed ?? 0,
      insightsLevel: performance?.insightsLevel || "basic",
    },
    growthTruth,
    ...brief,
    researchNotes: sanitizeBriefText(researchNotes, vault),
  }
}
