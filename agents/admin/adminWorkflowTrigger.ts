/**
 * AdminWorkflowTrigger
 * Handles all workflow triggering for admin operations
 * Extracted from AdminSupervisorAgent for single responsibility
 */

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

/**
 * Triggers the onboarding workflow for a new user
 * @param userId - The user ID to trigger onboarding for
 * @returns Workflow result
 */
export async function triggerOnboardingWorkflow(userId: string) {
  console.log(`[AdminWorkflowTrigger] Triggering onboarding workflow for user: ${userId}`)
  return await onboardingWorkflow.runWorkflow({ userId })
}

/**
 * Triggers the retention workflow for an inactive/at-risk user
 * @param userId - The user ID to re-engage
 * @returns Workflow result
 */
export async function triggerRetentionWorkflow(userId: string) {
  console.log(`[AdminWorkflowTrigger] Triggering retention workflow for user: ${userId}`)
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
  console.log(`[AdminWorkflowTrigger] Triggering newsletter workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering announcement workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering analytics workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering content workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering user journey workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering feed designer workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering auto-posting workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering feed performance workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering lead magnet workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering winback workflow`, payload)
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
  console.log(`[AdminWorkflowTrigger] Triggering churn prevention workflow`, payload)
  return await churnPreventionWorkflow.runWorkflow(payload)
}

/**
 * Triggers the upgrade workflow to detect and convert upgrade opportunities
 */
export async function triggerUpgradeWorkflow(payload?: {
  userId?: string
  batchSize?: number
}) {
  console.log(`[AdminWorkflowTrigger] Triggering upgrade workflow`, payload)
  return await upgradeWorkflow.runWorkflow(payload || {})
}

/**
 * Triggers the sales dashboard workflow to generate weekly insights
 */
export async function triggerSalesDashboardWorkflow(payload?: {
  adminEmail?: string
  sendEmail?: boolean
}) {
  console.log(`[AdminWorkflowTrigger] Triggering sales dashboard workflow`, payload)
  return await salesDashboardWorkflow.runWorkflow(payload || {})
}

