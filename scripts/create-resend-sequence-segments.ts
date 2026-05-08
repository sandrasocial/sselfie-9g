/**
 * Create required Resend sequence segments and update .env.local with IDs.
 * Run with: pnpm exec tsx scripts/create-resend-sequence-segments.ts
 */

import { config as loadEnv } from "dotenv"
import { join } from "path"
import { readFileSync, writeFileSync, existsSync } from "fs"

loadEnv({ path: join(process.cwd(), ".env.local") })
loadEnv({ path: join(process.cwd(), ".env") })

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID

const SEGMENTS = [
  { env: "RESEND_SEGMENT_BLUEPRINT_DAY_3", name: "Sequence: Blueprint Day 3" },
  { env: "RESEND_SEGMENT_BLUEPRINT_DAY_7", name: "Sequence: Blueprint Day 7" },
  { env: "RESEND_SEGMENT_BLUEPRINT_DAY_14", name: "Sequence: Blueprint Day 14" },
  { env: "RESEND_SEGMENT_PAID_BLUEPRINT_DAY_1", name: "Sequence: Paid Blueprint Day 1" },
  { env: "RESEND_SEGMENT_PAID_BLUEPRINT_DAY_3", name: "Sequence: Paid Blueprint Day 3" },
  { env: "RESEND_SEGMENT_PAID_BLUEPRINT_DAY_7", name: "Sequence: Paid Blueprint Day 7" },
  { env: "RESEND_SEGMENT_NURTURE_DAY_1", name: "Sequence: Nurture Day 1" },
  { env: "RESEND_SEGMENT_NURTURE_DAY_3", name: "Sequence: Nurture Day 3" },
  { env: "RESEND_SEGMENT_NURTURE_DAY_7", name: "Sequence: Nurture Day 7" },
  { env: "RESEND_SEGMENT_NURTURE_DAY_10", name: "Sequence: Nurture Day 10" },
  { env: "RESEND_SEGMENT_WELCOME_DAY_0", name: "Sequence: Welcome Day 0" },
  { env: "RESEND_SEGMENT_WELCOME_DAY_3", name: "Sequence: Welcome Day 3" },
  { env: "RESEND_SEGMENT_WELCOME_DAY_7", name: "Sequence: Welcome Day 7" },
  { env: "RESEND_SEGMENT_ONBOARDING_DAY_0", name: "Sequence: Onboarding Day 0" },
  { env: "RESEND_SEGMENT_ONBOARDING_DAY_2", name: "Sequence: Onboarding Day 2" },
  { env: "RESEND_SEGMENT_ONBOARDING_DAY_7", name: "Sequence: Onboarding Day 7" },
  { env: "RESEND_SEGMENT_REENGAGEMENT_DAY_0", name: "Sequence: Reengagement Day 0" },
  { env: "RESEND_SEGMENT_REENGAGEMENT_DAY_7", name: "Sequence: Reengagement Day 7" },
  { env: "RESEND_SEGMENT_REENGAGEMENT_DAY_14", name: "Sequence: Reengagement Day 14" },
  { env: "RESEND_SEGMENT_WIN_BACK_OFFER", name: "Sequence: Win Back Offer" },
  { env: "RESEND_SEGMENT_REACTIVATION_DAY_0", name: "Sequence: Reactivation Day 0" },
  { env: "RESEND_SEGMENT_REACTIVATION_DAY_2", name: "Sequence: Reactivation Day 2" },
  { env: "RESEND_SEGMENT_REACTIVATION_DAY_5", name: "Sequence: Reactivation Day 5" },
  { env: "RESEND_SEGMENT_REACTIVATION_DAY_7", name: "Sequence: Reactivation Day 7" },
  { env: "RESEND_SEGMENT_REACTIVATION_DAY_10", name: "Sequence: Reactivation Day 10" },
  { env: "RESEND_SEGMENT_REACTIVATION_DAY_14", name: "Sequence: Reactivation Day 14" },
  { env: "RESEND_SEGMENT_REACTIVATION_DAY_20", name: "Sequence: Reactivation Day 20" },
  { env: "RESEND_SEGMENT_REACTIVATION_DAY_25", name: "Sequence: Reactivation Day 25" },
  { env: "RESEND_SEGMENT_UPSELL_DAY_10", name: "Sequence: Upsell Day 10" },
  { env: "RESEND_SEGMENT_UPSELL_FREEBIE_MEMBERSHIP", name: "Sequence: Upsell Freebie Membership" },
  { env: "RESEND_SEGMENT_COLD_EDU_DAY_1", name: "Sequence: Cold Education Day 1" },
  { env: "RESEND_SEGMENT_COLD_EDU_DAY_3", name: "Sequence: Cold Education Day 3" },
  { env: "RESEND_SEGMENT_COLD_EDU_DAY_7", name: "Sequence: Cold Education Day 7" },
  { env: "RESEND_SEGMENT_DISCOVERY_DAY_0", name: "Sequence: Discovery Day 0" },
  { env: "RESEND_SEGMENT_DISCOVERY_DAY_3", name: "Sequence: Discovery Day 3" },
  { env: "RESEND_SEGMENT_DISCOVERY_DAY_5", name: "Sequence: Discovery Day 5" },
  { env: "RESEND_SEGMENT_DISCOVERY_DAY_7", name: "Sequence: Discovery Day 7" },
  { env: "RESEND_SEGMENT_DISCOVERY_DAY_10", name: "Sequence: Discovery Day 10" },
] as const

type SegmentEntry = (typeof SEGMENTS)[number]

async function listSegments() {
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
  return data?.data || data?.segments || data || []
}

async function createSegment(entry: SegmentEntry) {
  const maxAttempts = 5

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch("https://api.resend.com/segments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: entry.name,
        audience_id: RESEND_AUDIENCE_ID,
      }),
    })

    if (response.ok) {
      return response.json()
    }

    const errorText = await response.text()
    if (response.status === 429 && attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 700 * attempt))
      continue
    }

    throw new Error(`Resend API error: ${response.status} ${errorText}`)
  }
}

function updateEnvFile(envValues: Record<string, string>) {
  const envPath = join(process.cwd(), ".env.local")
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : ""
  const lines = existing.split(/\r?\n/)
  const seen = new Set<string>()

  const updatedLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/)
    if (!match) return line
    const key = match[1]
    if (envValues[key]) {
      seen.add(key)
      return `${key}=${envValues[key]}`
    }
    return line
  })

  for (const [key, value] of Object.entries(envValues)) {
    if (!seen.has(key)) {
      updatedLines.push(`${key}=${value}`)
    }
  }

  writeFileSync(envPath, updatedLines.join("\n").replace(/\n{3,}/g, "\n\n"))
}

async function main() {
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY not set")
    process.exit(1)
  }

  if (!RESEND_AUDIENCE_ID) {
    console.error("❌ RESEND_AUDIENCE_ID not set")
    process.exit(1)
  }

  const existing = await listSegments()
  const byName = new Map<string, { id: string; name: string }>()

  for (const segment of existing) {
    if (segment?.name && segment?.id) {
      byName.set(segment.name, segment)
    }
  }

  for (const entry of SEGMENTS) {
    if (byName.has(entry.name)) {
      continue
    }
    await createSegment(entry)
    await new Promise((resolve) => setTimeout(resolve, 600))
  }

  const refreshed = await listSegments()
  const envValues: Record<string, string> = {}

  for (const entry of SEGMENTS) {
    const match = refreshed.find((segment: any) => segment?.name === entry.name)
    if (!match?.id) {
      console.warn(`⚠️  Segment not found after creation: ${entry.name}`)
      continue
    }
    envValues[entry.env] = match.id
  }

  updateEnvFile(envValues)
  console.log("✅ Created/verified segments and updated .env.local")
}

main().catch((error) => {
  console.error("❌ Failed to create segments:", error)
  process.exit(1)
})
