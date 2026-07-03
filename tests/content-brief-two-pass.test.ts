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
    expect(generator).toContain('engineeredFor: { type: "string", enum: ["save", "share", "comment", "follow"] }')
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
      generator.indexOf("const BRIEF_PLAN_SCHEMA"),
    )
    expect(strategySchema).toContain("onScreenHookBank")
    expect(strategySchema).toContain("watchThroughMechanic")
    expect(strategySchema).toContain(
      'required: ["performanceRecap", "audienceDemand", "hookIntelligence", "onScreenHookBank", "demandMap"]',
    )
    // The sanitizer passes the section through, empty-safe for old briefs.
    expect(generator).toContain("onScreenHookBank: asArray<OnScreenHookBankEntry>")
    // The literal-overlay constraint and the adaptation rule.
    expect(generator).toContain("max 9 words")
    expect(generator).toContain("NEVER copy a creator's exact distinctive line verbatim")
    expect(generator).toContain('is a pattern, not property')
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

  it("renders trend radar and audience questions on the admin content brief page", () => {
    const client = read("components/admin/content-brief-client.tsx")
    expect(client).toContain("TrendRadarSection")
    expect(client).toContain("noFakeGuardrail")
    expect(client).toContain("audienceQuestions")
    expect(client).toContain("Questions your audience actually asked")
    expect(client).toContain("engineeredFor")
  })

  it("renders the on-screen hook bank as copyable chips on the admin page, empty-safe", () => {
    const client = read("components/admin/content-brief-client.tsx")
    expect(client).toContain("OnScreenHookBankSection")
    expect(client).toContain("On-screen hooks that stop the scroll")
    // Each hook is a copyable chip with its pattern label alongside.
    expect(client).toContain("CopyHookChip")
    expect(client).toContain("entry.pattern")
    expect(client).toContain("entry.watchThroughMechanic")
    // Old stored briefs without the bank render fine: the section disappears.
    expect(client).toContain("safeArray(brief.onScreenHookBank)")
    expect(client).toContain("if (entries.length === 0) return null")
  })

  it("adds a short on-screen hooks block to the weekly brief email, empty-safe", () => {
    const cron = read("app/api/cron/content-brief-weekly/route.ts")
    expect(cron).toContain("On-screen hooks this week")
    expect(cron).toContain("onScreenHookBank")
    // Top 5 only, text only, and old briefs degrade to no block.
    expect(cron).toContain(".slice(0, 5)")
    expect(cron).toContain("Array.isArray(brief.onScreenHookBank) ? brief.onScreenHookBank : []")
  })
})
