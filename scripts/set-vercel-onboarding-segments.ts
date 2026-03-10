/**
 * Push onboarding segment env vars from .env.local to Vercel.
 * Uses VERCEL_TOKEN from .env.local. Reads RESEND_SEGMENT_ONBOARDING_DAY_0/2/7 from .env.local.
 *
 * Run: pnpm exec tsx scripts/set-vercel-onboarding-segments.ts
 */
import { config } from "dotenv"
import { join } from "path"

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const ONBOARDING_KEYS = [
  "RESEND_SEGMENT_ONBOARDING_DAY_0",
  "RESEND_SEGMENT_ONBOARDING_DAY_2",
  "RESEND_SEGMENT_ONBOARDING_DAY_7",
] as const

async function main() {
  const token = process.env.VERCEL_TOKEN?.trim()
  if (!token) {
    console.error("VERCEL_TOKEN is not set in .env.local")
    process.exit(1)
  }

  const projectName = process.env.VERCEL_PROJECT_NAME || "v0-sselfie"
  const teamSlug = process.env.VERCEL_TEAM_SLUG || "sselfie-studio"

  const missing: string[] = []
  for (const key of ONBOARDING_KEYS) {
    const value = process.env[key]?.trim()
    if (!value) missing.push(key)
  }
  if (missing.length > 0) {
    console.error("Missing in .env.local:", missing.join(", "))
    process.exit(1)
  }

  const baseUrl = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/env`
  const target = ["production", "preview", "development"] as const

  for (const key of ONBOARDING_KEYS) {
    const value = process.env[key]!.trim()
    const url = `${baseUrl}?slug=${encodeURIComponent(teamSlug)}&upsert=true`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        type: "plain",
        target,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`Failed to set ${key}: ${res.status} ${text}`)
      process.exit(1)
    }
    console.log(`  ✅ ${key}`)
  }

  console.log(`\nOnboarding segment env vars set in Vercel (${projectName}).`)
}

main()
