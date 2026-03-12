/**
 * Auto-sync user to Resend when created or updated
 * Called from getOrCreateNeonUser and other signup flows
 */
import { Resend } from "resend"

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

  return { success: false, error: lastError }
}
