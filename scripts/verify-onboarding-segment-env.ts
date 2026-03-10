/**
 * Verify onboarding segment env vars (local and/or Vercel).
 *
 * Local only (default):
 *   pnpm run email:verify-onboarding-segments
 *
 * Check Vercel project env (uses VERCEL_TOKEN from .env.local):
 *   pnpm run email:verify-onboarding-segments --vercel
 *
 * Requires VERCEL_TOKEN in .env.local for --vercel. Optional: VERCEL_PROJECT_NAME (default v0-sselfie), VERCEL_TEAM_SLUG (default sselfie-studio).
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

async function fetchResendSegments(): Promise<Array<{ id: string; name: string }>> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return []
  }

  const res = await fetch("https://api.resend.com/segments", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  return Array.isArray(data?.data) ? data.data : []
}

async function checkVercelEnv(): Promise<void> {
  const token = process.env.VERCEL_TOKEN
  if (!token || token.trim() === "") {
    console.error("VERCEL_TOKEN is not set. Add it to .env.local to check Vercel env vars.")
    process.exit(1)
  }

  const projectName = process.env.VERCEL_PROJECT_NAME || "v0-sselfie"
  const teamSlug = process.env.VERCEL_TEAM_SLUG || "sselfie-studio"
  const url = new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/env`)
  url.searchParams.set("slug", teamSlug)

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`Vercel API error (${res.status}): ${text}`)
    process.exit(1)
  }

  const data = await res.json()
  // API returns an array of env vars (one per target: production/preview/development), so same key can appear multiple times
  const arr = Array.isArray(data) ? data : (data as { envs?: { key: string }[] }).envs ?? []
  const keys = new Set(arr.map((e: { key: string }) => e.key))

  console.log(`\nVercel project "${projectName}" (team: ${teamSlug}) — onboarding segment env:\n`)
  const missing: string[] = []
  for (const name of ONBOARDING_KEYS) {
    if (keys.has(name)) {
      console.log(`  ✅ ${name}: set`)
    } else {
      missing.push(name)
      console.log(`  ❌ ${name}: not set`)
    }
  }
  if (missing.length > 0) {
    console.log("\nAdd these in Vercel → Project → Settings → Environment Variables (Production/Preview/Development as needed).")
    process.exit(1)
  }
  console.log("\nAll onboarding segment env vars are set in Vercel.")
}

async function checkLocalEnv(): Promise<void> {
  console.log("Local / .env.local — onboarding segment env:\n")
  const missing: string[] = []
  const configured: Array<{ key: string; value: string }> = []
  for (const name of ONBOARDING_KEYS) {
    const v = process.env[name]
    if (!v || String(v).trim() === "") {
      missing.push(name)
      console.log(`  ❌ ${name}: (not set)`)
    } else {
      const value = String(v).trim()
      configured.push({ key: name, value })
      console.log(`  ✅ ${name}: ${value.slice(0, 8)}...`)
    }
  }
  if (missing.length > 0) {
    console.log("\nSet these in Vercel → Project → Settings → Environment Variables, and create matching segments in Resend.")
    process.exit(1)
  }

  const segments = await fetchResendSegments()
  if (segments.length > 0) {
    const stale = configured.filter(({ value }) => !segments.some((segment) => segment.id === value))
    if (stale.length > 0) {
      console.log("")
      for (const entry of stale) {
        console.log(`  ❌ ${entry.key}: ID does not exist in Resend`)
      }
      console.log("\nLocal onboarding segment IDs are stale. Recreate segments and update env before the cron runs.")
      process.exit(1)
    }

    console.log("")
    for (const entry of configured) {
      const segment = segments.find((candidate) => candidate.id === entry.value)
      console.log(`  ↳ ${entry.key}: ${segment?.name || "verified"}`)
    }
  }

  console.log("\nAll onboarding segment env vars are set locally and resolve in Resend.")
}

async function main() {
  const useVercel = process.argv.includes("--vercel")
  if (useVercel) {
    await checkVercelEnv()
  } else {
    await checkLocalEnv()
  }
}

main()
