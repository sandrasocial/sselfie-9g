// BRIDGE-01 — one-time backfill: invite past Vault/Starter Kit buyers to claim the 7-day
// SUITE trial. Sandra-approved send (2026-06-11). Run AFTER the trial flow is live.
//
//   npx tsx scripts/bridge-01-trial-backfill.ts            ← dry run (prints the list)
//   npx tsx scripts/bridge-01-trial-backfill.ts --send     ← actually sends
//
// Audience: distinct buyers of prompt_vault / starter_kit from stripe_payments (money
// truth) PLUS paid freebie_subscribers with no users row (token-only buyers — the claim
// flow creates their account). Excluded: active members, anyone with a suite_trial row
// (ever), anyone already sent 'suite_trial_unlock'. sendEmail enforces unsubscribe
// suppression (marketing: true) and writes email_logs, which also makes re-runs safe.

import { config } from "dotenv"
config({ path: ".env.local" })

const SEND = process.argv.includes("--send")

const PRODUCT_LABEL: Record<string, string> = {
  prompt_vault: "Prompt Vault",
  starter_kit: "Starter Kit",
  "prompt-vault-paid": "Prompt Vault",
  "starter-kit-paid": "Starter Kit",
}

async function main() {
  // Dynamic imports so dotenv has populated process.env BEFORE module-level clients
  // (Resend in send-email.ts) initialize — ES import hoisting would beat config() otherwise.
  const { sql } = await import("../lib/db/client")
  const { sendEmail } = await import("../lib/email/send-email")
  const { generateTrialUnlockEmail } = await import("../lib/email/templates/suite-trial")
  const { EMAIL_CONFIG } = await import("../lib/email/config")
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  // Group 1: buyers with accounts, from the money truth source.
  const accountBuyers = await sql`
    SELECT DISTINCT ON (LOWER(u.email))
      LOWER(u.email) AS email, MIN(sp.product_type) AS product
    FROM stripe_payments sp
    JOIN users u ON u.id = sp.user_id
    WHERE sp.product_type IN ('prompt_vault', 'starter_kit')
      AND sp.status IN ('succeeded', 'paid')
      AND (sp.is_test_mode = FALSE OR sp.is_test_mode IS NULL)
      AND u.email IS NOT NULL
    GROUP BY LOWER(u.email)
  `

  // Group 2: paid buyers with a token but no account yet (claim creates it).
  const tokenBuyers = await sql`
    SELECT LOWER(fs.email) AS email, fs.source AS product
    FROM freebie_subscribers fs
    WHERE fs.source IN ('prompt-vault-paid', 'starter-kit-paid')
      AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(fs.email))
  `

  const candidates = new Map<string, string>()
  for (const r of [...accountBuyers, ...tokenBuyers]) {
    if (!candidates.has(r.email)) candidates.set(r.email, PRODUCT_LABEL[r.product] || "Prompt Vault")
  }

  // Exclusions: members, anyone with a trial row ever, anyone already sent the unlock.
  const excluded = await sql`
    SELECT DISTINCT LOWER(u.email) AS email
    FROM users u JOIN subscriptions s ON s.user_id = u.id
    WHERE (s.product_type = 'sselfie_studio_membership' AND s.status = 'active')
       OR s.product_type = 'suite_trial'
  `
  const sent = await sql`
    SELECT DISTINCT LOWER(user_email) AS email FROM email_logs
    WHERE email_type = 'suite_trial_unlock' AND status IN ('sent', 'delivered')
  `
  for (const r of [...excluded, ...sent]) candidates.delete(r.email)

  // Claim tokens + names.
  const subscribers = await sql`
    SELECT LOWER(email) AS email, access_token, name FROM freebie_subscribers
    WHERE access_token IS NOT NULL AND access_token != ''
  `
  const tokenMap = new Map(subscribers.map((r: any) => [r.email, r]))

  const recipients = [...candidates.entries()]
    .map(([email, productLabel]) => {
      const sub = tokenMap.get(email) as { access_token: string; name: string | null } | undefined
      return sub ? { email, productLabel, name: sub.name, token: sub.access_token } : null
    })
    .filter(Boolean) as Array<{ email: string; productLabel: string; name: string | null; token: string }>

  console.log(`${SEND ? "SENDING to" : "DRY RUN —"} ${recipients.length} recipients:\n`)
  for (const r of recipients) console.log(`  ${r.email}  (${r.productLabel})`)

  if (!SEND) {
    console.log("\nDry run only. Re-run with --send to send.")
    return
  }

  let ok = 0
  let failed = 0
  for (const r of recipients) {
    const email = generateTrialUnlockEmail({
      customerName: r.name,
      customerEmail: r.email,
      productLabel: r.productLabel,
      claimUrl: `${SITE}/claim/${r.token}`,
      variant: "backfill",
    })
    const result = await sendEmail({
      to: r.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: "suite_trial_unlock",
      from: EMAIL_CONFIG.marketing.from,
      replyTo: EMAIL_CONFIG.marketing.replyTo,
      tags: ["suite-trial", "unlock", "backfill"],
      marketing: true,
    })
    if (result.success) {
      ok++
      console.log(`  ✓ ${r.email}`)
    } else {
      failed++
      console.error(`  ✗ ${r.email}: ${result.error}`)
    }
    await new Promise((res) => setTimeout(res, 200))
  }
  console.log(`\nDone: ${ok} sent, ${failed} failed.`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
