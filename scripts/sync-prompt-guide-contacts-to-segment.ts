/**
 * Sync existing prompt guide subscribers to Resend segment
 * 
 * This script finds all contacts in the database who subscribed to prompt guides
 * and ensures they are added to the Free Prompt Guide segment in Resend.
 * 
 * Segment ID: b25764ce-1f17-4869-9859-546cf9729355
 */

import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables")
  process.exit(1)
}

if (!process.env.RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY not found in environment variables")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const resend = new Resend(process.env.RESEND_API_KEY)
const FREE_PROMPT_GUIDE_SEGMENT_ID = "b25764ce-1f17-4869-9859-546cf9729355"

// Import functions after env is loaded
async function addOrUpdateResendContact(
  email: string,
  firstName: string | null,
  tags: Record<string, string>
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const audienceId = process.env.RESEND_AUDIENCE_ID
    if (!audienceId) {
      return { success: false, error: "RESEND_AUDIENCE_ID not configured" }
    }

    const formattedTags = Object.entries(tags)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([name, value]) => ({ name, value }))

    const { data, error } = await resend.contacts.create({
      email,
      firstName: firstName || undefined,
      audienceId,
      tags: formattedTags as any,
    })

    if (error) {
      // Try to update if exists
      const { data: updateData, error: updateError } = await resend.contacts.update({
        email,
        audienceId,
        tags: formattedTags as any,
      })

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      return { success: true, contactId: updateData?.id }
    }

    return { success: true, contactId: data?.id }
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" }
  }
}

async function addContactToSegment(
  email: string,
  segmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const audienceId = process.env.RESEND_AUDIENCE_ID
    if (!audienceId) {
      return { success: false, error: "RESEND_AUDIENCE_ID not configured" }
    }

    const { error } = await (resend.contacts.segments as any).add({
      email,
      segmentId,
      audienceId,
    })

    if (error) {
      if (error.message?.includes("already") || error.message?.includes("duplicate")) {
        return { success: true }
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" }
  }
}

async function syncContactsToSegment() {
  console.log("[Sync] Starting sync of prompt guide contacts to Resend segment...")
  console.log(`[Sync] Target segment ID: ${FREE_PROMPT_GUIDE_SEGMENT_ID}`)

  try {
    // Get all prompt guide subscribers from database
    const subscribers = await sql`
      SELECT DISTINCT email, name, source, email_tags, created_at
      FROM freebie_subscribers
      WHERE source = 'prompt-guide'
         OR 'prompt-guide-subscriber' = ANY(email_tags)
         OR email_tags && ARRAY['prompt-guide-subscriber', 'christmas-prompts-2025', 'prompt-guide']::text[]
      ORDER BY created_at DESC
    `

    console.log(`[Sync] Found ${subscribers.length} prompt guide subscribers in database`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const subscriber of subscribers) {
      try {
        const email = subscriber.email
        const name = subscriber.name || email.split("@")[0]
        const firstName = name.split(" ")[0] || name

        console.log(`[Sync] Processing: ${email}`)

        // First, ensure contact exists in Resend with proper tags
        const emailTags = subscriber.email_tags || []
        const emailListTag = emailTags.find((tag: string) => 
          tag.includes("christmas") || tag.includes("prompt-guide")
        ) || "prompt-guide"

        const contactResult = await addOrUpdateResendContact(email, firstName, {
          source: "prompt-guide-subscriber",
          status: "lead",
          product: emailListTag,
          journey: "nurture",
        })

        if (!contactResult.success) {
          console.warn(`[Sync] ⚠️ Failed to add/update contact ${email}: ${contactResult.error}`)
          errorCount++
          errors.push(`${email}: Failed to add/update contact - ${contactResult.error}`)
          continue
        }

        // Add to segment
        const segmentResult = await addContactToSegment(email, FREE_PROMPT_GUIDE_SEGMENT_ID)

        if (segmentResult.success) {
          console.log(`[Sync] ✅ Added ${email} to segment`)
          successCount++
        } else {
          // If already in segment, that's fine
          if (segmentResult.error?.includes("already") || segmentResult.error?.includes("duplicate")) {
            console.log(`[Sync] ✓ ${email} already in segment`)
            successCount++
          } else {
            console.warn(`[Sync] ⚠️ Failed to add ${email} to segment: ${segmentResult.error}`)
            errorCount++
            errors.push(`${email}: Failed to add to segment - ${segmentResult.error}`)
          }
        }

        // Rate limiting: wait 600ms between requests
        await new Promise((resolve) => setTimeout(resolve, 600))

      } catch (error: any) {
        console.error(`[Sync] ❌ Error processing ${subscriber.email}:`, error.message)
        errorCount++
        errors.push(`${subscriber.email}: ${error.message}`)
      }
    }

    console.log("\n[Sync] ===== SYNC COMPLETE =====")
    console.log(`[Sync] Total subscribers: ${subscribers.length}`)
    console.log(`[Sync] Successfully synced: ${successCount}`)
    console.log(`[Sync] Errors: ${errorCount}`)

    if (errors.length > 0) {
      console.log("\n[Sync] Errors:")
      errors.forEach((error) => console.log(`  - ${error}`))
    }

    return {
      total: subscribers.length,
      success: successCount,
      errors: errorCount,
      errorList: errors,
    }
  } catch (error) {
    console.error("[Sync] Fatal error:", error)
    throw error
  }
}

// Run the sync
if (require.main === module) {
  syncContactsToSegment()
    .then((result) => {
      console.log("\n[Sync] ✅ Sync completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("\n[Sync] ❌ Sync failed:", error)
      process.exit(1)
    })
}

export { syncContactsToSegment }

