#!/usr/bin/env tsx
/**
 * Create selfie-related tables
 * 
 * This script creates the following tables:
 * - selfies
 * - selfie_versions
 * - selfie_versions_metadata
 * - selfie_versions_metadata_audit
 * 
 * All tables include the is_public field.
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

async function createTables() {
  try {
    console.log("🚀 Creating selfie-related tables...\n")

    // Step 1: Create selfies table
    console.log("[1/15] Creating selfies table...")
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS selfies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          thumbnail_url TEXT,
          title TEXT,
          description TEXT,
          metadata JSONB DEFAULT '{}',
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.code === "42P07" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Table already exists (skipping)\n")
      } else {
        throw error
      }
    }

    // Step 2: Create selfie_versions table
    console.log("[2/15] Creating selfie_versions table...")
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS selfie_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          selfie_id UUID REFERENCES selfies(id) ON DELETE CASCADE,
          user_id TEXT,
          image_url TEXT NOT NULL,
          thumbnail_url TEXT,
          version_number INTEGER DEFAULT 1,
          prompt TEXT,
          negative_prompt TEXT,
          model_version TEXT,
          replicate_prediction_id TEXT,
          seed INTEGER,
          guidance_scale DECIMAL(4,2),
          num_inference_steps INTEGER,
          width INTEGER,
          height INTEGER,
          metadata JSONB DEFAULT '{}',
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.code === "42P07" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Table already exists (skipping)\n")
      } else {
        throw error
      }
    }

    // Step 3: Create selfie_versions_metadata table
    console.log("[3/15] Creating selfie_versions_metadata table...")
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS selfie_versions_metadata (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          selfie_version_id UUID REFERENCES selfie_versions(id) ON DELETE CASCADE,
          metadata_type TEXT NOT NULL,
          metadata_key TEXT NOT NULL,
          metadata_value TEXT,
          metadata_json JSONB,
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(selfie_version_id, metadata_type, metadata_key)
        )
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.code === "42P07" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Table already exists (skipping)\n")
      } else {
        throw error
      }
    }

    // Step 4: Create selfie_versions_metadata_audit table
    console.log("[4/15] Creating selfie_versions_metadata_audit table...")
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS selfie_versions_metadata_audit (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          metadata_id UUID REFERENCES selfie_versions_metadata(id) ON DELETE CASCADE,
          selfie_version_id UUID REFERENCES selfie_versions(id) ON DELETE CASCADE,
          action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
          old_value TEXT,
          new_value TEXT,
          old_json JSONB,
          new_json JSONB,
          changed_by TEXT,
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      if (error.code === "42P07" || error.message?.includes("already exists")) {
        console.log("   ⚠️  Table already exists (skipping)\n")
      } else {
        throw error
      }
    }

    // Step 5: Create update function
    console.log("[5/15] Creating update_updated_at_column function...")
    try {
      await sql`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `
      console.log("   ✅ Success\n")
    } catch (error: any) {
      console.log(`   ⚠️  ${error.message}\n`)
    }

    // Steps 6-15: Create indexes
    const indexSteps = [
      { name: "idx_selfies_user_id", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfies_user_id ON selfies(user_id)` },
      { name: "idx_selfies_is_public", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfies_is_public ON selfies(is_public) WHERE is_public = true` },
      { name: "idx_selfies_created_at", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfies_created_at ON selfies(created_at DESC)` },
      { name: "idx_selfie_versions_selfie_id", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_selfie_id ON selfie_versions(selfie_id)` },
      { name: "idx_selfie_versions_user_id", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_user_id ON selfie_versions(user_id)` },
      { name: "idx_selfie_versions_is_public", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_is_public ON selfie_versions(is_public) WHERE is_public = true` },
      { name: "idx_selfie_versions_created_at", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_created_at ON selfie_versions(created_at DESC)` },
      { name: "idx_selfie_versions_metadata_version_id", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_version_id ON selfie_versions_metadata(selfie_version_id)` },
      { name: "idx_selfie_versions_metadata_type", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_type ON selfie_versions_metadata(metadata_type)` },
      { name: "idx_selfie_versions_metadata_is_public", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_is_public ON selfie_versions_metadata(is_public) WHERE is_public = true` },
      { name: "idx_selfie_versions_metadata_audit_metadata_id", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_metadata_id ON selfie_versions_metadata_audit(metadata_id)` },
      { name: "idx_selfie_versions_metadata_audit_version_id", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_version_id ON selfie_versions_metadata_audit(selfie_version_id)` },
      { name: "idx_selfie_versions_metadata_audit_action", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_action ON selfie_versions_metadata_audit(action)` },
      { name: "idx_selfie_versions_metadata_audit_is_public", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_is_public ON selfie_versions_metadata_audit(is_public) WHERE is_public = true` },
      { name: "idx_selfie_versions_metadata_audit_created_at", sql: sql`CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_created_at ON selfie_versions_metadata_audit(created_at DESC)` },
    ]

    for (let i = 0; i < indexSteps.length; i++) {
      const step = indexSteps[i]
      try {
        console.log(`[${i + 6}/15] Creating index ${step.name}...`)
        await step.sql
        console.log("   ✅ Success\n")
      } catch (error: any) {
        if (error.code === "42P07" || error.message?.includes("already exists")) {
          console.log("   ⚠️  Index already exists (skipping)\n")
        } else {
          console.log(`   ⚠️  ${error.message}\n`)
        }
      }
    }

    // Create triggers
    console.log("[16/18] Creating triggers...")
    try {
      await sql`DROP TRIGGER IF EXISTS selfies_updated_at ON selfies`
      await sql`CREATE TRIGGER selfies_updated_at BEFORE UPDATE ON selfies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
      await sql`DROP TRIGGER IF EXISTS selfie_versions_updated_at ON selfie_versions`
      await sql`CREATE TRIGGER selfie_versions_updated_at BEFORE UPDATE ON selfie_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
      await sql`DROP TRIGGER IF EXISTS selfie_versions_metadata_updated_at ON selfie_versions_metadata`
      await sql`CREATE TRIGGER selfie_versions_metadata_updated_at BEFORE UPDATE ON selfie_versions_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
      console.log("   ✅ Success\n")
    } catch (error: any) {
      console.log(`   ⚠️  ${error.message}\n`)
    }

    console.log("✅ Table creation completed!")
    console.log("\n📊 Created tables:")
    console.log("   • selfies")
    console.log("   • selfie_versions")
    console.log("   • selfie_versions_metadata")
    console.log("   • selfie_versions_metadata_audit")
    console.log("\n   All tables include the is_public field.")
  } catch (error: any) {
    console.error("\n❌ Table creation failed:")
    console.error(error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

createTables()
