import { neon } from "@neondatabase/serverless"

// Production database (source)
const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

// New Supabase database (destination)
const newDb = neon(process.env.SUPABASE_POSTGRES_URL || process.env.DATABASE_URL)

async function migrateData() {
  console.log("[v0] Starting data migration from production to new database...\n")

  try {
    // 1. Migrate Users
    console.log("[v0] Migrating users...")
    const users = await prodDb`SELECT * FROM users`
    console.log(`[v0] Found ${users.length} users`)

    for (const user of users) {
      await newDb`
        INSERT INTO users (id, email, created_at, updated_at)
        VALUES (${user.id}, ${user.email}, ${user.created_at}, ${user.updated_at})
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          updated_at = EXCLUDED.updated_at
      `
    }
    console.log("[v0] ✓ Users migrated\n")

    // 2. Migrate User Profiles
    console.log("[v0] Migrating user profiles...")
    const profiles = await prodDb`SELECT * FROM user_profiles`
    console.log(`[v0] Found ${profiles.length} profiles`)

    for (const profile of profiles) {
      await newDb`
        INSERT INTO user_profiles (
          id, user_id, full_name, avatar_url, bio, 
          gender, age, location, created_at, updated_at
        )
        VALUES (
          ${profile.id}, ${profile.user_id}, ${profile.full_name}, 
          ${profile.avatar_url}, ${profile.bio}, ${profile.gender}, 
          ${profile.age}, ${profile.location}, ${profile.created_at}, 
          ${profile.updated_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          avatar_url = EXCLUDED.avatar_url,
          bio = EXCLUDED.bio,
          updated_at = EXCLUDED.updated_at
      `
    }
    console.log("[v0] ✓ User profiles migrated\n")

    // 3. Migrate Training Runs
    console.log("[v0] Migrating training runs...")
    const trainingRuns = await prodDb`SELECT * FROM training_runs`
    console.log(`[v0] Found ${trainingRuns.length} training runs`)

    for (const run of trainingRuns) {
      await newDb`
        INSERT INTO training_runs (
          id, user_id, status, replicate_training_id, 
          model_version, progress, error_message, 
          started_at, completed_at, created_at, updated_at
        )
        VALUES (
          ${run.id}, ${run.user_id}, ${run.status}, 
          ${run.replicate_training_id}, ${run.model_version}, 
          ${run.progress}, ${run.error_message}, ${run.started_at}, 
          ${run.completed_at}, ${run.created_at}, ${run.updated_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          progress = EXCLUDED.progress,
          completed_at = EXCLUDED.completed_at,
          updated_at = EXCLUDED.updated_at
      `
    }
    console.log("[v0] ✓ Training runs migrated\n")

    // 4. Migrate User Models
    console.log("[v0] Migrating user models...")
    const models = await prodDb`SELECT * FROM user_models`
    console.log(`[v0] Found ${models.length} models`)

    for (const model of models) {
      await newDb`
        INSERT INTO user_models (
          id, user_id, training_run_id, model_name, 
          replicate_model_id, trigger_word, is_active, 
          created_at, updated_at
        )
        VALUES (
          ${model.id}, ${model.user_id}, ${model.training_run_id}, 
          ${model.model_name}, ${model.replicate_model_id}, 
          ${model.trigger_word}, ${model.is_active}, 
          ${model.created_at}, ${model.updated_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at
      `
    }
    console.log("[v0] ✓ User models migrated\n")

    // 5. Migrate Generated Images
    console.log("[v0] Migrating generated images...")
    const images = await prodDb`SELECT * FROM generated_images`
    console.log(`[v0] Found ${images.length} images`)

    for (const image of images) {
      await newDb`
        INSERT INTO generated_images (
          id, user_id, user_model_id, prompt, image_url, 
          thumbnail_url, replicate_prediction_id, is_favorite, 
          created_at, updated_at
        )
        VALUES (
          ${image.id}, ${image.user_id}, ${image.user_model_id}, 
          ${image.prompt}, ${image.image_url}, ${image.thumbnail_url}, 
          ${image.replicate_prediction_id}, ${image.is_favorite}, 
          ${image.created_at}, ${image.updated_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          is_favorite = EXCLUDED.is_favorite,
          updated_at = EXCLUDED.updated_at
      `
    }
    console.log("[v0] ✓ Generated images migrated\n")

    // 6. Migrate Maya Chats
    console.log("[v0] Migrating Maya chats...")
    const chats = await prodDb`SELECT * FROM maya_chats`
    console.log(`[v0] Found ${chats.length} chats`)

    for (const chat of chats) {
      await newDb`
        INSERT INTO maya_chats (
          id, user_id, title, created_at, updated_at
        )
        VALUES (
          ${chat.id}, ${chat.user_id}, ${chat.title}, 
          ${chat.created_at}, ${chat.updated_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          updated_at = EXCLUDED.updated_at
      `
    }
    console.log("[v0] ✓ Maya chats migrated\n")

    // 7. Migrate Maya Chat Messages
    console.log("[v0] Migrating Maya chat messages...")
    const messages = await prodDb`SELECT * FROM maya_chat_messages`
    console.log(`[v0] Found ${messages.length} messages`)

    for (const message of messages) {
      await newDb`
        INSERT INTO maya_chat_messages (
          id, chat_id, role, content, created_at
        )
        VALUES (
          ${message.id}, ${message.chat_id}, ${message.role}, 
          ${message.content}, ${message.created_at}
        )
        ON CONFLICT (id) DO NOTHING
      `
    }
    console.log("[v0] ✓ Maya chat messages migrated\n")

    // 8. Migrate Subscriptions
    console.log("[v0] Migrating subscriptions...")
    const subscriptions = await prodDb`SELECT * FROM subscriptions`
    console.log(`[v0] Found ${subscriptions.length} subscriptions`)

    for (const sub of subscriptions) {
      await newDb`
        INSERT INTO subscriptions (
          id, user_id, tier, status, stripe_subscription_id, 
          current_period_start, current_period_end, 
          cancel_at_period_end, created_at, updated_at
        )
        VALUES (
          ${sub.id}, ${sub.user_id}, ${sub.tier}, ${sub.status}, 
          ${sub.stripe_subscription_id}, ${sub.current_period_start}, 
          ${sub.current_period_end}, ${sub.cancel_at_period_end}, 
          ${sub.created_at}, ${sub.updated_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          current_period_end = EXCLUDED.current_period_end,
          updated_at = EXCLUDED.updated_at
      `
    }
    console.log("[v0] ✓ Subscriptions migrated\n")

    console.log("[v0] ✅ Migration complete!")
    console.log("[v0] Summary:")
    console.log(`[v0]   - ${users.length} users`)
    console.log(`[v0]   - ${profiles.length} profiles`)
    console.log(`[v0]   - ${trainingRuns.length} training runs`)
    console.log(`[v0]   - ${models.length} models`)
    console.log(`[v0]   - ${images.length} images`)
    console.log(`[v0]   - ${chats.length} chats`)
    console.log(`[v0]   - ${messages.length} messages`)
    console.log(`[v0]   - ${subscriptions.length} subscriptions`)
  } catch (error) {
    console.error("[v0] ❌ Migration failed:", error)
    throw error
  }
}

migrateData()
