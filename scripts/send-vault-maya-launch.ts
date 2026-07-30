/**
 * Vault Maya launch email to commerce buyers (vault, starter kit, presets, bundle, AI photos kit).
 *
 * SAFETY: does NOTHING without an explicit flag.
 *   npx tsx scripts/send-vault-maya-launch.ts            → dry run: prints recipient count + sample
 *   npx tsx scripts/send-vault-maya-launch.ts --send     → sends via Resend (requires Sandra's
 *                                                          approval of the copy in
 *                                                          docs/business/VAULT_MAYA_LAUNCH_PACK_2026-07-30.md)
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)
const QA_EMAIL = "orriaamodt@gmail.com"
const FROM = "Sandra from SSELFIE <hello@sselfie.ai>"
const SUBJECT = "I made the Prompt Vault even easier"
const LIVE = process.argv.includes("--send")

const HTML = `
<div style="max-width:560px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;color:#282728;background:#ffffff;padding:32px 24px;">
  <p style="font-size:11px;letter-spacing:0.18em;color:#818283;text-transform:uppercase;margin:0 0 20px;">Vault Maya · new</p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Hi{{FIRST_NAME}},</p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">You have my prompts, so you know how good the photos can be.</p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">I created the Prompt Vault to give you the exact prompts. But I wanted to make the whole experience even easier. Now you don&rsquo;t need to copy anything or figure out what to type. You choose the photo you want, and Maya creates it for you.</p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">You add your selfie once. Every Vault look shows up ready to create. Tap the one you love, and Maya creates the photo. Still completely you.</p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">New drops land every Monday, and you can request the looks you want to see next.</p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 24px;">30 photo creations a month. Founder price: $19/month, this week only. Join now and you keep $19 for as long as your membership stays active. After that it&rsquo;s $29/month for new members.</p>
  <p style="text-align:center;margin:0 0 24px;">
    <a href="https://sselfie.ai/vault-maya?utm_source=email&utm_medium=launch&utm_campaign=vault_maya_launch" style="display:inline-block;background:#0D0E10;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Create your first photo</a>
  </p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 8px;">And your Prompt Vault isn&rsquo;t going anywhere &mdash; it&rsquo;s yours forever. Vault Maya is simply the easier way to create the same looks.</p>
  <p style="font-size:16px;line-height:1.7;margin:0;">Sandra</p>
</div>
`

async function main() {
  const rows = await sql`
    SELECT DISTINCT LOWER(COALESCE(sp.customer_email, u.email)) AS email,
           MAX(COALESCE(u.display_name, '')) AS display_name
    FROM stripe_payments sp
    LEFT JOIN users u ON u.id::text = sp.user_id::text
    WHERE sp.status IN ('succeeded','paid')
      AND COALESCE(sp.is_test_mode, false) = false
      AND sp.product_type IN ('prompt_vault','starter_kit','presets_single','presets_bundle','selfie_visibility_bundle','selfie_ai_photos_kit')
      AND COALESCE(sp.customer_email, u.email) IS NOT NULL
    GROUP BY 1
  `
  const recipients = (rows as { email: string; display_name: string }[]).filter(
    (r) => r.email && r.email !== QA_EMAIL && r.email.includes("@"),
  )
  console.log(`Recipients: ${recipients.length}`)
  console.log("Sample:", recipients.slice(0, 5).map((r) => r.email.replace(/(.{2}).+(@.+)/, "$1***$2")).join(", "))

  if (!LIVE) {
    console.log("\nDRY RUN — no emails sent. Re-run with --send after Sandra approves the copy.")
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY missing")

  let sent = 0
  let failed = 0
  for (const r of recipients) {
    const firstName = r.display_name?.trim().split(/\s+/)[0] || ""
    const html = HTML.replace("{{FIRST_NAME}}", firstName ? ` ${firstName}` : "")
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: r.email, reply_to: "hello@sselfie.ai", subject: SUBJECT, html }),
    })
    if (res.ok) sent++
    else {
      failed++
      console.error(`Failed for ${r.email}: ${res.status} ${await res.text().catch(() => "")}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 600))
  }
  console.log(`Sent ${sent}, failed ${failed}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
