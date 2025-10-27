import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateChats() {
  console.log("[v0] Migrating Maya chats and messages...")

  try {
    // Migrate Chats
    const chats = await prodDb`SELECT * FROM maya_chats`
    console.log(`[v0] Found ${chats.length} chats`)

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

      if (error) {
        console.log(`[v0] ✗ Error migrating chat ${chat.id}:`, error.message)
      }
    }
    console.log(`[v0] ✓ Migrated ${chats.length} chats`)

    // Migrate Messages
    const messages = await prodDb`SELECT * FROM maya_chat_messages`
    console.log(`[v0] Found ${messages.length} messages`)

    let migrated = 0
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

      if (error) {
        console.log(`[v0] ✗ Error migrating message ${message.id}:`, error.message)
      } else {
        migrated++
        if (migrated % 100 === 0) {
          console.log(`[v0] Progress: ${migrated}/${messages.length} messages migrated`)
        }
      }
    }

    console.log(`[v0] ✅ Chats migration complete! Migrated ${migrated}/${messages.length} messages`)
  } catch (error) {
    console.error("[v0] Migration failed:", error)
  }
}

migrateChats()
