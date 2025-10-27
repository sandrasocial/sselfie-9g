"use server"

import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"

const prodDb = neon(process.env.DATABASE_URL!)

export async function checkProductionData() {
  try {
    const users = await prodDb`SELECT COUNT(*) as count FROM users`
    const models = await prodDb`SELECT COUNT(*) as count FROM training_runs`
    const images = await prodDb`SELECT COUNT(*) as count FROM generated_images`
    const chats = await prodDb`SELECT COUNT(*) as count FROM maya_chats`
    const subscriptions = await prodDb`SELECT COUNT(*) as count FROM subscriptions`

    const message = `Production Data:
• Users: ${users[0].count}
• Trained Models: ${models[0].count}
• Generated Images: ${images[0].count}
• Maya Chats: ${chats[0].count}
• Subscriptions: ${subscriptions[0].count}`

    return { success: true, message }
  } catch (error) {
    console.error("[v0] Check error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function verifyMigration() {
  try {
    const supabase = await createServerClient()

    const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true })
    const { count: modelsCount } = await supabase.from("training_runs").select("*", { count: "exact", head: true })
    const { count: imagesCount } = await supabase.from("generated_images").select("*", { count: "exact", head: true })
    const { count: chatsCount } = await supabase.from("maya_chats").select("*", { count: "exact", head: true })
    const { count: subsCount } = await supabase.from("subscriptions").select("*", { count: "exact", head: true })

    const message = `Migrated Data in Supabase:
• Users: ${usersCount || 0}
• Trained Models: ${modelsCount || 0}
• Generated Images: ${imagesCount || 0}
• Maya Chats: ${chatsCount || 0}
• Subscriptions: ${subsCount || 0}`

    return { success: true, message }
  } catch (error) {
    console.error("[v0] Verify error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function migrateUsers() {
  try {
    const supabase = await createServerClient()

    // Fetch users from production
    const users = await prodDb`SELECT * FROM users`
    const profiles = await prodDb`SELECT * FROM user_profiles`

    // Insert users
    for (const user of users) {
      const { error: userError } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          display_name:
            user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : user.first_name || user.email?.split("@")[0],
          profile_image_url: user.profile_image_url,
          stripe_customer_id: user.stripe_customer_id,
          stripe_subscription_id: user.stripe_subscription_id,
          plan: user.plan || "free",
          role: user.role || "user",
          monthly_generation_limit: user.monthly_generation_limit || 50,
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

      if (userError) {
        console.error("[v0] Error inserting user:", userError)
      }
    }

    // Insert profiles
    for (const profile of profiles) {
      const { error: profileError } = await supabase.from("user_profiles").upsert(
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

      if (profileError) {
        console.error("[v0] Error inserting profile:", profileError)
      }
    }

    return { success: true, message: `Migrated ${users.length} users and ${profiles.length} profiles` }
  } catch (error) {
    console.error("[v0] Migration error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function migrateTraining() {
  try {
    const supabase = await createServerClient()

    // Fetch training data from production
    const trainingRuns = await prodDb`SELECT * FROM training_runs`

    // Insert training runs
    for (const run of trainingRuns) {
      const { error } = await supabase.from("training_runs").upsert(
        {
          id: run.id,
          user_id: run.user_id,
          replicate_model_id: run.replicate_model_id,
          trigger_word: run.trigger_word,
          training_status: run.training_status,
          model_name: run.model_name,
          created_at: run.created_at,
          completed_at: run.completed_at,
          replicate_version_id: run.replicate_version_id,
          training_progress: run.training_progress,
          estimated_completion_time: run.estimated_completion_time,
          failure_reason: run.failure_reason,
          updated_at: run.updated_at,
          trained_model_path: run.trained_model_path,
          started_at: run.started_at,
          is_luxury: run.is_luxury,
          model_type: run.model_type,
          finetune_id: run.finetune_id,
          lora_weights_url: run.lora_weights_url,
          training_id: run.training_id,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.error("[v0] Error inserting training run:", error)
      }
    }

    return { success: true, message: `Migrated ${trainingRuns.length} training runs` }
  } catch (error) {
    console.error("[v0] Migration error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function migrateImages() {
  try {
    const supabase = await createServerClient()

    // Fetch images from production
    const images = await prodDb`SELECT * FROM generated_images`

    // Insert images
    for (const image of images) {
      // Parse image_urls if it's a string
      let imageUrls = image.image_urls
      if (typeof imageUrls === "string") {
        try {
          imageUrls = JSON.parse(imageUrls)
        } catch {
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

      if (error) {
        console.error("[v0] Error inserting image:", error)
      }
    }

    return { success: true, message: `Migrated ${images.length} images` }
  } catch (error) {
    console.error("[v0] Migration error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function migrateChats() {
  try {
    const supabase = await createServerClient()

    // Fetch chats from production
    const chats = await prodDb`SELECT * FROM maya_chats`
    const messages = await prodDb`SELECT * FROM maya_chat_messages`

    // Insert chats
    for (const chat of chats) {
      const { error } = await supabase.from("maya_chats").upsert(
        {
          id: chat.id,
          user_id: chat.user_id,
          title: chat.title,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.error("[v0] Error inserting chat:", error)
      }
    }

    // Insert messages
    for (const message of messages) {
      const { error } = await supabase.from("maya_chat_messages").upsert(
        {
          id: message.id,
          chat_id: message.chat_id,
          role: message.role,
          content: message.content,
          concept_cards: message.concept_cards,
          styling_details: message.styling_details,
          created_at: message.created_at,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.error("[v0] Error inserting message:", error)
      }
    }

    return { success: true, message: `Migrated ${chats.length} chats and ${messages.length} messages` }
  } catch (error) {
    console.error("[v0] Migration error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function migrateSubscriptions() {
  try {
    const supabase = await createServerClient()

    // Fetch subscriptions from production
    const subscriptions = await prodDb`SELECT * FROM subscriptions`

    // Insert subscriptions
    for (const sub of subscriptions) {
      const { error } = await supabase.from("subscriptions").upsert(
        {
          id: sub.id,
          user_id: sub.user_id,
          stripe_subscription_id: sub.stripe_subscription_id,
          stripe_customer_id: sub.stripe_customer_id,
          plan: sub.plan,
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
          created_at: sub.created_at,
          updated_at: sub.updated_at,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.error("[v0] Error inserting subscription:", error)
      }
    }

    return { success: true, message: `Migrated ${subscriptions.length} subscriptions` }
  } catch (error) {
    console.error("[v0] Migration error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" }
  }
}
