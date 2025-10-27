import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateData() {
  console.log("[v0] Starting migration with Supabase client...")

  try {
    // 1. Migrate Users
    console.log("[v0] Migrating users...")
    const users = await prodDb`SELECT * FROM users`

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

      if (error) console.log(`[v0] Error migrating user ${user.id}:`, error.message)
    }
    console.log(`[v0] ✓ Migrated ${users.length} users`)

    // 2. Migrate User Profiles
    console.log("[v0] Migrating user profiles...")
    const profiles = await prodDb`SELECT * FROM user_profiles`

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

      if (error) console.log(`[v0] Error migrating profile ${profile.id}:`, error.message)
    }
    console.log(`[v0] ✓ Migrated ${profiles.length} profiles`)

    // 3. Migrate Training Runs
    console.log("[v0] Migrating training runs...")
    const trainingRuns = await prodDb`SELECT * FROM training_runs`

    for (const run of trainingRuns) {
      const { error } = await supabase.from("training_runs").upsert(
        {
          id: run.id,
          user_id: run.user_id,
          replicate_model_id: run.replicate_model_id,
          trigger_word: run.trigger_word,
          training_status: run.training_status || "pending",
          model_name: run.model_name,
          created_at: run.created_at,
          completed_at: run.completed_at,
          replicate_version_id: run.replicate_version_id,
          training_progress: run.training_progress || 0,
          estimated_completion_time: run.estimated_completion_time,
          failure_reason: run.failure_reason,
          updated_at: run.updated_at,
          trained_model_path: run.trained_model_path,
          started_at: run.started_at,
          is_luxury: run.is_luxury || false,
          model_type: run.model_type || "flux",
          finetune_id: run.finetune_id,
          lora_weights_url: run.lora_weights_url,
          training_id: run.training_id,
        },
        { onConflict: "id" },
      )

      if (error) console.log(`[v0] Error migrating training run ${run.id}:`, error.message)
    }
    console.log(`[v0] ✓ Migrated ${trainingRuns.length} training runs`)

    // 4. Migrate Generated Images
    console.log("[v0] Migrating generated images...")
    const images = await prodDb`SELECT * FROM generated_images`

    for (const image of images) {
      // Parse image_urls if it's a JSON string
      let imageUrls = image.image_urls
      if (typeof imageUrls === "string") {
        try {
          imageUrls = JSON.parse(imageUrls)
        } catch (e) {
          imageUrls = [imageUrls]
        }
      }

      const { error } = await supabase.from("generated_images").upsert(
        {
          id: image.id,
          user_id: image.user_id,
          model_id: image.model_id,
          category: image.category,
          subcategory: image.subcategory,
          prompt: image.prompt,
          image_urls: imageUrls,
          selected_url: image.selected_url,
          saved: image.saved || false,
          created_at: image.created_at,
        },
        { onConflict: "id" },
      )

      if (error) console.log(`[v0] Error migrating image ${image.id}:`, error.message)
    }
    console.log(`[v0] ✓ Migrated ${images.length} images`)

    // 5. Migrate Maya Chats
    console.log("[v0] Migrating Maya chats...")
    const chats = await prodDb`SELECT * FROM maya_chats`

    for (const chat of chats) {
      const { error } = await supabase.from("maya_chats").upsert(
        {
          id: chat.id,
          user_id: chat.user_id,
          title: chat.title || "Chat",
          created_at: chat.created_at,
          updated_at: chat.updated_at,
        },
        { onConflict: "id" },
      )

      if (error) console.log(`[v0] Error migrating chat ${chat.id}:`, error.message)
    }
    console.log(`[v0] ✓ Migrated ${chats.length} chats`)

    // 6. Migrate Maya Chat Messages
    console.log("[v0] Migrating Maya chat messages...")
    const messages = await prodDb`SELECT * FROM maya_chat_messages`

    for (const message of messages) {
      const { error } = await supabase.from("maya_chat_messages").upsert(
        {
          id: message.id,
          chat_id: message.chat_id,
          role: message.role,
          content: message.content,
          created_at: message.created_at,
        },
        { onConflict: "id" },
      )

      if (error) console.log(`[v0] Error migrating message ${message.id}:`, error.message)
    }
    console.log(`[v0] ✓ Migrated ${messages.length} messages`)

    // 7. Migrate Subscriptions
    console.log("[v0] Migrating subscriptions...")
    const subscriptions = await prodDb`SELECT * FROM subscriptions`

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

      if (error) console.log(`[v0] Error migrating subscription ${sub.id}:`, error.message)
    }
    console.log(`[v0] ✓ Migrated ${subscriptions.length} subscriptions`)

    console.log("[v0] ✅ Migration complete!")
    console.log("[v0] Summary:")
    console.log(`[v0]   - ${users.length} users`)
    console.log(`[v0]   - ${profiles.length} profiles`)
    console.log(`[v0]   - ${trainingRuns.length} training runs`)
    console.log(`[v0]   - ${images.length} images`)
    console.log(`[v0]   - ${chats.length} chats`)
    console.log(`[v0]   - ${messages.length} messages`)
    console.log(`[v0]   - ${subscriptions.length} subscriptions`)
  } catch (error) {
    console.error("[v0] Migration failed:", error)
  }
}

migrateData()
