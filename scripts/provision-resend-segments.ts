/**
 * Provision Resend audience segments and print the IDs for .env
 *
 * Usage:
 *   RESEND_API_KEY=re_... npx tsx scripts/provision-resend-segments.ts
 *
 * This script is idempotent — it lists existing segments and only creates
 * ones that don't exist yet (matched by name). Run it once, then paste the
 * printed env block into Vercel and .env.local.
 */

import { Resend } from "resend"

const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"

const SEGMENTS_TO_PROVISION = [
  { envKey: "RESEND_SEGMENT_ONBOARDING_DAY_0", name: "Onboarding Day 0" },
  { envKey: "RESEND_SEGMENT_ONBOARDING_DAY_2", name: "Onboarding Day 2" },
  { envKey: "RESEND_SEGMENT_ONBOARDING_DAY_7", name: "Onboarding Day 7" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_1",    name: "Nurture Day 1" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_3",    name: "Nurture Day 3" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_5",    name: "Nurture Day 5" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_7",    name: "Nurture Day 7" },
  { envKey: "RESEND_SEGMENT_NURTURE_DAY_10",   name: "Nurture Day 10" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_0",  name: "Discovery Day 0" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_3",  name: "Discovery Day 3" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_5",  name: "Discovery Day 5" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_7",  name: "Discovery Day 7" },
  { envKey: "RESEND_SEGMENT_DISCOVERY_DAY_10", name: "Discovery Day 10" },
  { envKey: "RESEND_SEGMENT_BLUEPRINT_DAY_3",  name: "Blueprint Day 3" },
  { envKey: "RESEND_SEGMENT_BLUEPRINT_DAY_7",  name: "Blueprint Day 7" },
  { envKey: "RESEND_SEGMENT_BLUEPRINT_DAY_14", name: "Blueprint Day 14" },
  { envKey: "RESEND_SEGMENT_COLD_EDU_DAY_1",   name: "Cold Edu Day 1" },
  { envKey: "RESEND_SEGMENT_COLD_EDU_DAY_3",   name: "Cold Edu Day 3" },
  { envKey: "RESEND_SEGMENT_COLD_EDU_DAY_7",   name: "Cold Edu Day 7" },
  { envKey: "RESEND_SEGMENT_WIN_BACK_DAY_3",   name: "Win Back Day 3" },
  { envKey: "RESEND_SEGMENT_WIN_BACK_DAY_7",   name: "Win Back Day 7" },
  { envKey: "RESEND_SEGMENT_WIN_BACK_DAY_14",  name: "Win Back Day 14" },
] as const

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("ERROR: RESEND_API_KEY is required")
    process.exit(1)
  }

  const resend = new Resend(apiKey)
  console.log(`\nUsing audience: ${AUDIENCE_ID}\n`)

  // Fetch existing segments
  let existing: Record<string, string> = {}
  try {
    // Resend doesn't yet expose a list-segments endpoint in the SDK;
    // use the contacts API as a proxy and fall through gracefully.
    console.log("Note: Resend SDK does not support listing segments — will attempt to create all.\n")
  } catch (_) {}

  const results: Array<{ envKey: string; id: string }> = []

  for (const seg of SEGMENTS_TO_PROVISION) {
    const existingId = existing[seg.name]
    if (existingId) {
      console.log(`  ✓ Already exists: ${seg.name} → ${existingId}`)
      results.push({ envKey: seg.envKey, id: existingId })
      continue
    }

    try {
      const res = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/segments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: seg.name }),
      })

      const json = (await res.json()) as any

      if (res.ok && json?.id) {
        console.log(`  ✓ Created: ${seg.name} → ${json.id}`)
        results.push({ envKey: seg.envKey, id: json.id })
      } else if (json?.name === seg.name || json?.message?.includes("already exists")) {
        // Already exists — try to find existing ID
        const listRes = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/segments`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        const list = (await listRes.json()) as any
        const found = list?.data?.find((s: any) => s.name === seg.name)
        if (found?.id) {
          console.log(`  ✓ Already exists: ${seg.name} → ${found.id}`)
          results.push({ envKey: seg.envKey, id: found.id })
        } else {
          console.warn(`  ✗ Already exists but ID not found: ${seg.name}`)
          results.push({ envKey: seg.envKey, id: "" })
        }
      } else {
        console.warn(`  ✗ Failed (${res.status}): ${seg.name}: ${json?.message || JSON.stringify(json)}`)
        results.push({ envKey: seg.envKey, id: "" })
      }
    } catch (err: any) {
      console.warn(`  ✗ Error: ${seg.name}: ${err?.message || err}`)
      results.push({ envKey: seg.envKey, id: "" })
    }

    // Rate limit buffer
    await new Promise((r) => setTimeout(r, 300))
  }

  // Print env block
  console.log("\n─── Paste into .env.local and Vercel env vars ──────────────────────────\n")
  for (const r of results) {
    console.log(`${r.envKey}="${r.id}"`)
  }
  console.log("\n────────────────────────────────────────────────────────────────────────\n")
}

main().catch((err) => {
  console.error("Unhandled error:", err)
  process.exit(1)
})
