/**
 * Closes the nine open questions from the SSELFIE Systems Audit (2026-09-03).
 *
 * Read-only. Touches nothing. Run it with your normal local env:
 *
 *   pnpm tsx scripts/audit-close-out.ts
 *
 * Needs DATABASE_URL. STRIPE_SECRET_KEY unlocks the two Stripe sections; without
 * it those are reported as skipped rather than guessed at.
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.SUPABASE_POSTGRES_URL

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Run this from the repo root with .env.local present.")
  process.exit(1)
}

const sql = neon(databaseUrl)

const money = (cents: number) => `${(Number(cents || 0) / 100).toFixed(2)}`
const heading = (n: number, title: string) => {
  console.log("")
  console.log("─".repeat(72))
  console.log(`${String(n).padStart(2, "0")}. ${title.toUpperCase()}`)
  console.log("─".repeat(72))
}
const verdict = (ok: boolean, good: string, bad: string) =>
  console.log(ok ? `\n   ✅ ${good}` : `\n   ⚠️  ${bad}`)

async function tableExists(name: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name} LIMIT 1
  `
  return rows.length > 0
}

async function safely(label: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (error: any) {
    console.log(`   ⚠️  Could not complete "${label}": ${error?.message || error}`)
  }
}

// ── 1. Duplicate accounts from case-sensitive email ────────────────────────────
async function duplicateUsers() {
  heading(1, "Duplicate accounts (case-variant email)")
  const dupes = await sql`
    SELECT LOWER(email) AS email, COUNT(*)::int AS copies,
           ARRAY_AGG(id ORDER BY created_at) AS user_ids,
           ARRAY_AGG(email ORDER BY created_at) AS spellings
    FROM users
    WHERE email IS NOT NULL
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `
  if (dupes.length === 0) {
    verdict(true, "No duplicates. Safe to add a UNIQUE index on LOWER(email).", "")
    return
  }

  console.log(`\n   ${dupes.length} email(s) have more than one account:\n`)
  for (const row of dupes as any[]) {
    console.log(`   ${row.email}  ->  ${row.copies} rows`)
    console.log(`     spellings: ${row.spellings.join(" | ")}`)
    // Which copy actually holds the value?
    const detail = await sql`
      SELECT u.id, u.created_at, u.password_setup_complete,
             COALESCE(c.balance, 0)::int AS credits,
             (SELECT COUNT(*)::int FROM subscriptions s WHERE s.user_id = u.id) AS subs,
             (SELECT COUNT(*)::int FROM ai_images i WHERE i.user_id = u.id) AS images
      FROM users u
      LEFT JOIN user_credits c ON c.user_id = u.id
      WHERE u.id = ANY(${row.user_ids})
      ORDER BY u.created_at
    `
    for (const d of detail as any[]) {
      console.log(
        `     - ${d.id} created ${new Date(d.created_at).toISOString().slice(0, 10)} | ` +
          `credits ${d.credits} | subs ${d.subs} | images ${d.images} | ` +
          `password_set ${d.password_setup_complete === true ? "yes" : "no"}`
      )
    }
    console.log("")
  }
  console.log("   Merge toward the row holding the subscription and the images.")
  console.log("   The UNIQUE index on LOWER(email) will not build until these are resolved.")
}

// ── 2. Stripe customer identity split ──────────────────────────────────────────
async function stripeCustomerDrift() {
  heading(2, "Wrong Stripe customer in the billing portal")
  const drift = await sql`
    SELECT u.id, u.email,
           u.stripe_customer_id AS on_user,
           s.stripe_customer_id AS on_subscription,
           s.status, s.product_type
    FROM users u
    JOIN subscriptions s ON s.user_id = u.id
    WHERE s.stripe_customer_id IS NOT NULL
      AND u.stripe_customer_id IS NOT NULL
      AND u.stripe_customer_id <> s.stripe_customer_id
      AND s.status IN ('active', 'trialing', 'past_due')
    ORDER BY u.email
  `
  if (drift.length === 0) {
    verdict(true, "Every active member's two customer ids agree.", "")
  } else {
    console.log(`\n   ${drift.length} member(s) whose portal may open the wrong customer:\n`)
    for (const r of drift as any[]) {
      console.log(`   ${r.email} (${r.product_type}, ${r.status})`)
      console.log(`     users.stripe_customer_id         ${r.on_user}`)
      console.log(`     subscriptions.stripe_customer_id ${r.on_subscription}   <- the real one`)
    }
    console.log("\n   Fix: copy the subscription's id onto users, or null the users column.")
  }

  const orphan = await sql`
    SELECT COUNT(*)::int AS n FROM subscriptions
    WHERE status IN ('active', 'trialing', 'past_due') AND stripe_customer_id IS NULL
  `
  if ((orphan as any[])[0]?.n > 0) {
    console.log(
      `\n   ⚠️  ${(orphan as any[])[0].n} active subscription(s) have NO stripe_customer_id.`
    )
    console.log("      Those members fall through to the Stripe email search in the portal.")
  }
}

// ── 3. Was transactional email being dropped? ──────────────────────────────────
async function droppedEmails() {
  heading(3, "Transactional email dropped by the rate limiter")
  if (!(await tableExists("email_logs"))) {
    console.log("   email_logs table not found — skipped.")
    return
  }
  const dropped = await sql`
    SELECT email_type, COUNT(*)::int AS dropped,
           MIN(sent_at) AS first_seen, MAX(sent_at) AS last_seen
    FROM email_logs
    WHERE status = 'failed' AND error_message ILIKE '%rate limit%'
    GROUP BY email_type
    ORDER BY COUNT(*) DESC
  `
  if (dropped.length === 0) {
    verdict(true, "No email was ever dropped by the limiter.", "")
    return
  }
  console.log("\n   type                              dropped   first        last")
  for (const r of dropped as any[]) {
    console.log(
      `   ${String(r.email_type || "unknown").padEnd(32)} ${String(r.dropped).padStart(7)}   ` +
        `${new Date(r.first_seen).toISOString().slice(0, 10)}   ${new Date(r.last_seen).toISOString().slice(0, 10)}`
    )
  }
  console.log(
    "\n   Anything here that is NOT marketing was a customer who paid and did not get her email."
  )
  console.log("   Those people need a manual resend. The fix is live, so it stops accruing now.")
}

// ── 4. Fulfilments the webhook could not complete ──────────────────────────────
async function needsReview() {
  heading(4, "Purchases flagged for manual review")
  if (!(await tableExists("webhook_events_needs_review"))) {
    console.log("   webhook_events_needs_review table not found — skipped.")
    return
  }
  const open = await sql`
    SELECT flag_reason, COUNT(*)::int AS n, MAX(created_at) AS newest
    FROM webhook_events_needs_review
    WHERE resolved = FALSE
    GROUP BY flag_reason ORDER BY COUNT(*) DESC
  `
  if (open.length === 0) {
    verdict(true, "Nothing unresolved. Every payment fulfilled.", "")
    return
  }
  for (const r of open as any[]) {
    console.log(
      `   ${String(r.flag_reason).padEnd(24)} ${String(r.n).padStart(4)}   newest ${new Date(r.newest).toISOString().slice(0, 10)}`
    )
  }
  const rows = await sql`
    SELECT stripe_event_id, customer_email, product_type, amount_cents, flag_reason, created_at
    FROM webhook_events_needs_review
    WHERE resolved = FALSE ORDER BY created_at DESC LIMIT 25
  `
  console.log("\n   Most recent (these are people who may have paid and got nothing):\n")
  for (const r of rows as any[]) {
    console.log(
      `   ${new Date(r.created_at).toISOString().slice(0, 10)}  ` +
        `${String(r.customer_email || "NO EMAIL").padEnd(34)} ` +
        `${String(r.product_type || "?").padEnd(26)} ${money(r.amount_cents).padStart(9)}  ${r.flag_reason}`
    )
  }
  console.log("\n   Review at /admin/webhook-review.")
}

// ── 5. Are the scheduled jobs actually running? ────────────────────────────────
async function cronHealth() {
  heading(5, "Cron jobs over the last 7 days")
  if (!(await tableExists("cron_job_logs"))) {
    console.log("   cron_job_logs table not found — skipped.")
    return
  }
  const runs = await sql`
    SELECT job_name,
           COUNT(*) FILTER (WHERE status = 'success')::int AS ok,
           COUNT(*) FILTER (WHERE status <> 'success')::int AS bad,
           MAX(created_at) AS last_run
    FROM cron_job_logs
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY job_name ORDER BY job_name
  `
  if (runs.length === 0) {
    console.log("   ⚠️  No cron ran in 7 days. Check CRON_SECRET and the Vercel cron config.")
    return
  }
  console.log("\n   job                                    ok   fail   last run")
  for (const r of runs as any[]) {
    const flag = r.bad > 0 ? " <-" : ""
    console.log(
      `   ${String(r.job_name).padEnd(38)} ${String(r.ok).padStart(3)}  ${String(r.bad).padStart(4)}   ` +
        `${new Date(r.last_run).toISOString().slice(0, 16).replace("T", " ")}${flag}`
    )
  }
  // Scheduled in vercel.json but never seen here = silently not running.
  const scheduled = [
    "resolve-pending-payments", "reconcile-credits", "cron-health-check",
    "reconcile-generation-assets", "reconcile-generations", "reconcile-subscriptions",
    "win-back-sequence", "nurture-sequence", "ai-photoshoot-nurture",
    "prompt-vault-checkout-recovery", "campaign-checkout-recovery",
    "starter-kit-checkout-recovery", "resend-lifecycle-sync", "high-intent-click-recovery",
    "resend-membership-status-sync", "onboarding-sequence", "paid-product-membership-bridge",
    "daily-sandra-briefing", "suite-habit-emails", "vault-maya-launch", "suite-trial-expiry",
    "membership-checkout-recovery", "subscriber-winback", "ig-insights-sync",
    "payment-reconciliation", "feed-plan-monthly-draft", "weekly-content-trends",
  ]
  const seen = new Set((runs as any[]).map(r => r.job_name))
  const missing = scheduled.filter(j => !seen.has(j))
  if (missing.length > 0) {
    console.log(`\n   ⚠️  Scheduled in vercel.json but no run logged in 7 days:`)
    for (const j of missing) console.log(`      ${j}`)
  }
}

// ── 6. Who is actually paying (and how urgent was the Vault gate fix) ──────────
async function membershipShape() {
  heading(6, "Live membership shape")
  const shape = await sql`
    SELECT product_type, plan, status, COUNT(*)::int AS members
    FROM subscriptions
    WHERE COALESCE(is_test_mode, FALSE) = FALSE
    GROUP BY product_type, plan, status
    ORDER BY product_type, status, COUNT(*) DESC
  `
  console.log("\n   product_type                plan                 status        members")
  for (const r of shape as any[]) {
    console.log(
      `   ${String(r.product_type).padEnd(27)} ${String(r.plan || "-").padEnd(20)} ` +
        `${String(r.status).padEnd(13)} ${String(r.members).padStart(5)}`
    )
  }
  const vault = await sql`
    SELECT COUNT(*)::int AS n FROM subscriptions
    WHERE product_type = 'vault_maya' AND status = 'active'
      AND COALESCE(is_test_mode, FALSE) = FALSE
  `
  const n = (vault as any[])[0]?.n ?? 0
  console.log(
    n > 0
      ? `\n   ${n} active Vault Maya member(s) were being sent to the locked shell before today's fix.`
      : "\n   No active Vault Maya members — that gate fix was preventative."
  )

  const credits = await sql`
    SELECT COUNT(*)::int AS wallets,
           SUM(balance)::int AS total,
           COUNT(*) FILTER (WHERE balance < 0)::int AS negative
    FROM user_credits
  `
  const c = (credits as any[])[0]
  console.log(`\n   Credit wallets: ${c.wallets} | total balance ${c.total} | negative ${c.negative}`)
  if (c.negative > 0) console.log("   ⚠️  Negative balances should not exist. Investigate.")
}

// ── 7-8. Stripe reconciliation ─────────────────────────────────────────────────
async function stripeChecks() {
  heading(7, "Stripe: webhook endpoints and DB reconciliation")
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.log("   STRIPE_SECRET_KEY not set — skipped (not guessed).")
    return
  }
  const { default: Stripe } = await import("stripe")
  const stripe = new Stripe(key, { apiVersion: "2026-01-28.clover" as any })

  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
  console.log(`\n   ${endpoints.data.length} webhook endpoint(s) registered:\n`)
  for (const e of endpoints.data) {
    const flag = e.status === "enabled" && !e.url.includes("sselfie.ai") ? "  <- NOT sselfie.ai" : ""
    console.log(`   [${e.status}] ${e.url}${flag}`)
    console.log(`      ${e.enabled_events.length} event types`)
  }
  const liveEnabled = endpoints.data.filter(e => e.status === "enabled")
  if (liveEnabled.length > 1) {
    console.log(
      `\n   ⚠️  ${liveEnabled.length} enabled endpoints. Duplicate delivery is possible;`
    )
    console.log("      disable any that is not the current production URL.")
  }

  heading(8, "Stripe vs database: active subscriptions")
  const stripeSubs = await stripe.subscriptions.list({ status: "active", limit: 100 })
  const dbSubs = await sql`
    SELECT stripe_subscription_id FROM subscriptions
    WHERE status IN ('active', 'trialing') AND COALESCE(is_test_mode, FALSE) = FALSE
  `
  const dbIds = new Set((dbSubs as any[]).map(r => r.stripe_subscription_id).filter(Boolean))
  const stripeIds = new Set(stripeSubs.data.map(s => s.id))

  console.log(`\n   Stripe says active: ${stripeIds.size}`)
  console.log(`   Database says active/trialing: ${dbIds.size}`)

  const missingLocally = [...stripeIds].filter(id => !dbIds.has(id))
  const missingInStripe = [...dbIds].filter(id => !stripeIds.has(id))

  if (missingLocally.length === 0 && missingInStripe.length === 0) {
    verdict(true, "Stripe and the database agree exactly.", "")
    return
  }
  if (missingLocally.length) {
    console.log(`\n   ⚠️  Paying in Stripe, not active locally (they may lack access):`)
    for (const id of missingLocally) {
      const s = stripeSubs.data.find(x => x.id === id)!
      const cust = typeof s.customer === "string" ? s.customer : s.customer?.id
      let email = ""
      try {
        const c: any = await stripe.customers.retrieve(cust!)
        email = c?.email || ""
      } catch {}
      console.log(`      ${id}  ${email}`)
    }
  }
  if (missingInStripe.length) {
    console.log(`\n   ⚠️  Active locally, not active in Stripe (access without paying):`)
    for (const id of missingInStripe) console.log(`      ${id}`)
  }
}

// ── 9. Environment sanity ──────────────────────────────────────────────────────
function envChecks() {
  heading(9, "Environment")
  const rows: Array<[string, string]> = [
    ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL || "(unset)"],
    ["NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL || "(unset)"],
    ["APP_V3_MEMBERS_ENABLED", process.env.APP_V3_MEMBERS_ENABLED || "(unset)"],
    ["ADMIN_ALERT_EMAILS", process.env.ADMIN_ALERT_EMAILS ? "set" : "(unset)"],
    ["CRON_SECRET", process.env.CRON_SECRET ? "set" : "(unset)"],
    ["SKOOL_MEMBERSHIP_INGRESS_SECRET", process.env.SKOOL_MEMBERSHIP_INGRESS_SECRET ? "set" : "(unset)"],
    ["STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY ? `set (${process.env.STRIPE_SECRET_KEY.slice(0, 8)}…)` : "(unset)"],
    ["RESEND_API_KEY", process.env.RESEND_API_KEY ? "set" : "(unset)"],
  ]
  console.log("")
  for (const [k, v] of rows) console.log(`   ${k.padEnd(34)} ${v}`)

  console.log("\n   Notes:")
  if (!process.env.ADMIN_ALERT_EMAILS)
    console.log("   ⚠️  ADMIN_ALERT_EMAILS unset — webhook failure alerts go nowhere.")
  if (!process.env.SKOOL_MEMBERSHIP_INGRESS_SECRET)
    console.log("   ⚠️  Skool provisioning is INERT. The endpoint returns 503; no Skool member")
    console.log("      gets an account or credits until this secret is set in Vercel.")
  const site = process.env.NEXT_PUBLIC_SITE_URL || ""
  if (site && !site.includes("www."))
    console.log(`   ⚠️  NEXT_PUBLIC_SITE_URL is the apex (${site}). It 307-redirects to www,`)
    console.log("      which is fragile for emailed password-setup links.")
  console.log("\n   This reads your LOCAL env. Confirm against `vercel env ls` for production.")
}

async function main() {
  console.log("")
  console.log("SSELFIE — AUDIT CLOSE-OUT")
  console.log(`Run at ${new Date().toISOString()}`)
  console.log("Read-only. Nothing is modified.")

  await safely("duplicate users", duplicateUsers)
  await safely("stripe customer drift", stripeCustomerDrift)
  await safely("dropped emails", droppedEmails)
  await safely("needs review", needsReview)
  await safely("cron health", cronHealth)
  await safely("membership shape", membershipShape)
  await safely("stripe checks", stripeChecks)
  envChecks()

  console.log("")
  console.log("─".repeat(72))
  console.log("Done. Anything marked ⚠️ is a real open item.")
  console.log("─".repeat(72))
  console.log("")
}

main().catch(error => {
  console.error("\nClose-out failed:", error)
  process.exit(1)
})
