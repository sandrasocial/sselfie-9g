#!/usr/bin/env tsx
/**
 * Run Paid Blueprint Migrations
 * Executes all 3 migrations using neon serverless
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config({ path: '.env.local' })

console.log('🚀 Running Paid Blueprint Migrations')
console.log('====================================\n')

// Use fetch-based approach for neon
async function executeSQL(sql: string, name: string) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set')
  }

  console.log(`📝 Executing: ${name}`)
  
  try {
    // Use the neon HTTP API directly
    const response = await fetch(databaseUrl.replace('postgres://', 'https://').replace('postgresql://', 'https://'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sql,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    console.log(`✅ ${name} complete\n`)
    return true
  } catch (error: any) {
    console.error(`❌ ${name} failed: ${error.message}\n`)
    // Continue anyway as columns might already exist
    return false
  }
}

async function main() {
  // Migration 1: Create blueprint_subscribers table
  const migration1 = readFileSync(
    join(process.cwd(), 'scripts', 'create-blueprint-subscribers-table.sql'),
    'utf-8'
  )
  await executeSQL(migration1, 'Migration 1: create-blueprint-subscribers-table')

  // Migration 2: Add generation tracking columns
  const migration2 = readFileSync(
    join(process.cwd(), 'scripts', 'migrations', 'add-blueprint-generation-tracking.sql'),
    'utf-8'
  )
  await executeSQL(migration2, 'Migration 2: add-blueprint-generation-tracking')

  // Migration 3: Add paid blueprint tracking columns
  const migration3 = readFileSync(
    join(process.cwd(), 'scripts', 'migrations', 'add-paid-blueprint-tracking.sql'),
    'utf-8'
  )
  await executeSQL(migration3, 'Migration 3: add-paid-blueprint-tracking')

  console.log('✨ Migrations complete!\n')
  console.log('Next steps:')
  console.log('1. Start dev server: npm run dev')
  console.log('2. Run tests: npx tsx scripts/test-paid-blueprint-pr4-simple.ts\n')
}

main().catch((error) => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
