import { createClient } from "@supabase/supabase-js"
import { neon } from "@neondatabase/serverless"

console.log("[v0] Checking environment variables...")
console.log("[v0] - SUPABASE_URL:", process.env.SUPABASE_URL ? "✓ Set" : "✗ Missing")
console.log("[v0] - SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ Set" : "✗ Missing")
console.log("[v0] - DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "✗ Missing")

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const databaseUrl = process.env.DATABASE_URL

if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
  console.error("[v0] ✗ Missing required environment variables!")
  throw new Error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL")
}

console.log("[v0] All environment variables present")

let supabaseAdmin
let sql

try {
  console.log("[v0] Creating Supabase admin client...")
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  console.log("[v0] ✓ Supabase admin client created")
} catch (error) {
  console.error("[v0] ✗ Failed to create Supabase admin client:", error)
  throw error
}

try {
  console.log("[v0] Creating Neon client...")
  sql = neon(databaseUrl)
  console.log("[v0] ✓ Neon client created")
} catch (error) {
  console.error("[v0] ✗ Failed to create Neon client:", error)
  throw error
}

const PASSWORD = "Sandra1604"

async function migrateUsersToSupabaseAuth() {
  console.log("[v0] Starting user migration to Supabase Auth...")

  try {
    console.log("[v0] Fetching users from Neon database...")
    let users
    try {
      users = await sql`
        SELECT id, email, name, avatar_url, auth_id
        FROM users
        WHERE email IS NOT NULL
        ORDER BY created_at ASC
      `
      console.log(`[v0] ✓ Found ${users.length} users in Neon database`)
    } catch (error) {
      console.error("[v0] ✗ Failed to fetch users from Neon:", error)
      throw error
    }

    let created = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const user of users) {
      try {
        // Skip if already has auth_id
        if (user.auth_id) {
          console.log(`[v0] User ${user.email} already has auth_id, skipping...`)
          skipped++
          continue
        }

        console.log(`[v0] Creating Supabase Auth account for ${user.email}...`)

        // Create Supabase Auth user with admin API
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            avatar_url: user.avatar_url,
            neon_user_id: user.id,
          },
        })

        if (authError) {
          // Check if user already exists in Supabase Auth
          if (authError.message.includes("already registered")) {
            console.log(`[v0] User ${user.email} already exists in Supabase Auth, fetching...`)

            // Try to get existing user by email
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = existingUsers?.users.find((u) => u.email === user.email)

            if (existingUser) {
              // Update Neon user with existing auth_id
              await sql`
                UPDATE users
                SET auth_id = ${existingUser.id}
                WHERE id = ${user.id}
              `
              console.log(`[v0] ✓ Linked existing Supabase user ${user.email}`)
              updated++
            } else {
              console.error(`[v0] ✗ Could not find existing user ${user.email}`)
              errors++
            }
          } else {
            console.error(`[v0] ✗ Error creating auth user for ${user.email}:`, authError.message)
            errors++
          }
          continue
        }

        if (!authUser?.user) {
          console.error(`[v0] ✗ No user returned for ${user.email}`)
          errors++
          continue
        }

        // Update Neon user with Supabase auth_id
        await sql`
          UPDATE users
          SET auth_id = ${authUser.user.id}
          WHERE id = ${user.id}
        `

        console.log(`[v0] ✓ Created and linked Supabase Auth account for ${user.email}`)
        created++
      } catch (error) {
        console.error(`[v0] ✗ Error processing user ${user.email}:`, error)
        errors++
      }
    }

    console.log("\n[v0] Migration complete!")
    console.log(`[v0] - Created: ${created}`)
    console.log(`[v0] - Updated: ${updated}`)
    console.log(`[v0] - Skipped: ${skipped}`)
    console.log(`[v0] - Errors: ${errors}`)
    console.log(`[v0] - Total: ${users.length}`)
    console.log(`\n[v0] All users can now sign in with password: ${PASSWORD}`)
  } catch (error) {
    console.error("[v0] ✗ Migration failed:", error)
    throw error
  }
}

try {
  await migrateUsersToSupabaseAuth()
} catch (error) {
  console.error("[v0] ✗ Script execution failed:", error)
  process.exit(1)
}
