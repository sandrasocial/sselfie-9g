import { sql } from "@/lib/neon"
import { createServerClient } from "@/lib/supabase/server"

export interface NeonUser {
  id: string // Now string instead of UUID to match production
  email: string
  display_name?: string
  first_name?: string
  last_name?: string
  profile_image_url?: string
  stack_auth_id?: string // Using stack_auth_id instead of auth_id
  created_at: string
  updated_at: string
}

/**
 * Syncs a Supabase Auth user with their Neon database user
 * Links by email and stores the stack_auth_id for future lookups
 */
export async function syncUserWithNeon(authUserId: string, email: string, name?: string): Promise<NeonUser | null> {
  try {
    console.log("[v0] Syncing user with Neon:", { authUserId, email })

    const existingByAuthId = await sql`
      SELECT * FROM users WHERE stack_auth_id = ${authUserId} LIMIT 1
    `

    if (existingByAuthId.length > 0) {
      console.log("[v0] User already synced by stack_auth_id")
      return existingByAuthId[0] as NeonUser
    }

    // Check if user exists by email
    const existingByEmail = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `

    if (existingByEmail.length > 0) {
      console.log("[v0] Found existing user by email, linking stack_auth_id")
      const updated = await sql`
        UPDATE users 
        SET stack_auth_id = ${authUserId}, updated_at = NOW()
        WHERE email = ${email}
        RETURNING *
      `
      return updated[0] as NeonUser
    }

    console.log("[v0] Creating new user in Neon")
    const newUser = await sql`
      INSERT INTO users (email, display_name, stack_auth_id, created_at, updated_at)
      VALUES (${email}, ${name || email.split("@")[0]}, ${authUserId}, NOW(), NOW())
      RETURNING *
    `

    return newUser[0] as NeonUser
  } catch (error) {
    console.error("[v0] Error syncing user with Neon:", error)
    return null
  }
}

/**
 * Gets the Neon user for the currently authenticated Supabase user
 */
export async function getCurrentNeonUser(): Promise<NeonUser | null> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.log("[v0] No authenticated user")
      return null
    }

    const byAuthId = await sql`
      SELECT * FROM users WHERE stack_auth_id = ${authUser.id} LIMIT 1
    `

    if (byAuthId.length > 0) {
      return byAuthId[0] as NeonUser
    }

    // Fallback to email lookup and sync
    if (authUser.email) {
      const displayName = authUser.user_metadata?.display_name || authUser.email.split("@")[0]
      return await syncUserWithNeon(authUser.id, authUser.email, displayName)
    }

    return null
  } catch (error) {
    console.error("[v0] Error getting current Neon user:", error)
    return null
  }
}

/**
 * Gets user data from Neon by user_id
 */
export async function getNeonUserById(userId: string): Promise<NeonUser | null> {
  try {
    const result = await sql`
      SELECT * FROM users WHERE id = ${userId} LIMIT 1
    `
    return result.length > 0 ? (result[0] as NeonUser) : null
  } catch (error) {
    console.error("[v0] Error getting Neon user by ID:", error)
    return null
  }
}

/**
 * Gets user data from Neon by stack_auth_id
 */
export async function getUserByAuthId(authId: string): Promise<NeonUser | null> {
  try {
    const result = await sql`
      SELECT * FROM users WHERE stack_auth_id = ${authId} LIMIT 1
    `
    return result.length > 0 ? (result[0] as NeonUser) : null
  } catch (error) {
    console.error("[v0] Error getting Neon user by auth ID:", error)
    return null
  }
}
