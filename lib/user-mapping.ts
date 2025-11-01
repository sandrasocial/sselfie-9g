import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import crypto from "crypto"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

const sql = neon(process.env.DATABASE_URL)

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

/**
 * Get or create a Neon database user linked to a Supabase auth user
 * Maps users by email address
 */
export async function getOrCreateNeonUser(supabaseAuthId: string, email: string, name?: string): Promise<NeonUser> {
  try {
    const existingUsers = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `

    if (existingUsers.length > 0) {
      const user = existingUsers[0] as NeonUser
      if (!user.supabase_user_id) {
        await sql`
          UPDATE users 
          SET supabase_user_id = ${supabaseAuthId}, updated_at = NOW()
          WHERE id = ${user.id}
        `
        user.supabase_user_id = supabaseAuthId
      }
      return user
    }

    const userId = crypto.randomUUID()

    const newUsers = await sql`
      INSERT INTO users (id, email, display_name, supabase_user_id, created_at, updated_at)
      VALUES (${userId}, ${email}, ${name || email.split("@")[0]}, ${supabaseAuthId}, NOW(), NOW())
      RETURNING *
    `

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
  const users = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `

  return users.length > 0 ? (users[0] as NeonUser) : null
}

/**
 * Get Neon user by ID
 */
export async function getNeonUserById(id: string): Promise<NeonUser | null> {
  const users = await sql`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `

  return users.length > 0 ? (users[0] as NeonUser) : null
}

/**
 * Get Neon user by Supabase auth ID
 * Supports both Stack Auth (existing users) and Supabase Auth (new users)
 */
export async function getUserByAuthId(authId: string): Promise<NeonUser | null> {
  try {
    const users = await sql`
      SELECT * FROM users 
      WHERE stack_auth_id = ${authId} OR supabase_user_id = ${authId}
      LIMIT 1
    `

    return users.length > 0 ? (users[0] as NeonUser) : null
  } catch (error) {
    console.error("Database error in getUserByAuthId:", error)
    throw new Error(`Error connecting to database: ${error instanceof Error ? error.message : String(error)}`)
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
    } = await supabase.auth.getUser()

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
