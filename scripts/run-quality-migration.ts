/**
 * Run Quality Baseline Migration
 * 
 * This script creates the prompt_quality_metrics table
 * Run with: pnpm exec tsx scripts/run-quality-migration.ts
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log("🚀 Running Quality Baseline Migration...")
  console.log("")

  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS prompt_quality_metrics (
        id SERIAL PRIMARY KEY,
        generation_id TEXT,
        prediction_id TEXT,
        user_id TEXT NOT NULL,
        prompt TEXT NOT NULL,
        prompt_hash VARCHAR(32) NOT NULL,
        model_used VARCHAR(255) NOT NULL,
        model_version TEXT,
        face_consistency_score NUMERIC(5,2),
        realism_score NUMERIC(5,2),
        stability_score NUMERIC(5,2),
        image_hash VARCHAR(32),
        image_url TEXT NOT NULL,
        category VARCHAR(100),
        source VARCHAR(50),
        is_baseline BOOLEAN NOT NULL DEFAULT true,
        baseline_version VARCHAR(50) NOT NULL DEFAULT '2026-01-17-v1',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    console.log("✅ Table 'prompt_quality_metrics' created")

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_quality_user_id ON prompt_quality_metrics(user_id)`
    console.log("✅ Index 'idx_prompt_quality_user_id' created")

    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_quality_prompt_hash ON prompt_quality_metrics(prompt_hash)`
    console.log("✅ Index 'idx_prompt_quality_prompt_hash' created")

    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_quality_model ON prompt_quality_metrics(model_used)`
    console.log("✅ Index 'idx_prompt_quality_model' created")

    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_quality_source ON prompt_quality_metrics(source)`
    console.log("✅ Index 'idx_prompt_quality_source' created")

    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_quality_baseline ON prompt_quality_metrics(is_baseline, baseline_version)`
    console.log("✅ Index 'idx_prompt_quality_baseline' created")

    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_quality_created_at ON prompt_quality_metrics(created_at DESC)`
    console.log("✅ Index 'idx_prompt_quality_created_at' created")

    // Verify table exists
    const result = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'prompt_quality_metrics'
      ORDER BY ordinal_position
      LIMIT 5
    `

    console.log("")
    console.log("✅ Migration Complete!")
    console.log("")
    console.log("Table 'prompt_quality_metrics' has been created with", result.length > 0 ? "columns:" : "successfully")
    
    if (result.length > 0) {
      console.log("")
      result.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type})`)
      })
    }

    console.log("")
    console.log("Next steps:")
    console.log("1. ✅ Database migration complete")
    console.log("2. ⏭️  Enable monitoring: vercel env add ENABLE_QUALITY_MONITORING")
    console.log("3. ⏭️  Deploy: git push")
    console.log("")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigration()
