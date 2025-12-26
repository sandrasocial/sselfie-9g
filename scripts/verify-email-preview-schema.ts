/**
 * Verification Script: Check Email Preview Schema
 * 
 * This script verifies that the email_preview_data column exists
 * and checks if email previews are being saved correctly.
 * 
 * Run with: npx tsx scripts/verify-email-preview-schema.ts
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("[Verify] ❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function verifyEmailPreviewSchema() {
  try {
    console.log("[Verify] 🔍 Checking email preview schema...\n")

    // Step 1: Check if table exists
    console.log("[Verify] Step 1: Checking if admin_agent_messages table exists...")
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'admin_agent_messages'
      ) as exists
    `
    
    if (!tableCheck[0]?.exists) {
      console.error("[Verify] ❌ Table admin_agent_messages does not exist!")
      console.log("[Verify] 💡 Run migration: scripts/38-run-email-preview-data-migration.ts")
      return false
    }
    console.log("[Verify] ✅ Table admin_agent_messages exists\n")

    // Step 2: Check if email_preview_data column exists
    console.log("[Verify] Step 2: Checking if email_preview_data column exists...")
    const columnCheck = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'admin_agent_messages'
      AND column_name = 'email_preview_data'
    `
    
    if (columnCheck.length === 0) {
      console.error("[Verify] ❌ Column email_preview_data does NOT exist!")
      console.log("[Verify] 💡 Run migration: scripts/38-run-email-preview-data-migration.ts")
      return false
    }
    
    console.log("[Verify] ✅ Column email_preview_data exists:")
    console.log("[Verify]   - Type:", columnCheck[0].data_type)
    console.log("[Verify]   - Nullable:", columnCheck[0].is_nullable)
    console.log()

    // Step 3: Check table structure
    console.log("[Verify] Step 3: Checking table structure...")
    const allColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'admin_agent_messages'
      ORDER BY ordinal_position
    `
    console.log("[Verify] Table columns:")
    allColumns.forEach((col: any) => {
      console.log(`[Verify]   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    console.log()

    // Step 4: Check if any messages have email_preview_data
    console.log("[Verify] Step 4: Checking if email previews are being saved...")
    const previewStats = await sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages,
        COUNT(*) FILTER (WHERE email_preview_data IS NOT NULL) as messages_with_preview,
        COUNT(*) FILTER (WHERE role = 'assistant' AND email_preview_data IS NOT NULL) as assistant_with_preview
      FROM admin_agent_messages
    `
    
    const stats = previewStats[0]
    console.log("[Verify] Message statistics:")
    console.log("[Verify]   - Total messages:", stats.total_messages)
    console.log("[Verify]   - Assistant messages:", stats.assistant_messages)
    console.log("[Verify]   - Messages with email_preview_data:", stats.messages_with_preview)
    console.log("[Verify]   - Assistant messages with preview:", stats.assistant_with_preview)
    console.log()

    // Step 5: Check recent email previews
    if (stats.messages_with_preview > 0) {
      console.log("[Verify] Step 5: Checking recent email previews...")
      const recentPreviews = await sql`
        SELECT 
          id,
          chat_id,
          created_at,
          email_preview_data->>'subjectLine' as subject,
          LENGTH(email_preview_data->>'html') as html_length,
          email_preview_data->>'preview' as preview_text
        FROM admin_agent_messages
        WHERE email_preview_data IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 5
      `
      
      console.log("[Verify] Recent email previews:")
      recentPreviews.forEach((preview: any, idx: number) => {
        console.log(`[Verify]   ${idx + 1}. Message ID: ${preview.id}`)
        console.log(`[Verify]      Subject: ${preview.subject || 'N/A'}`)
        console.log(`[Verify]      HTML Length: ${preview.html_length || 0} chars`)
        console.log(`[Verify]      Created: ${preview.created_at}`)
        console.log()
      })
    } else {
      console.log("[Verify] ⚠️  No email previews found in database")
      console.log("[Verify] 💡 This might mean:")
      console.log("[Verify]   1. No emails have been created yet")
      console.log("[Verify]   2. Email previews are not being saved (check server logs)")
      console.log()
    }

    // Step 6: Check for schema conflicts
    console.log("[Verify] Step 6: Checking for potential schema conflicts...")
    const constraintCheck = await sql`
      SELECT 
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'admin_agent_messages'
    `
    
    if (constraintCheck.length > 0) {
      console.log("[Verify] Table constraints:")
      constraintCheck.forEach((constraint: any) => {
        console.log(`[Verify]   - ${constraint.constraint_name}: ${constraint.constraint_type}`)
      })
    }
    console.log()

    // Summary
    console.log("[Verify] 📊 Summary:")
    console.log("[Verify]   ✅ Table exists")
    console.log("[Verify]   ✅ Column exists")
    console.log(`[Verify]   ${stats.messages_with_preview > 0 ? '✅' : '⚠️ '} Email previews: ${stats.messages_with_preview}`)
    
    if (stats.messages_with_preview === 0 && stats.assistant_messages > 0) {
      console.log("[Verify]")
      console.log("[Verify] ⚠️  WARNING: Assistant messages exist but no email previews found!")
      console.log("[Verify]    This suggests email previews are not being saved.")
      console.log("[Verify]    Check server logs for errors when saving messages.")
    }

    console.log()
    console.log("[Verify] 🎉 Verification complete!")
    return true
  } catch (error: any) {
    console.error("[Verify] ❌ Verification failed:", error)
    console.error("[Verify] Error details:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail
    })
    return false
  }
}

// Run verification
verifyEmailPreviewSchema()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("[Verify] Fatal error:", error)
    process.exit(1)
  })

