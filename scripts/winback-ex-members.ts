// FUNNEL-2026-06-11 — one-time win-back: canceled SUITE members get a 7-day trial of the
// REBUILT Studio (App v3 + Maya). They canceled the old product; they've never seen this one.
//
//   npx tsx scripts/winback-ex-members.ts            ← dry run (prints the list)
//   npx tsx scripts/winback-ex-members.ts --send     ← actually sends (Sandra-approved only)
//
// Audience: users with a canceled sselfie_studio_membership row (live mode), excluding
// anyone currently active, anyone who ever had a trial, and anyone already sent this email.

import { config } from "dotenv"
config({ path: ".env.local" })

const SEND = process.argv.includes("--send")

async function main() {
  const { sql } = await import("../lib/db/client")
  const { sendEmail } = await import("../lib/email/send-email")
  const { renderStoneButton, renderStoneShell } = await import("../lib/email/templates/stone-email")
  const { getFirstNameForEmail } = await import("../lib/email/recipient-name")
  const { EMAIL_CONFIG } = await import("../lib/email/config")
  const { randomUUID } = await import("crypto")
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  const exMembers = await sql`
    SELECT DISTINCT ON (LOWER(u.email)) LOWER(u.email) AS email, u.display_name AS name
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE s.product_type = 'sselfie_studio_membership'
      AND s.status = 'canceled'
      AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL)
      AND u.email IS NOT NULL
      AND u.email NOT ILIKE '%@yopmail.%'
      AND u.email NOT ILIKE '%@sselfie.ai'
      AND u.email NOT ILIKE '%@example.%'
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions a
        WHERE a.user_id = s.user_id
          AND ((a.product_type = 'sselfie_studio_membership' AND a.status = 'active')
               OR a.product_type = 'suite_trial')
      )
      AND NOT EXISTS (
        SELECT 1 FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(u.email)
          AND el.email_type IN ('winback_ex_member_trial', 'suite_trial_unlock')
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(u.email)
  `

  console.log(`${SEND ? "SENDING to" : "DRY RUN —"} ${exMembers.length} ex-members:\n`)
  for (const r of exMembers) console.log(`  ${r.email}`)
  if (!SEND) {
    console.log("\nDry run only. Re-run with --send to send.")
    return
  }

  let ok = 0
  let failed = 0
  for (const r of exMembers) {
    // Mint or reuse a claim token.
    const existing = await sql`
      SELECT access_token FROM freebie_subscribers WHERE LOWER(email) = LOWER(${r.email}) LIMIT 1
    `
    let token = (existing[0]?.access_token as string | undefined)?.trim()
    if (!token) {
      token = randomUUID()
      await sql`
        INSERT INTO freebie_subscribers (email, name, source, access_token, created_at, updated_at)
        VALUES (${r.email}, ${r.name || r.email.split("@")[0]}, 'winback-ex-member', ${token}, NOW(), NOW())
      `
    }
    const claimUrl = `${SITE}/claim/${token}`
    const name = getFirstNameForEmail({ fullName: r.name, email: r.email })

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You were a member once, and at some point the Studio stopped earning its place in your month. Fair.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Since then I rebuilt it from zero. The new Studio is Maya: a creative director who turns one selfie into photoshoots, carousels, reel covers, and captions that sound like you. No training. No prompt writing. You tap, she does the work.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">I'd rather show you than tell you: here's 7 days back inside, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.</p>
      <div style="margin:26px 0 22px;">${renderStoneButton("See the new Studio", claimUrl)}</div>
      <p style="margin:0;font-size:16px;line-height:1.75;">If it's still not for you, no hard feelings. Your old gallery is still yours.</p>
    `
    const html = renderStoneShell({
      title: "It's not the same Studio.",
      eyebrow: "SSELFIE SUITE",
      bodyHtml,
    })
    const text = `SSELFIE SUITE

Hey ${name},

You were a member once, and at some point the Studio stopped earning its place in your month. Fair.

Since then I rebuilt it from zero. The new Studio is Maya: a creative director who turns one selfie into photoshoots, carousels, reel covers, and captions that sound like you. No training. No prompt writing. You tap, she does the work.

I'd rather show you than tell you: here's 7 days back inside, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.

See the new Studio: ${claimUrl}

If it's still not for you, no hard feelings. Your old gallery is still yours.

Sandra`

    const result = await sendEmail({
      to: r.email,
      subject: "The Studio you left doesn't exist anymore",
      html,
      text,
      emailType: "winback_ex_member_trial",
      from: EMAIL_CONFIG.marketing.from,
      replyTo: EMAIL_CONFIG.marketing.replyTo,
      tags: ["winback", "ex-member", "trial-offer"],
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
