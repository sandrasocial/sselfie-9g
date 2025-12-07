/**
 * Audience Segmentation Helper
 * 
 * Core functions for segmenting Resend contacts based on Neon database data.
 * Uses tags to mark contacts with segment information.
 */

import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { updateContactTags as updateResendContactTags, type ContactTags, addContactToSegment } from "@/lib/resend/manage-contact"
import { getAudienceContacts } from "@/lib/resend/get-audience-contacts"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)
const audienceId = process.env.RESEND_AUDIENCE_ID!

export interface SegmentResult {
  email: string
  segments: {
    all_subscribers: boolean
    beta_users: boolean
    paid_users: boolean
    cold_users: boolean
  }
  reasoning: {
    beta_users?: string
    paid_users?: string
    cold_users?: string
  }
  tagsUpdated: boolean
  error?: string
}

/**
 * Fetch all contacts from Resend audience
 */
export async function getAllResendContacts(): Promise<Array<{ email: string; id: string; tags?: any[] }>> {
  try {
    if (!process.env.RESEND_API_KEY || !audienceId) {
      throw new Error("Resend not configured")
    }

    console.log("[v0] Fetching all contacts from Resend audience:", audienceId)
    const contacts = await getAudienceContacts(audienceId)
    
    return contacts.map((contact: any) => ({
      email: contact.email,
      id: contact.id,
      tags: contact.tags || [],
    }))
  } catch (error) {
    console.error("[v0] Error fetching Resend contacts:", error)
    throw error
  }
}

/**
 * Identify beta users from Neon database
 * Beta users: subscriptions with product_type = 'sselfie_studio_membership' AND is_test_mode = FALSE
 */
export async function identifyBetaUsers(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set()

  try {
    if (emails.length <= 5) {
      console.log(`[v0] [identifyBetaUsers] Searching for ${emails.length} email(s):`, emails)
    }
    
    const betaUsers = await sql`
      SELECT DISTINCT u.email
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id
      WHERE s.product_type = 'sselfie_studio_membership'
        AND s.is_test_mode = FALSE
        AND s.status = 'active'
        AND u.email = ANY(${emails})
    `

    const betaEmails = new Set(betaUsers.map((u: any) => u.email).filter(Boolean))
    if (emails.length <= 5) {
      console.log(`[v0] [identifyBetaUsers] Raw query result:`, betaUsers)
      console.log(`[v0] Beta user emails:`, Array.from(betaEmails))
    }
    console.log(`[v0] Identified ${betaEmails.size} beta users from ${emails.length} emails`)
    return betaEmails
  } catch (error) {
    console.error("[v0] Error identifying beta users:", error)
    return new Set()
  }
}

/**
 * Identify paid users from Neon database
 * Paid users: active subscriptions OR credit_transactions with purchase
 */
export async function identifyPaidUsers(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set()

  try {
    if (emails.length <= 5) {
      console.log(`[v0] [identifyPaidUsers] Searching for ${emails.length} email(s):`, emails)
    }
    
    const paidUsers = await sql`
      SELECT DISTINCT u.email
      FROM users u
      WHERE (
        EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id
            AND s.is_test_mode = FALSE
            AND s.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM credit_transactions ct
          WHERE ct.user_id = u.id
            AND ct.transaction_type = 'purchase'
            AND ct.amount > 0
            AND ct.is_test_mode = FALSE
        )
      )
      AND u.email = ANY(${emails})
    `

    const paidEmails = new Set(paidUsers.map((u: any) => u.email).filter(Boolean))
    if (emails.length <= 5) {
      console.log(`[v0] [identifyPaidUsers] Raw query result:`, paidUsers)
      console.log(`[v0] Paid user emails:`, Array.from(paidEmails))
    }
    console.log(`[v0] Identified ${paidEmails.size} paid users from ${emails.length} emails`)
    return paidEmails
  } catch (error) {
    console.error("[v0] Error identifying paid users:", error)
    return new Set()
  }
}

/**
 * Identify cold users (no email activity in last 30 days)
 * Uses email_logs table to check for recent email sends
 */
export async function identifyColdUsers(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set()

  try {
    // Find emails that have NO email_logs entries in the last 30 days
    const activeUsers = await sql`
      SELECT DISTINCT user_email
      FROM email_logs
      WHERE user_email = ANY(${emails})
        AND sent_at > NOW() - INTERVAL '30 days'
    `

    const activeEmails = new Set(activeUsers.map((u: any) => u.user_email).filter(Boolean))
    const allEmails = new Set(emails)
    
    // Cold users = all emails minus active emails
    const coldEmails = new Set([...allEmails].filter(email => !activeEmails.has(email)))
    
    console.log(`[v0] Identified ${coldEmails.size} cold users from ${emails.length} emails (${activeEmails.size} active)`)
    return coldEmails
  } catch (error) {
    console.error("[v0] Error identifying cold users:", error)
    return new Set()
  }
}

/**
 * Update contact segments in Resend
 * Uses Resend segments (more reliable than tags)
 */
export async function updateContactTags(email: string, segments: {
  all_subscribers: boolean
  beta_users: boolean
  paid_users: boolean
  cold_users: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY || !audienceId) {
      return { success: false, error: "Resend not configured" }
    }

    // Segment IDs (from user's provided IDs)
    const allSubscribersSegmentId = "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"
    const betaUsersSegmentId = "31080fb1-e957-4b41-af72-6f042e4fa869"
    const paidUsersSegmentId = "f7ed7f32-b103-400a-a8e8-ddbbe0e4d97b"
    const coldUsersSegmentId = "e515e2d6-1f0e-4a4c-beec-323b8758be61"

    const errors: string[] = []
    const successes: string[] = []

    // Add to segments using the existing helper function
    // Rate limit: Resend allows 2 requests/second, so we need at least 500ms between requests
    if (segments.all_subscribers) {
      const result = await addContactToSegment(email, allSubscribersSegmentId)
      if (result.success) {
        successes.push("all_subscribers")
      } else {
        errors.push(`all_subscribers: ${result.error}`)
      }
      // Rate limiting: 500ms delay between segment additions (2 requests/second = 500ms each)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (segments.beta_users) {
      const result = await addContactToSegment(email, betaUsersSegmentId)
      if (result.success) {
        successes.push("beta_users")
      } else {
        errors.push(`beta_users: ${result.error}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (segments.paid_users) {
      const result = await addContactToSegment(email, paidUsersSegmentId)
      if (result.success) {
        successes.push("paid_users")
      } else {
        errors.push(`paid_users: ${result.error}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (segments.cold_users) {
      const result = await addContactToSegment(email, coldUsersSegmentId)
      if (result.success) {
        successes.push("cold_users")
      } else {
        errors.push(`cold_users: ${result.error}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log(`[v0] Successfully added ${email} to segments:`, successes)
    if (errors.length > 0) {
      console.warn(`[v0] Some segment additions failed:`, errors)
    }

    // Return success if at least one segment was added, or if all requested segments succeeded
    if (successes.length > 0 || errors.length === 0) {
      return { success: true }
    }

    return { success: false, error: errors.join("; ") }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error(`[v0] Exception updating segments for ${email}:`, error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Run segmentation for a list of emails
 * Returns detailed results for each email
 */
export async function runSegmentationForEmails(emails: string[]): Promise<SegmentResult[]> {
  if (emails.length === 0) {
    return []
  }

  // Only log emails for small batches (debugging)
  if (emails.length <= 5) {
    console.log(`[v0] Running segmentation for ${emails.length} email(s):`, emails)
  } else {
    console.log(`[v0] Running segmentation for ${emails.length} email(s)`)
  }

  // Identify segments from database
  const [betaUsers, paidUsers, coldUsers] = await Promise.all([
    identifyBetaUsers(emails),
    identifyPaidUsers(emails),
    identifyColdUsers(emails),
  ])

  // Only log detailed results for small batches
  if (emails.length <= 5) {
    console.log(`[v0] [runSegmentationForEmails] Segment results:`)
    console.log(`[v0]   Beta users:`, Array.from(betaUsers))
    console.log(`[v0]   Paid users:`, Array.from(paidUsers))
    console.log(`[v0]   Cold users:`, Array.from(coldUsers))
  } else {
    console.log(`[v0] [runSegmentationForEmails] Identified: ${betaUsers.size} beta, ${paidUsers.size} paid, ${coldUsers.size} cold`)
  }

  // Process each email
  const results: SegmentResult[] = []

  for (const email of emails) {
    const segments = {
      all_subscribers: true, // All contacts are subscribers
      beta_users: betaUsers.has(email),
      paid_users: paidUsers.has(email),
      cold_users: coldUsers.has(email),
    }

    const reasoning: SegmentResult["reasoning"] = {}
    
    if (!segments.beta_users) {
      reasoning.beta_users = "Not found in beta users query (no active sselfie_studio_membership subscription)"
    } else {
      reasoning.beta_users = "Found active sselfie_studio_membership subscription"
    }

    if (!segments.paid_users) {
      reasoning.paid_users = "No active subscription or purchase found"
    } else {
      reasoning.paid_users = "Found active subscription or purchase"
    }

    if (!segments.cold_users) {
      reasoning.cold_users = "Has email activity in last 30 days"
    } else {
      reasoning.cold_users = "No email activity in last 30 days"
    }

    // Update tags in Resend
    const updateResult = await updateContactTags(email, segments)

    results.push({
      email,
      segments,
      reasoning,
      tagsUpdated: updateResult.success,
      error: updateResult.error,
    })

    // Small delay to avoid rate limiting
    if (emails.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return results
}

