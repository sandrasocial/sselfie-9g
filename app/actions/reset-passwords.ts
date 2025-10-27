"use server"

import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

export async function resetAllUserPasswords() {
  console.log("[v0] Starting password reset for all users...")

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
        details: [],
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

    // Fetch ALL users from Neon (including those already migrated)
    console.log("[v0] Fetching all users from Neon database...")
    const users = await sql`
      SELECT id, email, name, auth_id 
      FROM users 
      WHERE email IS NOT NULL
      ORDER BY created_at ASC
    `

    console.log(`[v0] Found ${users.length} users total`)

    if (users.length === 0) {
      return {
        success: true,
        message: "No users found in database",
        details: [],
      }
    }

    const results = []
    const password = "Sandra1604"

    // Reset password for each user
    for (const user of users) {
      try {
        console.log(`[v0] Processing user: ${user.email}`)

        // If user has auth_id, update their password
        if (user.auth_id) {
          console.log(`[v0] Resetting password for ${user.email} (auth_id: ${user.auth_id})`)

          const { error: updateError } = await supabase.auth.admin.updateUserById(user.auth_id, { password: password })

          if (updateError) {
            console.error(`[v0] Error updating password for ${user.email}:`, updateError)
            results.push(`✗ ${user.email}: ${updateError.message}`)
            continue
          }

          console.log(`[v0] Password reset successful for ${user.email}`)
          results.push(`✓ ${user.email} (password reset)`)
        } else {
          // User doesn't have auth_id, need to create or find them
          console.log(`[v0] User ${user.email} has no auth_id, checking if they exist in Supabase...`)

          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const existingUser = existingUsers?.users?.find((u) => u.email === user.email)

          if (existingUser) {
            // User exists in Supabase but not linked in Neon
            console.log(`[v0] Found existing Supabase user for ${user.email}, linking and resetting password...`)

            const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
              password: password,
            })

            if (updateError) {
              console.error(`[v0] Error updating password for ${user.email}:`, updateError)
              results.push(`✗ ${user.email}: ${updateError.message}`)
              continue
            }

            // Link to Neon user
            await sql`
              UPDATE users 
              SET auth_id = ${existingUser.id}
              WHERE id = ${user.id}
            `

            results.push(`✓ ${user.email} (linked & password reset)`)
          } else {
            // Create new Supabase auth user
            console.log(`[v0] Creating new Supabase user for ${user.email}...`)

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
              results.push(`✗ ${user.email}: No user data returned`)
              continue
            }

            // Link to Neon user
            await sql`
              UPDATE users 
              SET auth_id = ${authData.user.id}
              WHERE id = ${user.id}
            `

            results.push(`✓ ${user.email} (created)`)
          }
        }
      } catch (error) {
        console.error(`[v0] Error processing ${user.email}:`, error)
        results.push(`✗ ${user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    const successCount = results.filter((r) => r.startsWith("✓")).length
    const failCount = results.filter((r) => r.startsWith("✗")).length

    console.log(`[v0] Password reset complete: ${successCount} succeeded, ${failCount} failed`)

    return {
      success: true,
      message: `Password reset complete: ${successCount} users updated successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
      details: results,
    }
  } catch (error) {
    console.error("[v0] Password reset error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      details: [],
    }
  }
}
