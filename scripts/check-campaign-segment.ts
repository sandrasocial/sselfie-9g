import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

async function checkSegment() {
  const result = await sql`
    SELECT id, campaign_name, target_audience
    FROM admin_email_campaigns
    WHERE id = 3
  `
  
  console.log(JSON.stringify(result[0], null, 2))
}

checkSegment().then(() => process.exit(0)).catch(console.error)
