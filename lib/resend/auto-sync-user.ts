/**
 * Auto-sync user to Resend when created or updated
 * Called from getOrCreateNeonUser and other signup flows
 */
import { Resend } from "resend"
import { sql } from "@/lib/db/client"

const AUDIENCE_ID = "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"
const resend = new Resend(process.env.RESEND_API_KEY!)

export interface ResendSyncOptions {
  source?: "app_signup" | "app_update" | "admin_create"
  isStudioMember?: boolean
  subscriptionProduct?: string
}

/**
 * Automatically sync a new app user to Resend audience.
 * Non-blocking: failures won't block user signup.
 *
 * Retries up to 3 times with exponential backoff (500 ms, 1 s, 2 s) so that
 * transient Resend rate-limits or network blips don't silently drop signups
 * from the audience. Previously silent failures caused 200+ users to be
 * missing from the Resend audience entirely.
 */
export async function autoSyncUserToResend(
  email: string,
  firstName: string | null | undefined,
  options: ResendSyncOptions = {}
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[RESEND-SYNC] RESEND_API_KEY not configured")
    return { success: false, error: "API key not configured" }
  }

  if (!email) {
    return { success: false, error: "Email required" }
  }

  // Block test/fake emails from ever entering the Resend audience
  const TEST_EMAIL_PATTERN =
    /(@example\.|@test\.|@test\.local|@playwright\.test|sselfie-smoke\.test|sselfie-studio\.internal|@yopmail\.|@mailinator\.|@guerrillamail\.|@trashmail\.|@tempmail\.|@sharklasers\.|@spam4\.|codex-|codex\.|stripe@example|test@sselfie)/i
  if (TEST_EMAIL_PATTERN.test(email)) {
    console.log(`[RESEND-SYNC] Skipping test email: ${email}`)
    return { success: false, error: "Test email blocked" }
  }

  const { source = "app_signup", isStudioMember = false, subscriptionProduct } = options

  const tags: Array<{ name: string; value: string }> = [{ name: "source", value: source }]

  if (isStudioMember) {
    tags.push({ name: "product", value: "studio_member_active" })
    if (subscriptionProduct) {
      tags.push({ name: "subscription_product", value: subscriptionProduct })
    }
  } else {
    tags.push({ name: "status", value: "active" })
  }

  const properties = Object.fromEntries(tags.map((tag) => [tag.name, tag.value]))

  const MAX_ATTEMPTS = 3
  const BACKOFF_MS = [500, 1000, 2000]

  let lastError: string = "unknown"

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await resend.contacts.create({
        email,
        firstName: firstName || undefined,
        audienceId: AUDIENCE_ID,
        properties,
      })

      if (error) {
        lastError = error.message
        const isRetryable = error.message?.includes("rate") || error.message?.includes("429") || error.message?.includes("timeout")
        if (isRetryable && attempt < MAX_ATTEMPTS) {
          console.warn(`[RESEND-SYNC] Attempt ${attempt} failed for ${email} (retryable): ${error.message}`)
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]))
          continue
        }
        console.error(`[RESEND-SYNC] Failed to sync ${email} (attempt ${attempt}): ${error.message}`)
        return { success: false, error: error.message }
      }

      if (attempt > 1) {
        console.log(`[RESEND-SYNC] ✓ Synced ${email} to Resend (${source}) after ${attempt} attempts`)
      } else {
        console.log(`[RESEND-SYNC] ✓ Synced ${email} to Resend (${source})`)
      }
      return { success: true, contactId: data?.id }
    } catch (err) {
      lastError = String(err)
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[RESEND-SYNC] Attempt ${attempt} threw for ${email}: ${lastError}`)
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]))
      } else {
        console.error(`[RESEND-SYNC] All ${MAX_ATTEMPTS} attempts failed for ${email}: ${lastError}`)
      }
    }
  }

  // All retries exhausted — write to persistent queue so the weekly
  // sync-audience-segments cron can retry this user automatically.
  try {
    await sql`
      INSERT INTO resend_sync_queue (email, first_name, source, is_studio_member, subscription_product, attempts, last_attempted_at, status)
      VALUES (
        ${email},
        ${firstName || null},
        ${source},
        ${isStudioMember},
        ${subscriptionProduct || null},
        ${MAX_ATTEMPTS},
        NOW(),
        'pending'
      )
      ON CONFLICT (email, status) DO UPDATE SET
        attempts = resend_sync_queue.attempts + 1,
        last_attempted_at = NOW()
      WHERE resend_sync_queue.status = 'pending'
    `
    console.warn(`[RESEND-SYNC] Queued ${email} for retry after ${MAX_ATTEMPTS} failed attempts`)
  } catch (queueErr) {
    console.error(`[RESEND-SYNC] Failed to queue ${email} for retry:`, queueErr)
  }

  return { success: false, error: lastError }
}

/**
 * Drain the persistent retry queue — called by the weekly sync-audience-segments cron.
 * Retries all pending entries up to a maximum of 10 total attempts before giving up.
 */
export async function drainResendSyncQueue(): Promise<{ retried: number; resolved: number; abandoned: number }> {
  const result = { retried: 0, resolved: 0, abandoned: 0 }

  try {
    const pending = await sql`
      SELECT id, email, first_name, source, is_studio_member, subscription_product, attempts
      FROM resend_sync_queue
      WHERE status = 'pending'
        AND attempts < 10
      ORDER BY created_at ASC
      LIMIT 100
    `

    if (pending.length === 0) return result
    console.log(`[RESEND-QUEUE] Draining ${pending.length} pending sync entries`)

    for (const row of pending) {
      result.retried++
      const syncResult = await autoSyncUserToResend(row.email, row.first_name, {
        source: row.source as "app_signup" | "app_update" | "admin_create",
        isStudioMember: row.is_studio_member,
        subscriptionProduct: row.subscription_product,
      })

      if (syncResult.success) {
        await sql`
          UPDATE resend_sync_queue
          SET status = 'resolved', resolved_at = NOW()
          WHERE id = ${row.id}
        `
        result.resolved++
      } else {
        await sql`
          UPDATE resend_sync_queue
          SET attempts = attempts + 1, last_attempted_at = NOW()
          WHERE id = ${row.id}
        `
      }

      await new Promise((r) => setTimeout(r, 600))
    }

    // Mark entries that exceeded 10 attempts as abandoned
    const abandoned = await sql`
      UPDATE resend_sync_queue
      SET status = 'abandoned'
      WHERE status = 'pending' AND attempts >= 10
      RETURNING id
    `
    result.abandoned = abandoned.length
    if (abandoned.length > 0) {
      console.warn(`[RESEND-QUEUE] Abandoned ${abandoned.length} entries after 10+ failed attempts`)
    }
  } catch (err) {
    console.error("[RESEND-QUEUE] Error draining queue:", err)
  }

  return result
}
