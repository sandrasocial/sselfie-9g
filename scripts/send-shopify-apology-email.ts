#!/usr/bin/env tsx
/**
 * Send apology email to Shopify migration customer
 * Run from app root: pnpm tsx scripts/send-shopify-apology-email.ts
 */

import { sendEmail } from '@/lib/email/send-email'

const CUSTOMER_EMAIL = 'Kywhitt@yahoo.com'

const htmlContent = `
<p>Hi there,</p>

<p>I'm so sorry. You should've gotten instant access weeks ago, and instead you've been waiting and wondering if anyone was listening.</p>

<p>That's on me. We've moved from Shopify to a new platform, and your purchase didn't automatically transfer over. You paid, you deserve access, and I'm fixing this right now.</p>

<p><strong>Here's what to do next:</strong></p>

<ol>
  <li>Go to <a href="https://sselfie.ai/auth/login">sselfie.ai</a> and log in (or create your account if you haven't already — use the same email: Kywhitt@yahoo.com).</li>
  <li>Your course + workbooks will be unlocked inside the <strong>Academy</strong> tab.</li>
  <li>If anything doesn't work, reply to this email and I'll personally walk you through it.</li>
</ol>

<p>Again — I'm really sorry for the delay. You trusted me with your money and time, and I let you down. Thank you for your patience.</p>

<p>You're all set now. Let me know if you need anything.</p>

<p>— Sandra</p>
`

const textContent = `
Hi there,

I'm so sorry. You should've gotten instant access weeks ago, and instead you've been waiting and wondering if anyone was listening.

That's on me. We've moved from Shopify to a new platform, and your purchase didn't automatically transfer over. You paid, you deserve access, and I'm fixing this right now.

Here's what to do next:

1. Go to https://sselfie.ai/auth/login and log in (or create your account if you haven't already — use the same email: Kywhitt@yahoo.com).
2. Your course + workbooks will be unlocked inside the Academy tab.
3. If anything doesn't work, reply to this email and I'll personally walk you through it.

Again — I'm really sorry for the delay. You trusted me with your money and time, and I let you down. Thank you for your patience.

You're all set now. Let me know if you need anything.

— Sandra
`

async function main() {
  console.log(`[send-email] Sending apology email to ${CUSTOMER_EMAIL}`)

  const result = await sendEmail({
    to: CUSTOMER_EMAIL,
    subject: 'Your Brands by SSELFIE course access is ready — apology inside',
    html: htmlContent,
    text: textContent,
    emailType: 'shopify_migration_apology',
    tags: ['shopify-migration', 'manual-send', 'branded_by_sselfie'],
  })

  console.log(`[send-email] ✅ Email sent successfully`)
  console.log(`[send-email] Result:`, result)

  return result
}

main()
  .then((result) => {
    console.log(`[send-email] Done`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`[send-email] Fatal error:`, error)
    process.exit(1)
  })
