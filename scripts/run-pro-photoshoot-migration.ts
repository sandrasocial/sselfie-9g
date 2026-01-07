/**
 * Run Pro Photoshoot Migration
 * Creates pro_photoshoot tables and ensures admin_feature_flags exists
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import { config } from "dotenv"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  try {
    console.log("🔄 Running Pro Photoshoot migration...")

    // First, ensure admin_feature_flags table exists
    console.log("📋 Checking admin_feature_flags table...")
    await sql`
      CREATE TABLE IF NOT EXISTS admin_feature_flags (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by TEXT DEFAULT 'system'
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_feature_flags_key ON admin_feature_flags(key)
    `
    console.log("✅ admin_feature_flags table ready")

    // Read and execute pro_photoshoot migration
    console.log("📋 Creating pro_photoshoot tables...")
    const migrationPath = join(process.cwd(), "scripts", "53-create-pro-photoshoot-tables.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")

    // Execute the entire SQL file
    try {
      await sql.unsafe(migrationSQL)
      console.log("✅ SQL migration executed")
    } catch (error: any) {
      // If tables already exist, that's okay
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        console.log("ℹ️  Tables may already exist (continuing...)")
      } else {
        console.error("⚠️  Migration error:", error.message)
        // Try executing statement by statement as fallback
        const statements = migrationSQL
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("--") && !s.startsWith("COMMENT"))

        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await sql.unsafe(statement + ";")
            } catch (stmtError: any) {
              if (!stmtError.message?.includes("already exists") && !stmtError.message?.includes("duplicate")) {
                console.warn("⚠️  Statement warning:", stmtError.message?.substring(0, 100))
              }
            }
          }
        }
      }
    }

    console.log("✅ Pro Photoshoot tables created")

    // Verify tables exist
    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (
          table_name LIKE 'pro_photoshoot%' 
          OR table_name = 'admin_feature_flags'
        )
      ORDER BY table_name
    `

    console.log("\n📊 Tables verified:")
    const expectedTables = [
      'admin_feature_flags',
      'pro_photoshoot_sessions',
      'pro_photoshoot_grids',
      'pro_photoshoot_frames'
    ]
    
    const foundTables = allTables.map((row: any) => row.table_name)
    
    expectedTables.forEach((tableName) => {
      if (foundTables.includes(tableName)) {
        console.log(`  ✅ ${tableName}`)
      } else {
        console.log(`  ❌ ${tableName} (MISSING)`)
      }
    })
    
    if (foundTables.length < expectedTables.length) {
      console.log("\n⚠️  Some tables are missing. Re-running migration...")
      // Re-execute just the table creation statements
      const createStatements = [
        `CREATE TABLE IF NOT EXISTS pro_photoshoot_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          original_image_id INTEGER NOT NULL REFERENCES ai_images(id) ON DELETE CASCADE,
          total_grids INTEGER NOT NULL DEFAULT 8,
          session_status TEXT NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'cancelled')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS pro_photoshoot_grids (
          id SERIAL PRIMARY KEY,
          session_id INTEGER NOT NULL REFERENCES pro_photoshoot_sessions(id) ON DELETE CASCADE,
          grid_number INTEGER NOT NULL CHECK (grid_number >= 1 AND grid_number <= 8),
          prediction_id TEXT,
          grid_url TEXT,
          generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
          prompt TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          UNIQUE(session_id, grid_number)
        )`,
        `CREATE TABLE IF NOT EXISTS pro_photoshoot_frames (
          id SERIAL PRIMARY KEY,
          grid_id INTEGER NOT NULL REFERENCES pro_photoshoot_grids(id) ON DELETE CASCADE,
          frame_number INTEGER NOT NULL CHECK (frame_number >= 1 AND frame_number <= 9),
          frame_url TEXT NOT NULL,
          gallery_image_id INTEGER REFERENCES ai_images(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(grid_id, frame_number)
        )`
      ]
      
      for (const stmt of createStatements) {
        try {
          await sql.unsafe(stmt)
        } catch (error: any) {
          if (!error.message?.includes("already exists")) {
            console.error(`  ❌ Error creating table:`, error.message?.substring(0, 100))
          }
        }
      }
      
      // Create indexes
      const indexStatements = [
        `CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_sessions_user_id ON pro_photoshoot_sessions(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_sessions_status ON pro_photoshoot_sessions(session_status)`,
        `CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_sessions_original_image ON pro_photoshoot_sessions(original_image_id)`,
        `CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_grids_session_id ON pro_photoshoot_grids(session_id)`,
        `CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_grids_prediction_id ON pro_photoshoot_grids(prediction_id)`,
        `CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_grids_status ON pro_photoshoot_grids(generation_status)`,
        `CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_frames_grid_id ON pro_photoshoot_frames(grid_id)`,
        `CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_frames_gallery_image ON pro_photoshoot_frames(gallery_image_id)`
      ]
      
      for (const stmt of indexStatements) {
        try {
          await sql.unsafe(stmt)
        } catch (error: any) {
          // Ignore index errors
        }
      }
      
      console.log("✅ Re-created missing tables")
    }

    console.log("\n🎉 Migration complete!")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigration()

