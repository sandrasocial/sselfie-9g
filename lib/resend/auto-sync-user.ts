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
 * Automatically sync a new app user to Resend audience
 * Non-blocking: failures won't block user signup
 */
export async function autoSyncUserToResend(
  email: string,
  firstName: string | null | undefined,
  options: ResendSyncOptions = {}
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
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

    const { data, error } = await resend.contacts.create({
      email,
      firstName: firstName || undefined,
      audienceId: AUDIENCE_ID,
      properties,
    })

    if (error) {
      console.error(`[RESEND-SYNC] Failed to sync ${email}: ${error.message}`)
      return { success: false, error: error.message }
    }

    console.log(`[RESEND-SYNC] ✓ Synced ${email} to Resend (${source})`)
    return { success: true, contactId: data?.id }
  } catch (err) {
    console.error(`[RESEND-SYNC] Error syncing ${email}:`, err)
    return { success: false, error: String(err) }
  }
}
