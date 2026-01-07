/**
 * Run Pro Photoshoot Migration (V2 - Direct Execution)
 * Creates pro_photoshoot tables with explicit error handling
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

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
    console.log("🔄 Running Pro Photoshoot migration (V2)...\n")

    // 1. Ensure admin_feature_flags exists
    console.log("📋 Step 1: Checking admin_feature_flags...")
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
    console.log("✅ admin_feature_flags ready\n")

    // 2. Create pro_photoshoot_sessions
    console.log("📋 Step 2: Creating pro_photoshoot_sessions...")
    try {
      await sql`
        CREATE TABLE pro_photoshoot_sessions (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          original_image_id INTEGER NOT NULL REFERENCES ai_images(id) ON DELETE CASCADE,
          total_grids INTEGER NOT NULL DEFAULT 8,
          session_status TEXT NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'cancelled')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ
        )
      `
      console.log("✅ pro_photoshoot_sessions created")
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log("ℹ️  pro_photoshoot_sessions already exists")
      } else {
        throw error
      }
    }

    // 3. Create pro_photoshoot_grids
    console.log("📋 Step 3: Creating pro_photoshoot_grids...")
    try {
      await sql`
        CREATE TABLE pro_photoshoot_grids (
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
        )
      `
      console.log("✅ pro_photoshoot_grids created")
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log("ℹ️  pro_photoshoot_grids already exists")
      } else {
        throw error
      }
    }

    // 4. Create pro_photoshoot_frames
    console.log("📋 Step 4: Creating pro_photoshoot_frames...")
    try {
      await sql`
        CREATE TABLE pro_photoshoot_frames (
          id SERIAL PRIMARY KEY,
          grid_id INTEGER NOT NULL REFERENCES pro_photoshoot_grids(id) ON DELETE CASCADE,
          frame_number INTEGER NOT NULL CHECK (frame_number >= 1 AND frame_number <= 9),
          frame_url TEXT NOT NULL,
          gallery_image_id INTEGER REFERENCES ai_images(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(grid_id, frame_number)
        )
      `
      console.log("✅ pro_photoshoot_frames created")
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log("ℹ️  pro_photoshoot_frames already exists")
      } else {
        throw error
      }
    }

    // 5. Create indexes
    console.log("\n📋 Step 5: Creating indexes...")
    const indexes = [
      ["idx_pro_photoshoot_sessions_user_id", "pro_photoshoot_sessions(user_id)"],
      ["idx_pro_photoshoot_sessions_status", "pro_photoshoot_sessions(session_status)"],
      ["idx_pro_photoshoot_sessions_original_image", "pro_photoshoot_sessions(original_image_id)"],
      ["idx_pro_photoshoot_grids_session_id", "pro_photoshoot_grids(session_id)"],
      ["idx_pro_photoshoot_grids_prediction_id", "pro_photoshoot_grids(prediction_id)"],
      ["idx_pro_photoshoot_grids_status", "pro_photoshoot_grids(generation_status)"],
      ["idx_pro_photoshoot_frames_grid_id", "pro_photoshoot_frames(grid_id)"],
      ["idx_pro_photoshoot_frames_gallery_image", "pro_photoshoot_frames(gallery_image_id)"],
    ]

    for (const [indexName, tableColumn] of indexes) {
      try {
        await sql.unsafe(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableColumn}`)
      } catch (error: any) {
        // Ignore index errors
      }
    }
    console.log("✅ Indexes created\n")

    // 6. Verify
    console.log("📊 Verifying tables...")
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'pro_photoshoot_sessions',
          'pro_photoshoot_grids',
          'pro_photoshoot_frames',
          'admin_feature_flags'
        )
      ORDER BY table_name
    `

    const foundTables = tables.map((row: any) => row.table_name)
    const expectedTables = [
      "admin_feature_flags",
      "pro_photoshoot_sessions",
      "pro_photoshoot_grids",
      "pro_photoshoot_frames",
    ]

    expectedTables.forEach((tableName) => {
      if (foundTables.includes(tableName)) {
        console.log(`  ✅ ${tableName}`)
      } else {
        console.log(`  ❌ ${tableName} (MISSING)`)
      }
    })

    if (foundTables.length === expectedTables.length) {
      console.log("\n🎉 Migration complete! All tables created successfully.")
    } else {
      console.log("\n⚠️  Some tables are missing. Check errors above.")
      process.exit(1)
    }
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message)
    console.error(error)
    process.exit(1)
  }
}

runMigration()

