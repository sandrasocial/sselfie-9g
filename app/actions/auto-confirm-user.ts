"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { syncUserWithNeon } from "@/lib/user-sync"

/**
 * Auto-confirm user email after signup
 * Simple server action for free signups - no complex security needed
 * Users are already authenticated via Supabase signup
 */
export async function autoConfirmUser(email: string, userId: string) {
  try {
    console.log("[Auto-Confirm] Auto-confirming email for:", email, `(userId: ${userId})`)

    const supabaseAdmin = createAdminClient()

    // Auto-confirm email using Admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (updateError) {
      console.error("[Auto-Confirm] Error confirming email:", updateError)
      return { success: false, error: updateError.message }
    }

    console.log("[Auto-Confirm] ✅ Email auto-confirmed for:", email)

    // Sync user with Neon database
    try {
      const neonUser = await syncUserWithNeon(userId, email, updateData.user.user_metadata?.name)
      console.log("[Auto-Confirm] ✅ User synced with Neon:", neonUser?.id)
    } catch (syncError) {
      console.error("[Auto-Confirm] ⚠️ Error syncing with Neon (non-critical):", syncError)
      // Don't fail if sync fails - email is already confirmed
    }

    return { success: true, userId }
  } catch (error) {
    console.error("[Auto-Confirm] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to auto-confirm email",
    }
  }
}
