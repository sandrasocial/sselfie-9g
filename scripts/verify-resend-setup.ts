/**
 * Verify Resend segments + webhook config
 * Run with: pnpm exec tsx scripts/verify-resend-setup.ts
 */

import { Resend } from "resend"
import { config as loadEnv } from "dotenv"
import { join } from "path"

loadEnv({ path: join(process.cwd(), ".env.local") })
loadEnv({ path: join(process.cwd(), ".env") })

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

async function main() {
  const { MARKETING_SEGMENTS } = await import("@/lib/email/config")
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY not set")
    process.exit(1)
  }

  if (!RESEND_AUDIENCE_ID) {
    console.error("❌ RESEND_AUDIENCE_ID not set")
    process.exit(1)
  }

  console.log("✅ Resend API key and audience ID set")
  console.log(`   Audience ID: ${RESEND_AUDIENCE_ID}`)

  if (!RESEND_WEBHOOK_SECRET) {
    console.warn("⚠️  RESEND_WEBHOOK_SECRET not set (webhook signature verification disabled)")
  } else {
    console.log("✅ RESEND_WEBHOOK_SECRET set")
  }

  const resend = new Resend(RESEND_API_KEY)

  console.log("\n🔎 Fetching Resend segments...")
  const segmentsResponse = await fetch("https://api.resend.com/segments", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
  })
  if (!segmentsResponse.ok) {
    const errorText = await segmentsResponse.text()
    throw new Error(`Resend API error: ${segmentsResponse.status} ${errorText}`)
  }
  const segmentsData = await segmentsResponse.json()
  const segmentsRaw = segmentsData?.data || segmentsData?.segments || segmentsData || []
  const segments = Array.isArray(segmentsRaw) ? segmentsRaw : []

  if (segments.length === 0) {
    console.warn("⚠️  No segments found in Resend for this audience")
  } else {
    console.log(`✅ Found ${segments.length} segments`)
  }

  const segmentIds = new Set(segments.map((segment: any) => segment.id))

  console.log("\n🔎 Checking required RESEND_SEGMENT_* env vars...")
  const missingEnv: string[] = []
  const missingInResend: string[] = []

  for (const [key, value] of Object.entries(MARKETING_SEGMENTS)) {
    if (!value) {
      missingEnv.push(key)
      continue
    }
    if (!segmentIds.has(value)) {
      missingInResend.push(`${key} -> ${value}`)
    }
  }

  if (missingEnv.length > 0) {
    console.warn(`⚠️  Missing env vars for segments: ${missingEnv.join(", ")}`)
  } else {
    console.log("✅ All RESEND_SEGMENT_* env vars set")
  }

  if (missingInResend.length > 0) {
    console.warn(`⚠️  Segment IDs not found in Resend: ${missingInResend.join(", ")}`)
  } else {
    console.log("✅ All configured segment IDs exist in Resend")
  }

  console.log("\n🔎 Checking webhook endpoint availability...")
  try {
    const response = await fetch(`${SITE_URL}/api/webhooks/resend`)
    if (!response.ok) {
      console.warn(`⚠️  Webhook GET check failed: ${response.status}`)
    } else {
      console.log("✅ Webhook endpoint reachable")
    }
  } catch (error: any) {
    console.warn(`⚠️  Webhook endpoint check failed: ${error.message}`)
  }
}

main().catch((error) => {
  console.error("❌ Verification failed:", error)
  process.exit(1)
})
