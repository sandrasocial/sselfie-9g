"use server"

import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

export async function migrateUsersToSupabaseAuth() {
  console.log("[v0] Starting user migration to Supabase Auth...")

  try {
    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const databaseUrl = process.env.DATABASE_URL

    console.log("[v0] Environment check:", {
      supabaseUrl: supabaseUrl ? "✓" : "✗",
      supabaseServiceKey: supabaseServiceKey ? "✓" : "✗",
      databaseUrl: databaseUrl ? "✓" : "✗",
    })

    if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
      return {
        success: false,
        error: "Missing required environment variables",
        details: [
          `SUPABASE_URL: ${supabaseUrl ? "✓" : "✗"}`,
          `SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? "✓" : "✗"}`,
          `DATABASE_URL: ${databaseUrl ? "✓" : "✗"}`,
        ],
      }
    }

    // Initialize clients
    console.log("[v0] Initializing Supabase admin client...")
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v0] Initializing Neon database client...")
    const sql = neon(databaseUrl)

    // Fetch all users from Neon
    console.log("[v0] Fetching users from Neon database...")
    const users = await sql`
      SELECT id, email, name 
      FROM users 
      WHERE email IS NOT NULL 
      AND auth_id IS NULL
      ORDER BY created_at ASC
    `

    console.log(`[v0] Found ${users.length} users to migrate`)

    if (users.length === 0) {
      return {
        success: true,
        message: "No users to migrate (all users already have auth accounts)",
        details: [],
      }
    }

    const results = []
    const password = "Sandra1604"

    // Migrate each user
    for (const user of users) {
      try {
        console.log(`[v0] Migrating user: ${user.email}`)

        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find((u) => u.email === user.email)

        let authUserId: string

        if (existingUser) {
          console.log(`[v0] User ${user.email} already exists, updating password and linking...`)
          authUserId = existingUser.id

          // Update the user's password
          const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, { password: password })

          if (updateError) {
            console.error(`[v0] Error updating password for ${user.email}:`, updateError)
            results.push(`✗ ${user.email}: Failed to update password - ${updateError.message}`)
            continue
          }

          console.log(`[v0] Password updated for ${user.email}`)
          results.push(`↻ ${user.email} (password updated & linked)`)
        } else {
          // Create Supabase auth user
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: password,
            email_confirm: true,
            user_metadata: {
              name: user.name,
              neon_user_id: user.id,
            },
          })

          if (authError) {
            console.error(`[v0] Error creating auth user for ${user.email}:`, authError)
            results.push(`✗ ${user.email}: ${authError.message}`)
            continue
          }

          if (!authData.user) {
            console.error(`[v0] No user data returned for ${user.email}`)
            results.push(`✗ ${user.email}: No user data returned`)
            continue
          }

          authUserId = authData.user.id
          console.log(`[v0] Created new auth user for ${user.email}`)
          results.push(`✓ ${user.email} (created)`)
        }

        // Update Neon user with auth_id
        console.log(`[v0] Updating Neon user ${user.email} with auth_id...`)
        await sql`
          UPDATE users 
          SET auth_id = ${authUserId}
          WHERE id = ${user.id}
        `

        console.log(`[v0] Successfully migrated ${user.email}`)
      } catch (error) {
        console.error(`[v0] Error migrating ${user.email}:`, error)
        results.push(`✗ ${user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    const successCount = results.filter((r) => r.startsWith("✓") || r.startsWith("↻")).length
    const failCount = results.filter((r) => r.startsWith("✗")).length

    console.log(`[v0] Migration complete: ${successCount} succeeded, ${failCount} failed`)

    return {
      success: true,
      message: `Migration complete: ${successCount} users migrated successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
      details: results,
    }
  } catch (error) {
    console.error("[v0] Migration error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      details: [],
    }
  }
}
