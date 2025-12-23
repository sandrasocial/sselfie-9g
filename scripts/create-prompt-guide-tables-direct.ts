/**
 * Create Prompt Guide Tables - Direct Execution
 * Executes SQL statements directly to create the tables
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("[Migration] ❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function createTables() {
  console.log("[Migration] Creating prompt guide tables...\n")

  try {
    // Create prompt_guides table
    console.log("Creating prompt_guides table...")
    await sql`
      CREATE TABLE IF NOT EXISTS prompt_guides (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        published_at TIMESTAMP,
        total_prompts INTEGER DEFAULT 0,
        total_approved INTEGER DEFAULT 0
      )
    `
    console.log("✓ prompt_guides table created")

    // Create prompt_guide_items table
    console.log("Creating prompt_guide_items table...")
    await sql`
      CREATE TABLE IF NOT EXISTS prompt_guide_items (
        id SERIAL PRIMARY KEY,
        guide_id INTEGER REFERENCES prompt_guides(id) ON DELETE CASCADE,
        prompt_text TEXT NOT NULL,
        concept_title VARCHAR(255),
        concept_description TEXT,
        category VARCHAR(100),
        image_url TEXT,
        replicate_prediction_id TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        sort_order INTEGER DEFAULT 0,
        generation_settings JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by TEXT REFERENCES users(id)
      )
    `
    console.log("✓ prompt_guide_items table created")

    // Create prompt_pages table
    console.log("Creating prompt_pages table...")
    await sql`
      CREATE TABLE IF NOT EXISTS prompt_pages (
        id SERIAL PRIMARY KEY,
        guide_id INTEGER REFERENCES prompt_guides(id) ON DELETE CASCADE,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        welcome_message TEXT,
        email_capture_type VARCHAR(50) DEFAULT 'modal' CHECK (email_capture_type IN ('modal', 'inline', 'top')),
        email_list_tag VARCHAR(100),
        upsell_link TEXT,
        upsell_text TEXT,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        view_count INTEGER DEFAULT 0,
        email_capture_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        published_at TIMESTAMP
      )
    `
    console.log("✓ prompt_pages table created")

    // Create writing_assistant_outputs table
    console.log("Creating writing_assistant_outputs table...")
    await sql`
      CREATE TABLE IF NOT EXISTS writing_assistant_outputs (
        id SERIAL PRIMARY KEY,
        content_pillar VARCHAR(100),
        output_type VARCHAR(50),
        content TEXT NOT NULL,
        context JSONB,
        calendar_scheduled BOOLEAN DEFAULT false,
        scheduled_date TIMESTAMP,
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log("✓ writing_assistant_outputs table created")

    // Create indexes
    console.log("Creating indexes...")
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_guides_status ON prompt_guides(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_guide_items_guide_id ON prompt_guide_items(guide_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_guide_items_status ON prompt_guide_items(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_pages_slug ON prompt_pages(slug)`
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_pages_guide_id ON prompt_pages(guide_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_writing_assistant_pillar ON writing_assistant_outputs(content_pillar)`
    console.log("✓ Indexes created")

    console.log("\n[Migration] ✅ All tables created successfully!")
  } catch (error: any) {
    console.error("[Migration] ❌ Error:", error.message)
    if (error.message?.includes("already exists")) {
      console.log("[Migration] Tables may already exist, continuing...")
    } else {
      process.exit(1)
    }
  }
}

createTables()



