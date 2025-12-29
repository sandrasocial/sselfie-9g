/**
 * Shared dependencies for Alex tools
 */

import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { buildEmailSystemPrompt } from "@/lib/admin/email-brand-guidelines"

// Database connection
export const sql = neon(process.env.DATABASE_URL!)

// Resend client - initialized if API key exists
let resendClient: Resend | null = null
try {
  if (process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
} catch (error) {
  console.error("[Alex] ⚠️ Failed to initialize Resend client:", error)
}

export const resend = resendClient

// Helper function to strip HTML tags
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// Export email system prompt builder
export { buildEmailSystemPrompt } from '@/lib/admin/email-brand-guidelines'

// Export Anthropic client
import { Anthropic } from '@anthropic-ai/sdk'
export { Anthropic }

// Export helpers
export * from './helpers'

// Export getAudienceContacts helper
export { getAudienceContacts } from '@/lib/resend/get-audience-contacts'

// Export email content generator
export { generateEmailContent } from './email-content-generator'
export type { GenerateEmailContentParams, GeneratedEmailContent } from './email-content-generator'

// Export constants
export { ALEX_CONSTANTS } from '../constants'

