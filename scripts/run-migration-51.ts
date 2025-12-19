#!/usr/bin/env tsx
/**
 * Run migration 51: Add is_public field to selfie-related tables
 * 
 * This script executes the SQL migration to add is_public boolean field to:
 * - selfies
 * - selfie_versions
 * - selfie_versions_metadata
 * - selfie_versions_metadata_audit
 */

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL or POSTGRES_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function runMigration() {
  try {
    console.log("🚀 Starting migration 51: Add is_public to selfie tables...\n")

    // Step 1: Add is_public to selfies table
    console.log("[1/8] Adding is_public to selfies table...")
    try {
      await sql`
        ALTER TABLE selfies
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.message?.includes("does not exist")) {
        console.log("   ⚠️  Table 'selfies' doesn't exist yet (will be created later)\n")
      } else if (error.code === "42701" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Column already exists (skipping)\n")
      } else {
        throw error
      }
    }

    // Step 2: Add is_public to selfie_versions table
    console.log("[2/8] Adding is_public to selfie_versions table...")
    try {
      await sql`
        ALTER TABLE selfie_versions
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.message?.includes("does not exist")) {
        console.log("   ⚠️  Table 'selfie_versions' doesn't exist yet (will be created later)\n")
      } else if (error.code === "42701" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Column already exists (skipping)\n")
      } else {
        throw error
      }
    }

    // Step 3: Add is_public to selfie_versions_metadata table
    console.log("[3/8] Adding is_public to selfie_versions_metadata table...")
    try {
      await sql`
        ALTER TABLE selfie_versions_metadata
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.message?.includes("does not exist")) {
        console.log("   ⚠️  Table 'selfie_versions_metadata' doesn't exist yet (will be created later)\n")
      } else if (error.code === "42701" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Column already exists (skipping)\n")
      } else {
        throw error
      }
    }

    // Step 4: Add is_public to selfie_versions_metadata_audit table
    console.log("[4/8] Adding is_public to selfie_versions_metadata_audit table...")
    try {
      await sql`
        ALTER TABLE selfie_versions_metadata_audit
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.message?.includes("does not exist")) {
        console.log("   ⚠️  Table 'selfie_versions_metadata_audit' doesn't exist yet (will be created later)\n")
      } else if (error.code === "42701" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Column already exists (skipping)\n")
      } else {
        throw error
      }
    }

    // Step 5-8: Create indexes
    console.log("[5/8] Creating index on selfies.is_public...")
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_selfies_is_public 
        ON selfies(is_public) 
        WHERE is_public = true
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.code === "42P07" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Index already exists (skipping)\n")
      } else {
        console.log(`   ⚠️  Could not create index (non-critical): ${error.message}\n`)
      }
    }

    console.log("[6/8] Creating index on selfie_versions.is_public...")
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_selfie_versions_is_public 
        ON selfie_versions(is_public) 
        WHERE is_public = true
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.code === "42P07" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Index already exists (skipping)\n")
      } else {
        console.log(`   ⚠️  Could not create index (non-critical): ${error.message}\n`)
      }
    }

    console.log("[7/8] Creating index on selfie_versions_metadata.is_public...")
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_is_public 
        ON selfie_versions_metadata(is_public) 
        WHERE is_public = true
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.code === "42P07" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Index already exists (skipping)\n")
      } else {
        console.log(`   ⚠️  Could not create index (non-critical): ${error.message}\n`)
      }
    }

    console.log("[8/8] Creating index on selfie_versions_metadata_audit.is_public...")
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_is_public 
        ON selfie_versions_metadata_audit(is_public) 
        WHERE is_public = true
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.code === "42P07" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Index already exists (skipping)\n")
      } else {
        console.log(`   ⚠️  Could not create index (non-critical): ${error.message}\n`)
      }
    }

    console.log("✅ Migration 51 completed successfully!")
    console.log("\n📊 Summary:")
    console.log("   - Added is_public BOOLEAN DEFAULT false to:")
    console.log("     • selfies")
    console.log("     • selfie_versions")
    console.log("     • selfie_versions_metadata")
    console.log("     • selfie_versions_metadata_audit")
    console.log("   - Created indexes for is_public queries")
  } catch (error: any) {
    console.error("\n❌ Migration failed:")
    console.error(error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

runMigration()
