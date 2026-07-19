// Feed Planner Phase 2b/2c - the auto-draft core, shared by the member-facing route
// (app/api/app-v3/maya/feed-plan/draft) and the monthly rollover cron
// (app/api/cron/feed-plan-monthly-draft). One place owns the lock, the guard, the LLM call,
// and the write - the two callers only differ in how they authenticate and pick the user.

import { generateText } from "ai"
import { createMayaOpenRouterModel, getMayaMaxTokensForTask } from "@/lib/maya/openrouter"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getUserPersonalBrand } from "@/lib/data/maya"
import { getMemory } from "@/lib/app-v3/maya/memory-store"
import { resolvePostingCadence, postsPerMonthForCadence } from "@/lib/feed-planner/cadence"
import { resolveFeedStyleForUser } from "@/lib/feed-planner/resolve-feed-style"
import { CURATED_FEED_STYLE_MAP } from "@/lib/style-presets"
import {
  buildCohesiveFeedPlan,
  describeCohesiveFeedPlan,
  type CohesiveFeedPlan,
} from "@/lib/feed-planner/cohesive-feed-plan"
import {
  validateFeedMonthPlan,
  writeAutoDraft,
  getMonthPlanState,
  currentPeriodMonth,
} from "@/lib/feed-planner/write-auto-draft"
import { sql } from "@/lib/db/client"
import { extractJson } from "@/lib/ai/extract-json"

export type AutoDraftOutcome =
  | { created: true; feedLayoutId: number; postCount: number }
  | {
      created: false
      reason: "draft_in_progress" | "plan_exists" | "missing_context" | "generation_failed"
    }

export type AutoDraftPromptInput = {
  agentName: string
  periodMonth: string
  postCount: number
  cadence: number
  daysInMonth: number
  brandContext: string | null
  strictTruthMode?: boolean
  cohesivePlan?: CohesiveFeedPlan
}

function profileText(profile: unknown, ...keys: string[]): string {
  if (!profile || typeof profile !== "object") return ""
  const record = profile as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

export function hasSufficientCalendarContext(personalBrand: unknown): boolean {
  return Boolean(
    profileText(personalBrand, "business_type") &&
    profileText(personalBrand, "ideal_audience", "target_audience", "ideal_audience_description") &&
    profileText(personalBrand, "current_situation", "content_goals")
  )
}

const UNSUPPORTED_EXPERIENCE_PATTERNS = [
  /\b(?:a lot of|lots of|many)\s+(?:people|clients|customers|followers)\s+(?:ask|tell|say|share|mention)\b/i,
  /\b(?:people|clients|customers|followers)\s+(?:always|often|constantly|keep)\s+(?:asking|telling|saying|sharing|mentioning)\b/i,
  /\b(?:my|our)\s+(?:clients|customers|followers|community)\b/i,
  /\b(?:in my experience|in my work|what i(?:'ve| have) learned|i(?:'ve| have) seen)\b/i,
]

export function containsUnsupportedExperienceClaim(caption: string): boolean {
  return UNSUPPORTED_EXPERIENCE_PATTERNS.some(pattern => pattern.test(caption))
}

const FIRST_PERSON_CLAIM_PATTERN =
  /\b(?:i|i['’](?:m|ve|d|ll)|me|my|mine|we|we['’](?:re|ve|d|ll)|us|our|ours)\b/i
const UNSOURCED_DIRECTION_PATTERN =
  /\b(?:behind(?: the)?|process(?: peek)?|personal (?:story|perspective)|studio glimpse|day in(?: the)? life|client (?:story|win))\b/i

export function isUnsupportedAutoDraftPost(
  post: { title: string; contentPillar: string; caption: string },
  strictTruthMode: boolean
): boolean {
  if (containsUnsupportedExperienceClaim(post.caption)) return true
  if (!strictTruthMode) return false
  return (
    FIRST_PERSON_CLAIM_PATTERN.test(post.caption) ||
    UNSOURCED_DIRECTION_PATTERN.test(`${post.contentPillar} ${post.title}`)
  )
}

function calendarContextFromPersonalBrand(personalBrand: unknown): string {
  const lines = [
    ["What she does", profileText(personalBrand, "business_type")],
    [
      "Who she serves",
      profileText(personalBrand, "ideal_audience", "target_audience", "ideal_audience_description"),
    ],
    ["Current offer or focus", profileText(personalBrand, "current_situation", "content_goals")],
    ["Brand voice", profileText(personalBrand, "brand_voice", "language_style")],
    ["Content themes", profileText(personalBrand, "content_themes", "content_pillars")],
  ]

  return lines
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n")
}

export function buildAutoDraftPrompt(input: AutoDraftPromptInput): {
  system: string
  userMessage: string
} {
  const { agentName, periodMonth, postCount, cadence, daysInMonth, brandContext } = input
  const strictTruthMode = input.strictTruthMode ?? !brandContext
  const cohesivePlan = input.cohesivePlan
  const system = [
    `You are ${agentName}, her personal content strategist at SSELFIE. Plan her Instagram feed for ${periodMonth} as one connected feed, not separate posts. Make it specific to her, never generic.`,
    `Plan exactly ${postCount} posts, spread naturally across the month (about ${cadence} per week) rather than clustered at the start.`,
    "Use her own photos and videos first. Create only what is missing.",
    "Treat inspiration as composition and mood only. Never copy another creator's face, words, or exact feed.",
    "Keep the feed cohesive, not identical. Do not place similar portraits, text covers, close-ups, or dark images beside each other.",
    "Factual safety:",
    "- Never invent facts, numbers, customer results, personal history, testimonials, pricing, timelines, or proof.",
    "- Use only facts explicitly present in the context. Treat missing information as unknown, not as permission to create a plausible detail.",
    "- Do not write first-person autobiography, quantified proof, or a client story unless the supplied context supports it.",
    "- Do not imply repeated experience with phrases such as 'people ask me', 'my clients', 'I often see', or 'in my work' unless that exact experience is supplied.",
    "- Do not invent the steps, method, promises, or deliverables of her offer. High-level offer names do not prove how her process works.",
    "- When context is limited, write useful caption structures the member can personalize without pretending an unverified experience happened.",
    ...(strictTruthMode
      ? [
          "- SOURCE-LIMITED MODE: Do not use first-person claims (I, me, my, we, our). Write neutral or second-person guidance only.",
          "- SOURCE-LIMITED MODE: Do not plan behind-the-scenes, process, personal-perspective, studio-glimpse, client-story, or day-in-the-life posts. No source material exists for them yet.",
        ]
      : []),
    "Rules:",
    "- Each post's contentPillar is a short creator-specific category grounded in HER brand (e.g. 'Behind the offer', 'Useful lesson', 'Personal perspective'), never generic ('Motivation', 'Lifestyle').",
    "- Only use categories such as 'Client win' or 'Personal story' when the supplied context contains the real source material for them.",
    "- Each post's title is a short editorial label for that day's post (a few words), specific to what it's about.",
    "- Each post's caption is a real, postable Instagram caption in HER voice - warm, direct, human, a few sentences, no hashtag spam, no hype words, never a long dash.",
    "- plannedDate is an ISO date (YYYY-MM-DD) within the target month, one distinct date per post, in ascending order.",
    "- position is 1-indexed and sequential (1, 2, 3, ...).",
    "Return ONLY raw JSON, no prose, no code fences, in exactly this shape:",
    `{"themeSummary": string, "schedulingRationale": string, "posts": [{"position": number, "plannedDate": "YYYY-MM-DD", "contentPillar": string, "title": string, "caption": string}]}`,
  ].join("\n")

  const userMessage = [
    `Target month: ${periodMonth} (${daysInMonth} days).`,
    brandContext
      ? `What you know about her:\n${brandContext}`
      : "You don't have much on her yet. Keep the plan relevant to her business and audience. Use observations, useful how-to guidance, thoughtful questions, and editable caption structures. Do not fill missing context with plausible details.",
    cohesivePlan
      ? `The complete feed structure Maya has chosen:\nFeed story: ${cohesivePlan.feedStory}\nVisual rhythm: ${cohesivePlan.visualRhythm}\n${describeCohesiveFeedPlan(cohesivePlan)}\n\nWrite each post for its assigned job. Do not change the format, shot role, subject, or visual weight.`
      : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n")

  return { system, userMessage }
}

export async function draftMonthPlanForUser(
  authUserId: string,
  neonUserId: string | number
): Promise<AutoDraftOutcome> {
  const periodMonth = currentPeriodMonth()
  const advisoryLockKey = `feed-draft:${neonUserId}:${periodMonth}`
  let lockAcquired = false

  try {
    const [lockResult] =
      await sql`SELECT pg_try_advisory_lock(hashtext(${advisoryLockKey})) AS locked`
    lockAcquired = Boolean(lockResult?.locked)
    if (!lockAcquired) return { created: false, reason: "draft_in_progress" }

    // Hard guard, re-checked under the lock: never draft twice, never touch a month that
    // already has a real plan (even a manually-created one with real generated images). A
    // place-photo STUB (she saved a chat photo before any plan existed) is the one exception:
    // the draft fills that layout in around her photo instead of creating a competing one.
    const monthState = await getMonthPlanState(neonUserId, periodMonth)
    if (monthState.state === "planned") return { created: false, reason: "plan_exists" }
    const stubLayoutId =
      monthState.state === "stub" ? (monthState.layoutId ?? undefined) : undefined

    const personalBrand = await getUserPersonalBrand(String(neonUserId)).catch(() => null)
    if (!hasSufficientCalendarContext(personalBrand)) {
      return { created: false, reason: "missing_context" }
    }

    const [brandContext, memory] = await Promise.all([
      getUserContextForMaya(authUserId),
      getMemory(String(neonUserId)).catch(() => null),
    ])

    const cadence = await resolvePostingCadence(neonUserId)
    const postCount = postsPerMonthForCadence(cadence)
    const resolvedStyle = await resolveFeedStyleForUser(personalBrand, neonUserId)
    const grid = CURATED_FEED_STYLE_MAP[resolvedStyle.feedStyle].grid
    const cohesivePlan = buildCohesiveFeedPlan({ personalBrand, postCount, grid })

    let agentName = "Maya"
    if (memory?.agentName?.trim()) agentName = memory.agentName.trim()

    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

    const { system, userMessage } = buildAutoDraftPrompt({
      agentName,
      periodMonth,
      postCount,
      cadence,
      daysInMonth,
      brandContext: brandContext?.trim()
        ? brandContext
        : calendarContextFromPersonalBrand(personalBrand),
      strictTruthMode: !profileText(
        personalBrand,
        "transformation_story",
        "specific_phrases",
        "signature_phrases"
      ),
      cohesivePlan,
    })
    const strictTruthMode = !profileText(
      personalBrand,
      "transformation_story",
      "specific_phrases",
      "signature_phrases"
    )

    let plan: ReturnType<typeof validateFeedMonthPlan> = null
    for (let attempt = 0; attempt < 2 && !plan; attempt += 1) {
      const attemptSystem =
        attempt === 0
          ? system
          : `${system}\nThe previous draft was rejected for implying personal or customer experience that was not in the context. Rewrite every caption with neutral or second-person guidance and only the supplied facts.`
      const { text } = await generateText({
        model: createMayaOpenRouterModel("chat_pro"),
        system: attemptSystem,
        messages: [{ role: "user", content: userMessage }],
        temperature: attempt === 0 ? 0.8 : 0.5,
        maxOutputTokens: getMayaMaxTokensForTask("chat_pro"),
      })

      let parsed: unknown = null
      try {
        parsed = JSON.parse(extractJson(text))
      } catch {
        console.error("[feed-plan draft] JSON parse failed. Raw model output:", text.slice(0, 400))
      }

      const candidate = validateFeedMonthPlan(parsed, periodMonth, cohesivePlan)
      if (!candidate) continue
      if (candidate.posts.some(post => isUnsupportedAutoDraftPost(post, strictTruthMode))) {
        console.warn("[feed-plan draft] rejected unsupported experience claim")
        continue
      }
      plan = candidate
    }

    if (!plan) return { created: false, reason: "generation_failed" }

    const { feedLayoutId, postIds } = await writeAutoDraft({
      userId: neonUserId,
      periodMonth,
      plan,
      feedStyle: resolvedStyle.feedStyle,
      styleId: resolvedStyle.styleId,
      variationId: resolvedStyle.variationId,
      grid,
      existingLayoutId: stubLayoutId,
    })

    return { created: true, feedLayoutId, postCount: postIds.length }
  } finally {
    if (lockAcquired) {
      await sql`SELECT pg_advisory_unlock(hashtext(${advisoryLockKey}))`.catch(() => {})
    }
  }
}
