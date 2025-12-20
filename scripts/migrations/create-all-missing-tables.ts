/**
 * Create all missing Studio Pro tables directly
 */

import { neon } from '@neondatabase/serverless'

async function createAllTables() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = neon(databaseUrl)

  console.log('[CREATE] Creating all missing Studio Pro tables...')

  const tables = [
    {
      name: 'user_avatar_images',
      sql: sql`
        CREATE TABLE IF NOT EXISTS user_avatar_images (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          image_type TEXT NOT NULL CHECK (image_type IN ('selfie', 'lifestyle', 'mirror', 'casual', 'professional')),
          is_active BOOLEAN DEFAULT true,
          display_order INTEGER DEFAULT 0,
          uploaded_at TIMESTAMP DEFAULT NOW()
        )
      `,
    },
    {
      name: 'brand_kits',
      sql: sql`
        CREATE TABLE IF NOT EXISTS brand_kits (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          primary_color TEXT,
          secondary_color TEXT,
          accent_color TEXT,
          font_style TEXT,
          brand_tone TEXT CHECK (brand_tone IN ('bold', 'soft', 'minimalist', 'luxury', 'casual', 'professional')),
          is_default BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `,
    },
    {
      name: 'user_pro_preferences',
      sql: sql`
        CREATE TABLE IF NOT EXISTS user_pro_preferences (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          preferred_tone TEXT,
          preferred_style TEXT,
          preferred_layouts TEXT[],
          last_used_workflows TEXT[],
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `,
    },
    {
      name: 'pro_workflows',
      sql: sql`
        CREATE TABLE IF NOT EXISTS pro_workflows (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          workflow_type TEXT NOT NULL CHECK (workflow_type IN (
            'carousel', 'reel-cover', 'ugc-product', 'edit-image', 
            'change-outfit', 'remove-object', 'quote-graphic', 
            'product-mockup', 'reuse-adapt'
          )),
          status TEXT NOT NULL CHECK (status IN ('setup', 'in-progress', 'completed', 'cancelled')),
          context JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `,
    },
    {
      name: 'pro_generations',
      sql: sql`
        CREATE TABLE IF NOT EXISTS pro_generations (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          workflow_id INTEGER REFERENCES pro_workflows(id) ON DELETE SET NULL,
          parent_generation_id INTEGER REFERENCES pro_generations(id) ON DELETE SET NULL,
          generation_type TEXT NOT NULL,
          image_urls TEXT[] NOT NULL,
          edit_instruction TEXT,
          prompt_used TEXT,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `,
    },
  ]

  for (const table of tables) {
    try {
      await table.sql
      console.log(`[CREATE] ✓ ${table.name} created`)
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log(`[CREATE] ⚠ ${table.name} already exists`)
      } else {
        console.error(`[CREATE] ✗ Error creating ${table.name}:`, error.message)
        throw error
      }
    }
  }

  // Create indexes
  const indexes = [
    sql`CREATE INDEX IF NOT EXISTS idx_user_avatar_images_user_id ON user_avatar_images(user_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_user_avatar_images_active ON user_avatar_images(user_id, is_active) WHERE is_active = true`,
    sql`CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id ON brand_kits(user_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_brand_kits_default ON brand_kits(user_id, is_default) WHERE is_default = true`,
    sql`CREATE INDEX IF NOT EXISTS idx_pro_workflows_user_id ON pro_workflows(user_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_pro_workflows_status ON pro_workflows(user_id, status)`,
    sql`CREATE INDEX IF NOT EXISTS idx_pro_generations_user_id ON pro_generations(user_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_pro_generations_workflow ON pro_generations(workflow_id) WHERE workflow_id IS NOT NULL`,
    sql`CREATE INDEX IF NOT EXISTS idx_pro_generations_parent ON pro_generations(parent_generation_id) WHERE parent_generation_id IS NOT NULL`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_kits_one_default ON brand_kits(user_id) WHERE is_default = true`,
  ]

  for (let i = 0; i < indexes.length; i++) {
    try {
      await indexes[i]
      console.log(`[CREATE] ✓ Index ${i + 1}/${indexes.length} created`)
    } catch (error: any) {
      if (error.code === '42P07' || error.code === '23505') {
        console.log(`[CREATE] ⚠ Index ${i + 1} already exists`)
      } else {
        console.error(`[CREATE] ✗ Error creating index ${i + 1}:`, error.message)
      }
    }
  }

  console.log('[CREATE] ✅ All tables and indexes created')
}

createAllTables()
  .then(() => {
    console.log('[CREATE] Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[CREATE] Error:', error)
    process.exit(1)
  })






















