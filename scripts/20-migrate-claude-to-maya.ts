import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function migrateChatData() {
  console.log("🔄 Starting migration from claude_conversations to maya_chats...")

  try {
    // Step 1: Migrate conversations
    console.log("\n📋 Step 1: Migrating conversations...")
    const claudeConversations = await sql`
      SELECT * FROM claude_conversations
      ORDER BY created_at ASC
    `

    console.log(`Found ${claudeConversations.length} conversations to migrate`)

    for (const conv of claudeConversations) {
      // Check if already migrated
      const existing = await sql`
        SELECT id FROM maya_chats 
        WHERE user_id = ${conv.user_id} 
        AND created_at = ${conv.created_at}
      `

      if (existing.length > 0) {
        console.log(`⏭️  Skipping conversation ${conv.id} - already migrated`)
        continue
      }

      // Insert into maya_chats
      const newChat = await sql`
        INSERT INTO maya_chats (
          user_id,
          chat_title,
          chat_category,
          chat_summary,
          created_at,
          updated_at,
          last_activity
        )
        VALUES (
          ${conv.user_id},
          ${conv.title || "Migrated Chat"},
          'general',
          ${conv.context ? JSON.stringify(conv.context) : null},
          ${conv.created_at},
          ${conv.updated_at || conv.created_at},
          ${conv.last_message_at || conv.created_at}
        )
        RETURNING id
      `

      console.log(`✅ Migrated conversation ${conv.id} → maya_chat ${newChat[0].id}`)

      // Step 2: Migrate messages for this conversation
      const claudeMessages = await sql`
        SELECT * FROM claude_messages
        WHERE conversation_id = ${conv.conversation_id}
        ORDER BY created_at ASC
      `

      console.log(`  📨 Found ${claudeMessages.length} messages for conversation ${conv.id}`)

      for (const msg of claudeMessages) {
        // Extract concept cards from metadata if they exist
        let conceptCards = null
        if (msg.metadata && typeof msg.metadata === "object") {
          const metadata = msg.metadata as any
          if (metadata.concept_cards || metadata.conceptCards) {
            conceptCards = metadata.concept_cards || metadata.conceptCards
          }
        }

        // Extract concept cards from tool_results if they exist
        if (!conceptCards && msg.tool_results) {
          const toolResults = msg.tool_results as any
          if (Array.isArray(toolResults)) {
            for (const result of toolResults) {
              if (result.concepts || result.conceptCards) {
                conceptCards = result.concepts || result.conceptCards
                break
              }
            }
          }
        }

        await sql`
          INSERT INTO maya_chat_messages (
            chat_id,
            role,
            content,
            concept_cards,
            created_at
          )
          VALUES (
            ${newChat[0].id},
            ${msg.role},
            ${msg.content || ""},
            ${conceptCards ? JSON.stringify(conceptCards) : null},
            ${msg.created_at || msg.timestamp}
          )
        `
      }

      console.log(`  ✅ Migrated ${claudeMessages.length} messages`)
    }

    // Step 3: Verify migration
    console.log("\n🔍 Verifying migration...")
    const mayaChatsCount = await sql`SELECT COUNT(*) as count FROM maya_chats`
    const mayaMessagesCount = await sql`SELECT COUNT(*) as count FROM maya_chat_messages`

    console.log(`\n✅ Migration complete!`)
    console.log(`   Maya chats: ${mayaChatsCount[0].count}`)
    console.log(`   Maya messages: ${mayaMessagesCount[0].count}`)
    console.log(`   Original conversations: ${claudeConversations.length}`)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  }
}

migrateChatData()
  .then(() => {
    console.log("\n🎉 Migration completed successfully!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error)
    process.exit(1)
  })
