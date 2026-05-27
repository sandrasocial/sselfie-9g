/**
 * One-shot script: send Prompt Vault launch broadcast via Resend API.
 * Run from project root: node scripts/send-prompt-vault-launch.mjs
 * Delete after use.
 */

import { readFileSync } from "fs"
import { join } from "path"

// ── Load .env.local ────────────────────────────────────────────────────────
const envPath = join(process.cwd(), ".env.local")
const envFile = readFileSync(envPath, "utf-8")
for (const raw of envFile.split(/\r?\n/)) {
  const line = raw.trim()
  if (!line || line.startsWith("#")) continue
  const eq = line.indexOf("=")
  if (eq < 1) continue
  const key = line.slice(0, eq).trim()
  let val = line.slice(eq + 1).trim()
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  if (!process.env[key]) process.env[key] = val
}

// ── Config ─────────────────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY
const AUDIENCE_ID   = "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"
const FROM          = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO      = "hello@sselfie.ai"
const SUBJECT       = "the vault is live"
const PREVIEW_URL   = "http://localhost:3000/api/admin/email-preview/prompt-vault-launch?firstName=there"

if (!RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY not found in .env.local")
  process.exit(1)
}

// ── Fetch rendered HTML from dev server ───────────────────────────────────
console.log("Fetching email HTML from dev server…")
const htmlRes = await fetch(PREVIEW_URL)
if (!htmlRes.ok) {
  console.error(`❌ Preview route returned ${htmlRes.status}`)
  process.exit(1)
}
const rawHtml = await htmlRes.text()
console.log(`  HTML length: ${rawHtml.length} chars`)

// ── Append Resend compliance block (required for broadcasts) ───────────────
// Resend requires {{{RESEND_UNSUBSCRIBE_URL}}} in broadcast HTML.
// CAN-SPAM requires a physical address.
const complianceHtml = `
<div style="text-align:center;padding:16px 24px 8px;font-family:Arial,Helvetica,sans-serif;">
  <p style="margin:0 0 6px;font-size:12px;color:#9B9189;">
    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9B9189;text-decoration:underline;">Unsubscribe</a>
  </p>
  <p style="margin:0;font-size:11px;color:#a8a49c;">SSELFIE Studio &bull; Fauskevegen 121, 6230 Sykkylven, Norway</p>
</div>
`
const html = `${rawHtml}\n${complianceHtml}`

// Plain-text version
const text = `THE VAULT IS OFFICIALLY LIVE
AI photoshoot prompts that make you feel like her again.

Hi there,

There is a version of you living somewhere in the photos you have been saving for months.

Not a fantasy version. Not someone else entirely. Just you photographed in a way that finally matches how you actually see yourself in your best moments.

The problem is not that those photos are impossible. The problem is that nobody ever showed you how to get them.

I have spent the past year testing AI photoshoot prompts on myself. What I kept finding is this: the gap between a beautiful result and a generic one has nothing to do with the AI. It has everything to do with the direction you give it.

Most people open ChatGPT, type something vague, and get something forgettable. That is not an AI problem. That is a prompt problem.

The vault is the direction.

GET THE VAULT: https://www.sselfie.ai/prompt-vault?utm_source=email&utm_medium=broadcast&utm_campaign=prompt_vault_launch

---

Four collections in the vault right now:

. Coastal White Dress Sunset Editorial
. Marble Cafe Wine Editorial
. Soft Blazer + Light Denim Street Editorial
. Cozy Leather + Oversized Knit Mirror Editorial

New collections drop as I test them. You pay once and keep everything that comes after.

You open ChatGPT. You upload one selfie. You paste the prompt. That is enough.

GET THE VAULT: https://www.sselfie.ai/prompt-vault?utm_source=email&utm_medium=broadcast&utm_campaign=prompt_vault_launch&utm_content=bottom_cta

$27 . Instant access . Grows with every new collection

Sandra x

---
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}
SSELFIE Studio, Fauskevegen 121, 6230 Sykkylven, Norway`

// ── Pre-send audit log ─────────────────────────────────────────────────────
console.log("\n── Pre-send audit ──────────────────────────────────────────")
console.log(`  Subject:     ${SUBJECT}`)
console.log(`  From:        ${FROM}`)
console.log(`  Audience ID: ${AUDIENCE_ID}`)
console.log(`  HTML chars:  ${html.length}`)
console.log(`  Has {{{RESEND_UNSUBSCRIBE_URL}}}: ${html.includes("RESEND_UNSUBSCRIBE_URL")}`)
console.log(`  CTA 1 link:  ${html.includes("utm_content=main_cta")}`)
console.log(`  CTA 2 link:  ${html.includes("utm_content=bottom_cta")}`)
console.log(`  Vault URL:   ${html.includes("sselfie.ai/prompt-vault")}`)
console.log("────────────────────────────────────────────────────────────\n")

// ── Step 1: Create broadcast ───────────────────────────────────────────────
console.log("Step 1: Creating Resend broadcast…")
const createRes = await fetch("https://api.resend.com/broadcasts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    audience_id: AUDIENCE_ID,
    from: FROM,
    reply_to: REPLY_TO,
    subject: SUBJECT,
    html,
    text,
  }),
})

const createData = await createRes.json()
console.log("  Resend response:", JSON.stringify(createData, null, 2))

if (!createRes.ok || !createData.id) {
  console.error("❌ Failed to create broadcast:", createData)
  process.exit(1)
}

const broadcastId = createData.id
console.log(`  ✅ Broadcast created: ${broadcastId}\n`)

// ── Step 2: Send broadcast ─────────────────────────────────────────────────
console.log("Step 2: Sending broadcast…")
const sendRes = await fetch(`https://api.resend.com/broadcasts/${broadcastId}/send`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({}),
})

const sendData = await sendRes.json()
console.log("  Resend response:", JSON.stringify(sendData, null, 2))

if (!sendRes.ok) {
  console.error("❌ Failed to send broadcast:", sendData)
  process.exit(1)
}

console.log(`\n✅ Broadcast sent! ID: ${broadcastId}`)
console.log("   Monitor at: https://resend.com/broadcasts")
console.log("   Admin panel: http://localhost:3000/admin/prompt-vault")
