import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

async function resetCampaign() {
  const result = await sql`
    UPDATE admin_email_campaigns
    SET status = 'scheduled', scheduled_for = NOW(), total_sent = 0, total_failed = 0, sent_at = NULL, updated_at = NOW()
    WHERE id = 3
    RETURNING id, campaign_name, status
  `
  
  console.log("Campaign reset:", JSON.stringify(result[0], null, 2))
}

resetCampaign().then(() => process.exit(0)).catch(console.error)
