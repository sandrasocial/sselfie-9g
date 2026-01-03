#!/usr/bin/env tsx
/**
 * Verify Feed Planner Schema
 * Checks that all required columns exist in feed_layouts and feed_posts tables
 */

import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '..', '.env.local') })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL environment variable not found')
  process.exit(1)
}

const sql = neon(databaseUrl)

async function verifySchema() {
  console.log('🔍 Verifying Feed Planner Schema...\n')

  try {
    // Check feed_layouts columns
    console.log('📋 Checking feed_layouts table...')
    const feedLayoutsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'feed_layouts'
      ORDER BY ordinal_position
    `

    const requiredFeedLayoutsColumns = [
      'aesthetic',
      'aesthetic_id',
      'strategic_rationale',
      'total_credits',
      'overall_vibe',
    ]

    console.log(`   Found ${feedLayoutsColumns.length} columns in feed_layouts`)
    
    const missingFeedLayouts = requiredFeedLayoutsColumns.filter(
      col => !feedLayoutsColumns.some((c: any) => c.column_name === col)
    )

    if (missingFeedLayouts.length > 0) {
      console.log(`   ❌ Missing columns: ${missingFeedLayouts.join(', ')}`)
    } else {
      console.log('   ✅ All required columns present')
    }

    // Check feed_posts columns
    console.log('\n📋 Checking feed_posts table...')
    const feedPostsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'feed_posts'
      ORDER BY ordinal_position
    `

    const requiredFeedPostsColumns = [
      'shot_type',
      'visual_direction',
      'purpose',
      'background',
      'generation_mode',
      'caption',
      'prompt',
      'error',
    ]

    console.log(`   Found ${feedPostsColumns.length} columns in feed_posts`)
    
    const missingFeedPosts = requiredFeedPostsColumns.filter(
      col => !feedPostsColumns.some((c: any) => c.column_name === col)
    )

    if (missingFeedPosts.length > 0) {
      console.log(`   ❌ Missing columns: ${missingFeedPosts.join(', ')}`)
    } else {
      console.log('   ✅ All required columns present')
    }

    // Check indexes
    console.log('\n📊 Checking indexes...')
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('feed_layouts', 'feed_posts')
      ORDER BY tablename, indexname
    `

    const requiredIndexes = [
      'idx_feed_layouts_aesthetic_id',
      'idx_feed_posts_generation_mode',
      'idx_feed_posts_shot_type',
    ]

    console.log(`   Found ${indexes.length} indexes`)
    
    const missingIndexes = requiredIndexes.filter(
      idx => !indexes.some((i: any) => i.indexname === idx)
    )

    if (missingIndexes.length > 0) {
      console.log(`   ⚠️  Missing indexes: ${missingIndexes.join(', ')}`)
    } else {
      console.log('   ✅ All required indexes present')
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    if (missingFeedLayouts.length === 0 && missingFeedPosts.length === 0 && missingIndexes.length === 0) {
      console.log('✅ Schema verification PASSED - All required fields exist!')
      process.exit(0)
    } else {
      console.log('❌ Schema verification FAILED - Some fields are missing')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Error verifying schema:', error)
    process.exit(1)
  }
}

verifySchema().catch(console.error)

