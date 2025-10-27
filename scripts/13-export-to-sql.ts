import { neon } from "@neondatabase/serverless"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

async function exportToSQL() {
  console.log("[v0] Starting SQL export from production database...\n")

  let sqlOutput = "-- SSELFIE Production Data Export\n"
  sqlOutput += "-- Generated: " + new Date().toISOString() + "\n\n"
  sqlOutput += "BEGIN;\n\n"

  try {
    // Export Users
    console.log("[v0] Exporting users...")
    const users = await prodDb`SELECT * FROM users ORDER BY created_at`
    sqlOutput += "-- Users (" + users.length + " records)\n"
    for (const user of users) {
      const values = [
        user.id ? `'${user.id.replace(/'/g, "''")}'` : "NULL",
        user.email ? `'${user.email.replace(/'/g, "''")}'` : "NULL",
        user.display_name ? `'${user.display_name.replace(/'/g, "''")}'` : "NULL",
        user.profile_image_url ? `'${user.profile_image_url.replace(/'/g, "''")}'` : "NULL",
        user.stripe_customer_id ? `'${user.stripe_customer_id.replace(/'/g, "''")}'` : "NULL",
        user.stripe_subscription_id ? `'${user.stripe_subscription_id.replace(/'/g, "''")}'` : "NULL",
        user.plan ? `'${user.plan}'` : "'free'",
        user.role ? `'${user.role}'` : "'user'",
        user.monthly_generation_limit || 10,
        user.generations_used_this_month || 0,
        user.gender ? `'${user.gender.replace(/'/g, "''")}'` : "NULL",
        user.profession ? `'${user.profession.replace(/'/g, "''")}'` : "NULL",
        user.brand_style ? `'${user.brand_style.replace(/'/g, "''")}'` : "NULL",
        user.photo_goals ? `'${user.photo_goals.replace(/'/g, "''")}'` : "NULL",
        user.created_at ? `'${user.created_at.toISOString()}'` : "NOW()",
        user.updated_at ? `'${user.updated_at.toISOString()}'` : "NOW()",
        user.last_login_at ? `'${user.last_login_at.toISOString()}'` : "NULL",
      ]
      sqlOutput += `INSERT INTO users (id, email, display_name, profile_image_url, stripe_customer_id, stripe_subscription_id, plan, role, monthly_generation_limit, generations_used_this_month, gender, profession, brand_style, photo_goals, created_at, updated_at, last_login_at) VALUES (${values.join(", ")}) ON CONFLICT (id) DO NOTHING;\n`
    }
    sqlOutput += "\n"

    // Export User Profiles
    console.log("[v0] Exporting user profiles...")
    const profiles = await prodDb`SELECT * FROM user_profiles ORDER BY created_at`
    sqlOutput += "-- User Profiles (" + profiles.length + " records)\n"
    for (const profile of profiles) {
      const values = [
        profile.user_id ? `'${profile.user_id.replace(/'/g, "''")}'` : "NULL",
        profile.full_name ? `'${profile.full_name.replace(/'/g, "''")}'` : "NULL",
        profile.phone ? `'${profile.phone.replace(/'/g, "''")}'` : "NULL",
        profile.location ? `'${profile.location.replace(/'/g, "''")}'` : "NULL",
        profile.instagram_handle ? `'${profile.instagram_handle.replace(/'/g, "''")}'` : "NULL",
        profile.website_url ? `'${profile.website_url.replace(/'/g, "''")}'` : "NULL",
        profile.bio ? `'${profile.bio.replace(/'/g, "''")}'` : "NULL",
        profile.brand_vibe ? `'${profile.brand_vibe.replace(/'/g, "''")}'` : "NULL",
        profile.goals ? `'${profile.goals.replace(/'/g, "''")}'` : "NULL",
        profile.created_at ? `'${profile.created_at.toISOString()}'` : "NOW()",
        profile.updated_at ? `'${profile.updated_at.toISOString()}'` : "NOW()",
      ]
      sqlOutput += `INSERT INTO user_profiles (user_id, full_name, phone, location, instagram_handle, website_url, bio, brand_vibe, goals, created_at, updated_at) VALUES (${values.join(", ")}) ON CONFLICT (user_id) DO NOTHING;\n`
    }
    sqlOutput += "\n"

    // Export Training Runs
    console.log("[v0] Exporting training runs...")
    const trainingRuns = await prodDb`SELECT * FROM training_runs ORDER BY created_at`
    sqlOutput += "-- Training Runs (" + trainingRuns.length + " records)\n"
    for (const run of trainingRuns) {
      const values = [
        run.user_id ? `'${run.user_id.replace(/'/g, "''")}'` : "NULL",
        run.replicate_model_id ? `'${run.replicate_model_id.replace(/'/g, "''")}'` : "NULL",
        run.trigger_word ? `'${run.trigger_word.replace(/'/g, "''")}'` : "NULL",
        run.training_status ? `'${run.training_status}'` : "'pending'",
        run.model_name ? `'${run.model_name.replace(/'/g, "''")}'` : "NULL",
        run.lora_weights_url ? `'${run.lora_weights_url.replace(/'/g, "''")}'` : "NULL",
        run.training_progress || 0,
        run.created_at ? `'${run.created_at.toISOString()}'` : "NOW()",
        run.started_at ? `'${run.started_at.toISOString()}'` : "NULL",
        run.completed_at ? `'${run.completed_at.toISOString()}'` : "NULL",
        run.updated_at ? `'${run.updated_at.toISOString()}'` : "NOW()",
      ]
      sqlOutput += `INSERT INTO training_runs (user_id, replicate_model_id, trigger_word, training_status, model_name, lora_weights_url, training_progress, created_at, started_at, completed_at, updated_at) VALUES (${values.join(", ")});\n`
    }
    sqlOutput += "\n"

    // Export Generated Images
    console.log("[v0] Exporting generated images...")
    const images = await prodDb`SELECT * FROM generated_images ORDER BY created_at LIMIT 100`
    sqlOutput += "-- Generated Images (first 100 of " + images.length + " records)\n"
    for (const image of images) {
      // Parse image_urls if it's a JSON string
      let imageUrl = "NULL"
      if (image.image_urls) {
        try {
          const urls = typeof image.image_urls === "string" ? JSON.parse(image.image_urls) : image.image_urls
          imageUrl = Array.isArray(urls) && urls.length > 0 ? `'${urls[0].replace(/'/g, "''")}'` : "NULL"
        } catch {
          imageUrl = `'${String(image.image_urls).replace(/'/g, "''")}'`
        }
      }

      const values = [
        image.user_id ? `'${image.user_id.replace(/'/g, "''")}'` : "NULL",
        imageUrl,
        image.prompt ? `'${image.prompt.replace(/'/g, "''")}'` : "NULL",
        image.category ? `'${image.category.replace(/'/g, "''")}'` : "NULL",
        image.subcategory ? `'${image.subcategory.replace(/'/g, "''")}'` : "NULL",
        image.saved ? "true" : "false",
        image.created_at ? `'${image.created_at.toISOString()}'` : "NOW()",
      ]
      sqlOutput += `INSERT INTO generated_images (user_id, image_url, prompt, category, subcategory, is_favorite, created_at) VALUES (${values.join(", ")});\n`
    }
    sqlOutput += "\n"

    // Export Maya Chats
    console.log("[v0] Exporting Maya chats...")
    const chats = await prodDb`SELECT * FROM maya_chats ORDER BY created_at`
    sqlOutput += "-- Maya Chats (" + chats.length + " records)\n"
    for (const chat of chats) {
      const values = [
        chat.user_id ? `'${chat.user_id.replace(/'/g, "''")}'` : "NULL",
        chat.title ? `'${chat.title.replace(/'/g, "''")}'` : "'New Chat'",
        chat.created_at ? `'${chat.created_at.toISOString()}'` : "NOW()",
        chat.updated_at ? `'${chat.updated_at.toISOString()}'` : "NOW()",
      ]
      sqlOutput += `INSERT INTO maya_chats (user_id, title, created_at, updated_at) VALUES (${values.join(", ")});\n`
    }
    sqlOutput += "\n"

    // Export Subscriptions
    console.log("[v0] Exporting subscriptions...")
    const subscriptions = await prodDb`SELECT * FROM subscriptions ORDER BY created_at`
    sqlOutput += "-- Subscriptions (" + subscriptions.length + " records)\n"
    for (const sub of subscriptions) {
      const values = [
        sub.user_id ? `'${sub.user_id.replace(/'/g, "''")}'` : "NULL",
        sub.stripe_subscription_id ? `'${sub.stripe_subscription_id.replace(/'/g, "''")}'` : "NULL",
        sub.stripe_customer_id ? `'${sub.stripe_customer_id.replace(/'/g, "''")}'` : "NULL",
        sub.plan_id ? `'${sub.plan_id}'` : "'free'",
        sub.status ? `'${sub.status}'` : "'active'",
        sub.current_period_start ? `'${sub.current_period_start.toISOString()}'` : "NOW()",
        sub.current_period_end ? `'${sub.current_period_end.toISOString()}'` : "NOW()",
        sub.cancel_at_period_end ? "true" : "false",
        sub.created_at ? `'${sub.created_at.toISOString()}'` : "NOW()",
        sub.updated_at ? `'${sub.updated_at.toISOString()}'` : "NOW()",
      ]
      sqlOutput += `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at) VALUES (${values.join(", ")}) ON CONFLICT (user_id) DO NOTHING;\n`
    }
    sqlOutput += "\n"

    sqlOutput += "COMMIT;\n\n"
    sqlOutput += "-- Export complete!\n"
    sqlOutput += "-- Total records exported:\n"
    sqlOutput += "-- Users: " + users.length + "\n"
    sqlOutput += "-- Profiles: " + profiles.length + "\n"
    sqlOutput += "-- Training Runs: " + trainingRuns.length + "\n"
    sqlOutput += "-- Images: " + images.length + " (limited to 100)\n"
    sqlOutput += "-- Chats: " + chats.length + "\n"
    sqlOutput += "-- Subscriptions: " + subscriptions.length + "\n"

    console.log("\n[v0] ========================================")
    console.log("[v0] SQL EXPORT COMPLETE!")
    console.log("[v0] ========================================\n")
    console.log(sqlOutput)
    console.log("\n[v0] Copy the SQL above and run it in your Supabase SQL editor")
    console.log("[v0] Or save it to a file and run: psql <connection-string> < export.sql")
  } catch (error) {
    console.error("[v0] Export error:", error)
  }
}

exportToSQL()
