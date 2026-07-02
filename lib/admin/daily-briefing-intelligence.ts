// Daily Sandra Briefing intelligence layer.
//
// Replaces the old canned postToday/sandraNext template lines with one real
// intelligence pass: today's content move pulled from the stored weekly brief,
// a genuine day-over-day diff against yesterday's snapshot, and the single
// thing worth watching today. The truth-number sections of the briefing
// (money header, truth snapshot, revenue scorecard, support threads) are NOT
// touched here; per the Admin Data Contract they stay template-built from
// stripe_payments / Stripe-verified subscriptions.
//
// DB access goes through dynamic imports of lib/analytics/reports so the pure
// pieces of this module stay unit-testable without a server context.

import Anthropic from "@anthropic-ai/sdk"
import type { ContentBlock, Tool, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages"
import { sanitizeGroundedText } from "@/lib/content/grounding"
import type { DailySandraBriefing } from "@/lib/admin/daily-sandra-briefing"
import type { ContentBrief, ContentBriefPiece } from "@/lib/content-engine/brief-generator"

const INTELLIGENCE_MODEL = "claude-sonnet-4-5"
const DAILY_BRIEFING_REPORT_TYPE = "daily_sandra_briefing"

export type DailyBriefingIntelligence = {
  todaysMove: string
  whatChanged: string
  watchThis: string
}

export type DailyBriefingSnapshot = {
  generatedAt: string
  metrics: {
    yesterdayPayments: number | null
    yesterdayRevenue: number | null
    monthPayments: number | null
    monthRevenue: number | null
    followers: number | null
    sumLatestPostReach: number | null
    manychatCaptures: number | null
    promptVaultPayments: number | null
    promptVaultRevenueCents: number | null
    activePaidMembers: number | null
    activeTrials: number | null
    trialsClaimed30d: number | null
    trialsFirstGeneration30d: number | null
    emailSubscribed: number | null
    openSupportThreads: number | null
    flaggedDmCount: number | null
  }
  sections: {
    todaysMove: string | null
    whatChanged: string | null
    watchThis: string | null
    working: string[]
    leaking: string[]
  }
  flaggedDmUsernames: string[]
  supportSubjects: string[]
}

export type DailyBriefingMoneyInput = {
  yesterdayPayments: number
  yesterdayRevenue: number
  monthPayments: number
  monthRevenue: number
}

function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use"
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")
  return new Anthropic({ apiKey })
}

const BANNED_INTELLIGENCE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bleverage\b/gi, "use"],
  [/\bsynergy\b/gi, "fit"],
  [/\btransform(?:s|ed|ing|ation)?\b/gi, "turn"],
  [/\bgame-changer\b/gi, "useful shift"],
  [/\bskyrocket\b/gi, "grow"],
  [/\bunlock\b/gi, "open"],
  [/\belevated?\b/gi, "sharper"],
]

export function sanitizeIntelligenceText(value: unknown): string {
  let next = sanitizeGroundedText(String(value ?? ""))
  for (const [pattern, replacement] of BANNED_INTELLIGENCE_REPLACEMENTS) {
    next = next.replace(pattern, replacement)
  }
  return next.replace(/[ \t]{2,}/g, " ").trim()
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/**
 * Compact snapshot of today's briefing, stored so tomorrow's run can diff
 * against real yesterday numbers instead of restating standing facts.
 */
export function buildDailyBriefingSnapshot(
  briefing: DailySandraBriefing,
  money?: DailyBriefingMoneyInput | null,
): DailyBriefingSnapshot {
  const truth = briefing.truthSnapshot
  const scorecard = briefing.revenueScorecard
  return {
    generatedAt: briefing.generatedAt,
    metrics: {
      yesterdayPayments: money ? money.yesterdayPayments : null,
      yesterdayRevenue: money ? money.yesterdayRevenue : null,
      monthPayments: money ? money.monthPayments : null,
      monthRevenue: money ? money.monthRevenue : null,
      followers: truth?.instagram.followers ?? null,
      sumLatestPostReach: truth?.recentInstagram.sumLatestPostReach ?? null,
      manychatCaptures: truth?.manychat.captures ?? null,
      promptVaultPayments: truth?.promptVault.payments ?? null,
      promptVaultRevenueCents: truth?.promptVault.revenueCents ?? null,
      activePaidMembers: truth?.suite.activePaidMembers ?? scorecard?.members.active ?? null,
      activeTrials: truth?.suite.activeTrials ?? scorecard?.trials.active ?? null,
      trialsClaimed30d: scorecard?.trials.claimed30d ?? null,
      trialsFirstGeneration30d: scorecard?.trials.firstGeneration30d ?? null,
      emailSubscribed: truth?.email.subscribedContacts ?? null,
      openSupportThreads: briefing.supportThreads.filter((thread) => thread.status !== "resolved").length,
      flaggedDmCount: briefing.inboxFlaggedCount,
    },
    sections: {
      todaysMove: briefing.intelligence?.todaysMove ?? null,
      whatChanged: briefing.intelligence?.whatChanged ?? null,
      watchThis: briefing.intelligence?.watchThis ?? null,
      working: briefing.working,
      leaking: briefing.leaking,
    },
    flaggedDmUsernames: briefing.inboxFlagged.map((item) => item.username),
    supportSubjects: briefing.supportThreads.map((thread) => thread.subject),
  }
}

/**
 * Store today's snapshot in analytics_reports (report_type daily_sandra_briefing),
 * keyed on the UTC day so reruns on the same day upsert instead of piling up.
 */
export async function storeDailyBriefingSnapshot(snapshot: DailyBriefingSnapshot): Promise<void> {
  const { storeAnalyticsReport } = await import("@/lib/analytics/reports")
  const day = startOfUtcDay(new Date(snapshot.generatedAt))
  const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000)
  await storeAnalyticsReport({
    reportType: DAILY_BRIEFING_REPORT_TYPE,
    periodStart: day,
    periodEnd: nextDay,
    payload: snapshot,
  })
}

/**
 * Most recent stored snapshot from a day strictly before today (so a rerun
 * today never diffs against itself).
 */
export async function getYesterdayBriefingSnapshot(now: Date = new Date()): Promise<DailyBriefingSnapshot | null> {
  const { getLatestAnalyticsReports } = await import("@/lib/analytics/reports")
  const rows = await getLatestAnalyticsReports({ reportType: DAILY_BRIEFING_REPORT_TYPE, limit: 5 })
  const todayStart = startOfUtcDay(now).getTime()
  for (const row of rows) {
    const periodStart = new Date(row.period_start).getTime()
    if (Number.isFinite(periodStart) && periodStart < todayStart && row.payload) {
      return row.payload as DailyBriefingSnapshot
    }
  }
  return null
}

export async function getLatestWeeklyContentBrief(): Promise<ContentBrief | null> {
  const { getLatestAnalyticsReports } = await import("@/lib/analytics/reports")
  const rows = await getLatestAnalyticsReports({ reportType: "content_brief_weekly", limit: 1 })
  return (rows[0]?.payload as ContentBrief) || null
}

function weeklyPlanForPrompt(weeklyBrief: ContentBrief | null): Array<Record<string, unknown>> {
  const plan = weeklyBrief && Array.isArray(weeklyBrief.contentPlan) ? weeklyBrief.contentPlan : []
  return plan.map((piece: ContentBriefPiece) => ({
    day: piece.day,
    format: piece.format,
    funnelStage: piece.funnelStage,
    engineeredFor: piece.engineeredFor ?? null,
    engagementMechanic: piece.engagementMechanic ?? null,
    title: piece.title,
    hook: piece.hook,
    visualHook: piece.visualHook,
    onScreenText: Array.isArray(piece.onScreenText) ? piece.onScreenText.slice(0, 3) : [],
    offerBridge: piece.offerBridge ?? null,
    shortSuggestion: piece.shortSuggestion ?? null,
  }))
}

const INTELLIGENCE_SCHEMA: Tool.InputSchema = {
  type: "object",
  properties: {
    todaysMove: { type: "string" },
    whatChanged: { type: "string" },
    watchThis: { type: "string" },
  },
  required: ["todaysMove", "whatChanged", "watchThis"],
} as const

const INTELLIGENCE_SYSTEM = `You write the three advice sections of Sandra's daily SSELFIE briefing. Sandra runs SSELFIE (sselfie.ai): AI-assisted brand photos from one selfie, for women building a personal brand. The numbers sections of her email are built elsewhere from Stripe truth; your job is only the thinking on top.

Ground rules, non-negotiable:
- Use ONLY numbers that appear in the input JSON. Never invent, estimate, or round a number that is not there. If a number is missing, do not mention it.
- No m-dashes anywhere. Use a period or a colon instead.
- Never use these words: leverage, synergy, transform, game-changer, skyrocket, unlock, elevate, elevated, empower, utilize.
- Write in Sandra's voice: warm, direct, like texting a friend who runs the business with you. Short sentences. Contractions.
- Each section is 3 sentences maximum. No filler, no pep talk, no restating what the numbers sections already show.

todaysMove: ONE concrete content action from the weekly content plan in the input. Pick the piece whose day matches today's weekday; if none matches, pick the strongest piece that has not been used in a previous daily snapshot. Give her: the hook, what is literally on screen in second one, the ONE engagement action it is engineered for, and the CTA. If the weekly plan is empty, say plainly that this week's brief has no content plan and she should regenerate it; never invent a piece.

whatChanged: ONLY genuine changes since yesterday's snapshot in the input: a new payment, a new trial, a metric that actually moved, a new DM theme, a new support thread. Compare today's metrics against yesterday's metrics field by field. If nothing changed, one honest line saying nothing moved since yesterday. Never restate standing facts like total followers or member counts unless they changed. If there is no yesterday snapshot, say the day-over-day diff starts tomorrow and name today's single plainest fact.

watchThis: the single most important leak or opportunity TODAY, and only if it is new or got worse compared to yesterday. If nothing is new or worse, say the watch list is unchanged and name the standing top leak in one short clause.`

export type GenerateDailyIntelligenceInput = {
  briefing: DailySandraBriefing
  weeklyBrief: ContentBrief | null
  yesterday: DailyBriefingSnapshot | null
  now?: Date
}

export async function generateDailyBriefingIntelligence(
  input: GenerateDailyIntelligenceInput,
): Promise<DailyBriefingIntelligence> {
  const client = getAnthropicClient()
  const now = input.now ?? new Date()
  const weekday = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
  const planPieces = weeklyPlanForPrompt(input.weeklyBrief)

  const payload = {
    todayWeekday: weekday,
    moneyHeader: input.briefing.moneyHeader,
    truthSnapshot: input.briefing.truthSnapshot,
    revenueScorecard: input.briefing.revenueScorecard,
    working: input.briefing.working,
    leaking: input.briefing.leaking,
    flaggedDms: input.briefing.inboxFlagged,
    supportThreads: input.briefing.supportThreads.map((thread) => ({
      subject: thread.subject,
      label: thread.label,
      status: thread.status,
      message: thread.message,
    })),
    weeklyContentPlan: planPieces,
    weeklyDemandMap: input.weeklyBrief?.demandMap ?? null,
    yesterdaySnapshot: input.yesterday,
  }

  const attempt = (extraInstruction?: string) =>
    client.messages.create({
      model: INTELLIGENCE_MODEL,
      max_tokens: 1600,
      system: INTELLIGENCE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Here is today's briefing data. Write the three sections.\n\n${JSON.stringify(payload, null, 2)}${
            extraInstruction ? `\n\n${extraInstruction}` : ""
          }`,
        },
      ],
      tools: [
        {
          name: "deliver_daily_intelligence",
          description: "Deliver todaysMove, whatChanged, and watchThis for the daily briefing.",
          input_schema: INTELLIGENCE_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "deliver_daily_intelligence" },
    })

  let response = await attempt()
  if (response.stop_reason === "max_tokens") {
    response = await attempt("Your previous attempt ran out of room. Be more concise: 2 sentences per section.")
    if (response.stop_reason === "max_tokens") {
      throw new Error("Daily intelligence output truncated at max_tokens twice")
    }
  }

  const toolBlock = response.content.find(isToolUseBlock)
  if (!toolBlock?.input) {
    throw new Error("Daily intelligence returned no structured output")
  }

  const raw = toolBlock.input as Partial<DailyBriefingIntelligence>
  const result: DailyBriefingIntelligence = {
    todaysMove: sanitizeIntelligenceText(raw.todaysMove),
    whatChanged: sanitizeIntelligenceText(raw.whatChanged),
    watchThis: sanitizeIntelligenceText(raw.watchThis),
  }

  // Old briefs stored before the two-pass fix have empty content plans. Never
  // let the model paper over that with filler.
  if (planPieces.length === 0) {
    result.todaysMove =
      "This week's brief has no content plan. Regenerate it from the admin content brief page before picking today's post."
  }

  if (!result.todaysMove || !result.whatChanged || !result.watchThis) {
    throw new Error("Daily intelligence returned an empty section")
  }

  return result
}
