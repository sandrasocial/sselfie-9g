import { neon } from "@neondatabase/serverless"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

async function exportToSQL() {
  console.log("[v0] Starting SQL export...\n")

  try {
    // Fetch all data
    const users = await prodDb`SELECT * FROM users`
    const profiles = await prodDb`SELECT * FROM user_profiles`
    const training = await prodDb`SELECT * FROM training_runs`
    const images = await prodDb`SELECT * FROM generated_images`
    const chats = await prodDb`SELECT * FROM maya_chats`
    const messages = await prodDb`SELECT * FROM maya_chat_messages`
    const subs = await prodDb`SELECT * FROM subscriptions`

    console.log("[v0] Generating SQL INSERT statements...\n")
    console.log("-- SSELFIE Production Data Export\n")
    console.log("-- Run this SQL in Supabase SQL Editor\n\n")

    // Users
    console.log("-- Insert Users")
    for (const user of users) {
      const values = [
        user.id ? `'${user.id}'` : "NULL",
        user.email ? `'${user.email.replace(/'/g, "''")}'` : "NULL",
        user.display_name ? `'${user.display_name.replace(/'/g, "''")}'` : "NULL",
        user.profile_image_url ? `'${user.profile_image_url}'` : "NULL",
        user.stripe_customer_id ? `'${user.stripe_customer_id}'` : "NULL",
        user.stripe_subscription_id ? `'${user.stripe_subscription_id}'` : "NULL",
        user.plan ? `'${user.plan}'` : "'free'",
        user.role ? `'${user.role}'` : "'user'",
        user.monthly_generation_limit || 10,
        user.generations_used_this_month || 0,
        user.gender ? `'${user.gender}'` : "NULL",
        user.profession ? `'${user.profession.replace(/'/g, "''")}'` : "NULL",
        user.brand_style ? `'${user.brand_style.replace(/'/g, "''")}'` : "NULL",
        user.photo_goals ? `'${user.photo_goals.replace(/'/g, "''")}'` : "NULL",
        user.onboarding_completed ? "true" : "false",
        user.created_at ? `'${user.created_at}'` : "NOW()",
        user.updated_at ? `'${user.updated_at}'` : "NOW()",
        user.last_login_at ? `'${user.last_login_at}'` : "NULL",
      ]
      console.log(
        `INSERT INTO users (id, email, display_name, profile_image_url, stripe_customer_id, stripe_subscription_id, plan, role, monthly_generation_limit, generations_used_this_month, gender, profession, brand_style, photo_goals, onboarding_completed, created_at, updated_at, last_login_at) VALUES (${values.join(", ")}) ON CONFLICT (id) DO NOTHING;`,
      )
    }

    // Profiles
    console.log("\n-- Insert User Profiles")
    for (const profile of profiles) {
      const values = [
        profile.user_id ? `'${profile.user_id}'` : "NULL",
        profile.full_name ? `'${profile.full_name.replace(/'/g, "''")}'` : "NULL",
        profile.phone ? `'${profile.phone}'` : "NULL",
        profile.location ? `'${profile.location.replace(/'/g, "''")}'` : "NULL",
        profile.instagram_handle ? `'${profile.instagram_handle}'` : "NULL",
        profile.website_url ? `'${profile.website_url}'` : "NULL",
        profile.bio ? `'${profile.bio.replace(/'/g, "''")}'` : "NULL",
        profile.brand_vibe ? `'${profile.brand_vibe.replace(/'/g, "''")}'` : "NULL",
        profile.goals ? `'${profile.goals.replace(/'/g, "''")}'` : "NULL",
        profile.created_at ? `'${profile.created_at}'` : "NOW()",
        profile.updated_at ? `'${profile.updated_at}'` : "NOW()",
      ]
      console.log(
        `INSERT INTO user_profiles (user_id, full_name, phone, location, instagram_handle, website_url, bio, brand_vibe, goals, created_at, updated_at) VALUES (${values.join(", ")}) ON CONFLICT (user_id) DO NOTHING;`,
      )
    }

    // Training runs
    console.log("\n-- Insert Training Runs")
    for (const run of training) {
      const values = [
        run.user_id ? `'${run.user_id}'` : "NULL",
        run.replicate_model_id ? `'${run.replicate_model_id}'` : "NULL",
        run.trigger_word ? `'${run.trigger_word}'` : "NULL",
        run.training_status ? `'${run.training_status}'` : "'pending'",
        run.model_name ? `'${run.model_name.replace(/'/g, "''")}'` : "NULL",
        run.lora_weights_url ? `'${run.lora_weights_url}'` : "NULL",
        run.training_progress || 0,
        run.created_at ? `'${run.created_at}'` : "NOW()",
        run.started_at ? `'${run.started_at}'` : "NULL",
        run.completed_at ? `'${run.completed_at}'` : "NULL",
      ]
      console.log(
        `INSERT INTO training_runs (user_id, replicate_model_id, trigger_word, training_status, model_name, lora_weights_url, training_progress, created_at, started_at, completed_at) VALUES (${values.join(", ")});`,
      )
    }

    // Images
    console.log("\n-- Insert Generated Images")
    for (const img of images) {
      const imageUrls = typeof img.image_urls === "string" ? img.image_urls : JSON.stringify(img.image_urls)
      const values = [
        img.user_id ? `'${img.user_id}'` : "NULL",
        img.category ? `'${img.category}'` : "NULL",
        img.subcategory ? `'${img.subcategory}'` : "NULL",
        img.prompt ? `'${img.prompt.replace(/'/g, "''")}'` : "NULL",
        `'${imageUrls.replace(/'/g, "''")}'`,
        img.selected_url ? `'${img.selected_url}'` : "NULL",
        img.saved ? "true" : "false",
        img.created_at ? `'${img.created_at}'` : "NOW()",
      ]
      console.log(
        `INSERT INTO generated_images (user_id, category, subcategory, prompt, image_urls, selected_url, saved, created_at) VALUES (${values.join(", ")});`,
      )
    }

    // Chats
    console.log("\n-- Insert Maya Chats")
    for (const chat of chats) {
      const values = [
        chat.user_id ? `'${chat.user_id}'` : "NULL",
        chat.title ? `'${chat.title.replace(/'/g, "''")}'` : "'New Chat'",
        chat.created_at ? `'${chat.created_at}'` : "NOW()",
        chat.updated_at ? `'${chat.updated_at}'` : "NOW()",
      ]
      console.log(`INSERT INTO maya_chats (user_id, title, created_at, updated_at) VALUES (${values.join(", ")});`)
    }

    // Messages
    console.log("\n-- Insert Maya Chat Messages")
    for (const msg of messages) {
      const content = msg.content ? msg.content.replace(/'/g, "''") : ""
      const values = [
        msg.chat_id || "NULL",
        msg.role ? `'${msg.role}'` : "'user'",
        `'${content}'`,
        msg.created_at ? `'${msg.created_at}'` : "NOW()",
      ]
      console.log(`INSERT INTO maya_chat_messages (chat_id, role, content, created_at) VALUES (${values.join(", ")});`)
    }

    // Subscriptions
    console.log("\n-- Insert Subscriptions")
    for (const sub of subs) {
      const values = [
        sub.user_id ? `'${sub.user_id}'` : "NULL",
        sub.stripe_subscription_id ? `'${sub.stripe_subscription_id}'` : "NULL",
        sub.plan ? `'${sub.plan}'` : "'free'",
        sub.status ? `'${sub.status}'` : "'active'",
        sub.current_period_start ? `'${sub.current_period_start}'` : "NULL",
        sub.current_period_end ? `'${sub.current_period_end}'` : "NULL",
        sub.cancel_at_period_end ? "true" : "false",
        sub.created_at ? `'${sub.created_at}'` : "NOW()",
        sub.updated_at ? `'${sub.updated_at}'` : "NOW()",
      ]
      console.log(
        `INSERT INTO subscriptions (user_id, stripe_subscription_id, plan, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at) VALUES (${values.join(", ")}) ON CONFLICT (user_id) DO NOTHING;`,
      )
    }

    console.log("\n\n[v0] SQL export complete! Copy all the SQL above and run it in Supabase.")
  } catch (error) {
    console.error("[v0] Error:", error)
  }
}

exportToSQL()
