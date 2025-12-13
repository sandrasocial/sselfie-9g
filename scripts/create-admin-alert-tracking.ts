import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  console.error("[v0] ❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function createAdminAlertTrackingTable() {
  try {
    console.log("[v0] Creating admin_alert_sent table...")
    
    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_alert_sent (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(100) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        alert_data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    console.log("[v0] ✓ Created admin_alert_sent table")
    
    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_alert_sent_alert_id 
      ON admin_alert_sent(alert_id)
    `
    console.log("[v0] ✓ Created index on alert_id")
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_alert_sent_sent_at 
      ON admin_alert_sent(sent_at DESC)
    `
    console.log("[v0] ✓ Created index on sent_at")
    
    // Add comment
    try {
      await sql`
        COMMENT ON TABLE admin_alert_sent IS 'Tracks when admin alert emails were sent to prevent spam/duplicate notifications'
      `
      console.log("[v0] ✓ Added table comment")
    } catch (error: any) {
      // Comment might fail on some databases, that's okay
      console.log("[v0] ⚠️  Could not add comment (non-critical)")
    }
    
    console.log("[v0] ✅ Successfully created admin_alert_sent table and indexes")
    
    // Verify the table was created
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'admin_alert_sent'
    `
    
    if (result.length > 0) {
      console.log("[v0] ✅ Table verified in database")
    } else {
      console.log("[v0] ⚠️  Warning: Table not found after creation")
    }
    
  } catch (error: any) {
    // Ignore "already exists" errors
    if (error?.message?.includes("already exists") || error?.code === "42P07" || error?.code === "23505") {
      console.log("[v0] ⚠️  Table/index already exists, that's okay")
    } else {
      console.error("[v0] ❌ Error creating table:", error)
      process.exit(1)
    }
  }
}

createAdminAlertTrackingTable()
