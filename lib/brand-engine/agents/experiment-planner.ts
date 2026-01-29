/**
 * EXPERIMENT PLANNER AGENT
 *
 * Turns insights into a weekly testing plan:
 * - 2-3 tests max per week
 * - Clear hypothesis, variable, control, metric
 * - Tracks results and generates learnings
 *
 * Feeds into: Brand Reasoner
 */

import { Experiment, PerformanceInsight } from "../types"
import { SSELFIE_BRAND_BRAIN } from "../brand-brain/sselfie-brand-brain"

export const EXPERIMENT_PLANNER_SYSTEM_PROMPT = `You are the Experiment Planner for SSELFIE.

Your job is to turn performance insights into simple, actionable tests.

EXPERIMENT PHILOSOPHY:
- Maximum 2-3 tests per week (we have limited time: ${SSELFIE_BRAND_BRAIN.currentFocus.timeBudget})
- Each test should be small enough to run in 1-2 posts
- Clear before/after comparison
- Focus on one variable at a time

EXPERIMENT CATEGORIES:
1. HOOK TESTS - Different opening lines/seconds
2. FORMAT TESTS - Carousel vs Reel vs Static
3. CTA TESTS - Different calls to action
4. TIMING TESTS - Post time/day variations
5. PILLAR TESTS - Which content themes perform best
6. ANGLE TESTS - Same topic, different perspective

EXPERIMENT TEMPLATE:
{
  "hypothesis": "If we [change X], then [metric Y] will [increase/decrease] because [reason]",
  "variable": "The ONE thing we're changing",
  "control": "How we normally do it",
  "test": "The new approach",
  "metric": "What we're measuring",
  "targetLift": "% improvement we'd consider a win",
  "runDuration": "How long/how many posts"
}

CURRENT PRIORITIES:
- Focus: ${SSELFIE_BRAND_BRAIN.currentFocus.priorityGoal}
- Primary CTA: ${SSELFIE_BRAND_BRAIN.contentStrategy.ctaMapping.find((c) => c.funnelStage === "bottom")?.cta}

AVOID:
- Tests that require too much production effort
- Testing multiple variables at once
- Tests without clear success metrics
- Anything that feels "hustle-y" or against brand values
`

export type ExperimentPlannerInput = {
  insights: PerformanceInsight[]
  recentExperiments: Experiment[]
  currentPriorities: string[]
}

/**
 * Generate weekly experiment suggestions
 */
export function generateExperimentSuggestions(
  input: ExperimentPlannerInput
): string {
  return `
Based on these insights, suggest 2-3 simple experiments for this week:

PERFORMANCE INSIGHTS:
${input.insights.map((i) => `- ${i.title}: ${i.description} (Confidence: ${i.confidence}%)`).join("\n")}

RECENT EXPERIMENTS (avoid repeating):
${input.recentExperiments.map((e) => `- ${e.variable}: ${e.status === "completed" ? e.results?.learnings : "In progress"}`).join("\n") || "None yet"}

CURRENT PRIORITIES:
${input.currentPriorities.map((p) => `- ${p}`).join("\n")}

For each experiment, provide:
1. Hypothesis
2. What we're testing (single variable)
3. Control vs Test
4. Success metric
5. How many posts/duration needed

Keep it simple - these should be easy to run within our ${SSELFIE_BRAND_BRAIN.currentFocus.timeBudget} time budget.
`
}

/**
 * Common experiment templates ready to use
 */
export const EXPERIMENT_TEMPLATES: Partial<Experiment>[] = [
  {
    hypothesis: "If we use a question hook instead of a statement, engagement will increase because it invites participation",
    variable: "Hook type",
    control: "Statement hook (e.g., 'I used to struggle with...')",
    test: "Question hook (e.g., 'Do you ever feel like...')",
    metric: "Comments per post",
    targetLift: 20,
  },
  {
    hypothesis: "If we mention 'decision fatigue' in the hook, saves will increase because it directly addresses audience pain",
    variable: "Pain point specificity",
    control: "General hook about feeling stuck",
    test: "Specific hook mentioning decision fatigue",
    metric: "Saves per post",
    targetLift: 25,
  },
  {
    hypothesis: "If we post between 7-8am, reach will increase because our audience is online during morning routines",
    variable: "Post timing",
    control: "Current posting time",
    test: "7-8am local time",
    metric: "Reach within 24 hours",
    targetLift: 15,
  },
  {
    hypothesis: "If we add a simple CTA in Stories, DMs will increase because we're making it easier to engage",
    variable: "Story CTA",
    control: "No direct CTA in stories",
    test: "Reply with '[keyword]' for [thing]",
    metric: "DM replies from stories",
    targetLift: 30,
  },
  {
    hypothesis: "If we use 'systems' language instead of 'tools', saves will increase because it sounds more premium and less overwhelming",
    variable: "Word choice",
    control: "Tools/tips/hacks language",
    test: "Systems/structure language",
    metric: "Saves and shares",
    targetLift: 20,
  },
]

/**
 * Track experiment results
 */
export function analyzeExperimentResults(experiment: Experiment): string {
  if (!experiment.results) {
    return "Experiment still in progress"
  }

  return `
EXPERIMENT RESULTS: ${experiment.variable}

Hypothesis: ${experiment.hypothesis}
Winner: ${experiment.results.winner === "test" ? "TEST (new approach)" : experiment.results.winner === "control" ? "CONTROL (old approach)" : "INCONCLUSIVE"}
Lift: ${experiment.results.lift > 0 ? "+" : ""}${experiment.results.lift}%
Confidence: ${experiment.results.confidence}%

KEY LEARNING:
${experiment.results.learnings}

NEXT STEPS:
${experiment.results.winner === "test" ? "Adopt the new approach as default" : experiment.results.winner === "control" ? "Keep doing what we were doing" : "Run the test again with larger sample"}
`
}

/**
 * Export agent configuration
 */
export const EXPERIMENT_PLANNER_CONFIG = {
  agentId: "experiment_planner",
  name: "Experiment Planner Agent",
  description: "Turns insights into simple weekly tests (2-3 max)",
  systemPrompt: EXPERIMENT_PLANNER_SYSTEM_PROMPT,
  inputs: ["performance_insights", "recent_experiments", "priorities"],
  outputs: ["weekly_experiments", "experiment_results", "learnings_log"],
  schedule: {
    plan: "Sunday 7pm", // Plan next week's experiments
    review: "Saturday 2pm", // Review this week's results
  },
  templates: EXPERIMENT_TEMPLATES,
}
