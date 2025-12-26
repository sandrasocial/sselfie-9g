/**
 * Add the missing trigger for email drafts table
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

// Load environment variables
config({ path: ".env.local" })
config({ path: ".env" })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function addTrigger() {
  try {
    console.log("[Trigger] Adding email_drafts_updated_at trigger...")

    // Create function if it doesn't exist
    await sql`
      CREATE OR REPLACE FUNCTION update_email_drafts_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log("✅ Function created/updated")

    // Drop trigger if exists
    try {
      await sql`DROP TRIGGER IF EXISTS email_drafts_updated_at ON admin_email_drafts`
    } catch (error: any) {
      // Ignore if trigger doesn't exist
    }

    // Create trigger
    await sql`
      CREATE TRIGGER email_drafts_updated_at
      BEFORE UPDATE ON admin_email_drafts
      FOR EACH ROW
      EXECUTE FUNCTION update_email_drafts_updated_at()
    `
    console.log("✅ Trigger created")

    // Verify trigger exists
    const triggers = await sql`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'public' 
        AND event_object_table = 'admin_email_drafts'
    `

    if (triggers.length > 0) {
      console.log("\n✅ Trigger verification:")
      triggers.forEach((trig) => {
        console.log(`  - ${trig.trigger_name}: ${trig.event_manipulation}`)
      })
    } else {
      console.log("\n⚠️  Warning: Trigger not found after creation")
    }

    console.log("\n✅ Trigger setup complete!")
  } catch (error: any) {
    console.error("❌ Error adding trigger:", error.message)
    throw error
  }
}

addTrigger()
  .then(() => {
    console.log("\n✅ Done")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error)
    process.exit(1)
  })




