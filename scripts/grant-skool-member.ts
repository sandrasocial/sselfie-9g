/**
 * Give one paid Skool member her SSELFIE access, by hand.
 *
 *   pnpm skool:grant her@email.com
 *   pnpm skool:grant a@x.com b@y.com c@z.com        # several at once
 *   pnpm skool:grant --file=members.txt             # one email per line
 *   pnpm skool:grant --list                         # who is already provisioned
 *   pnpm skool:grant her@email.com --dry-run
 *   pnpm skool:grant --file=members.txt --period=2026-10-01   # the monthly renewal run
 *
 * WHY THIS EXISTS
 * ---------------
 * /api/orchestration/skool/paid-member is built, signed, tested — and nothing
 * calls it. Skool has no native webhook that emits this envelope, and there is
 * no sender anywhere in this repo or in any automation. So on launch day the
 * automated path does not exist yet, and setting the ingress secret alone would
 * only change the failure from "503 not configured" to "nothing ever arrives".
 *
 * This runs the exact same provisioning the endpoint would run, locally, for one
 * member: account, entitlement, 100 credits, ledger row, setup email. Same
 * primitives, same idempotency, same advisory lock. Running it twice for the
 * same member in the same billing period is safe — the second run grants nothing.
 *
 * Replace it with the real webhook when there is a sender. Until then this is
 * the honest path, and it works.
 */

import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

import { createHmac } from "node:crypto"

import {
  SKOOL_GROUP_ID,
  SKOOL_PLAN_CODE,
  SKOOL_MEMBERSHIP_CREDITS,
  type SkoolMembershipEnvelope,
} from "@/lib/skool/membership-contract"
import { ensureSkoolMemberAccount } from "@/lib/skool/account-provisioning"
import { grantSkoolMembership } from "@/lib/skool/membership-service"
import { buildSkoolSetupEntryLink } from "@/lib/skool/setup-link"
import { sendSkoolSetupEmail } from "@/lib/skool/setup-email"

const BASE64URL_32 = /^[A-Za-z0-9_-]{43}$/

function fail(message: string, ...detail: string[]): never {
  console.error(`\n✗ ${message}`)
  for (const line of detail) console.error(`  ${line}`)
  console.error("")
  process.exit(1)
}

/** Mirrors identityDigest() in membership-contract.ts exactly. */
function identityDigest(secret: Buffer, email: string): string {
  return createHmac("sha256", secret)
    .update(`${SKOOL_GROUP_ID}\0${email}`, "utf8")
    .digest("hex")
    .slice(0, 32)
}

function normalizeEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase()
  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    /\s/.test(normalized) ||
    !/^[^@]+@[^@]+\.[^@]+$/.test(normalized)
  ) {
    return null
  }
  return normalized
}

async function listProvisioned() {
  const { sql } = await import("@/lib/db/client")
  const rows = (await sql`
    SELECT e.membership_key, e.access_status, e.last_confirmed_at, u.email,
           COALESCE(c.balance, 0)::int AS balance,
           (SELECT MAX(ct.created_at) FROM credit_transactions ct
             WHERE ct.user_id = e.user_id
               AND ct.transaction_type = 'subscription_grant'
               AND ct.reference_id LIKE 'skool-membership-period:%') AS last_grant
    FROM skool_membership_entitlements e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN user_credits c ON c.user_id = e.user_id
    WHERE e.group_id = ${SKOOL_GROUP_ID}
    ORDER BY e.last_confirmed_at DESC NULLS LAST
  `) as Array<Record<string, any>>

  console.log("")
  if (rows.length === 0) {
    console.log("  No Skool member has been provisioned yet.\n")
    return
  }
  console.log(`  ${rows.length} provisioned Skool member${rows.length > 1 ? "s" : ""}:\n`)
  console.log("  email                                   status    credits  last grant")
  for (const r of rows) {
    const last = r.last_grant ? new Date(r.last_grant).toISOString().slice(0, 10) : "never"
    console.log(
      `  ${String(r.email).padEnd(38)}  ${String(r.access_status).padEnd(8)}  ` +
        `${String(r.balance).padStart(7)}  ${last}`
    )
  }
  console.log("")
  console.log("  Anyone whose last grant is not this month still needs the renewal run.")
  console.log("")
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")

  if (args.includes("--list")) {
    await listProvisioned()
    return
  }

  const fileArg = args.find(a => a.startsWith("--file="))?.split("=")[1]?.trim()
  const inlineEmails = args.filter(a => !a.startsWith("--"))
  let rawEmails: string[] = inlineEmails

  if (fileArg) {
    const { readFileSync } = await import("node:fs")
    let contents: string
    try {
      contents = readFileSync(fileArg, "utf8")
    } catch {
      fail(`Could not read ${fileArg}.`)
    }
    rawEmails = [
      ...inlineEmails,
      ...contents.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#")),
    ]
  }

  if (rawEmails.length === 0) {
    fail(
      "No email given.",
      "Usage: pnpm skool:grant her@email.com [more@emails ...] [--dry-run]",
      "       pnpm skool:grant --file=members.txt",
      "       pnpm skool:grant --list",
    )
  }

  const emails: string[] = []
  for (const raw of rawEmails) {
    const normalized = normalizeEmail(raw)
    if (!normalized) fail(`"${raw}" is not a valid email address.`)
    if (!emails.includes(normalized)) emails.push(normalized)
  }

  const rawSecret = process.env.SKOOL_MEMBERSHIP_INGRESS_SECRET?.trim() || ""
  if (!BASE64URL_32.test(rawSecret)) {
    fail(
      "SKOOL_MEMBERSHIP_INGRESS_SECRET is missing or malformed.",
      "",
      "It must be 32 random bytes, base64url, 43 characters. Generate one with:",
      "",
      "  node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"",
      "",
      "Then set it in Vercel (production AND preview) and in .env.local, and never",
      "change it again. Every membership key and setup link is derived from this",
      "secret — rotating it orphans every member provisioned before the change.",
    )
  }
  // Audit key falls back to the ingress secret, exactly as the route does.
  const auditSecret = process.env.SKOOL_MEMBERSHIP_AUDIT_KEY_SECRET?.trim() || rawSecret
  if (!BASE64URL_32.test(auditSecret)) {
    fail("SKOOL_MEMBERSHIP_AUDIT_KEY_SECRET is set but malformed. Unset it, or fix it.")
  }

  // Credits are granted once per billing period, and the period key is what makes a
  // re-run a no-op. Deriving it from "today" would mean running this on the 3rd and
  // again on the 11th grants 200 credits to the same member in one month — a silent
  // credit leak on the exact path a human runs by hand.
  //
  // So the period defaults to the first of the current month: every run inside a month
  // resolves to the same key and only the first one grants. Pass --period=YYYY-MM-DD to
  // set it explicitly (use the real paid date when back-filling a specific join).
  const periodArg = args.find(a => a.startsWith("--period="))?.split("=")[1]?.trim()
  if (periodArg && !/^\d{4}-\d{2}-\d{2}$/.test(periodArg)) {
    fail(`--period must be YYYY-MM-DD, got "${periodArg}".`)
  }
  const now = new Date()
  const billingPeriodKey =
    periodArg ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`
  const observedAt = new Date(`${billingPeriodKey}T00:00:00.000Z`)
  if (Number.isNaN(observedAt.getTime())) fail(`--period "${billingPeriodKey}" is not a real date.`)

  console.log("")
  console.log(`  group           ${SKOOL_GROUP_ID}`)
  console.log(`  plan            ${SKOOL_PLAN_CODE}`)
  console.log(`  billing period  ${billingPeriodKey}${periodArg ? " (explicit)" : " (this month)"}`)
  console.log(`  credits         ${SKOOL_MEMBERSHIP_CREDITS} per member per period`)
  console.log(`  members         ${emails.length}`)
  console.log("")

  if (dryRun) {
    for (const email of emails) console.log(`  · ${email}`)
    console.log("\n  --dry-run: nothing was written. Re-run without the flag to provision.\n")
    return
  }

  let granted = 0
  let alreadyDone = 0
  const failures: Array<{ email: string; reason: string }> = []

  // One member at a time, deliberately. Each grant is its own transaction, so a
  // failure part-way through leaves every member before it fully provisioned and
  // every member after it untouched — re-running is safe and picks up where it
  // stopped. A batch that half-commits would be worse than a slow one.
  for (const email of emails) {
    const membershipKey = `skool:${SKOOL_GROUP_ID}:${identityDigest(
      Buffer.from(auditSecret, "base64url"),
      email
    )}`
    const envelope: SkoolMembershipEnvelope = {
      schemaVersion: 1,
      source: "skool",
      eventType: "membership.present",
      groupId: SKOOL_GROUP_ID,
      planCode: SKOOL_PLAN_CODE,
      observedAt: observedAt.toISOString(),
      billingPeriodKey,
      membershipKey,
      dedupeKey: `${membershipKey}:period:${billingPeriodKey}`,
      privateProvisioning: { email },
    }

    try {
      const account = await ensureSkoolMemberAccount({ email })
      const grant = await grantSkoolMembership({ userId: account.userId, envelope })

      let note: string
      if (grant.replay) {
        alreadyDone += 1
        note = `already had ${billingPeriodKey} · balance ${grant.balance}`
      } else {
        granted += 1
        note = `+${grant.creditsGranted} · balance ${grant.balance}`
      }

      if (account.accountState === "recovery_required") {
        const setupLink = buildSkoolSetupEntryLink({
          membershipKey,
          secret: rawSecret,
          productionUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
        })
        await sendSkoolSetupEmail({ email, setupLink, membershipKey, billingPeriodKey })
        note += " · setup email sent"
      } else {
        note += " · has a password already"
      }

      console.log(`  ✓ ${email.padEnd(38)} ${note}`)
    } catch (error: any) {
      const reason =
        error?.message === "SKOOL_IDENTITY_CONFLICT"
          ? "duplicate account — run pnpm audit:close-out and merge first"
          : error?.message || String(error)
      failures.push({ email, reason })
      console.log(`  ✗ ${email.padEnd(38)} ${reason}`)
    }
  }

  console.log("")
  console.log(
    `  ${granted} newly granted · ${alreadyDone} already had this period · ${failures.length} failed`
  )

  if (failures.length > 0) {
    console.log("")
    console.log("  Not provisioned — these members have paid and have nothing:")
    for (const f of failures) console.log(`    ${f.email}  ${f.reason}`)
    console.log("")
    console.log("  Fix the cause and re-run. Everyone already done will be skipped.")
    console.log("")
    process.exit(1)
  }

  console.log("")
  console.log("  Done. They have SSELFIE Suite + Maya.")
  console.log("")
}

main().catch(error => {
  console.error("\n✗ Provisioning failed:", error?.message || error)
  console.error("  Nothing partial was left behind — the grant is one transaction.\n")
  process.exit(1)
})
