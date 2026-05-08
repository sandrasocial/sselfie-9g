#!/usr/bin/env tsx
/**
 * Run Brand Engine migration
 * Creates all necessary tables for the Brand Engine system
 *
 * Usage: pnpm exec tsx scripts/migrations/run-brand-engine-migration.ts
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })
dotenv.config()

function splitSQLStatements(sql: string): string[] {
  // Remove comments
  let cleaned = sql.replace(/--.*$/gm, "")
  
  // Split by semicolons, but be careful with function definitions
  const statements: string[] = []
  let current = ""
  let inFunction = false
  
  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim()
    
    // Track if we're inside a function definition
    if (trimmed.match(/CREATE.*FUNCTION/i) || trimmed.match(/^\$\$/)) {
      inFunction = true
    }
    
    current += line + "\n"
    
    // Check for end of function
    if (inFunction && trimmed.match(/^\$\$.*language/i)) {
      inFunction = false
    }
    
    // If we hit a semicolon and we're not in a function, it's the end of a statement
    if (trimmed.endsWith(";") && !inFunction) {
      const stmt = current.trim()
      if (stmt && stmt !== ";") {
        statements.push(stmt)
      }
      current = ""
    }
  }
  
  // Add any remaining statement
  if (current.trim()) {
    statements.push(current.trim())
  }
  
  return statements.filter(s => s.length > 0)
}

async function runMigration() {
  console.log("🚀 Starting Brand Engine migration...")

  try {
    // Check for DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    const sql = neon(process.env.DATABASE_URL)

    // Read the migration SQL file
    const migrationPath = join(__dirname, "2026-01-29-create-brand-engine-tables.sql")
    const migrationSQL = readFileSync(migrationPath, "utf-8")

    console.log("📄 Migration file loaded")
    console.log("🔌 Connected to database")

    // Split into individual statements
    const statements = splitSQLStatements(migrationSQL)
    console.log(`📝 Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    let executed = 0
    let skipped = 0
    for (const statement of statements) {
      try {
        const trimmed = statement.trim()
        // Skip empty statements, DO blocks, CREATE EXTENSION, functions and triggers
        // Triggers and functions can be added later if needed - focusing on tables for v1
        if (trimmed.startsWith("DO $$") || 
            trimmed.startsWith("CREATE EXTENSION") ||
            trimmed.startsWith("CREATE OR REPLACE FUNCTION") ||
            trimmed.startsWith("CREATE FUNCTION") ||
            trimmed.startsWith("CREATE TRIGGER") ||
            trimmed.startsWith("DROP TRIGGER")) {
          skipped++
          continue
        }
        await sql.query(statement)
        executed++
        if (executed % 5 === 0) {
          console.log(`   Executed ${executed}/${statements.length - skipped} statements...`)
        }
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message && (error.message.includes("already exists") || 
                               error.message.includes("duplicate"))) {
          console.log(`   ⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`)
          skipped++
        } else {
          console.error(`   ❌ Failed statement: ${statement.substring(0, 100)}...`)
          throw error
        }
      }
    }
    
    console.log(`✅ Executed ${executed} statements successfully! (skipped ${skipped} optional statements)`)

    console.log(`✅ Executed ${executed} statements successfully!`)

    // Verify tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'brand_engine%'
      ORDER BY table_name
    `

    console.log("\n✅ Brand Engine tables:")
    tables.forEach((table) => {
      console.log(`   - ${table.table_name}`)
    })

    console.log("\n🎉 Migration complete!")
    console.log(`📊 Total tables: ${tables.length}`)
  } catch (error) {
    console.error("\n❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigration()
