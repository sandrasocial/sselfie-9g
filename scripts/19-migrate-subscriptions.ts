import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateSubscriptions() {
  console.log("[v0] Migrating subscriptions...")

  try {
    const subscriptions = await prodDb`SELECT * FROM subscriptions`
    console.log(`[v0] Found ${subscriptions.length} subscriptions`)

    for (const sub of subscriptions) {
      const { error } = await supabase.from("subscriptions").upsert(
        {
          id: sub.id,
          user_id: sub.user_id,
          stripe_subscription_id: sub.stripe_subscription_id,
          stripe_customer_id: sub.stripe_customer_id,
          plan: sub.plan || "free",
          status: sub.status || "active",
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          created_at: sub.created_at,
          updated_at: sub.updated_at,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.log(`[v0] ✗ Error migrating subscription ${sub.id}:`, error.message)
      } else {
        console.log(`[v0] ✓ Migrated subscription for user ${sub.user_id}`)
      }
    }

    console.log("[v0] ✅ Subscriptions migration complete!")
  } catch (error) {
    console.error("[v0] Migration failed:", error)
  }
}

migrateSubscriptions()
