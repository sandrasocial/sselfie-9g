/**
 * Launch-day go / no-go for SSELFIE Skool.
 *
 *   pnpm skool:preflight
 *
 * Checks every prerequisite between "she pays on Skool" and "she is inside SSELFIE
 * with 100 credits". Read-only. Says GO or NO-GO and names the exact next action.
 *
 * Reads your LOCAL env. The same values must be set in Vercel production for the
 * live site — this cannot see Vercel, so confirm with `vercel env ls`.
 */

import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

import { SKOOL_GROUP_ID, SKOOL_PLAN_CODE, SKOOL_MEMBERSHIP_CREDITS } from "@/lib/skool/membership-contract"
import { SKOOL_PUBLIC_MEMBERSHIP_URL } from "@/lib/skool/public-acquisition"

const BASE64URL_32 = /^[A-Za-z0-9_-]{43}$/

type Check = {
  name: string
  ok: boolean
  blocking: boolean
  detail: string
  fix?: string
}

const checks: Check[] = []
const add = (c: Check) => checks.push(c)

async function run() {
  // ── 1. The signing secret ───────────────────────────────────────────────────
  const secret = process.env.SKOOL_MEMBERSHIP_INGRESS_SECRET?.trim() || ""
  add({
    name: "Signing secret",
    ok: BASE64URL_32.test(secret),
    blocking: true,
    detail: secret
      ? BASE64URL_32.test(secret)
        ? `set (${secret.slice(0, 6)}…, 43 chars)`
        : `set but MALFORMED (${secret.length} chars, needs 43)`
      : "not set",
    fix:
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"\n' +
      "       then set SKOOL_MEMBERSHIP_INGRESS_SECRET in Vercel (production + preview)\n" +
      "       AND .env.local. Same value in all three. Never rotate it — every\n" +
      "       membership key and setup link derives from it.",
  })

  // ── 2. Public acquisition flag ──────────────────────────────────────────────
  const acq = process.env.NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED?.trim()
  add({
    name: "Public acquisition flag",
    ok: acq === "true",
    blocking: true,
    detail:
      acq === "true"
        ? `on — /join/studio, /bio and the marketing CTAs point at Skool`
        : `off (${acq || "unset"}) — those three surfaces still sell the parallel Stripe membership`,
    fix: "Set NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED=true in Vercel production, then redeploy.\n" +
      "       Until this is on, your bio link sends people to the wrong offer.",
  })

  // ── 3. Database ─────────────────────────────────────────────────────────────
  const dbUrl =
    process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL
  let dbOk = false
  let dbDetail = "DATABASE_URL not set"
  if (dbUrl) {
    try {
      const { neon } = await import("@neondatabase/serverless")
      const sql = neon(dbUrl)
      const rows = await sql`SELECT 1 FROM skool_membership_entitlements LIMIT 1`
      void rows
      dbOk = true
      dbDetail = "reachable, skool_membership_entitlements exists (migration 77 applied)"
    } catch (error: any) {
      dbDetail = /relation .* does not exist/i.test(error?.message || "")
        ? "reachable, but skool_membership_entitlements is MISSING — migration 77 never ran"
        : `not reachable: ${error?.message || error}`
    }
  }
  add({
    name: "Database + Skool schema",
    ok: dbOk,
    blocking: true,
    detail: dbDetail,
    fix: "Migration 77 ships in the production build command. If the table is missing,\n" +
      "       the last production deploy did not apply it — redeploy and watch the build log.",
  })

  // ── 4. Email delivery ───────────────────────────────────────────────────────
  const resend = process.env.RESEND_API_KEY?.trim()
  add({
    name: "Setup email (Resend)",
    ok: Boolean(resend),
    blocking: true,
    detail: resend ? "RESEND_API_KEY set" : "RESEND_API_KEY not set — no member gets her setup link",
    fix: "Set RESEND_API_KEY in Vercel production and .env.local.",
  })

  // ── 5. Site URL — the setup link is rejected unless it is sselfie.ai ─────────
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim()
  const siteOk =
    siteUrl.startsWith("https://sselfie.ai") || siteUrl.startsWith("https://www.sselfie.ai")
  add({
    name: "Site URL",
    ok: siteOk,
    blocking: true,
    detail: siteUrl
      ? siteOk
        ? siteUrl
        : `${siteUrl} — sendSkoolSetupEmail rejects any link not on sselfie.ai`
      : "unset — the setup link falls back to a default that may not match production",
    fix: "Set NEXT_PUBLIC_SITE_URL=https://www.sselfie.ai (www, to match the live redirect).",
  })

  // ── 6. The transport — informational, cannot be checked from here ────────────
  add({
    name: "Skool → SSELFIE transport",
    ok: false,
    blocking: false,
    detail: "no automated sender exists (see docs/business/SKOOL_LAUNCH_RUNBOOK.md)",
    fix: "Until Zapier is wired: provision each member with `pnpm skool:grant her@email.com`.\n" +
      "       That is a complete, working path — it is manual, not broken.",
  })

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log("")
  console.log("  SSELFIE SKOOL — LAUNCH PREFLIGHT")
  console.log(`  group ${SKOOL_GROUP_ID} · plan ${SKOOL_PLAN_CODE} · ${SKOOL_MEMBERSHIP_CREDITS} credits/period`)
  console.log(`  join page ${SKOOL_PUBLIC_MEMBERSHIP_URL}`)
  console.log("")

  for (const c of checks) {
    const mark = c.ok ? "✓" : c.blocking ? "✗" : "·"
    console.log(`  ${mark} ${c.name.padEnd(28)} ${c.detail}`)
  }

  const blockers = checks.filter(c => !c.ok && c.blocking)

  console.log("")
  console.log("  " + "─".repeat(68))
  if (blockers.length === 0) {
    console.log("  GO — a member who pays on Skool can be provisioned end to end.")
    console.log("")
    console.log("  Next: pnpm skool:grant her@email.com")
  } else {
    console.log(`  NO-GO — ${blockers.length} blocker${blockers.length > 1 ? "s" : ""}. In order:`)
    console.log("")
    blockers.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name}: ${c.detail}`)
      if (c.fix) console.log(`     ${c.fix}`)
      console.log("")
    })
  }
  console.log("  " + "─".repeat(68))
  console.log("")
  console.log("  This reads your LOCAL env. Confirm production with: vercel env ls")
  console.log("")

  process.exit(blockers.length === 0 ? 0 : 1)
}

run().catch(error => {
  console.error("\nPreflight failed to run:", error?.message || error, "\n")
  process.exit(1)
})
