// POST-NOW-01: Sandra's "I need something to post now" tool.
//
// One button in admin returns three concrete ready-tonight options in one
// Anthropic pass, each executable in under 30 minutes, never repeating a
// previously surfaced suggestion. It draws ONLY from intelligence that already
// exists (the stored weekly brief + the Instagram performance snapshot). It
// never runs web research: that belongs to the weekly brief cron and is far
// too slow for a "what do I post tonight" moment.
//
// The used log lives in content_suggestion_log (lazy CREATE TABLE IF NOT
// EXISTS per repo precedent, e.g. lib/app-v3/maya/memory-store.ts; formal
// record: migrations/20260702_content_suggestion_log.sql).
//
// No "server-only" import here on purpose: the generation function must stay
// unit-testable (same reasoning as lib/admin/daily-briefing-intelligence.ts).
// The one server-only dependency (instagram-performance) is dynamically
// imported inside runPostNow.

import Anthropic from "@anthropic-ai/sdk"
import type { ContentBlock, Tool, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages"
import { sql } from "@/lib/db/client"
import { noFakeBlock, voiceBlock } from "@/lib/content/grounding"
import {
  getLatestWeeklyContentBrief,
  sanitizeIntelligenceText,
} from "@/lib/admin/daily-briefing-intelligence"
import type { ContentBrief } from "@/lib/content-engine/brief-generator"
import type { InstagramPerformanceSnapshot } from "@/lib/content-engine/instagram-performance"

const POST_NOW_MODEL = "claude-sonnet-4-5"
const POST_NOW_ANTHROPIC_TIMEOUT_MS = 45_000
// Sandra posts on Norway time; the tool exists for "tonight".
const POST_NOW_TIME_ZONE = "Europe/Oslo"

export const POST_NOW_OPTION_TYPES = ["repurpose", "trend-test", "story-sequence"] as const
export type PostNowOptionType = (typeof POST_NOW_OPTION_TYPES)[number]

export type PostNowOption = {
  /** Set once the option is stored in content_suggestion_log. */
  id?: number
  type: PostNowOptionType
  title: string
  /** Which real signal this came from, with real numbers only. */
  source: string
  /** Honest execution estimate, always under 30 minutes ("15 min"). */
  executeIn: string
  /** 3-5 short imperative lines she can follow on her phone tonight. */
  steps: string[]
  /** For repurpose picks: the original post, one tap away. */
  permalink: string | null
  /** Dedupe key: the permalink for repurpose picks, the normalized title otherwise. */
  fingerprint: string
}

export type PostNowResult = {
  options: PostNowOption[]
  /** Inputs that were missing/empty this run, named honestly in the UI. */
  missingInputs: string[]
}

function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use"
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")
  return new Anthropic({ apiKey })
}

// ---------------------------------------------------------------------------
// Used log (content_suggestion_log)
// ---------------------------------------------------------------------------

let ensured: Promise<void> | null = null

export function ensureSuggestionLogTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS content_suggestion_log (
          id          serial PRIMARY KEY,
          created_at  timestamptz NOT NULL DEFAULT now(),
          type        text NOT NULL,
          fingerprint text NOT NULL,
          title       text NOT NULL,
          status      text NOT NULL DEFAULT 'suggested',
          payload     jsonb
        )
      `
    })().catch((e) => {
      ensured = null
      throw e
    })
  }
  return ensured
}

export type SuggestionExclusions = {
  /** Last ~30 fingerprints already surfaced or used: never repeat these. */
  recentFingerprints: string[]
  /** "Not for me" picks from the last 14 days: excluded, then eligible again. */
  dismissedFingerprints: string[]
}

export async function getSuggestionExclusions(): Promise<SuggestionExclusions> {
  await ensureSuggestionLogTable()
  const recent = (await sql`
    SELECT fingerprint FROM content_suggestion_log
    WHERE status IN ('suggested', 'used')
    ORDER BY created_at DESC
    LIMIT 30
  `) as Array<{ fingerprint: string }>
  const dismissed = (await sql`
    SELECT fingerprint FROM content_suggestion_log
    WHERE status = 'dismissed'
      AND created_at > now() - interval '14 days'
    ORDER BY created_at DESC
    LIMIT 30
  `) as Array<{ fingerprint: string }>
  return {
    recentFingerprints: [...new Set(recent.map((row) => row.fingerprint))],
    dismissedFingerprints: [...new Set(dismissed.map((row) => row.fingerprint))],
  }
}

/** Store one surfaced set as status 'suggested'; returns the options with ids. */
export async function logSuggestedOptions(options: PostNowOption[]): Promise<PostNowOption[]> {
  await ensureSuggestionLogTable()
  const stored: PostNowOption[] = []
  for (const option of options) {
    const rows = (await sql`
      INSERT INTO content_suggestion_log (type, fingerprint, title, status, payload)
      VALUES (${option.type}, ${option.fingerprint}, ${option.title}, 'suggested', ${JSON.stringify(option)}::jsonb)
      RETURNING id
    `) as Array<{ id: number }>
    stored.push({ ...option, id: rows[0]?.id })
  }
  return stored
}

export async function setSuggestionStatus(
  id: number,
  status: "used" | "dismissed",
): Promise<boolean> {
  await ensureSuggestionLogTable()
  const rows = (await sql`
    UPDATE content_suggestion_log
    SET status = ${status}
    WHERE id = ${id}
    RETURNING id
  `) as Array<{ id: number }>
  return rows.length > 0
}

// ---------------------------------------------------------------------------
// Generation pass (one guarded Anthropic tool call)
// ---------------------------------------------------------------------------

const POST_NOW_SCHEMA: Tool.InputSchema = {
  type: "object",
  properties: {
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["repurpose", "trend-test", "story-sequence"] },
          title: { type: "string" },
          source: { type: "string" },
          executeIn: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
          permalink: { type: "string" },
        },
        required: ["type", "title", "source", "executeIn", "steps"],
      },
    },
  },
  required: ["options"],
} as const

const EVERGREEN_STORY_LADDER = `Evergreen story ladder (the fallback when the weekly brief is missing or empty):
Frame 1: one real photo from her day tonight + a low-friction poll ("posting tonight: yes / talk me into it").
Frame 2: the honest line about freezing on what to post + an emoji slider ("how often does this happen to you?").
Frame 3: one tiny lesson from her own content: what she posts when she has nothing planned.
Frame 4: question box ("what do you keep putting off posting?").
Frame 5: DM keyword CTA (reply PROMPT for the free starter shoots) or "answers tomorrow in stories".`

function buildPostNowSystem(): string {
  return `You are Sandra's post-tonight picker for SSELFIE (@sandra.social). She is stuck on what to post TONIGHT. Your job: exactly three concrete options she can execute in under 30 minutes each, built only from the data in the input JSON.

${voiceBlock()}

${noFakeBlock()}

Ground rules, non-negotiable:
- Use ONLY numbers that appear in the input JSON. Never invent stats, views, saves, or dates.
- No m-dashes anywhere. Use a period or a colon instead.
- Never use these words: leverage, synergy, transform, game-changer, skyrocket, unlock, elevate, elevated, empower, utilize, curated.
- Write in Sandra's voice: warm, direct, short sentences, contractions. She reads this on her phone at night.
- doNotRepeat holds fingerprints (post permalinks and option titles) already suggested, used, or dismissed. Never pick a post whose permalink is in those lists and never rebuild an idea whose title matches one.

Return exactly three options, one of each type:

1. type "repurpose": pick ONE of her top posts from topPosts that is NOT in doNotRepeat. Give a fresh re-cut, not a repost: a new hook line, a new first frame, or a new format (reel to carousel, carousel to reel). In the steps, say what to change and what NOT to repeat verbatim. In source, name the post and why it will work again using its real numbers, e.g. "your top reel from June 14 (2,300 saves, 41,000 reach)". Include the post permalink so she can find it in one tap.

2. type "trend-test": take ONE trend from weeklyBrief.trendRadar. If the radar is empty, use a hookIntelligence entry instead. If both are empty, build from her own top post hook patterns and say so in source. Translate it into a ready-tonight execution. The steps must cover: the exact hook line, what is literally on screen in second one, the ONE engagement action it is engineered for (save, share, comment, or follow), the CTA, and the no-fake guardrail that keeps it still her, never fake.

3. type "story-sequence": a 3 to 5 frame story sequence for tonight following the micro-commitment ladder: frame 1 is a low-friction poll or slider, each frame escalates, and the final frame is a question box or a DM keyword CTA. Theme it to the weekly demand map or a real audience question when available. One step per frame: what is on screen plus the interaction.

Every option must include:
- title: short and specific, in her voice.
- executeIn: an honest estimate under 30 minutes, like "15 min".
- steps: 3 to 5 short imperative lines she can follow tonight. The FIRST step must name the exact on-screen text to put on the first frame, verbatim in quotes: max 9 words, readable on a phone, and it is the text overlay ON the video/slide, not the caption. Pick it from weeklyBrief.onScreenHookBank when it has entries (and keep its watch-through mechanic visible on screen, e.g. a countdown or a "wait for #3" beat). If the bank is empty, adapt one of her own top post hookLine overlays or a hookIntelligence pattern and say so in source.
- source: the exact signal it came from, with real numbers only, e.g. "this week's trend radar" or "a DM question from this week".

If missingInputs is not empty, still deliver three strong options from what remains and say plainly inside the affected option's source which input was missing (e.g. "no weekly brief this week, built from your top posts").

${EVERGREEN_STORY_LADDER}`
}

export type GeneratePostNowInput = {
  weeklyBrief: ContentBrief | null
  performance: InstagramPerformanceSnapshot | null
  recentFingerprints: string[]
  dismissedFingerprints: string[]
  now?: Date
}

function normalizeFingerprint(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 160)
}

export function deriveFingerprint(option: Pick<PostNowOption, "type" | "title" | "permalink">): string {
  if (option.type === "repurpose" && option.permalink) return option.permalink.trim()
  return normalizeFingerprint(option.title)
}

function compactWeeklyBrief(brief: ContentBrief | null) {
  if (!brief) return null
  const plan = Array.isArray(brief.contentPlan) ? brief.contentPlan : []
  return {
    contentPlan: plan.map((piece) => ({
      day: piece.day,
      format: piece.format,
      funnelStage: piece.funnelStage,
      engineeredFor: piece.engineeredFor ?? null,
      title: piece.title,
      hook: piece.hook,
      visualHook: piece.visualHook,
      onScreenText: Array.isArray(piece.onScreenText) ? piece.onScreenText.slice(0, 3) : [],
      offerBridge: piece.offerBridge ?? null,
    })),
    trendRadar: Array.isArray(brief.trendRadar) ? brief.trendRadar : [],
    hookIntelligence: Array.isArray(brief.hookIntelligence) ? brief.hookIntelligence : [],
    // Proven first-frame text overlays from the weekly brief. Old briefs predate
    // this section, so it degrades to an empty array.
    onScreenHookBank: Array.isArray(brief.onScreenHookBank) ? brief.onScreenHookBank : [],
    audienceQuestions: Array.isArray(brief.demandMap?.audienceQuestions)
      ? brief.demandMap?.audienceQuestions
      : [],
    demandMap: brief.demandMap
      ? {
          strongestDemandSignal: brief.demandMap.strongestDemandSignal,
          painfulBefore: brief.demandMap.painfulBefore,
          desiredAfter: brief.demandMap.desiredAfter,
          contentWarning: brief.demandMap.contentWarning,
        }
      : null,
    storySequenceTheme: brief.storySequence?.theme ?? null,
  }
}

export function buildPerformanceFromWeeklyBrief(
  weeklyBrief: ContentBrief | null,
): InstagramPerformanceSnapshot | null {
  if (!weeklyBrief?.performanceRecap?.length) return null
  return {
    username: weeklyBrief.accountSnapshot?.username || "sandra.social",
    followers: weeklyBrief.accountSnapshot?.followers ?? null,
    postsAnalyzed: weeklyBrief.accountSnapshot?.postsAnalyzed ?? weeklyBrief.performanceRecap.length,
    insightsLevel: weeklyBrief.accountSnapshot?.insightsLevel || "basic",
    topPosts: weeklyBrief.performanceRecap.slice(0, 8).map((post, index) => {
      const likes = Number(post.likes || 0)
      const comments = Number(post.comments || 0)
      return {
        id: post.permalink || `weekly-brief-${index + 1}`,
        permalink: post.permalink || "",
        format:
          post.format === "reel" ||
          post.format === "carousel" ||
          post.format === "feed" ||
          post.format === "other"
            ? post.format
            : "other",
        postedAt: weeklyBrief.periodStart,
        caption: "",
        hookLine: post.hookLine || post.whyItWorked || "Stored weekly brief winner",
        likes,
        comments,
        views: null,
        reach: null,
        saves: null,
        shares: null,
        engagementScore: likes + comments * 2,
      }
    }),
    allPosts: [],
  }
}

export function findMissingInputs(
  weeklyBrief: ContentBrief | null,
  performance: InstagramPerformanceSnapshot | null,
): string[] {
  const missing: string[] = []
  if (!weeklyBrief) {
    missing.push("weekly brief")
  } else {
    if (!Array.isArray(weeklyBrief.contentPlan) || weeklyBrief.contentPlan.length === 0) {
      missing.push("weekly brief content plan")
    }
    const radarEmpty = !Array.isArray(weeklyBrief.trendRadar) || weeklyBrief.trendRadar.length === 0
    const hooksEmpty =
      !Array.isArray(weeklyBrief.hookIntelligence) || weeklyBrief.hookIntelligence.length === 0
    if (radarEmpty && hooksEmpty) missing.push("trend radar")
  }
  if (!performance || !Array.isArray(performance.topPosts) || performance.topPosts.length === 0) {
    missing.push("Instagram top posts")
  }
  return missing
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const clean = sanitizeIntelligenceText(value)
    if (clean) return clean
  }
  return ""
}

function firstOverlayText(weeklyBrief: ContentBrief | null, fallback: string): string {
  const fromBank = weeklyBrief?.onScreenHookBank?.find((entry) => entry?.text)?.text
  const fromPlan = weeklyBrief?.contentPlan?.find((piece) => piece?.onScreenText?.[0])?.onScreenText?.[0]
  return firstNonEmpty(fromBank, fromPlan, fallback).slice(0, 80)
}

function optionWithFingerprint(option: Omit<PostNowOption, "fingerprint">): PostNowOption {
  const next: PostNowOption = { ...option, fingerprint: "" }
  next.fingerprint = deriveFingerprint(next)
  return next
}

export function buildPostNowFallbackOptions(input: {
  weeklyBrief: ContentBrief | null
  performance: InstagramPerformanceSnapshot | null
}): PostNowOption[] {
  const weeklyBrief = input.weeklyBrief
  const topPost = input.performance?.topPosts?.[0] ?? null
  const trend = weeklyBrief?.trendRadar?.[0] ?? null
  const hook = weeklyBrief?.hookIntelligence?.[0] ?? null
  const demand = weeklyBrief?.demandMap ?? null
  const question = demand?.audienceQuestions?.[0]?.question
  const overlay = firstOverlayText(weeklyBrief, topPost?.hookLine || "One clear selfie is enough")
  const demandLine = firstNonEmpty(
    demand?.strongestDemandSignal,
    question,
    weeklyBrief?.storySequence?.theme,
    "what to post when you feel stuck",
  )

  return [
    optionWithFingerprint({
      type: "repurpose",
      title: topPost?.hookLine
        ? `Re-cut: ${topPost.hookLine.slice(0, 70)}`
        : "Re-cut the clearest lesson from this week",
      source: topPost
        ? `stored weekly brief winner (${topPost.likes.toLocaleString("en-US")} likes, ${topPost.comments.toLocaleString("en-US")} comments)`
        : "no Instagram top posts this run, built from the stored weekly brief",
      executeIn: "20 min",
      steps: [
        `Put "${overlay}" on the first frame.`,
        "Use the same idea, but change the opening visual.",
        "Make the caption one short lesson, not a full explanation.",
        "End with the one action this post was built for.",
      ],
      permalink: topPost?.permalink || null,
    }),
    optionWithFingerprint({
      type: "trend-test",
      title: trend?.trend ? `Test: ${trend.trend.slice(0, 70)}` : "Test the strongest hook pattern",
      source: trend
        ? `this week's stored trend radar: ${trend.whyItsMoving}`
        : hook
          ? `no trend radar this run, built from hook pattern: ${hook.pattern}`
          : "no trend radar this run, built from the stored brief",
      executeIn: "25 min",
      steps: [
        `Put "${firstOverlayText(weeklyBrief, hook?.hook || overlay)}" on screen first.`,
        trend?.howSandraRidesIt || "Show your real face and the simple result side by side.",
        trend?.noFakeGuardrail || "Keep the image recognizable and true to you.",
        "Use one CTA only: comment PROMPT or reply with the question.",
      ],
      permalink: null,
    }),
    optionWithFingerprint({
      type: "story-sequence",
      title: `Story: ${demandLine.slice(0, 70)}`,
      source: question
        ? `audience question from the stored weekly brief: ${question}`
        : demand
          ? `stored demand map: ${demand.strongestDemandSignal}`
          : "stored weekly brief story sequence",
      executeIn: "15 min",
      steps: [
        `Frame 1: "${overlay}" plus a yes/no poll.`,
        `Frame 2: name the stuck point: ${firstNonEmpty(demand?.painfulBefore, "not knowing what to post")}.`,
        `Frame 3: show the tiny shift: ${firstNonEmpty(demand?.beliefShift, "one clear starting point is enough")}.`,
        "Frame 4: add a question box or PROMPT reply CTA.",
      ],
      permalink: null,
    }),
  ]
}

export async function generatePostNowOptions(input: GeneratePostNowInput): Promise<PostNowResult> {
  const client = getAnthropicClient()
  const now = input.now ?? new Date()
  const weekday = now.toLocaleDateString("en-US", { weekday: "long", timeZone: POST_NOW_TIME_ZONE })
  const localHour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: POST_NOW_TIME_ZONE,
    }).format(now),
  )

  const missingInputs = findMissingInputs(input.weeklyBrief, input.performance)

  const payload = {
    localContext: {
      weekday,
      localHour,
      note: "She wants something she can post tonight, from her phone, in under 30 minutes.",
    },
    weeklyBrief: compactWeeklyBrief(input.weeklyBrief),
    topPosts: (input.performance?.topPosts || []).slice(0, 8).map((post) => ({
      permalink: post.permalink,
      format: post.format,
      postedAt: post.postedAt,
      hookLine: post.hookLine,
      likes: post.likes,
      comments: post.comments,
      reach: post.reach,
      saves: post.saves,
      shares: post.shares,
    })),
    doNotRepeat: {
      recentFingerprints: input.recentFingerprints.slice(0, 30),
      dismissedFingerprints: input.dismissedFingerprints.slice(0, 30),
    },
    missingInputs,
  }

  const attempt = (extraInstruction?: string) =>
    client.messages.create({
      model: POST_NOW_MODEL,
      max_tokens: 2500,
      system: buildPostNowSystem(),
      messages: [
        {
          role: "user",
          content: `Here is tonight's data. Give Sandra her three options.\n\n${JSON.stringify(payload, null, 2)}${
            extraInstruction ? `\n\n${extraInstruction}` : ""
          }`,
        },
      ],
      tools: [
        {
          name: "deliver_post_now_options",
          description:
            "Deliver exactly three ready-tonight content options (repurpose, trend-test, story-sequence) as structured data.",
          input_schema: POST_NOW_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "deliver_post_now_options" },
    }, {
      maxRetries: 0,
      timeout: POST_NOW_ANTHROPIC_TIMEOUT_MS,
    })

  let response = await attempt()
  if (response.stop_reason === "max_tokens") {
    response = await attempt(
      "Your previous attempt ran out of room. Be more concise: shorter steps, shorter titles, keep all three options.",
    )
    if (response.stop_reason === "max_tokens") {
      throw new Error("Post-now options truncated at max_tokens twice")
    }
  }

  const toolBlock = response.content.find(isToolUseBlock)
  if (!toolBlock?.input) {
    throw new Error("Post-now generation returned no structured output")
  }

  const raw = (toolBlock.input as { options?: unknown }).options
  const options = validatePostNowOptions(raw, input)
  return { options, missingInputs }
}

/**
 * Strict validation: exactly three options, one of each type, no excluded
 * fingerprint. A wrong shape throws instead of surfacing a broken card set.
 */
export function validatePostNowOptions(
  raw: unknown,
  exclusions: Pick<GeneratePostNowInput, "recentFingerprints" | "dismissedFingerprints">,
): PostNowOption[] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    throw new Error("Post-now generation did not return exactly three options")
  }

  const excluded = new Set(
    [...exclusions.recentFingerprints, ...exclusions.dismissedFingerprints].map((f) =>
      normalizeFingerprint(f),
    ),
  )

  const options = raw.map((entry) => {
    const record = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>
    const type = record.type
    if (type !== "repurpose" && type !== "trend-test" && type !== "story-sequence") {
      throw new Error(`Post-now option has an unknown type: ${String(type)}`)
    }
    const title = sanitizeIntelligenceText(record.title)
    const source = sanitizeIntelligenceText(record.source)
    const executeIn = sanitizeIntelligenceText(record.executeIn)
    const steps = (Array.isArray(record.steps) ? record.steps : [])
      .map((step) => sanitizeIntelligenceText(step))
      .filter((step) => step.length > 0)
      .slice(0, 5)
    if (!title || !source || !executeIn || steps.length < 2) {
      throw new Error(`Post-now ${type} option came back incomplete`)
    }
    const permalink =
      typeof record.permalink === "string" && record.permalink.trim().length > 0
        ? record.permalink.trim()
        : null
    const option: PostNowOption = {
      type,
      title,
      source,
      executeIn,
      steps,
      permalink,
      fingerprint: "",
    }
    option.fingerprint = deriveFingerprint(option)
    return option
  })

  const types = new Set(options.map((option) => option.type))
  if (types.size !== 3) {
    throw new Error("Post-now generation did not return three distinct option types")
  }

  for (const option of options) {
    if (excluded.has(normalizeFingerprint(option.fingerprint))) {
      throw new Error(`Post-now option repeats an excluded suggestion: ${option.title}`)
    }
  }

  return options
}

// ---------------------------------------------------------------------------
// Orchestrator: gather inputs -> generate -> log as 'suggested'
// ---------------------------------------------------------------------------

export async function runPostNow(now: Date = new Date()): Promise<PostNowResult> {
  const [weeklyBrief, exclusions] = await Promise.all([
    getLatestWeeklyContentBrief().catch((error) => {
      console.error("[post-now] weekly brief unavailable:", error)
      return null
    }),
    getSuggestionExclusions().catch((error) => {
      console.error("[post-now] suggestion log unavailable:", error)
      return { recentFingerprints: [], dismissedFingerprints: [] }
    }),
  ])
  const performance = buildPerformanceFromWeeklyBrief(weeklyBrief)

  const result = await generatePostNowOptions({
    weeklyBrief,
    performance,
    recentFingerprints: exclusions.recentFingerprints,
    dismissedFingerprints: exclusions.dismissedFingerprints,
    now,
  }).catch((error) => {
    console.error("[post-now] AI draft generator unavailable, using fallback options:", error)
    return {
      options: buildPostNowFallbackOptions({ weeklyBrief, performance }),
      missingInputs: [...findMissingInputs(weeklyBrief, performance), "AI draft generator"],
    }
  })

  const options = await logSuggestedOptions(result.options).catch((error) => {
    // Logging failure should not eat the options Sandra is waiting on; the
    // set just won't be dedupable (no ids), which the UI handles.
    console.error("[post-now] failed to log suggested options:", error)
    return result.options
  })

  return { options, missingInputs: result.missingInputs }
}
