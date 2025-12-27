import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import { config } from "dotenv"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

if (!process.env.DATABASE_URL) {
  console.error("[Migration] ❌ DATABASE_URL environment variable not found")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  try {
    console.log("[Migration] Starting migration 010: Creative Content Tables")
    
    // Execute CREATE TABLE statements using template literals
    console.log("[Migration] Creating instagram_captions table...")
    await sql`
      CREATE TABLE IF NOT EXISTS instagram_captions (
        id SERIAL PRIMARY KEY,
        caption_text TEXT NOT NULL,
        caption_type VARCHAR(50),
        hashtags TEXT[],
        cta TEXT,
        image_description TEXT,
        tone VARCHAR(50),
        word_count INTEGER,
        hook TEXT,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `.catch((err: any) => {
      if (!err.message?.includes("already exists")) throw err
      console.log("[Migration] ⚠️ instagram_captions table already exists")
    })
    
    console.log("[Migration] Creating content_calendars table...")
    await sql`
      CREATE TABLE IF NOT EXISTS content_calendars (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        platform VARCHAR(50),
        calendar_data JSONB NOT NULL,
        content_pillars TEXT[],
        total_posts INTEGER,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `.catch((err: any) => {
      if (!err.message?.includes("already exists")) throw err
      console.log("[Migration] ⚠️ content_calendars table already exists")
    })
    
    console.log("[Migration] Creating maya_prompt_suggestions table...")
    await sql`
      CREATE TABLE IF NOT EXISTS maya_prompt_suggestions (
        id SERIAL PRIMARY KEY,
        prompt_text TEXT NOT NULL,
        prompt_title VARCHAR(255),
        category VARCHAR(100),
        season VARCHAR(50),
        style VARCHAR(100),
        mood VARCHAR(100),
        tags TEXT[],
        use_case TEXT,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `.catch((err: any) => {
      if (!err.message?.includes("already exists")) throw err
      console.log("[Migration] ⚠️ maya_prompt_suggestions table already exists")
    })
    
    // Create indexes
    console.log("[Migration] Creating indexes...")
    const indexStatements = [
      sql`CREATE INDEX IF NOT EXISTS idx_instagram_captions_created_by ON instagram_captions(created_by)`,
      sql`CREATE INDEX IF NOT EXISTS idx_instagram_captions_created_at ON instagram_captions(created_at DESC)`,
      sql`CREATE INDEX IF NOT EXISTS idx_instagram_captions_type ON instagram_captions(caption_type)`,
      sql`CREATE INDEX IF NOT EXISTS idx_content_calendars_created_by ON content_calendars(created_by)`,
      sql`CREATE INDEX IF NOT EXISTS idx_content_calendars_date_range ON content_calendars(start_date, end_date)`,
      sql`CREATE INDEX IF NOT EXISTS idx_content_calendars_platform ON content_calendars(platform)`,
      sql`CREATE INDEX IF NOT EXISTS idx_maya_prompts_created_by ON maya_prompt_suggestions(created_by)`,
      sql`CREATE INDEX IF NOT EXISTS idx_maya_prompts_category ON maya_prompt_suggestions(category)`,
      sql`CREATE INDEX IF NOT EXISTS idx_maya_prompts_season ON maya_prompt_suggestions(season)`,
      sql`CREATE INDEX IF NOT EXISTS idx_maya_prompts_style ON maya_prompt_suggestions(style)`,
    ]
    
    for (const stmt of indexStatements) {
      await stmt.catch((err: any) => {
        if (!err.message?.includes("already exists")) throw err
      })
    }
    
    console.log("[Migration] ✅ Migration 010 completed successfully")
    
    // Verify tables were created
    console.log("[Migration] Verifying tables...")
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('instagram_captions', 'content_calendars', 'maya_prompt_suggestions')
      ORDER BY table_name
    `
    
    console.log(`[Migration] Found ${tables.length} tables:`)
    tables.forEach((t: any) => {
      console.log(`  - ${t.table_name}`)
    })
    
    if (tables.length === 3) {
      console.log("[Migration] ✅ All tables created successfully!")
    } else {
      console.log("[Migration] ⚠️ Some tables may be missing")
    }
    
  } catch (error: any) {
    console.error("[Migration] ❌ Error running migration:", error)
    throw error
  }
}

runMigration()
  .then(() => {
    console.log("[Migration] Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[Migration] Migration script failed:", error)
    process.exit(1)
  })

