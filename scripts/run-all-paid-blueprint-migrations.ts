#!/usr/bin/env tsx
/**
 * Run All Paid Blueprint Migrations
 * Executes all 3 migrations in order:
 * 1. create-blueprint-subscribers-table
 * 2. add-blueprint-generation-tracking
 * 3. add-paid-blueprint-tracking (PR-3)
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

console.log('🚀 Paid Blueprint Migrations Runner')
console.log('====================================\n')

async function runAllMigrations() {
  try {
    // Migration 1: Create blueprint_subscribers table
    console.log('📝 Migration 1: create-blueprint-subscribers-table')
    console.log('---------------------------------------------------')
    
    await sql`
      CREATE TABLE IF NOT EXISTS blueprint_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        access_token VARCHAR(255) NOT NULL UNIQUE,
        source VARCHAR(100) DEFAULT 'brand-blueprint',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Form data from blueprint
        business VARCHAR(500),
        dream_client TEXT,
        struggle TEXT,
        selfie_skill_level VARCHAR(50),
        feed_style VARCHAR(50),
        post_frequency VARCHAR(50),
        blueprint_score INTEGER DEFAULT 0,
        form_data JSONB,
        
        -- Engagement tracking
        blueprint_completed BOOLEAN DEFAULT FALSE,
        blueprint_completed_at TIMESTAMP WITH TIME ZONE,
        pdf_downloaded BOOLEAN DEFAULT FALSE,
        pdf_downloaded_at TIMESTAMP WITH TIME ZONE,
        cta_clicked BOOLEAN DEFAULT FALSE,
        cta_clicked_at TIMESTAMP WITH TIME ZONE,
        converted_to_user BOOLEAN DEFAULT FALSE,
        converted_at TIMESTAMP WITH TIME ZONE,
        
        -- Email tracking
        welcome_email_sent BOOLEAN DEFAULT FALSE,
        welcome_email_sent_at TIMESTAMP WITH TIME ZONE,
        resend_contact_id VARCHAR(255),
        
        -- Metadata
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        referrer TEXT,
        user_agent TEXT,
        email_tags TEXT[] DEFAULT ARRAY['blueprint-subscriber', 'sselfie-brand-blueprint']::text[],
        
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_email ON blueprint_subscribers(email)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_access_token ON blueprint_subscribers(access_token)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_created_at ON blueprint_subscribers(created_at DESC)
    `
    
    // Create updated_at trigger
    await sql`
      CREATE OR REPLACE FUNCTION update_blueprint_subscribers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    
    await sql`
      DROP TRIGGER IF EXISTS blueprint_subscribers_updated_at ON blueprint_subscribers
    `
    
    await sql`
      CREATE TRIGGER blueprint_subscribers_updated_at
      BEFORE UPDATE ON blueprint_subscribers
      FOR EACH ROW
      EXECUTE FUNCTION update_blueprint_subscribers_updated_at()
    `
    
    console.log('✅ Migration 1 complete\n')

    // Migration 2: Add generation tracking columns
    console.log('📝 Migration 2: add-blueprint-generation-tracking')
    console.log('--------------------------------------------------')
    
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    const existing2 = await sql`
      SELECT version FROM schema_migrations 
      WHERE version = 'add-blueprint-generation-tracking'
    `
    
    if (existing2.length === 0) {
      // Add strategy tracking columns
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS strategy_generated BOOLEAN DEFAULT FALSE`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS strategy_generated_at TIMESTAMP WITH TIME ZONE`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS strategy_data JSONB`
      
      // Add grid tracking columns
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS grid_generated BOOLEAN DEFAULT FALSE`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS grid_generated_at TIMESTAMP WITH TIME ZONE`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS grid_url TEXT`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS grid_frame_urls JSONB`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS grid_prediction_id TEXT`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS selfie_image_urls JSONB`
      
      // Create indexes
      await sql`
        CREATE INDEX IF NOT EXISTS idx_blueprint_strategy_generated 
        ON blueprint_subscribers(strategy_generated, strategy_generated_at)
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_blueprint_grid_generated 
        ON blueprint_subscribers(grid_generated, grid_generated_at)
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_blueprint_email_strategy 
        ON blueprint_subscribers(email, strategy_generated) 
        WHERE strategy_generated = FALSE
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_blueprint_email_grid 
        ON blueprint_subscribers(email, grid_generated) 
        WHERE grid_generated = FALSE
      `
      
      await sql`
        INSERT INTO schema_migrations (version) 
        VALUES ('add-blueprint-generation-tracking')
        ON CONFLICT (version) DO NOTHING
      `
      
      console.log('✅ Migration 2 complete\n')
    } else {
      console.log('⏭️  Migration 2 already applied\n')
    }

    // Migration 3: Add paid blueprint tracking columns (PR-3)
    console.log('📝 Migration 3: add-paid-blueprint-tracking (PR-3)')
    console.log('---------------------------------------------------')
    
    const existing3 = await sql`
      SELECT version FROM schema_migrations 
      WHERE version = 'add-paid-blueprint-tracking'
    `
    
    if (existing3.length === 0) {
      // Add paid blueprint columns
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS paid_blueprint_purchased BOOLEAN DEFAULT FALSE`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS paid_blueprint_purchased_at TIMESTAMP WITH TIME ZONE`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS paid_blueprint_stripe_payment_id TEXT`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS paid_blueprint_photo_urls JSONB DEFAULT '[]'::jsonb`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS paid_blueprint_generated BOOLEAN DEFAULT FALSE`
      await sql`ALTER TABLE blueprint_subscribers ADD COLUMN IF NOT EXISTS paid_blueprint_generated_at TIMESTAMP WITH TIME ZONE`
      
      // Create indexes
      await sql`
        CREATE INDEX IF NOT EXISTS idx_blueprint_paid_purchased 
        ON blueprint_subscribers(paid_blueprint_purchased) 
        WHERE paid_blueprint_purchased = TRUE
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_blueprint_paid_pending_generation 
        ON blueprint_subscribers(paid_blueprint_generated, paid_blueprint_purchased) 
        WHERE paid_blueprint_generated = FALSE AND paid_blueprint_purchased = TRUE
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_blueprint_paid_email 
        ON blueprint_subscribers(email, paid_blueprint_purchased)
      `
      
      await sql`
        INSERT INTO schema_migrations (version) 
        VALUES ('add-paid-blueprint-tracking')
        ON CONFLICT (version) DO NOTHING
      `
      
      console.log('✅ Migration 3 complete\n')
    } else {
      console.log('⏭️  Migration 3 already applied\n')
    }

    // Verification
    console.log('🔍 Verification')
    console.log('---------------')
    
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blueprint_subscribers' 
      AND column_name LIKE 'paid_blueprint%'
      ORDER BY column_name
    `
    
    console.log(`✅ Found ${columns.length} paid_blueprint columns:`)
    columns.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type})`)
    })
    
    const indexes = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'blueprint_subscribers' 
      AND indexname LIKE 'idx_blueprint_paid%'
      ORDER BY indexname
    `
    
    console.log(`✅ Found ${indexes.length} paid_blueprint indexes:`)
    indexes.forEach((idx: any) => {
      console.log(`   - ${idx.indexname}`)
    })
    
    console.log('\n✨ All migrations complete!\n')
    console.log('Next steps:')
    console.log('1. Start dev server: npm run dev')
    console.log('2. Run API tests: npx tsx scripts/test-paid-blueprint-pr4-simple.ts\n')
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    throw error
  }
}

// Run migrations
runAllMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
