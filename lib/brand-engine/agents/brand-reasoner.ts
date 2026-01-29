/**
 * BRAND REASONER AGENT
 *
 * The "Kim/Kylie social director" - The brain that combines:
 * - Brand Brain (identity, voice, offers, rules)
 * - Signals (trends, competitors, culture)
 * - Performance (analytics, insights, experiments)
 *
 * Outputs:
 * - "What matters this week" briefing
 * - "What to post today" with reasoning
 * - Strategic recommendations
 */

import {
  BrandBrain,
  SignalsData,
  PerformanceData,
  WeeklyBrief,
  TodaysPlan,
  AgentOutput,
} from "../types"
import { SSELFIE_BRAND_BRAIN } from "../brand-brain/sselfie-brand-brain"

export const BRAND_REASONER_SYSTEM_PROMPT = `You are the Brand Reasoner for SSELFIE - the strategic brain that acts like a celebrity's social media director.

Your role is to analyze three sources of truth and make smart content decisions:

1. BRAND BRAIN (What we stand for)
- Mission: "${SSELFIE_BRAND_BRAIN.identity.mission}"
- Core Values: ${SSELFIE_BRAND_BRAIN.identity.coreValues.join(", ")}
- Voice: ${SSELFIE_BRAND_BRAIN.voice.toneDescription}
- Current Focus: ${SSELFIE_BRAND_BRAIN.currentFocus.priorityGoal}

2. SIGNALS (What's happening externally)
- Trends worth catching
- What competitors are doing
- Cultural moments to address or avoid

3. PERFORMANCE (What's working for us)
- Top performing content patterns
- Experiments in progress
- Audience engagement insights

OUTPUT FORMAT:
Always structure your recommendations with:
- WHAT to do (specific action)
- WHY it matters now (strategic reasoning)
- HOW it connects to brand goals (alignment check)

DECISION FRAMEWORK:
1. Does this align with current focus? (If no, skip it)
2. Does this serve the target audience's pain points?
3. Does this move toward closing pilot clients?
4. Is this simple enough to execute in limited time?

BANNED APPROACHES:
- Don't suggest anything requiring "hustle" or "grind"
- Don't recommend reactive viral chasing
- Don't suggest content that feels performative
- Don't overcomplicate with too many tactics

ALWAYS:
- Prioritize consistency over intensity
- Lead with decision fatigue solutions
- Keep recommendations to 2-3 max per day
- Acknowledge time constraints (10-15 hrs/week budget)
`

export type BrandReasonerInput = {
  brandBrain: BrandBrain
  signals: SignalsData
  performance: PerformanceData
  requestType: "weekly_brief" | "todays_plan" | "strategic_question"
  question?: string
  date: Date
}

/**
 * Generate the weekly brief
 */
export async function generateWeeklyBrief(
  input: BrandReasonerInput
): Promise<WeeklyBrief> {
  const prompt = buildWeeklyBriefPrompt(input)

  // This would call your AI provider (OpenAI, Anthropic, etc.)
  // For now, returning structure for Make.com integration
  return {
    id: `brief-${Date.now()}`,
    weekOf: input.date,
    whatMattersThisWeek: [],
    contentCalendar: [],
    experimentsToRun: [],
    dontForget: [],
    reasoning: "",
    generatedAt: new Date(),
  }
}

/**
 * Generate today's content plan
 */
export async function generateTodaysPlan(
  input: BrandReasonerInput
): Promise<TodaysPlan> {
  const prompt = buildTodaysPlanPrompt(input)

  return {
    id: `plan-${Date.now()}`,
    date: input.date,
    whatToPostToday: [],
    storiesToPost: [],
    engagementPriorities: [],
    reasoning: "",
    generatedAt: new Date(),
  }
}

/**
 * Build prompt for weekly brief generation
 */
function buildWeeklyBriefPrompt(input: BrandReasonerInput): string {
  const { brandBrain, signals, performance } = input

  return `
Generate the weekly content brief for SSELFIE.

CURRENT FOCUS:
${brandBrain.currentFocus.priorityGoal}

TIME BUDGET: ${brandBrain.currentFocus.timeBudget}

ACTIVE SIGNALS:
${signals.trends.slice(0, 5).map((t) => `- ${t.title}: ${t.description}`).join("\n")}

COMPETITOR MOVES:
${signals.competitors.slice(0, 3).map((c) => `- ${c.competitorName}: ${c.observation.description}`).join("\n")}

TOP PERFORMING CONTENT:
${performance.insights.filter((i) => i.type === "winner").slice(0, 3).map((i) => `- ${i.title}: ${i.description}`).join("\n")}

CONTENT PILLARS TO ROTATE:
${brandBrain.contentStrategy.contentPillars.map((p) => `- ${p.name}: ${p.postAngles.join(", ")}`).join("\n")}

Generate:
1. What matters this week (3 priorities max)
2. A simple content calendar (following the ${brandBrain.contentStrategy.platforms.map((p) => `${p.platform}: ${p.cadence}`).join("; ")} cadence)
3. 1-2 experiments to run
4. Key things not to forget

Keep it simple and actionable.
`
}

/**
 * Build prompt for today's plan
 */
function buildTodaysPlanPrompt(input: BrandReasonerInput): string {
  const { brandBrain, signals, performance, date } = input
  const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" })

  return `
Generate today's content plan for SSELFIE.

TODAY: ${dayOfWeek}, ${date.toLocaleDateString()}

WEEKLY PRIORITY: ${brandBrain.currentFocus.priorityGoal}

TODAY'S SIGNALS:
${signals.cultureMoments.filter((c) => c.timing === "immediate").slice(0, 2).map((c) => `- ${c.topic}: ${c.suggestedAngle || c.description}`).join("\n") || "No urgent moments today"}

WHAT'S WORKING:
${performance.insights.filter((i) => i.type === "winner").slice(0, 2).map((i) => i.suggestedAction || i.title).join("\n") || "Stay consistent with pillars"}

CTA TO USE TODAY: ${brandBrain.contentStrategy.ctaMapping.find((c) => c.funnelStage === "bottom")?.cta}

Generate:
1. What to post today (1-2 pieces max)
2. Stories to share (2-3 simple ideas)
3. Engagement priorities (who to respond to, where to show up)

Remember: Consistency over intensity. What's the ONE thing that will move the needle?
`
}

/**
 * Export agent configuration for Make.com/external orchestration
 */
export const BRAND_REASONER_CONFIG = {
  agentId: "brand_reasoner",
  name: "Brand Reasoner",
  description: "Strategic brain that decides what matters and what to post",
  systemPrompt: BRAND_REASONER_SYSTEM_PROMPT,
  inputs: ["brand_brain", "signals", "performance"],
  outputs: ["weekly_brief", "todays_plan", "strategic_recommendation"],
  schedule: {
    weekly: "Sunday 8pm", // Weekly brief
    daily: "7am", // Today's plan
  },
  dependencies: [
    "competitor_intel", // Needs competitor data
    "signal_scout", // Needs trend signals (when added)
    "analytics_interpreter", // Needs performance insights (when added)
  ],
}
