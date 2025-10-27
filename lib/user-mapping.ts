import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface NeonUser {
  id: string // String ID to match production
  email: string
  display_name?: string
  first_name?: string
  last_name?: string
  profile_image_url?: string
  stack_auth_id?: string // Using stack_auth_id
  created_at: string
  updated_at: string
}

/**
 * Get or create a Neon database user linked to a Supabase auth user
 * Maps users by email address
 */
export async function getOrCreateNeonUser(supabaseAuthId: string, email: string, name?: string): Promise<NeonUser> {
  // First, try to find existing user by email
  const existingUsers = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `

  if (existingUsers.length > 0) {
    const user = existingUsers[0] as NeonUser
    if (!user.stack_auth_id) {
      await sql`
        UPDATE users 
        SET stack_auth_id = ${supabaseAuthId}, updated_at = NOW()
        WHERE id = ${user.id}
      `
      user.stack_auth_id = supabaseAuthId
    }
    return user
  }

  const newUsers = await sql`
    INSERT INTO users (email, display_name, stack_auth_id, created_at, updated_at)
    VALUES (${email}, ${name || email.split("@")[0]}, ${supabaseAuthId}, NOW(), NOW())
    RETURNING *
  `

  return newUsers[0] as NeonUser
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
 */
export async function getUserByAuthId(authId: string): Promise<NeonUser | null> {
  const users = await sql`
    SELECT * FROM users WHERE stack_auth_id = ${authId} LIMIT 1
  `

  return users.length > 0 ? (users[0] as NeonUser) : null
}
