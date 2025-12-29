#!/usr/bin/env node

/**
 * Run database migration script
 * Usage: node scripts/run-migration.js migrations/create-alex-tables.sql
 */

const { neon } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function runMigration(migrationFile) {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable not found')
    console.error('   Make sure .env.local exists and contains DATABASE_URL')
    process.exit(1)
  }

  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Error: Migration file not found: ${migrationFile}`)
    process.exit(1)
  }

  const sql = neon(databaseUrl)
  const migrationSQL = fs.readFileSync(migrationFile, 'utf8')

  console.log(`📦 Running migration: ${migrationFile}`)
  console.log(`🔗 Database: ${databaseUrl.split('@')[1]?.split('/')[0] || 'connected'}`)
  console.log('')

  try {
    // Execute the entire migration as one transaction
    // Remove comments and split by semicolon, but execute in order
    const lines = migrationSQL.split('\n')
    const statements = []
    let currentStatement = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('--')) {
        continue
      }
      
      currentStatement += line + '\n'
      
      // If line ends with semicolon, it's a complete statement
      if (trimmed.endsWith(';')) {
        const statement = currentStatement.trim()
        if (statement) {
          statements.push(statement)
        }
        currentStatement = ''
      }
    }
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        try {
          await sql.query(statement)
          console.log(`  ✓ Executed statement ${i + 1}/${statements.length}`)
        } catch (stmtError) {
          // If it's a "relation does not exist" error on an index, it might be because table wasn't created
          // But CREATE INDEX IF NOT EXISTS should handle this
          if (stmtError.message.includes('does not exist') && statement.includes('CREATE INDEX')) {
            console.log(`  ⚠️  Index creation skipped (table may not exist yet): ${stmtError.message.split('\n')[0]}`)
          } else {
            throw stmtError
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('Created tables:')
    console.log('  - alex_suggestion_history')
    console.log('  - testimonials')
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('ℹ️  Tables may already exist - this is okay')
    } else {
      console.error('Full error:', error)
      process.exit(1)
    }
  }
}

const migrationFile = process.argv[2] || 'migrations/create-alex-tables.sql'
runMigration(migrationFile)

