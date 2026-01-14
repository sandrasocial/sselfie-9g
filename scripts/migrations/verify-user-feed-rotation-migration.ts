/**
 * Migration Verifier: Verify user_feed_rotation_state table
 * 
 * Verifies that the table was created correctly with all required columns and constraints.
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

async function verifyMigration() {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    console.log("[Verification] Verifying user_feed_rotation_state table...")

    // Check if table exists
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_feed_rotation_state'
    `

    if (tableCheck.length === 0) {
      console.error("[Verification] ❌ Table user_feed_rotation_state does not exist")
      process.exit(1)
    }

    console.log("[Verification] ✅ Table exists")

    // Check columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_feed_rotation_state'
      ORDER BY ordinal_position
    `

    const expectedColumns = [
      { name: 'id', type: 'integer' },
      { name: 'user_id', type: 'character varying' },
      { name: 'vibe', type: 'character varying' },
      { name: 'fashion_style', type: 'character varying' },
      { name: 'outfit_index', type: 'integer' },
      { name: 'location_index', type: 'integer' },
      { name: 'accessory_index', type: 'integer' },
      { name: 'last_used_at', type: 'timestamp with time zone' },
      { name: 'total_generations', type: 'integer' },
      { name: 'created_at', type: 'timestamp with time zone' },
      { name: 'updated_at', type: 'timestamp with time zone' },
    ]

    console.log("\n[Verification] Table columns:")
    const foundColumns = new Set<string>()
    for (const col of columns as any[]) {
      foundColumns.add(col.column_name)
      console.log(`  ✅ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
    }

    // Verify all expected columns exist
    const missingColumns = expectedColumns.filter(exp => !foundColumns.has(exp.name))
    if (missingColumns.length > 0) {
      console.error(`[Verification] ❌ Missing columns: ${missingColumns.map(c => c.name).join(', ')}`)
      process.exit(1)
    }

    // Check unique constraint
    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'user_feed_rotation_state'
      AND constraint_type = 'UNIQUE'
    `

    const hasUniqueConstraint = (constraints as any[]).some(
      (c: any) => c.constraint_name === 'unique_user_vibe_style' || c.constraint_name.includes('user_vibe_style')
    )

    if (!hasUniqueConstraint) {
      console.error("[Verification] ❌ Unique constraint (user_id, vibe, fashion_style) not found")
      process.exit(1)
    }

    console.log("[Verification] ✅ Unique constraint exists")

    // Check indexes
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'user_feed_rotation_state'
    `

    console.log("\n[Verification] Indexes:")
    for (const idx of indexes as any[]) {
      console.log(`  ✅ ${idx.indexname}`)
    }

    console.log("\n[Verification] ✅ All checks passed!")
    process.exit(0)
  } catch (error: any) {
    console.error("[Verification] ❌ Verification failed:", error.message)
    if (error.stack) {
      console.error("[Verification] Stack trace:", error.stack)
    }
    process.exit(1)
  }
}

// Run verification
verifyMigration()
