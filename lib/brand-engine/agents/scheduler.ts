/**
 * SCHEDULER / REPURPOSING AGENT
 *
 * Turns one piece of content into a cross-platform plan:
 * - Repurposing strategies
 * - Platform-specific adaptations
 * - Scheduling recommendations
 * - Content batching
 *
 * Maximizes content ROI with minimal effort
 */

import { SSELFIE_BRAND_BRAIN } from "../brand-brain/sselfie-brand-brain"

export const SCHEDULER_SYSTEM_PROMPT = `You are the Scheduler & Repurposing Agent for SSELFIE.

Your job is to maximize content ROI by:
1. Turning ONE piece of content into multiple platform versions
2. Recommending optimal posting times
3. Creating batching strategies for efficient production
4. Ensuring consistent cross-platform presence

PLATFORM CADENCE:
${SSELFIE_BRAND_BRAIN.contentStrategy.platforms.map((p) => `- ${p.platform}: ${p.cadence}`).join("\n")}

TIME BUDGET: ${SSELFIE_BRAND_BRAIN.currentFocus.timeBudget}

REPURPOSING PHILOSOPHY:
- One idea, multiple expressions
- Platform-native adaptations (not just cross-posting)
- 80/20 rule: 80% repurposed, 20% fresh
- Batch similar tasks for efficiency

CONTENT TO PLATFORM MAPPING:
- Long-form content (blog/email) → Extract for Reels → Pull quotes for carousels → Story snippets
- Reel → TikTok version → Story clips → Audio for future content
- Carousel → Individual slides as Stories → Thread version → Email section
- Email → Carousel → Story series → Single post

SCHEDULING PRINCIPLES:
- Consistency > Perfect timing
- Account for time zones (audience in US + Nordic/European)
- Stories: Throughout the day
- Feed posts: When you have energy to engage back
- Batch production days vs posting days

EFFICIENCY RULES:
- Never create from scratch if you can repurpose
- Group similar tasks (all captions at once, all videos at once)
- Templates > starting blank
- Systems over motivation
`

export type OriginalContent = {
  id: string
  type: "reel" | "carousel" | "static" | "email" | "blog"
  platform: "instagram" | "tiktok" | "email"
  pillar: string
  hook: string
  mainContent: string
  cta: string
  assets?: string[] // URLs to images/videos
}

export type RepurposedContent = {
  originalId: string
  newPlatform: "instagram" | "tiktok" | "email" | "stories"
  newFormat: string
  adaptationNotes: string
  content: {
    hook?: string
    body: string
    cta?: string
  }
  scheduledFor?: Date
  priority: "high" | "medium" | "low"
}

export type ContentCalendarEntry = {
  date: Date
  platform: string
  contentType: string
  pillar: string
  sourceContent?: string // ID of original if repurposed
  status: "draft" | "scheduled" | "posted"
  time?: string
}

/**
 * Generate repurposing plan for a piece of content
 */
export function buildRepurposingPrompt(content: OriginalContent): string {
  return `
Create a repurposing plan for this content:

ORIGINAL:
- Type: ${content.type}
- Platform: ${content.platform}
- Pillar: ${content.pillar}
- Hook: "${content.hook}"
- Main Content: ${content.mainContent.substring(0, 500)}...
- CTA: "${content.cta}"

Generate repurposing options for:
1. Instagram Stories (3-5 story slides)
2. TikTok version (if original is video, adjust; if not, suggest format)
3. Email excerpt (1-2 paragraphs for weekly email)
4. Quote graphics (2-3 pullable quotes)
5. Future content hooks (variations of the hook for new content)

For each, provide:
- Format/length
- What to adapt (not just copy-paste)
- Platform-specific tweaks
- CTA adjustment if needed

Remember: Each platform has its own culture. Adapt, don't just repost.
`
}

/**
 * Generate weekly content calendar
 */
export function buildWeeklyCalendarPrompt(
  contentPool: OriginalContent[],
  weekStartDate: Date
): string {
  const platforms = SSELFIE_BRAND_BRAIN.contentStrategy.platforms

  return `
Create a weekly content calendar starting ${weekStartDate.toLocaleDateString()}.

CADENCE REQUIREMENTS:
${platforms.map((p) => `- ${p.platform}: ${p.cadence}`).join("\n")}

AVAILABLE CONTENT POOL:
${contentPool.map((c, i) => `${i + 1}. [${c.type}] ${c.pillar}: "${c.hook.substring(0, 50)}..."`).join("\n")}

PILLAR ROTATION:
${SSELFIE_BRAND_BRAIN.contentStrategy.contentPillars.map((p) => p.name).join(" → ")} → repeat

Generate a calendar with:
- Day of week
- Platform
- Content type (fresh/repurposed)
- Pillar
- Content reference (number from pool) or "Fresh"
- Best posting time
- Priority level

Guidelines:
- Balance pillars across the week
- Don't post same pillar back-to-back
- Mix fresh and repurposed
- Account for ${SSELFIE_BRAND_BRAIN.currentFocus.timeBudget} time budget
- Include at least one bottom-funnel CTA post per week
`
}

/**
 * Optimal posting times by platform
 * Based on audience: US + Nordic/European markets
 */
export const OPTIMAL_POSTING_TIMES = {
  instagram: {
    feed: ["7:00 AM EST", "12:00 PM EST", "7:00 PM EST"],
    stories: ["9:00 AM", "1:00 PM", "5:00 PM", "8:00 PM"],
    reels: ["9:00 AM EST", "12:00 PM EST", "3:00 PM EST"],
  },
  tiktok: {
    feed: ["7:00 AM EST", "10:00 AM EST", "7:00 PM EST"],
  },
  email: {
    send: ["Tuesday 10:00 AM EST", "Thursday 10:00 AM EST"],
  },
}

/**
 * Batching templates for efficient content creation
 */
export const BATCHING_TEMPLATES = {
  weekly_batch: {
    day1: {
      focus: "Planning + Research",
      tasks: [
        "Review last week's performance",
        "Identify this week's angles",
        "Pull trending sounds/formats",
      ],
      duration: "1-2 hours",
    },
    day2: {
      focus: "Writing Day",
      tasks: [
        "Write all captions for the week",
        "Draft email",
        "Create carousel copy",
      ],
      duration: "2-3 hours",
    },
    day3: {
      focus: "Recording Day",
      tasks: [
        "Film all video content",
        "Record stories in advance",
        "Shoot any static images needed",
      ],
      duration: "2-3 hours",
    },
    day4: {
      focus: "Editing + Scheduling",
      tasks: [
        "Edit videos",
        "Create graphics",
        "Schedule everything",
      ],
      duration: "2-3 hours",
    },
    daily: {
      focus: "Engagement",
      tasks: [
        "Respond to comments/DMs",
        "Post stories if not batched",
        "Engage with community",
      ],
      duration: "30-60 minutes",
    },
  },
}

/**
 * Repurposing matrix - what can become what
 */
export const REPURPOSING_MATRIX = {
  reel: {
    canBecome: [
      { format: "tiktok", effort: "low", notes: "Download, re-upload, adjust caption" },
      { format: "story_clips", effort: "low", notes: "Cut into 3-5 story segments" },
      { format: "carousel", effort: "medium", notes: "Extract key points as slides" },
      { format: "quote_graphic", effort: "low", notes: "Pull best line as static" },
      { format: "email_snippet", effort: "low", notes: "Transcribe key insight for email" },
    ],
  },
  carousel: {
    canBecome: [
      { format: "story_series", effort: "low", notes: "Post each slide as story" },
      { format: "reel", effort: "medium", notes: "Turn slides into talking points" },
      { format: "email_section", effort: "low", notes: "Expand one slide into email content" },
      { format: "tiktok_slideshow", effort: "low", notes: "Add trending sound to slides" },
    ],
  },
  email: {
    canBecome: [
      { format: "carousel", effort: "medium", notes: "Break into visual points" },
      { format: "reel_script", effort: "low", notes: "Use as talking points" },
      { format: "story_series", effort: "low", notes: "Share behind-the-scenes of topic" },
      { format: "quote_graphics", effort: "low", notes: "Pull 2-3 key lines" },
    ],
  },
  static_post: {
    canBecome: [
      { format: "story", effort: "low", notes: "Repost with poll/question" },
      { format: "reel_hook", effort: "medium", notes: "Expand caption into video" },
      { format: "email_intro", effort: "low", notes: "Use as email opener" },
    ],
  },
}

/**
 * Export agent configuration
 */
export const SCHEDULER_CONFIG = {
  agentId: "scheduler",
  name: "Scheduler & Repurposing Agent",
  description: "Turns one piece into cross-platform plan + handles scheduling",
  systemPrompt: SCHEDULER_SYSTEM_PROMPT,
  inputs: ["original_content", "content_pool", "calendar_constraints"],
  outputs: ["repurposing_plan", "weekly_calendar", "batching_schedule"],
  optimalTimes: OPTIMAL_POSTING_TIMES,
  batchingTemplates: BATCHING_TEMPLATES,
  repurposingMatrix: REPURPOSING_MATRIX,
  integrations: [
    "later", // Scheduling tool
    "planoly",
    "metricool",
    "buffer",
    "google_calendar",
  ],
}
