import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function createSessionsTables() {
  console.log("[v0] Creating photo_sessions and session_shots tables...")

  try {
    // Create photo_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS photo_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        session_name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        progress INTEGER DEFAULT 0,
        total_shots INTEGER DEFAULT 0,
        completed_shots INTEGER DEFAULT 0,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created photo_sessions table")

    // Create session_shots table
    await sql`
      CREATE TABLE IF NOT EXISTS session_shots (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
        shot_name VARCHAR(255) NOT NULL,
        shot_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        image_id INTEGER,
        order_index INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("[v0] ✓ Created session_shots table")

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_photo_sessions_user_id ON photo_sessions(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_photo_sessions_status ON photo_sessions(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_session_shots_session_id ON session_shots(session_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_session_shots_status ON session_shots(status)`
    console.log("[v0] ✓ Created indexes")

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_photo_sessions_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log("[v0] ✓ Created trigger function")

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS photo_sessions_updated_at ON photo_sessions
    `
    await sql`
      CREATE TRIGGER photo_sessions_updated_at
      BEFORE UPDATE ON photo_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_photo_sessions_updated_at()
    `
    console.log("[v0] ✓ Created trigger")

    console.log("[v0] ✅ Successfully created all sessions tables and indexes!")
  } catch (error) {
    console.error("[v0] ❌ Error creating sessions tables:", error)
    throw error
  }
}

createSessionsTables()
