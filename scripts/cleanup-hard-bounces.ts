/**
 * Hard bounce cleanup for Resend audience.
 *
 * Default mode is dry-run:
 *   pnpm tsx scripts/cleanup-hard-bounces.ts
 *
 * Apply deletions:
 *   pnpm tsx scripts/cleanup-hard-bounces.ts --apply
 *
 * Optional limit for phased rollout:
 *   pnpm tsx scripts/cleanup-hard-bounces.ts --apply --limit 200
 */

import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { config as loadEnv } from "dotenv"
import { resolve } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { getAudienceContacts } from "@/lib/resend/get-audience-contacts"

loadEnv({ path: resolve(process.cwd(), ".env.local") })
loadEnv({ path: resolve(process.cwd(), ".env") })

type HardBounceRow = {
  email: string
  bounce_count: number
  last_bounced_at: string
}

const APPLY = process.argv.includes("--apply")
const limitIndex = process.argv.indexOf("--limit")
const LIMIT = limitIndex > -1 ? Number.parseInt(process.argv[limitIndex + 1] || "", 10) : null
const TARGET_LIMIT = Number.isFinite(LIMIT) && (LIMIT as number) > 0 ? (LIMIT as number) : null
const REQUEST_DELAY_MS = 550

function formatDateForFile(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-")
}

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase()
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  const resendApiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required")
  }
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is required")
  }
  if (!audienceId) {
    throw new Error("RESEND_AUDIENCE_ID is required")
  }

  const sql = neon(databaseUrl)
  const resend = new Resend(resendApiKey)

  console.log(`[HardBounceCleanup] Mode: ${APPLY ? "APPLY" : "DRY RUN"}`)
  if (TARGET_LIMIT) {
    console.log(`[HardBounceCleanup] Limit: ${TARGET_LIMIT}`)
  }

  const hardBounces = await sql`
    SELECT
      LOWER(BTRIM(user_email)) AS email,
      COUNT(*)::int AS bounce_count,
      MAX(sent_at)::text AS last_bounced_at
    FROM email_logs
    WHERE user_email IS NOT NULL
      AND BTRIM(user_email) <> ''
      AND status = 'bounced'
      AND LOWER(COALESCE(error_message, '')) LIKE 'bounced: hard%'
    GROUP BY LOWER(BTRIM(user_email))
    ORDER BY bounce_count DESC, MAX(sent_at) DESC
  ` as HardBounceRow[]

  const allAudienceContacts = await getAudienceContacts(audienceId)
  const audienceMap = new Map(
    allAudienceContacts
      .filter((contact) => contact.email)
      .map((contact) => [normalizeEmail(contact.email), contact]),
  )

  const intersectedCandidates = hardBounces
    .map((row) => ({ row, contact: audienceMap.get(normalizeEmail(row.email)) }))
    .filter((item) => !!item.contact)

  const candidates = TARGET_LIMIT ? intersectedCandidates.slice(0, TARGET_LIMIT) : intersectedCandidates

  let removedCount = 0
  const failed: Array<{ email: string; reason: string }> = []

  if (APPLY) {
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const contact = candidate.contact!

      try {
        // Remove by contact id from current audience membership.
        const response = await resend.contacts.remove({
          id: contact.id,
          audienceId,
        } as any)

        const apiError = (response as any)?.error
        if (apiError) {
          failed.push({ email: candidate.row.email, reason: String(apiError.message || apiError) })
        } else {
          removedCount += 1
        }
      } catch (error) {
        failed.push({
          email: candidate.row.email,
          reason: error instanceof Error ? error.message : String(error),
        })
      }

      // Respect Resend request limits.
      if (i < candidates.length - 1) {
        await sleep(REQUEST_DELAY_MS)
      }
    }
  }

  const now = new Date()
  const timestamp = now.toISOString()
  const reportPath = resolve(
    process.cwd(),
    "output/automation",
    `hard-bounce-cleanup-${formatDateForFile(now)}.md`,
  )
  await mkdir(resolve(process.cwd(), "output/automation"), { recursive: true })

  const report = [
    "# Hard Bounce Cleanup",
    "",
    `- Timestamp: ${timestamp}`,
    `- Mode: ${APPLY ? "apply" : "dry-run"}`,
    `- Audience ID: ${audienceId}`,
    `- Hard-bounced emails in DB: ${hardBounces.length}`,
    `- Active contacts in audience: ${allAudienceContacts.length}`,
    `- Hard-bounced contacts currently in audience: ${intersectedCandidates.length}`,
    `- Targeted this run: ${candidates.length}`,
    `- Removed this run: ${removedCount}`,
    `- Failed removals: ${failed.length}`,
    "",
    "## Top 20 candidates",
    "",
    "| email | hard_bounce_count | last_bounced_at |",
    "| --- | ---: | --- |",
    ...intersectedCandidates.slice(0, 20).map((item) =>
      `| ${item.row.email} | ${item.row.bounce_count} | ${item.row.last_bounced_at || "-"} |`,
    ),
    "",
    "## Failures",
    "",
    ...(failed.length === 0 ? ["None"] : failed.slice(0, 50).map((item) => `- ${item.email}: ${item.reason}`)),
    "",
  ].join("\n")

  await writeFile(reportPath, report, "utf8")

  console.log("")
  console.log(`[HardBounceCleanup] Hard-bounced in DB: ${hardBounces.length}`)
  console.log(`[HardBounceCleanup] In audience now: ${intersectedCandidates.length}`)
  console.log(`[HardBounceCleanup] Targeted this run: ${candidates.length}`)
  if (APPLY) {
    console.log(`[HardBounceCleanup] Removed: ${removedCount}`)
    console.log(`[HardBounceCleanup] Failed: ${failed.length}`)
  }
  console.log(`[HardBounceCleanup] Report: ${reportPath}`)
}

main().catch((error) => {
  console.error("[HardBounceCleanup] Failed:", error)
  process.exit(1)
})
