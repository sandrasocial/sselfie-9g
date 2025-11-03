import { neon } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("Missing required environment variable: DATABASE_URL")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function setupFreebieTable() {
  console.log("Creating freebie_subscribers table...")

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS freebie_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        access_token VARCHAR(255) NOT NULL UNIQUE,
        guide_opened BOOLEAN DEFAULT FALSE,
        guide_opened_at TIMESTAMP,
        scroll_progress INTEGER DEFAULT 0,
        cta_clicks INTEGER DEFAULT 0,
        converted BOOLEAN DEFAULT FALSE,
        converted_at TIMESTAMP,
        resend_contact_id VARCHAR(255),
        resend_email_id VARCHAR(255),
        email_delivered BOOLEAN DEFAULT FALSE,
        email_opened BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    console.log("✅ Table created successfully")

    await sql`
      CREATE INDEX IF NOT EXISTS idx_freebie_access_token 
      ON freebie_subscribers(access_token)
    `

    console.log("✅ Index on access_token created")

    await sql`
      CREATE INDEX IF NOT EXISTS idx_freebie_email 
      ON freebie_subscribers(email)
    `

    console.log("✅ Index on email created")

    // Verify the table was created
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'freebie_subscribers'
    `

    if (result.length > 0) {
      console.log("✅ Table verified in database")
    } else {
      console.error("❌ Table not found after creation")
    }
  } catch (error) {
    console.error("Failed to setup table:", error)
    throw error
  }
}

setupFreebieTable().catch((error) => {
  console.error("Setup failed:", error)
  process.exit(1)
})
