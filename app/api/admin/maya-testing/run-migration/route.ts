import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Execute CREATE TABLE statements one by one
    // Using template literals for safety with Neon driver
    
    try {
      // Create maya_test_results table
      await sql`
        CREATE TABLE IF NOT EXISTS maya_test_results (
          id SERIAL PRIMARY KEY,
          test_name VARCHAR(255) NOT NULL,
          test_type VARCHAR(50) NOT NULL,
          test_user_id TEXT REFERENCES users(id),
          configuration JSONB NOT NULL,
          results JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          created_by TEXT REFERENCES users(id),
          is_active BOOLEAN DEFAULT true,
          notes TEXT,
          comparison_group_id INTEGER,
          status VARCHAR(50) DEFAULT 'pending'
        )
      `
      
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_results_test_type ON maya_test_results(test_type)`
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_results_test_user ON maya_test_results(test_user_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_results_comparison_group ON maya_test_results(comparison_group_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_results_created_at ON maya_test_results(created_at DESC)`

      // Create maya_test_trainings table
      await sql`
        CREATE TABLE IF NOT EXISTS maya_test_trainings (
          id SERIAL PRIMARY KEY,
          test_result_id INTEGER REFERENCES maya_test_results(id),
          test_user_id TEXT REFERENCES users(id),
          training_params JSONB NOT NULL,
          replicate_training_id TEXT,
          replicate_model_id TEXT,
          training_status VARCHAR(50) DEFAULT 'pending',
          model_url TEXT,
          trigger_word TEXT,
          started_at TIMESTAMP DEFAULT NOW(),
          completed_at TIMESTAMP,
          metrics JSONB,
          training_images_count INTEGER,
          training_images_urls TEXT[]
        )
      `
      
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_trainings_test_result ON maya_test_trainings(test_result_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_trainings_status ON maya_test_trainings(training_status)`

      // Create maya_test_images table
      await sql`
        CREATE TABLE IF NOT EXISTS maya_test_images (
          id SERIAL PRIMARY KEY,
          test_result_id INTEGER REFERENCES maya_test_results(id),
          prompt TEXT NOT NULL,
          prompt_settings JSONB NOT NULL,
          image_url TEXT NOT NULL,
          generation_params JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          comparison_rank INTEGER,
          rating INTEGER,
          notes TEXT,
          generation_time_ms INTEGER,
          replicate_prediction_id TEXT
        )
      `
      
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_images_test_result ON maya_test_images(test_result_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_images_comparison_rank ON maya_test_images(comparison_rank)`

      // Create maya_test_comparisons table
      await sql`
        CREATE TABLE IF NOT EXISTS maya_test_comparisons (
          id SERIAL PRIMARY KEY,
          comparison_name VARCHAR(255) NOT NULL,
          test_result_ids INTEGER[] NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          created_by TEXT REFERENCES users(id),
          winner_test_result_id INTEGER REFERENCES maya_test_results(id),
          notes TEXT
        )
      `
      
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_comparisons_created_at ON maya_test_comparisons(created_at DESC)`

      // Create maya_test_configs table
      await sql`
        CREATE TABLE IF NOT EXISTS maya_test_configs (
          id SERIAL PRIMARY KEY,
          config_name VARCHAR(255) NOT NULL,
          config_type VARCHAR(50) NOT NULL,
          configuration JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          created_by TEXT REFERENCES users(id),
          is_template BOOLEAN DEFAULT false,
          description TEXT
        )
      `
      
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_configs_config_type ON maya_test_configs(config_type)`
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_test_configs_created_by ON maya_test_configs(created_by)`
      
    } catch (error: any) {
      // Some errors are OK (tables/indexes already exist)
      if (!error.message?.includes('already exists') && 
          !error.message?.includes('duplicate') &&
          !error.message?.includes('relation already exists')) {
        throw error
      }
    }

    // Verify migration
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('maya_test_results', 'maya_test_trainings', 'maya_test_images', 'maya_test_comparisons', 'maya_test_configs')
    `

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      tables_created: tables.map((t: any) => t.table_name),
    })
  } catch (error: any) {
    console.error("[v0] Error running migration:", error)
    return NextResponse.json(
      { error: error.message || "Failed to run migration" },
      { status: 500 }
    )
  }
}















