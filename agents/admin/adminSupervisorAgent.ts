import { BaseAgent } from "../core/base-agent"
import { emailTools } from "../tools/emailTools"
import { analyticsTools } from "../tools/analyticsTools"
import { contentTools } from "../tools/contentTools"
import { audienceTools } from "../tools/audienceTools"
import * as onboardingWorkflow from "../workflows/onboardingWorkflow"
import * as retentionWorkflow from "../workflows/retentionWorkflow"
import * as newsletterWorkflow from "../workflows/newsletterWorkflow"
import * as announcementWorkflow from "../workflows/announcementWorkflow"
import * as analyticsWorkflow from "../workflows/analyticsWorkflow"
import * as contentWorkflow from "../workflows/contentWorkflow"
import * as userJourneyWorkflow from "../workflows/userJourneyWorkflow"
import * as feedDesignerWorkflow from "../workflows/feedDesignerWorkflow"
import * as autoPostingWorkflow from "../workflows/autoPostingWorkflow"
import * as feedPerformanceWorkflow from "../workflows/feedPerformanceWorkflow"
import * as leadMagnetWorkflow from "../workflows/leadMagnetWorkflow"
import * as winbackWorkflow from "../workflows/winbackWorkflow"
import * as churnPreventionWorkflow from "../workflows/churnPreventionWorkflow"
import * as upgradeWorkflow from "../workflows/upgradeWorkflow"
import * as salesDashboardWorkflow from "../workflows/salesDashboardWorkflow"

const allTools = {
  ...emailTools,
  ...analyticsTools,
  ...contentTools,
  ...audienceTools,
}

/**
 * AdminSupervisorAgent
 * Top-level supervisor agent for SSELFIE administrative automation
 * Handles business management, analytics, email campaigns, and strategic decisions
 */
export class AdminSupervisorAgent extends BaseAgent {
  constructor() {
    super({
      name: "AdminSupervisor",
      description:
        "Top-level supervisor agent for SSELFIE administrative automation. Handles business management, analytics, email campaigns, user insights, and strategic decision-making for Sandra's business operations.",
      systemPrompt: `You are the Admin Supervisor Agent for the SSELFIE platform. Your role is to act as Sandra's internal COO and strategic automation brain.

Your responsibilities:
- Monitor user behavior via analytics tools.
- Identify trends in activation, engagement, churn risk, and revenue.
- Determine when to run marketing workflows, then delegate tasks to the MarketingAutomationAgent.
- Manage internal automations safely and without interfering with any user-facing features such as Maya.
- Create summaries, insights, and action plans based on analytics and audience segmentation.
- Decide which tool to use and when to call it.
- Output clear reasoning and structured results.

Critical rules:
- NEVER attempt to modify or interfere with Maya or any user-facing flows.
- NEVER attempt to generate images, photoshoots, videos, or concepts. Those belong to Maya.
- ONLY use the tools mounted to you.
- If a tool is missing or unsupported, respond with a safe fallback message.
- You are not a user-facing agent. You only assist Sandra internally.

Tone:
Professional, concise, analytical, strategic. No emojis.`,
      tools: allTools,
      model: "anthropic/claude-sonnet-4",
    })
  }
}

/**
 * Factory function to create AdminSupervisorAgent
 */
export function createAdminSupervisorAgent(): AdminSupervisorAgent {
  return new AdminSupervisorAgent()
}

/**
 * Singleton instance for use across the application
 */
export const adminSupervisorAgent = new AdminSupervisorAgent()

/**
 * Triggers the onboarding workflow for a new user
 * @param userId - The user ID to trigger onboarding for
 * @returns Workflow result
 */
export async function triggerOnboardingWorkflow(userId: string) {
  console.log(`[AdminSupervisor] Triggering onboarding workflow for user: ${userId}`)
  return await onboardingWorkflow.runWorkflow({ userId })
}

/**
 * Triggers the retention workflow for an inactive/at-risk user
 * @param userId - The user ID to re-engage
 * @returns Workflow result
 */
export async function triggerRetentionWorkflow(userId: string) {
  console.log(`[AdminSupervisor] Triggering retention workflow for user: ${userId}`)
  return await retentionWorkflow.runWorkflow({ userId })
}

/**
 * Triggers the newsletter workflow
 * @param payload - Newsletter configuration (audience, content context, etc.)
 * @returns Workflow result
 */
export async function triggerNewsletterWorkflow(payload: {
  userId: string
  context?: any
}) {
  console.log(`[AdminSupervisor] Triggering newsletter workflow`, payload)
  return await newsletterWorkflow.runWorkflow(payload)
}

/**
 * Triggers the announcement workflow for platform updates
 * @param payload - Announcement configuration (title, description, target segment, schedule)
 * @returns Workflow result
 */
export async function triggerAnnouncementWorkflow(payload: {
  title: string
  description: string
  targetSegment?: string
  generateImage?: boolean
  scheduleDate?: string
}) {
  console.log(`[AdminSupervisor] Triggering announcement workflow`, payload)
  return await announcementWorkflow.runWorkflow(payload)
}

/**
 * Triggers the analytics workflow to generate weekly performance summary
 * @param payload - Analytics configuration (optional adminEmail override)
 * @returns Workflow result
 */
export async function triggerAnalyticsWorkflow(payload?: {
  adminEmail?: string
}) {
  console.log(`[AdminSupervisor] Triggering analytics workflow`, payload)
  return await analyticsWorkflow.runWorkflow(payload || {})
}

/**
 * Triggers the content workflow to generate daily content for Sandra
 * @param payload - Content configuration (topic, content type, context)
 * @returns Workflow result with draft ID
 */
export async function triggerContentWorkflow(payload?: {
  topic?: string
  contentType?: "reel" | "carousel" | "story" | "hook" | "caption" | "auto"
  context?: any
}) {
  console.log(`[AdminSupervisor] Triggering content workflow`, payload)
  return await contentWorkflow.runWorkflow(payload || {})
}

/**
 * Triggers the user journey workflow to evaluate and message users
 * @param payload - Journey configuration (optional userId for single user processing)
 * @returns Workflow result with processed users count
 */
export async function triggerJourneyWorkflow(payload?: {
  userId?: string
  batchSize?: number
}) {
  console.log(`[AdminSupervisor] Triggering user journey workflow`, payload)
  return await userJourneyWorkflow.runWorkflow(payload || {})
}

/**
 * Triggers the feed designer workflow to analyze a user's feed
 * @param payload - Feed analysis configuration (userId, feedId)
 * @returns Workflow result with design recommendations
 */
export async function triggerFeedDesignerWorkflow(payload: {
  userId: string
  feedId: number
}) {
  console.log(`[AdminSupervisor] Triggering feed designer workflow`, payload)
  return await feedDesignerWorkflow.runWorkflow(payload)
}

/**
 * Triggers the auto-posting workflow to queue scheduled posts
 * @param payload - Posting configuration (optional userId, feedPostId)
 * @returns Workflow result with queued posts count
 */
export async function triggerAutoPostingWorkflow(payload?: {
  userId?: string
  feedPostId?: number
}) {
  console.log(`[AdminSupervisor] Triggering auto-posting workflow`, payload)
  return await autoPostingWorkflow.runWorkflow(payload || {})
}

/**
 * Triggers the feed performance workflow to generate insights
 * @param payload - Performance analysis configuration (userId, feedId)
 * @returns Workflow result with insights and recommendations
 */
export async function triggerFeedPerformanceWorkflow(payload: {
  userId: string
  feedId: number
}) {
  console.log(`[AdminSupervisor] Triggering feed performance workflow`, payload)
  return await feedPerformanceWorkflow.runWorkflow(payload)
}

/**
 * Triggers the lead magnet workflow for new user acquisition
 */
export async function triggerLeadMagnetWorkflow(payload: {
  userId: string
  userEmail: string
  userName?: string
  magnetType: string
  source?: string
}) {
  console.log(`[AdminSupervisor] Triggering lead magnet workflow`, payload)
  return await leadMagnetWorkflow.runWorkflow(payload)
}

/**
 * Triggers the winback workflow for inactive users
 */
export async function triggerWinbackWorkflow(payload?: {
  userId?: string
  daysSinceActivity?: number
  batchSize?: number
}) {
  console.log(`[AdminSupervisor] Triggering winback workflow`, payload)
  return await winbackWorkflow.runWorkflow(payload || {})
}

/**
 * Triggers the churn prevention workflow for subscription events
 */
export async function triggerChurnPreventionWorkflow(payload: {
  userId: string
  eventType: "payment_failed" | "renewal_upcoming" | "cancellation" | "downgrade"
  metadata?: Record<string, any>
}) {
  console.log(`[AdminSupervisor] Triggering churn prevention workflow`, payload)
  return await churnPreventionWorkflow.runWorkflow(payload)
}

/**
 * Triggers the upgrade workflow to detect and convert upgrade opportunities
 */
export async function triggerUpgradeWorkflow(payload?: {
  userId?: string
  batchSize?: number
}) {
  console.log(`[AdminSupervisor] Triggering upgrade workflow`, payload)
  return await upgradeWorkflow.runWorkflow(payload || {})
}

/**
 * Triggers the sales dashboard workflow to generate weekly insights
 */
export async function triggerSalesDashboardWorkflow(payload?: {
  adminEmail?: string
  sendEmail?: boolean
}) {
  console.log(`[AdminSupervisor] Triggering sales dashboard workflow`, payload)
  return await salesDashboardWorkflow.runWorkflow(payload || {})
}
