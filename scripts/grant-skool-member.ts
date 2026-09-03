/**
 * Give one paid Skool member her SSELFIE access, by hand.
 *
 *   pnpm skool:grant her@email.com
 *   pnpm skool:grant her@email.com --dry-run
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

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const rawEmail = args.find(a => !a.startsWith("--"))

  if (!rawEmail) {
    fail("No email given.", "Usage: pnpm skool:grant her@email.com [--dry-run]")
  }

  const email = normalizeEmail(rawEmail)
  if (!email) fail(`"${rawEmail}" is not a valid email address.`)

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
  const secret = Buffer.from(rawSecret, "base64url")

  // Audit key falls back to the ingress secret, exactly as the route does.
  const auditSecret = process.env.SKOOL_MEMBERSHIP_AUDIT_KEY_SECRET?.trim() || rawSecret
  if (!BASE64URL_32.test(auditSecret)) {
    fail("SKOOL_MEMBERSHIP_AUDIT_KEY_SECRET is set but malformed. Unset it, or fix it.")
  }

  const observedAt = new Date()
  const membershipKey = `skool:${SKOOL_GROUP_ID}:${identityDigest(
    Buffer.from(auditSecret, "base64url"),
    email
  )}`
  const billingPeriodKey = observedAt.toISOString().slice(0, 10)

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

  console.log("")
  console.log(`  member          ${email}`)
  console.log(`  group           ${SKOOL_GROUP_ID}`)
  console.log(`  plan            ${SKOOL_PLAN_CODE}`)
  console.log(`  billing period  ${billingPeriodKey}`)
  console.log(`  credits         ${SKOOL_MEMBERSHIP_CREDITS}`)
  console.log("")

  if (dryRun) {
    console.log("  --dry-run: nothing was written. Re-run without the flag to provision.\n")
    return
  }

  let account
  try {
    account = await ensureSkoolMemberAccount({ email })
  } catch (error: any) {
    if (error?.message === "SKOOL_IDENTITY_CONFLICT") {
      fail(
        `Two accounts share ${email}, or the auth account's email does not match.`,
        "",
        "This is the case-variant duplicate the audit flagged. Run `pnpm audit:close-out`",
        "and merge the two rows before provisioning her, or she will end up with credits",
        "on the account she cannot log into.",
      )
    }
    throw error
  }

  console.log(`  ✓ account       ${account.userId} (${account.accountState})`)

  const grant = await grantSkoolMembership({ userId: account.userId, envelope })

  if (grant.replay) {
    console.log(`  · already provisioned for ${billingPeriodKey} — no credits added`)
  } else {
    console.log(`  ✓ credits       +${grant.creditsGranted}`)
  }
  console.log(`  ✓ balance       ${grant.balance}`)

  if (account.accountState === "recovery_required") {
    const setupLink = buildSkoolSetupEntryLink({
      membershipKey,
      secret: rawSecret,
      productionUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    })
    const sent = await sendSkoolSetupEmail({
      email,
      setupLink,
      membershipKey,
      billingPeriodKey,
    })
    console.log(`  ✓ setup email   sent (${sent.messageId || "no id"})`)
    console.log("")
    console.log("  If it does not arrive, send her this link directly:")
    console.log(`  ${setupLink}`)
  } else {
    console.log("  · she already has a password — no setup email needed, she just logs in")
  }

  console.log("")
  console.log("  Done. She has SSELFIE Suite + Maya.")
  console.log("")
}

main().catch(error => {
  console.error("\n✗ Provisioning failed:", error?.message || error)
  console.error("  Nothing partial was left behind — the grant is one transaction.\n")
  process.exit(1)
})
