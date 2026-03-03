import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import { autoSyncUserToResend } from "@/lib/resend/auto-sync-user"

export interface NeonUser {
  id: string
  email: string
  role?: string | null
  // Legacy/compat fields used across routes (DB may contain one or more)
  name?: string | null
  display_name?: string
  first_name?: string
  last_name?: string
  gender?: string | null
  trigger_word?: string | null
  profile_image_url?: string
  stack_auth_id?: string
  supabase_user_id?: string
  created_at: string
  updated_at: string
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const errorMessage = error?.message || String(error)

      // Check if it's a rate limit error or JSON parsing error (which often indicates rate limiting)
      const isRateLimit =
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("Unexpected token") ||
        errorMessage.includes("is not valid JSON")

      if (isRateLimit && attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        console.log(
          `[v0] Rate limit or parsing error, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // If not a rate limit error or last attempt, throw
      throw error
    }
  }

  throw lastError
}

/**
 * Get or create a Neon database user linked to a Supabase auth user
 * Maps users by email address
 */
export async function getOrCreateNeonUser(
  supabaseAuthId: string,
  email: string,
  name?: string | null,
): Promise<NeonUser> {
  try {
    const db = sql
    const existingUsers = await retryWithBackoff(
      () => db`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `,
      5,
      2000,
    )

    if (existingUsers.length > 0) {
      const user = existingUsers[0] as NeonUser
      if (!user.supabase_user_id) {
        await retryWithBackoff(
          () => db`
          UPDATE users 
          SET supabase_user_id = ${supabaseAuthId}, updated_at = NOW()
          WHERE id = ${user.id}
        `,
          5,
          2000,
        )
        user.supabase_user_id = supabaseAuthId
      }
      // Update display_name if null and we have a name from metadata
      if (!user.display_name && name) {
        await retryWithBackoff(
          () => db`
          UPDATE users 
          SET display_name = ${name}, updated_at = NOW()
          WHERE id = ${user.id}
        `,
          5,
          2000,
        )
        user.display_name = name
      }
      return user
    }

    const userId = globalThis.crypto.randomUUID()

    const displayName = name === null || name === undefined ? null : name

    const newUsers = await retryWithBackoff(
      () => db`
      INSERT INTO users (id, email, display_name, supabase_user_id, created_at, updated_at)
      VALUES (${userId}, ${email}, ${displayName}, ${supabaseAuthId}, NOW(), NOW())
      RETURNING *
    `,
      5,
      2000,
    )

    const newUser = newUsers[0] as NeonUser

    // Auto-sync new user to Resend (non-blocking)
    try {
      await autoSyncUserToResend(newUser.email, newUser.display_name, {
        source: "app_signup",
      })
    } catch (syncErr) {
      console.warn("[USER-MAPPING] Resend sync error (non-blocking):", syncErr)
    }

    return newUser
  } catch (error) {
    console.error("Database error in getOrCreateNeonUser:", error)
    throw error
  }
}

/**
 * Get Neon user by email
 */
export async function getNeonUserByEmail(email: string): Promise<NeonUser | null> {
  const db = sql
  const users = await retryWithBackoff(
    () => db`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `,
    5,
    2000,
  )

  return users.length > 0 ? (users[0] as NeonUser) : null
}

/**
 * Get Neon user by ID
 */
export async function getNeonUserById(id: string): Promise<NeonUser | null> {
  const db = sql
  const users = await retryWithBackoff(
    () => db`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `,
    5,
    2000,
  )

  return users.length > 0 ? (users[0] as NeonUser) : null
}

/**
 * Get Neon user by Supabase auth ID
 * Supports both Stack Auth (existing users) and Supabase Auth (new users)
 */
export async function getUserByAuthId(authId: string): Promise<NeonUser | null> {
  try {
    const db = sql
    const users = await retryWithBackoff(
      () => db`
      SELECT * FROM users 
      WHERE stack_auth_id = ${authId} OR supabase_user_id = ${authId}
      LIMIT 1
    `,
      5,
      2000,
    )

    return users.length > 0 ? (users[0] as NeonUser) : null
  } catch (error) {
    console.error("Database error in getUserByAuthId:", error)
    throw error
  }
}

/**
 * Get current user's Neon database ID from Supabase auth session
 * Returns null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user: authUser },
    } = await retryWithBackoff(() => supabase.auth.getUser(), 5, 2000)

    if (!authUser) {
      return null
    }

    const neonUser = await getUserByAuthId(authUser.id)
    return neonUser?.id || null
  } catch (error) {
    console.error("Error getting user ID:", error)
    return null
  }
}

/**
 * Get Neon user ID from Supabase auth user ID
 * Helper function for Scene Composer and other features
 */
export async function getUserIdFromSupabase(supabaseAuthId: string): Promise<string> {
  const neonUser = await getUserByAuthId(supabaseAuthId)
  if (!neonUser) {
    throw new Error("User not found in database")
  }
  return neonUser.id
}
