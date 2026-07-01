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
  appUrl = "https://sselfie.ai/app",
}: {
  firstName: string
  passwordSetupUrl?: string
  masterclassUrl?: string
  selfieToBrandShootUrl?: string
  promptVaultUrl?: string
  bookingUrl?: string
  appUrl?: string
}): { html: string; text: string; subject: string } {
  const subject = "You're in. Here's how we start."
  const startButtons = passwordSetupUrl
    ? `<div style="margin:20px 0 10px;">${renderStoneButton("Set up your access", passwordSetupUrl)}</div>
       <div style="margin:8px 0 0;">${renderStoneButton("Open the Masterclass", masterclassUrl, "outline")}</div>`
    : `<div style="margin:20px 0 10px;">${renderStoneButton("Open the Masterclass", masterclassUrl)}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">You&apos;re in, and I&apos;m so glad. Four weeks, just us. Before our first call, four quick things so we hit the ground running:</p>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.75;"><strong>1. The plan.</strong> Read your four weeks below, so we&apos;re on the same page from day one. If anything feels off, tell me.</p>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.75;"><strong>2. Tell me about you.</strong> Just hit reply and answer the few questions at the bottom. Ten minutes, so our first call is all about you, not catching up.</p>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.75;"><strong>3. Start now.</strong> Your Masterclass, Selfie to Brand Shoot System, and Prompt Vault are ready. Start with the System, then open SSELFIE and begin your first photos so you arrive with a few already in progress.</p>
    ${startButtons}
    <div style="margin:8px 0 0;">${renderStoneButton("Open Selfie to Brand Shoot", selfieToBrandShootUrl, "outline")}</div>
    <div style="margin:8px 0 0;">${renderStoneButton("Open Prompt Vault", promptVaultUrl, "outline")}</div>
    <div style="margin:8px 0 18px;">${renderStoneButton("Start your photos", appUrl, "outline")}</div>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;"><strong>4. Book our first call.</strong> Pick a time that works for you. That&apos;s our kickoff, where we map your four weeks. You can use this same Calendly link for the weekly 45-minute sessions too.</p>
    <div style="margin:0 0 28px;">${renderStoneButton("Book your kickoff call", bookingUrl)}</div>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9189;">Your four weeks</p>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.75;">We pick the one goal that actually moves the needle for you, build the few things that matter most, and leave the rest for later so you&apos;re never buried. You&apos;ll always know what we&apos;re working on and why. You leave with your message, your offer, your content system, and a clear next move you can run yourself.</p>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9189;">A few questions before we start</p>
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;">1. Your business in one line. Who do you help, and with what?</p>
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;">2. Where do you show up online now? Drop your handles and website.</p>
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;">3. If these four weeks were a win, what would be true at the end?</p>
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;">4. How many minutes a week can you realistically give to this?</p>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.7;">5. What feels hardest about being online?</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Once you&apos;ve booked, we&apos;re off. Can&apos;t wait to build this with you.</p>
  `

  const html = renderStoneShell({
    title: "You're in.",
    eyebrow: "Work With Me",
    subtitle: "Four weeks, just us. Here's how we begin.",
    bodyHtml,
    footerLead: "Private. Four weeks. Just us.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

You're in, and I'm so glad. Four weeks, just us. Before our first call, four quick things:

1. The plan. Read your four weeks below, so we're on the same page from day one.
2. Tell me about you. Hit reply and answer the questions at the bottom. Ten minutes.
3. Start now. Your Masterclass, Selfie to Brand Shoot System, and Prompt Vault are ready. Start with the System, then open SSELFIE and begin your first photos.
4. Book our first call: ${bookingUrl}
You can use this same Calendly link for the weekly 45-minute sessions too.

${passwordSetupUrl ? `Set up your access: ${passwordSetupUrl}\n` : ""}Open the Masterclass: ${masterclassUrl}
Open Selfie to Brand Shoot: ${selfieToBrandShootUrl}
Open Prompt Vault: ${promptVaultUrl}
Start your photos: ${appUrl}

YOUR FOUR WEEKS
We pick the one goal that moves the needle, build the few things that matter most, and leave the rest for later so you're never buried. You leave with your message, your offer, your content system, and a clear next move.

A FEW QUESTIONS BEFORE WE START
1. Your business in one line. Who do you help, and with what?
2. Where do you show up online now? Handles and website.
3. If these four weeks were a win, what would be true at the end?
4. How many minutes a week can you realistically give to this?
5. What feels hardest about being online?

Once you've booked, we're off. Can't wait.

Sandra x`

  return { html, text, subject }
}
