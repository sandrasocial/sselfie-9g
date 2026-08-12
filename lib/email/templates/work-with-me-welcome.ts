// Work With Me - post-payment welcome packet. Branded via the locked stone editorial shell.
// Sent after a Work With Me payment. Warm, her voice, four steps, the Calendly kickoff button,
// a compact "your four weeks" plan, and a short intake.

import { renderStoneButton, renderStoneShell } from "./stone-email"

const BOOKING_URL = "https://calendly.com/sandrasocial/work-with-me-session-45-min"

export function generateWorkWithMeWelcomeEmail({
  firstName,
  passwordSetupUrl,
  masterclassUrl = "https://sselfie.ai/academy/access/masterclass",
  selfieToBrandShootUrl = "https://sselfie.ai/academy/access/selfie-to-brand-shoot",
  promptVaultUrl = "https://sselfie.ai/academy/access/prompt-vault",
  bookingUrl = BOOKING_URL,
}: {
  firstName: string
  passwordSetupUrl?: string
  masterclassUrl?: string
  selfieToBrandShootUrl?: string
  promptVaultUrl?: string
  bookingUrl?: string
}): { html: string; text: string; subject: string } {
  const subject = "You're in. Here is how we start."
  const accessButton = passwordSetupUrl
    ? `<div style="margin:8px 0 0;">${renderStoneButton("Set up your access", passwordSetupUrl, "outline")}</div>`
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">You&apos;re in, and I&apos;m so glad. We have one job now: make the value you already create in real life clear enough for the right clients to understand, trust, and act on online.</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;"><strong>Your next step is to book our kickoff call.</strong> Choose a time that works for you. You can use this same Calendly link for the weekly 45-minute sessions too.</p>
    <div style="margin:0 0 28px;">${renderStoneButton("Book your kickoff call", bookingUrl)}</div>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9189;">One client-ready path</p>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.75;">Before our first call, I research your service, clients, market, message, and online presence. Then I build the first version of your positioning, offer page copy, Instagram profile copy, simple inquiry path, and four weeks of content drafts that teach, build trust, and lead to one clear invitation. On our calls, we refine that work against your real business. Anything that does not help the right client understand, trust, or contact you waits.</p>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9189;">Reply with these five things</p>
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;">1. The service you already deliver and what a good client pays for it.</p>
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;">2. Who gets the best result from your help.</p>
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;">3. The exact words you use to explain your service now.</p>
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;">4. Any client questions, messages, testimonials, or results that show why the work matters.</p>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.7;">5. Your Instagram and website links.</p>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9189;">Your supporting library</p>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.75;">Your Masterclass, Selfie to Brand Shoot System, and Prompt Vault are included. They are there to support the work, but you do not need to finish everything before we begin.</p>
    ${accessButton}
    <div style="margin:8px 0 0;">${renderStoneButton("Open the Masterclass", masterclassUrl, "outline")}</div>
    <div style="margin:8px 0 0;">${renderStoneButton("Open Selfie to Brand Shoot", selfieToBrandShootUrl, "outline")}</div>
    <div style="margin:8px 0 22px;">${renderStoneButton("Open Prompt Vault", promptVaultUrl, "outline")}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Book the call and send your reply. Then I get to work.</p>
  `

  const html = renderStoneShell({
    title: "You're in.",
    eyebrow: "Work With Me",
    subtitle: "One client-ready path. Four weeks, just us.",
    bodyHtml,
    footerLead: "Private. Four weeks. Just us.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

You're in, and I'm so glad. We have one job now: make the value you already create in real life clear enough for the right clients to understand, trust, and act on online.

YOUR NEXT STEP
Book our kickoff call: ${bookingUrl}
You can use this same Calendly link for the weekly 45-minute sessions too.

ONE CLIENT-READY PATH
Before our first call, I research your service, clients, market, message, and online presence. Then I build the first version of your positioning, offer page copy, Instagram profile copy, simple inquiry path, and four weeks of content drafts that teach, build trust, and lead to one clear invitation. On our calls, we refine that work against your real business. Anything that does not help the right client understand, trust, or contact you waits.

REPLY WITH THESE FIVE THINGS
1. The service you already deliver and what a good client pays for it.
2. Who gets the best result from your help.
3. The exact words you use to explain your service now.
4. Any client questions, messages, testimonials, or results that show why the work matters.
5. Your Instagram and website links.

YOUR SUPPORTING LIBRARY
${passwordSetupUrl ? `Set up your access: ${passwordSetupUrl}\n` : ""}Open the Masterclass: ${masterclassUrl}
Open Selfie to Brand Shoot: ${selfieToBrandShootUrl}
Open Prompt Vault: ${promptVaultUrl}

Book the call and send your reply. Then I get to work.

Sandra x`

  return { html, text, subject }
}
