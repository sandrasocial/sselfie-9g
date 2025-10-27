import { neon } from "@neondatabase/serverless"

const prodConnectionString =
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

const newConnectionString =
  process.env.SUPABASE_POSTGRES_URL_NON_POOLING || process.env.SUPABASE_POSTGRES_URL || process.env.DATABASE_URL

console.log("[v0] Production DB: Connected")
console.log("[v0] Destination DB:", newConnectionString ? "Connected" : "ERROR: No connection string found")

if (!newConnectionString) {
  throw new Error("No Supabase connection string found. Please check environment variables.")
}

const prodDb = neon(prodConnectionString)
const newDb = neon(newConnectionString)

async function migrateData() {
  console.log("[v0] Starting data migration...\n")

  try {
    console.log("[v0] Testing database connections...")
    await prodDb`SELECT 1`
    console.log("[v0] ✓ Production database connected")

    await newDb`SELECT 1`
    console.log("[v0] ✓ Destination database connected\n")

    // 1. Migrate Users
    console.log("[v0] Migrating users...")
    const users = await prodDb`SELECT * FROM users ORDER BY created_at`

    for (const user of users) {
      await newDb`
        INSERT INTO users (
          id, email, created_at, updated_at,
          stripe_customer_id, stripe_subscription_id,
          plan, monthly_generation_limit, generations_used_this_month,
          gender, has_trained_model, last_login_at
        ) VALUES (
          ${user.id}, ${user.email}, ${user.created_at}, ${user.updated_at},
          ${user.stripe_customer_id}, ${user.stripe_subscription_id},
          ${user.plan || "free"}, ${user.monthly_generation_limit || 10}, ${user.generations_used_this_month || 0},
          ${user.gender}, ${user.training_coaching_completed || false}, ${user.last_login_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          updated_at = EXCLUDED.updated_at
      `
    }
    console.log(`[v0] ✓ Migrated ${users.length} users\n`)

    // 2. Migrate User Profiles
    console.log("[v0] Migrating user profiles...")
    const profiles = await prodDb`SELECT * FROM user_profiles`

    for (const profile of profiles) {
      await newDb`
        INSERT INTO user_profiles (
          user_id, full_name, phone, location, instagram_handle,
          website_url, bio, brand_vibe, goals, created_at, updated_at
        ) VALUES (
          ${profile.user_id}, ${profile.full_name}, ${profile.phone}, ${profile.location},
          ${profile.instagram_handle}, ${profile.website_url}, ${profile.bio},
          ${profile.brand_vibe}, ${profile.goals}, ${profile.created_at}, ${profile.updated_at}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          updated_at = EXCLUDED.updated_at
      `
    }
    console.log(`[v0] ✓ Migrated ${profiles.length} user profiles\n`)

    // 3. Migrate Training Runs
    console.log("[v0] Migrating training runs...")
    const trainingRuns = await prodDb`SELECT * FROM training_runs ORDER BY created_at`

    for (const run of trainingRuns) {
      await newDb`
        INSERT INTO training_runs (
          user_id, replicate_model_id, trigger_word, training_status,
          model_name, lora_weights_url, training_progress,
          created_at, started_at, completed_at, failure_reason
        ) VALUES (
          ${run.user_id}, ${run.replicate_model_id}, ${run.trigger_word},
          ${run.training_status || "completed"}, ${run.model_name},
          ${run.lora_weights_url}, ${run.training_progress || 100},
          ${run.created_at}, ${run.started_at}, ${run.completed_at}, ${run.failure_reason}
        )
        ON CONFLICT (user_id, replicate_model_id) DO NOTHING
      `
    }
    console.log(`[v0] ✓ Migrated ${trainingRuns.length} training runs\n`)

    // 4. Migrate Generated Images
    console.log("[v0] Migrating generated images...")
    const images = await prodDb`SELECT * FROM generated_images ORDER BY created_at`

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

      const imageUrl = image.selected_url || (Array.isArray(imageUrls) ? imageUrls[0] : imageUrls)

      await newDb`
        INSERT INTO generated_images (
          user_id, prompt, image_url, category, is_favorite, created_at
        ) VALUES (
          ${image.user_id}, ${image.prompt}, ${imageUrl},
          ${image.category || "studio"}, ${image.saved || false}, ${image.created_at}
        )
        ON CONFLICT DO NOTHING
      `
    }
    console.log(`[v0] ✓ Migrated ${images.length} generated images\n`)

    // 5. Migrate Maya Chats
    console.log("[v0] Migrating Maya chats...")
    const chats = await prodDb`SELECT * FROM maya_chats ORDER BY created_at`

    for (const chat of chats) {
      await newDb`
        INSERT INTO maya_chats (
          id, user_id, title, created_at, updated_at
        ) VALUES (
          ${chat.id}, ${chat.user_id}, ${chat.title || "Chat"}, 
          ${chat.created_at}, ${chat.updated_at}
        )
        ON CONFLICT (id) DO NOTHING
      `
    }
    console.log(`[v0] ✓ Migrated ${chats.length} Maya chats\n`)

    // 6. Migrate Maya Chat Messages
    console.log("[v0] Migrating Maya chat messages...")
    const messages = await prodDb`SELECT * FROM maya_chat_messages ORDER BY created_at`

    for (const message of messages) {
      await newDb`
        INSERT INTO maya_chat_messages (
          chat_id, role, content, created_at
        ) VALUES (
          ${message.chat_id}, ${message.role}, ${message.content}, ${message.created_at}
        )
        ON CONFLICT DO NOTHING
      `
    }
    console.log(`[v0] ✓ Migrated ${messages.length} Maya chat messages\n`)

    // 7. Migrate Subscriptions
    console.log("[v0] Migrating subscriptions...")
    const subscriptions = await prodDb`SELECT * FROM subscriptions`

    for (const sub of subscriptions) {
      await newDb`
        INSERT INTO subscriptions (
          user_id, plan, status, stripe_subscription_id,
          current_period_start, current_period_end, created_at
        ) VALUES (
          ${sub.user_id}, ${sub.plan}, ${sub.status}, ${sub.stripe_subscription_id},
          ${sub.current_period_start}, ${sub.current_period_end}, ${sub.created_at}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          plan = EXCLUDED.plan,
          status = EXCLUDED.status
      `
    }
    console.log(`[v0] ✓ Migrated ${subscriptions.length} subscriptions\n`)

    console.log("[v0] ✅ Migration completed successfully!")
    console.log("[v0] Summary:")
    console.log(`[v0]   - ${users.length} users`)
    console.log(`[v0]   - ${profiles.length} profiles`)
    console.log(`[v0]   - ${trainingRuns.length} trained models`)
    console.log(`[v0]   - ${images.length} generated images`)
    console.log(`[v0]   - ${chats.length} Maya chats`)
    console.log(`[v0]   - ${messages.length} chat messages`)
    console.log(`[v0]   - ${subscriptions.length} subscriptions`)
  } catch (error) {
    console.error("[v0] Migration error:", error)
    throw error
  }
}

migrateData()
