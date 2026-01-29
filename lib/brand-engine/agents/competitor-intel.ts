/**
 * COMPETITOR INTEL AGENT
 *
 * Tracks 5-20 competitors/adjacent creators and reports:
 * - What they're pushing (offers, messaging)
 * - What's repeating (consistent patterns)
 * - What's working (engagement, growth)
 *
 * Feeds into: Brand Reasoner
 */

import { CompetitorIntel } from "../types"
import { SSELFIE_BRAND_BRAIN } from "../brand-brain/sselfie-brand-brain"

export const COMPETITOR_INTEL_SYSTEM_PROMPT = `You are the Competitor Intelligence Agent for SSELFIE.

Your job is to track competitors and adjacent creators, looking for:
1. WHAT THEY'RE PUSHING - Current offers, campaigns, messaging themes
2. WHAT'S REPEATING - Patterns they keep using (formats, hooks, CTAs)
3. WHAT'S WORKING - Content getting high engagement, what's resonating

TARGET AUDIENCE CONTEXT:
${SSELFIE_BRAND_BRAIN.audience.psychographics.currentFeelings.join(", ")}

BRAND POSITIONING:
${SSELFIE_BRAND_BRAIN.identity.mission}

ANALYSIS FRAMEWORK:
For each competitor observation, classify as:
- ADOPT: Great idea we should adapt to our voice
- AVOID: Doesn't fit our brand/values
- WATCH: Interesting but wait to see if it's a pattern
- DIFFERENTIATE: They're doing X, we should do opposite

OUTPUT FORMAT:
{
  "competitor": "[Name/Handle]",
  "platform": "[instagram/tiktok/youtube]",
  "observation": {
    "type": "[post/campaign/offer/messaging/format]",
    "description": "[What you noticed]",
    "isRepeating": [true/false]
  },
  "takeaway": "[One-sentence insight]",
  "shouldWe": "[adopt/avoid/watch/differentiate]"
}

IMPORTANT:
- Focus on strategic patterns, not vanity metrics
- Look for messaging that resonates with OUR audience
- Note what's missing that we could fill
- Flag anything that conflicts with our values (hustle culture, pressure tactics)
`

/**
 * Default competitor list to track
 * These can be customized per client
 */
export const DEFAULT_COMPETITORS = [
  // Personal branding coaches
  { name: "Jasmine Star", handle: "@jasminestar", platform: "instagram" as const },
  { name: "Jenna Kutcher", handle: "@jennakutcher", platform: "instagram" as const },
  // Visibility/confidence coaches
  { name: "Rachel Luna", handle: "@girlconfident", platform: "instagram" as const },
  // AI/Systems coaches
  { name: "Amy Porterfield", handle: "@amyporterfield", platform: "instagram" as const },
  // Brand strategists
  { name: "Hilary Hartling", handle: "@hilaryhartling", platform: "instagram" as const },
]

export type CompetitorProfile = {
  name: string
  handle: string
  platform: "instagram" | "tiktok" | "youtube"
  category: "direct_competitor" | "adjacent_creator" | "industry_leader"
  trackingPriority: "high" | "medium" | "low"
  notes?: string
}

export type CompetitorIntelInput = {
  competitors: CompetitorProfile[]
  lookbackDays: number
  focusAreas: string[]
}

/**
 * Analyze competitor content
 * This would integrate with social media APIs or manual input
 */
export async function analyzeCompetitors(
  input: CompetitorIntelInput
): Promise<CompetitorIntel[]> {
  // In production, this would:
  // 1. Fetch recent posts from competitor profiles
  // 2. Run through AI for pattern analysis
  // 3. Return structured insights

  // For Make.com integration, this is the expected output format
  return []
}

/**
 * Generate weekly competitor report
 */
export function buildCompetitorReportPrompt(
  recentObservations: CompetitorIntel[]
): string {
  return `
Analyze these competitor observations and create a weekly intel report:

OBSERVATIONS:
${recentObservations.map((o) => `
- ${o.competitorName} (${o.platform}):
  Type: ${o.observation.type}
  What: ${o.observation.description}
  Repeating: ${o.observation.isRepeating ? "Yes" : "No"}
`).join("\n")}

Generate:
1. KEY PATTERNS: What are competitors consistently doing?
2. GAPS: What's nobody doing that we could own?
3. WARNINGS: What trends should we avoid?
4. OPPORTUNITIES: What should we test based on what's working?

Keep it strategic and actionable for a brand focused on:
"${SSELFIE_BRAND_BRAIN.identity.mission}"
`
}

/**
 * Export agent configuration for Make.com/external orchestration
 */
export const COMPETITOR_INTEL_CONFIG = {
  agentId: "competitor_intel",
  name: "Competitor Intel Agent",
  description: "Tracks competitors and reports patterns, gaps, opportunities",
  systemPrompt: COMPETITOR_INTEL_SYSTEM_PROMPT,
  inputs: ["competitor_list", "social_data"],
  outputs: ["competitor_observations", "weekly_intel_report", "opportunity_alerts"],
  schedule: {
    scan: "Daily 6am", // Quick scan for new posts
    report: "Friday 4pm", // Weekly summary
  },
  integrations: [
    "phantombuster", // For social scraping (optional)
    "manual_input", // CSV upload of observations
    "apify", // Alternative scraper
  ],
  manualWorkflow: `
    WEEKLY COMPETITOR CHECK (15 mins):
    1. Open each competitor's profile
    2. Note their last 7 days of posts
    3. Log in spreadsheet: Date | Competitor | Type | Description | Engagement | Notes
    4. Upload CSV to Make.com scenario
  `,
}
