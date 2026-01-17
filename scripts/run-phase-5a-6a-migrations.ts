/**
 * Run Phase 5A & 6A Migrations
 * 
 * This script creates the prompt_audit_events and incident_events tables
 * Run with: npx tsx scripts/run-phase-5a-6a-migrations.ts
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log("🚀 Running Phase 5A & 6A Migrations...")
  console.log("")

  try {
    // Migration 1: prompt_audit_events table (Phase 5A)
    console.log("📊 Creating prompt_audit_events table (Phase 5A)...")
    
    await sql`
      CREATE TABLE IF NOT EXISTS prompt_audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        route_id TEXT NOT NULL,
        route_path TEXT,
        prompt_type TEXT,
        fingerprint TEXT NOT NULL,
        provider TEXT,
        model TEXT,
        status TEXT NOT NULL CHECK (status IN ('ok', 'error')),
        error_code TEXT,
        request_id TEXT,
        user_id TEXT,
        mode TEXT,
        feature TEXT,
        builder TEXT,
        execution_time_ms INTEGER,
        prompt_length INTEGER,
        input_hash TEXT,
        output_hash TEXT,
        path_used TEXT CHECK (path_used IN ('authority', 'legacy'))
      )
    `
    
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_audit_created_at ON prompt_audit_events(created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_audit_route_id ON prompt_audit_events(route_id, created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_audit_status ON prompt_audit_events(status, created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_prompt_audit_fingerprint ON prompt_audit_events(fingerprint, created_at DESC)`
    
    console.log("✅ Table 'prompt_audit_events' created with indexes")
    console.log("")

    // Migration 2: incident_events table (Phase 6A)
    console.log("📊 Creating incident_events table (Phase 6A)...")
    
    await sql`
      CREATE TABLE IF NOT EXISTS incident_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        severity TEXT NOT NULL CHECK (severity IN ('red', 'orange', 'yellow')),
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        snapshot JSONB,
        resolved_at TIMESTAMPTZ,
        resolution_note TEXT,
        dedupe_key TEXT
      )
    `
    
    await sql`CREATE INDEX IF NOT EXISTS idx_incident_events_created_at ON incident_events(created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_incident_events_severity ON incident_events(severity, created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_incident_events_resolved_at ON incident_events(resolved_at) WHERE resolved_at IS NULL`
    await sql`CREATE INDEX IF NOT EXISTS idx_incident_events_dedupe_key ON incident_events(dedupe_key, created_at DESC)`
    
    console.log("✅ Table 'incident_events' created with indexes")
    console.log("")

    // Verify tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('prompt_audit_events', 'incident_events')
      ORDER BY table_name
    `

    console.log("✅ Migrations Complete!")
    console.log("")
    console.log("Tables created:")
    tables.forEach((row: any) => {
      console.log(`  ✅ ${row.table_name}`)
    })

    console.log("")
    console.log("Next steps:")
    console.log("1. ✅ Database migrations complete")
    console.log("2. ⏭️  Tables are ready for use")
    console.log("3. ⏭️  Prompt audit events will be logged automatically")
    console.log("4. ⏭️  Incidents will be created from RED alerts automatically")
    console.log("")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigration()
