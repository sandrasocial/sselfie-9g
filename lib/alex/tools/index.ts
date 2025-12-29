/**
 * Tools Index
 * Exports all tools for use in the main route
 */

import type { Tool } from '../types'
import { registerToolHandler } from '../handlers/tool-executor'

// Email tools
import { composeEmailDraftTool } from './email/compose-email-draft'
import { editEmailTool } from './email/edit-email'
import { sendResendEmailTool } from './email/send-resend-email'
import { sendBroadcastToSegmentTool } from './email/send-broadcast-to-segment'
import { getEmailCampaignTool } from './email/get-email-campaign'
import { listEmailDraftsTool } from './email/list-email-drafts'
import { checkCampaignStatusTool } from './email/check-campaign-status'
import { createEmailSequencePlanTool } from './email/create-email-sequence-plan'
import { recommendSendTimingTool } from './email/recommend-send-timing'
import { getEmailTimelineTool } from './email/get-email-timeline'
import { getResendAudienceDataTool } from './email/get-resend-audience-data'
import { createEmailSequenceTool } from './email/create-email-sequence'
import { createResendAutomationSequenceTool } from './email/create-resend-automation-sequence'
import { scheduleResendAutomationTool } from './email/schedule-resend-automation'
import { getResendAutomationStatusTool } from './email/get-resend-automation-status'
import { analyzeEmailStrategyTool } from './email/analyze-email-strategy'

// Analytics tools
import { getRevenueMetricsTool } from './analytics/get-revenue-metrics'
import { getPlatformAnalyticsTool } from './analytics/get-platform-analytics'
import { getBusinessInsightsTool } from './analytics/get-business-insights'
import { getContentPerformanceTool } from './analytics/get-content-performance'
import { getEmailRecommendationsTool } from './analytics/get-email-recommendations'
import { researchContentStrategyTool } from './analytics/research-content-strategy'
import { getBrandStrategyTool } from './analytics/get-brand-strategy'

// Content tools
import { createInstagramCaptionTool } from './content/create-instagram-caption'
import { createContentCalendarTool } from './content/create-content-calendar'
import { suggestMayaPromptsTool } from './content/suggest-maya-prompts'
import { readCodebaseFileTool } from './content/read-codebase-file'

// Business tools
import { getTestimonialsTool } from './business/get-testimonials'
import { getPromptGuidesTool } from './business/get-prompt-guides'
import { updatePromptGuideTool } from './business/update-prompt-guide'
import { getSandraJournalTool } from './business/get-sandra-journal'

// Automation tools
import { createAutomationTool } from './automation/create-automation'
import { webSearchTool } from './automation/web-search'

// Historical tools
import { markEmailSentTool } from './historical/mark-email-sent'
import { recordEmailAnalyticsTool } from './historical/record-email-analytics'

// Collect all tools
export const allTools: Tool[] = [
  // Email tools
  composeEmailDraftTool,
  editEmailTool,
  sendResendEmailTool,
  sendBroadcastToSegmentTool,
  getEmailCampaignTool,
  listEmailDraftsTool,
  checkCampaignStatusTool,
  createEmailSequencePlanTool,
  recommendSendTimingTool,
  getEmailTimelineTool,
  getResendAudienceDataTool,
  createEmailSequenceTool,
  createResendAutomationSequenceTool,
  scheduleResendAutomationTool,
  getResendAutomationStatusTool,
  analyzeEmailStrategyTool,

  // Analytics tools
  getRevenueMetricsTool,
  getPlatformAnalyticsTool,
  getBusinessInsightsTool,
  getContentPerformanceTool,
  getEmailRecommendationsTool,
  researchContentStrategyTool,
  getBrandStrategyTool,

  // Content tools
  createInstagramCaptionTool,
  createContentCalendarTool,
  suggestMayaPromptsTool,
  readCodebaseFileTool,

  // Business tools
  getTestimonialsTool,
  getPromptGuidesTool,
  updatePromptGuideTool,
  getSandraJournalTool,

  // Automation tools
  createAutomationTool,
  webSearchTool,

  // Historical tools
  markEmailSentTool,
  recordEmailAnalyticsTool
]

// Register handlers for tool executor
allTools.forEach(tool => {
  registerToolHandler(tool.name, tool.execute)
})

// Export tool definitions in Anthropic format
export const toolDefinitions = allTools.map(tool => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.input_schema
}))


