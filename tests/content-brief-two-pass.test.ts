import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// CONTENT-INTELLIGENCE-01 guardrails: the weekly brief must be generated in
// two guarded passes so the content plan can never again be silently truncated
// into an empty array by a single oversized tool call.

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("weekly content brief: two-pass generation", () => {
  const generator = read("lib/content-engine/brief-generator.ts")

  it("splits generation into a strategy pass and a plan pass with separate tool schemas", () => {
    expect(generator).toContain("BRIEF_STRATEGY_SCHEMA")
    expect(generator).toContain("BRIEF_PLAN_SCHEMA")
    expect(generator).toContain('toolName: "deliver_brief_strategy"')
    expect(generator).toContain('toolName: "deliver_brief_plan"')
    // The old single monolithic tool call is gone.
    expect(generator).not.toContain("deliver_content_brief")
    // Three guarded tool calls: strategy + plan in generateContentBrief, plus the
    // daily-stories pass (its own cron phase, 2026-07-03 daily cadence).
    const passCalls = generator.match(/await runBriefToolCall\(\{/g) || []
    expect(passCalls.length).toBe(3)
    expect(generator).toContain('toolName: "deliver_daily_stories"')
    expect(generator).toContain("export async function generateDailyStoriesForBrief")
  })

  it("feeds the pass-1 strategy output into the pass-2 prompt", () => {
    expect(generator).toContain("strategy layer from pass 1")
    expect(generator).toContain("JSON.stringify(strategyOutput")
  })

  it("checks stop_reason on every model call and retries once before throwing", () => {
    const stopReasonChecks = generator.match(/stop_reason === "max_tokens"/g) || []
    // runBriefToolCall checks twice (initial + retry) and the research memo
    // call checks twice as well.
    expect(stopReasonChecks.length).toBeGreaterThanOrEqual(4)
    expect(generator).toContain("Be more concise")
    expect(generator).toContain("truncated at max_tokens twice")
  })

  it("refuses to return a brief with fewer than 5 content pieces (7 expected daily)", () => {
    expect(generator).toContain("brief.contentPlan.length < 5")
    expect(generator).toContain("Refusing to store a brief")
    // Same guard on the stories pass: a week of stories Sandra cannot post from is refused.
    expect(generator).toContain("stories.length < 5")
  })

  it("adds trendRadar to the plan schema, type, and sanitizer", () => {
    expect(generator).toContain("export type TrendRadarEntry")
    expect(generator).toContain('required: ["contentPlan", "storySequence", "trendRadar"]')
    for (const field of ["trend", "whyItsMoving", "howSandraRidesIt", "noFakeGuardrail"]) {
      expect(generator).toContain(field)
    }
    expect(generator).toContain("trendRadar: asArray<TrendRadarEntry>")
  })

  it("SHOOT-TREND-PRESET-01: adds a buyer-safe vibePreset to every trend, for Shoot Studio's vibe picker", () => {
    // Sandra's ask (2026-07-05): "a new preset that helps me create the trends we're pulling
    // from the weekly brief." howSandraRidesIt is a strategy paragraph that names her, Vault
    // drops, Reels, and CTAs - unsafe to paste into a shareable buyer prompt. vibePreset is a
    // separate, clean, generic directive synthesized just for that purpose.
    expect(generator).toContain(
      'required: ["trend", "whyItsMoving", "howSandraRidesIt", "noFakeGuardrail", "vibePreset"]'
    )
    expect(generator).toContain("vibePreset: { type: \"string\" }")
    expect(generator).toContain(
      "a clean, generic, buyer-safe image-style directive synthesized from THIS trend"
    )
    expect(generator).toContain('NEVER write "Sandra", a product name, a channel')
    expect(generator).toContain("set vibePreset to an empty string rather than forcing one")
    // Defensive sanitizer strip, in case the model names her anyway.
    expect(generator).toContain('.replace(/\\bsandra\'s\\b/gi, "her")')
    expect(generator).toContain('.replace(/\\bsandra\\b/gi, "the woman")')
  })

  it("adds audienceQuestions to the demand map schema and sanitizer, traced to real DMs", () => {
    expect(generator).toContain("export type AudienceQuestion")
    expect(generator).toContain("audienceQuestions")
    expect(generator).toContain("suggestedAnswerContent")
    expect(generator).toContain("audienceQuestions: asArray<AudienceQuestion>")
    // The instruction that keeps questions honest.
    expect(generator).toContain("Every question must trace to a real DM sample")
    expect(generator).toContain("never invent questions")
  })

  it("encodes the 2026 algorithm truth and per-piece engagement engineering", () => {
    expect(generator).toContain("Saves and shares outrank comments")
    expect(generator).toContain("Sends-per-reach")
    expect(generator).toContain("works on mute")
    expect(generator).toContain("Teach-while-entertaining")
    // Every piece must name its ONE engagement action.
    expect(generator).toContain(
      'engineeredFor: { type: "string", enum: ["save", "share", "comment", "follow"] }'
    )
    expect(generator).toContain("engagementMechanic")
  })

  it("deepens the research memo to five grounded angles", () => {
    expect(generator).toContain("HOOK AND FORMAT MECHANICS")
    expect(generator).toContain("TREND RADAR")
    expect(generator).toContain("WHAT SIMILAR CREATORS SHIPPED THIS WEEK")
    expect(generator).toContain("STORY SEQUENCE MECHANICS")
    expect(generator).toContain("micro-commitment ladders")
    expect(generator).toContain("synthetic-avatar")
  })

  it("asks the research memo for verbatim ON-SCREEN hooks, explicitly not caption first-lines", () => {
    expect(generator).toContain("ON-SCREEN HOOK BANK")
    expect(generator).toContain("VERBATIM on-screen text hooks")
    expect(generator).toContain("NOT caption first-lines")
    // The scroll-stop pattern taxonomy and the watch-through question are both requested.
    expect(generator).toContain("why it stops the scroll")
    expect(generator).toContain("full watch-through")
    // The concision retry never drops the new section.
    expect(generator).toContain("Never drop the ON-SCREEN HOOK BANK section")
  })

  it("adds onScreenHookBank to the strategy schema (pass 1), type, and sanitizer", () => {
    expect(generator).toContain("export type OnScreenHookBankEntry")
    // Pass 1 owns the bank so pass 2 can build the plan from it.
    const strategySchema = generator.slice(
      generator.indexOf("const BRIEF_STRATEGY_SCHEMA"),
      generator.indexOf("const BRIEF_PLAN_SCHEMA")
    )
    expect(strategySchema).toContain("onScreenHookBank")
    expect(strategySchema).toContain("watchThroughMechanic")
    expect(strategySchema).toContain(
      'required: ["performanceRecap", "audienceDemand", "hookIntelligence", "onScreenHookBank", "demandMap"]'
    )
    // The sanitizer passes the section through, empty-safe for old briefs.
    expect(generator).toContain("onScreenHookBank: asArray<OnScreenHookBankEntry>")
    // The literal-overlay constraint and the adaptation rule.
    expect(generator).toContain("max 9 words")
    expect(generator).toContain("NEVER copy a creator's exact distinctive line verbatim")
    expect(generator).toContain("is a pattern, not property")
  })

  it("forces plan pieces to draw their on-screen text from the bank", () => {
    expect(generator).toContain("onScreenHookBank or follow one of its named patterns")
    expect(generator).toContain("name the bank hook or pattern in executionNotes")
    // Reels must carry the watch-through mechanic on screen.
    expect(generator).toContain("watch-through mechanic must be visible ON SCREEN")
  })
})

describe("weekly content brief: surfaces", () => {
  it("renders the trend radar in the weekly email", () => {
    const cron = read("app/api/cron/content-brief-weekly/route.ts")
    expect(cron).toContain("trendRadar")
    expect(cron).toContain("Trend radar")
  })

  it("keeps the weekly cron surfacing failures through the cron error alert pattern", () => {
    const cron = read("app/api/cron/content-brief-weekly/route.ts")
    expect(cron).toContain("logger.error(error")
    expect(cron).toContain("content_brief_generation_failed")
    expect(cron).toContain("status: 500")
  })

  it("adds a short on-screen hooks block to the weekly brief email, empty-safe", () => {
    const cron = read("app/api/cron/content-brief-weekly/route.ts")
    expect(cron).toContain("On-screen hooks this week")
    expect(cron).toContain("onScreenHookBank")
    // Top 5 only, text only, and old briefs degrade to no block.
    expect(cron).toContain(".slice(0, 5)")
    expect(cron).toContain("Array.isArray(brief.onScreenHookBank) ? brief.onScreenHookBank : []")
  })

  it("removes the orphaned admin dashboard while preserving the local worker fallback", () => {
    const worker = read("scripts/run-content-brief-jobs.ts")

    expect(fs.existsSync(path.join(root, "components/admin/content-brief-client.tsx"))).toBe(false)
    expect(fs.existsSync(path.join(root, "app/api/admin/content-brief/route.ts"))).toBe(false)

    expect(worker).toContain("claimNextContentBriefJob")
    expect(worker).toContain("generateContentBriefResearchMemo")
    expect(worker).toContain("generateContentBrief({ prebuiltResearchMemo: memo })")
    expect(worker).toContain("generateDailyStoriesForBrief")
    expect(worker).toContain("completeContentBriefJob")
    expect(worker).toContain("failContentBriefJob")
  })

  it("uses streaming for long structured Anthropic brief calls", () => {
    const generator = read("lib/content-engine/brief-generator.ts")
    const toolCallHelper = generator.slice(
      generator.indexOf("async function runBriefToolCall"),
      generator.indexOf("// Canonical LIST prices")
    )

    expect(toolCallHelper).toContain(".messages")
    expect(toolCallHelper).toContain(".stream({")
    expect(toolCallHelper).toContain(".finalMessage()")
    expect(toolCallHelper).not.toContain(".messages.create({")
  })

  it("drains a queued admin brief job automatically, without a manual worker command", () => {
    // 2026-07-04: the job queue (content_brief_jobs) fixed the admin "Queue this week's
    // brief" button timing out, but nothing served the queue in production except a local
    // `pnpm content-brief:worker` command Sandra would never run. A cron tick must exist
    // that drains it on its own, mirroring the Monday research/build/stories cron split.
    const tick = read("app/api/cron/content-brief-jobs/route.ts")
    expect(tick).toContain("claimNextContentBriefJob")
    expect(tick).toContain("markContentBriefJobPhase")
    expect(tick).toContain("completeContentBriefJob")
    expect(tick).toContain("generateContentBriefResearchMemo")
    expect(tick).toContain("generateContentBrief(")
    expect(tick).toContain("generateDailyStoriesForBrief")

    const vercelConfig = read("vercel.json")
    expect(vercelConfig).toContain('"path": "/api/cron/content-brief-jobs"')

    // The queue has no live UI producer now; Phase 2B owns eventual cron/pipeline deletion.
    expect(fs.existsSync(path.join(root, "components/admin/content-brief-client.tsx"))).toBe(false)
  })
})

describe("Story Engine rebuild (2026-07-04): Stories are conversations, not lessons", () => {
  // Sandra's direction: her real highest-performing recent Story (her son bringing her
  // flowers) taught and sold nothing, and still landed as one of her best-viewed Stories in a
  // long time - because people were spending time with her, not consuming content. Stories were
  // wrongly built as a daily lesson tied to the feed reel, selling a low-ticket keyword. This
  // pins the rebuilt system: four conversation types, decoupled from the feed, real client
  // material only, grounded in her actual Story Bank and beliefs, never invented generically.
  const generator = read("lib/content-engine/brief-generator.ts")
  const grounding = read("lib/content/grounding.ts")

  it("wires the real Story Bank and beliefs into the daily stories prompt, not a generic template", () => {
    expect(generator).toContain("${storyBankBlock()}")
    expect(grounding).toContain("export const STORY_BANK")
    expect(grounding).toContain("export function storyBankBlock")
    // A sample of real, specific named themes must be present, not paraphrased away.
    expect(grounding).toContain("The bathroom studio")
    expect(grounding).toContain("The two-bedroom apartment was not the ending")
    expect(grounding).toContain("My ADHD brain was not the problem")
    expect(grounding).toContain("The selfie that made people stop")
    // Her real beliefs (SANDRA_EXPERTISE.md "What I Believe"), not invented philosophy.
    expect(grounding).toContain("Your phone is enough to start.")
    expect(grounding).toContain("Simple beats complicated.")
  })

  it("decouples Stories from the day's feed piece instead of echoing it", () => {
    expect(generator).toContain("DECOUPLED from that day's feed piece")
    expect(generator).not.toContain("must echo or extend that day's feed piece")
    expect(generator).toContain("never the story's subject")
  })

  it("requires my-clients days to use only real DM/audience-question data, never invented", () => {
    expect(generator).toContain("my-clients days: sourceStoryTheme must quote or closely paraphrase a REAL entry")
    expect(generator).toContain("do NOT invent one - use a different conversationType that day instead")
  })

  it("requires the real-life-conversation shape instead of a lesson/hook opener", () => {
    expect(generator).toContain("NEVER open like a lesson, a hook, or a tip")
    expect(generator).toContain("I realized something today")
    expect(generator).toContain("what she actually helps women achieve")
    expect(generator).toContain("never a bare keyword command")
  })

  it("rotates across four conversation types and removed the old mechanical CTA quota", () => {
    expect(generator).toContain('"my-story", "my-clients", "my-beliefs", "my-life"')
    expect(generator).not.toContain("at least 2 days end in a DM keyword ask")
    expect(generator).not.toContain("Build each day as a micro-commitment ladder")
    expect(generator).toContain("never a mandatory lead-gen ladder")
  })

  it("adds conversationType and sourceStoryTheme to the schema, type, and sanitizer", () => {
    expect(generator).toContain("export type DailyStoryConversationType")
    expect(generator).toContain('enum: ["my-story", "my-clients", "my-beliefs", "my-life"]')
    expect(generator).toContain("conversationType: {")
    expect(generator).toContain("sourceStoryTheme: safeBriefText(story.sourceStoryTheme, vault)")
  })

  // 2026-07-09: the daily email's full feed-script + story-sequence dump was cut (Sandra's own
  // content workflow lives in her Cowork skills, not this money-truth email).
  it("no longer dumps today's conversation type/citation into the daily email", () => {
    const dailyEmail = read("lib/admin/daily-sandra-briefing.ts")
    expect(dailyEmail).not.toContain("conversationTypeLabel")
  })
})
