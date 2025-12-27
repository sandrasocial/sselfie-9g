/**
 * Loops Client Configuration
 * 
 * Official Loops SDK for email marketing automation
 * Docs: https://loops.so/docs/api-reference
 */

import { LoopsClient } from 'loops'

if (!process.env.LOOPS_API_KEY) {
  throw new Error('LOOPS_API_KEY environment variable is required')
}

export const loops = new LoopsClient(process.env.LOOPS_API_KEY)

/**
 * Check if Loops is properly configured
 */
export function isLoopsConfigured(): boolean {
  return !!process.env.LOOPS_API_KEY
}

/**
 * Loops audience/tag mappings
 * These match your Resend segments
 */
export const LOOPS_AUDIENCES = {
  ALL_SUBSCRIBERS: 'subscriber',
  STUDIO_MEMBERS: 'studio-member',
  PAID_CUSTOMERS: 'paid',
  COLD_USERS: 'cold',
  ENGAGED_USERS: 'engaged',
} as const

/**
 * Helper to get contact by email
 */
export async function getLoopsContact(email: string) {
  try {
    const contact = await loops.findContact({ email })
    return contact
  } catch (error) {
    console.error('[Loops] Error fetching contact:', error)
    return null
  }
}

/**
 * Helper to add/update contact with tags
 */
export async function upsertLoopsContact(data: {
  email: string
  firstName?: string
  lastName?: string
  userGroup?: string
  tags?: string[]
  customFields?: Record<string, any>
}) {
  try {
    const response = await loops.createContact({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      userGroup: data.userGroup || LOOPS_AUDIENCES.ALL_SUBSCRIBERS,
      source: 'sselfie-platform',
      subscribed: true,
      ...data.customFields
    })
    
    // Add tags if provided
    if (data.tags && data.tags.length > 0) {
      await loops.updateContact({
        email: data.email,
        tags: data.tags
      })
    }
    
    return response
  } catch (error) {
    console.error('[Loops] Error upserting contact:', error)
    throw error
  }
}

export default loops

