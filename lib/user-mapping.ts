import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"

let sql: ReturnType<typeof neon> | null = null

function getSQL() {
  if (!sql) {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    sql = neon(dbUrl)
  }
  return sql
}

export interface NeonUser {
  id: string
  email: string
  display_name?: string
  first_name?: string
  last_name?: string
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
    const db = getSQL()
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

    return newUsers[0] as NeonUser
  } catch (error) {
    console.error("Database error in getOrCreateNeonUser:", error)
    throw error
  }
}

/**
 * Get Neon user by email
 */
export async function getNeonUserByEmail(email: string): Promise<NeonUser | null> {
  const db = getSQL()
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
  const db = getSQL()
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
    const db = getSQL()
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
 * Returns the Neon user ID (string) or null if not authenticated
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
