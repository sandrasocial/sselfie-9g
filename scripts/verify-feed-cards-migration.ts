/**
 * Verify feed_cards column migration
 */

import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function verifyMigration() {
  console.log("🔍 Verifying feed_cards column migration...\n")

  try {
    // Check if column exists
    const columnInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'maya_chat_messages'
      AND column_name = 'feed_cards'
    `

    if (columnInfo.length === 0) {
      console.log("❌ feed_cards column NOT found!")
      process.exit(1)
    }

    console.log("✅ feed_cards column exists:")
    console.log(`   - Type: ${columnInfo[0].data_type}`)
    console.log(`   - Nullable: ${columnInfo[0].is_nullable}\n`)

    // Check index
    const indexInfo = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'maya_chat_messages'
      AND indexname = 'idx_maya_chat_messages_feed_cards'
    `

    if (indexInfo.length === 0) {
      console.log("⚠️  GIN index NOT found!")
    } else {
      console.log("✅ GIN index exists:")
      console.log(`   - Name: ${indexInfo[0].indexname}\n`)
    }

    // Count messages with feed_cards
    const feedCardsCount = await sql`
      SELECT COUNT(*) as count
      FROM maya_chat_messages
      WHERE feed_cards IS NOT NULL
    `
    console.log(`📊 Messages with feed_cards: ${feedCardsCount[0]?.count || 0}`)

    // Count messages still in styling_details
    const stylingCount = await sql`
      SELECT COUNT(*) as count
      FROM maya_chat_messages
      WHERE styling_details IS NOT NULL
        AND styling_details::text LIKE '%"feedStrategy"%'
    `
    console.log(`📊 Messages with feed cards in styling_details: ${stylingCount[0]?.count || 0}\n`)

    console.log("✅ Migration verification complete!")
  } catch (error: any) {
    console.error("❌ Verification error:", error.message)
    process.exit(1)
  }
}

verifyMigration()

