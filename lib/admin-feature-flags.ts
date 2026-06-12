/**
 * Admin Feature Flags
 * Simple feature flag system for admin-only features
 */

import { sql } from "@/lib/db/client"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "ssa@ssasocial.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()))
}

/** Lowercased admin emails, e.g. for excluding Sandra's own usage from member aggregates. */
export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS]
}

/**
 * Check if Pro Photoshoot feature is enabled (admin-only)
 */
export async function isProPhotoshootEnabled(): Promise<boolean> {
  try {
    // Check env var first (faster, no DB call)
    const envFlag = process.env.FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY
    if (envFlag !== undefined) {
      return envFlag === "true" || envFlag === "1"
    }

    // Fallback to DB flag
    const result = await sql`
      SELECT value FROM admin_feature_flags
      WHERE key = 'pro_photoshoot_admin_only'
    `
    if (result.length === 0) {
      return false // Default to false if flag doesn't exist
    }
    return result[0].value === true || result[0].value === "true"
  } catch (error) {
    console.error("[AdminFeatureFlags] Error checking pro photoshoot flag:", error)
    return false // Fail safe: default to false
  }
}

/**
 * Check if user is admin
 * Uses existing admin check pattern (email + role)
 */
export async function requireAdmin(): Promise<{ isAdmin: boolean; userId?: number; error?: string }> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server")
    const { getUserByAuthId } = await import("@/lib/user-mapping")
    
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return { isAdmin: false, error: "Not authenticated" }
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return { isAdmin: false, error: "User not found" }
    }

    // Check role in DB
    const adminCheck = await sql`
      SELECT role FROM users WHERE id = ${user.id} LIMIT 1
    `

    if (!isAdminEmail(user.email) && adminCheck[0]?.role !== "admin") {
      return { isAdmin: false, error: "Not an admin" }
    }

    return { isAdmin: true, userId: Number(user.id) }
  } catch (error) {
    console.error("[AdminFeatureFlags] Error checking admin access:", error)
    return { isAdmin: false, error: "Error checking admin status" }
  }
}

