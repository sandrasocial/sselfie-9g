import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateUsers() {
  console.log("[v0] Migrating users and profiles...")

  try {
    // Migrate Users
    const users = await prodDb`SELECT * FROM users`
    console.log(`[v0] Found ${users.length} users`)

    for (const user of users) {
      const { error } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          display_name:
            user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : user.first_name || user.email?.split("@")[0] || "User",
          profile_image_url: user.profile_image_url,
          stripe_customer_id: user.stripe_customer_id,
          stripe_subscription_id: user.stripe_subscription_id,
          plan: user.plan || "free",
          role: user.role || "user",
          monthly_generation_limit: user.monthly_generation_limit || 10,
          generations_used_this_month: user.generations_used_this_month || 0,
          gender: user.gender,
          profession: user.profession,
          brand_style: user.brand_style,
          photo_goals: user.photo_goals,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login_at: user.last_login_at,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.log(`[v0] ✗ Error migrating user ${user.email}:`, error.message)
      } else {
        console.log(`[v0] ✓ Migrated user ${user.email}`)
      }
    }

    // Migrate User Profiles
    const profiles = await prodDb`SELECT * FROM user_profiles`
    console.log(`[v0] Found ${profiles.length} profiles`)

    for (const profile of profiles) {
      const { error } = await supabase.from("user_profiles").upsert(
        {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          phone: profile.phone,
          location: profile.location,
          instagram_handle: profile.instagram_handle,
          website_url: profile.website_url,
          bio: profile.bio,
          brand_vibe: profile.brand_vibe,
          goals: profile.goals,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.log(`[v0] ✗ Error migrating profile:`, error.message)
      } else {
        console.log(`[v0] ✓ Migrated profile for user ${profile.user_id}`)
      }
    }

    console.log("[v0] ✅ Users and profiles migration complete!")
  } catch (error) {
    console.error("[v0] Migration failed:", error)
  }
}

migrateUsers()
