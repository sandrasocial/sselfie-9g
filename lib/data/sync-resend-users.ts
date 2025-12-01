/**
 * Resend Audience Synchronization
 * Fetches subscribers from Resend Audience API and syncs to marketing_subscribers table
 */

import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)

// Lazy Resend client
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export interface SyncResult {
  success: boolean
  synced: number
  updated: number
  errors: string[]
}

/**
 * Sync subscribers from Resend Audience API to marketing_subscribers table
 * Links to existing users by email when possible
 */
export async function syncResendAudience(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    updated: 0,
    errors: [],
  }

  try {
    const resend = getResendClient()

    console.log("[ResendSync] Fetching subscribers from Resend Audience API...")

    // Fetch all contacts from Resend Audience
    const audienceId = process.env.RESEND_AUDIENCE_ID

    if (!audienceId) {
      throw new Error("RESEND_AUDIENCE_ID is not configured")
    }

    console.log(`[ResendSync] Fetching contacts from audience: ${audienceId}`)

    const response = await resend.contacts.list({
      audienceId,
    })

    if (response.error) {
      throw new Error(`Resend API error: ${response.error.message}`)
    }

    // Resend returns { data: { data: [...] } }
    const allContacts = response.data?.data || []

    console.log(`[ResendSync] Fetched ${allContacts.length} contacts from Resend`)

    // Sync each contact to marketing_subscribers
    for (const contact of allContacts) {
      try {
        const email = contact.email
        const resendId = contact.id

        if (!email) {
          result.errors.push(`Contact missing email: ${JSON.stringify(contact)}`)
          continue
        }

        // Check if user exists in users table by email
        const userResult = await sql`
          SELECT id FROM users WHERE email = ${email} LIMIT 1
        `

        const userId = userResult.length > 0 ? userResult[0].id : null

        // Insert or update in marketing_subscribers
        const existing = await sql`
          SELECT id FROM marketing_subscribers WHERE email = ${email} LIMIT 1
        `

        if (existing.length > 0) {
          // Update existing
          await sql`
            UPDATE marketing_subscribers
            SET 
              resend_id = ${resendId || null},
              user_id = ${userId || null},
              updated_at = NOW(),
              synced_at = NOW()
            WHERE email = ${email}
          `
          result.updated++
        } else {
          // Insert new
          await sql`
            INSERT INTO marketing_subscribers (
              email,
              resend_id,
              user_id,
              created_at,
              updated_at,
              synced_at
            )
            VALUES (
              ${email},
              ${resendId || null},
              ${userId || null},
              NOW(),
              NOW(),
              NOW()
            )
          `
          result.synced++
        }
      } catch (error) {
        const errorMsg = `Error syncing contact ${contact.email}: ${error instanceof Error ? error.message : "Unknown error"}`
        result.errors.push(errorMsg)
        console.error("[ResendSync]", errorMsg)
      }
    }

    console.log(
      `[ResendSync] Sync complete: ${result.synced} new, ${result.updated} updated, ${result.errors.length} errors`,
    )

    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[ResendSync] Fatal error:", errorMsg)
    result.success = false
    result.errors.push(errorMsg)
    return result
  }
}

/**
 * Get all subscribers from marketing_subscribers table
 */
export async function getAllSubscribers(): Promise<
  Array<{ email: string; userId: string | null; resendId: string | null }>
> {
  try {
    const result = await sql`
      SELECT email, user_id, resend_id
      FROM marketing_subscribers
      ORDER BY created_at DESC
    `

    return result.map((row) => ({
      email: row.email,
      userId: row.user_id || null,
      resendId: row.resend_id || null,
    }))
  } catch (error) {
    console.error("[ResendSync] Error getting subscribers:", error)
    return []
  }
}

