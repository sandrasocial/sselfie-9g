/**
 * List Resend segments (REST API)
 * Run with: pnpm exec tsx scripts/list-resend-segments.ts
 */

import { config as loadEnv } from "dotenv"
import { join } from "path"

loadEnv({ path: join(process.cwd(), ".env.local") })
loadEnv({ path: join(process.cwd(), ".env") })

const RESEND_API_KEY = process.env.RESEND_API_KEY

async function main() {
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY not set")
    process.exit(1)
  }

  const response = await fetch("https://api.resend.com/segments", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const segments = data?.data || data?.segments || data || []

  console.log(JSON.stringify({ segments }, null, 2))
}

main().catch((error) => {
  console.error("❌ Failed to list segments:", error)
  process.exit(1)
})
