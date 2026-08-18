// Work With Me post-payment welcome packet. Branded via the locked stone editorial shell.

import { renderStoneButton, renderStoneShell } from "./stone-email"

const BOOKING_URL = "https://calendly.com/sandrasocial/work-with-me-session-45-min"

export function generateWorkWithMeWelcomeEmail({
  firstName,
  welcomeUrl = "https://sselfie.ai/work-with-me/welcome",
  passwordSetupUrl,
  masterclassUrl = "https://sselfie.ai/academy/access/masterclass",
  selfieToBrandShootUrl = "https://sselfie.ai/academy/access/selfie-to-brand-shoot",
  promptVaultUrl = "https://sselfie.ai/academy/access/prompt-vault",
  bookingUrl = BOOKING_URL,
}: {
  firstName: string
  welcomeUrl?: string
  passwordSetupUrl?: string
  masterclassUrl?: string
  selfieToBrandShootUrl?: string
  promptVaultUrl?: string
  bookingUrl?: string
}): { html: string; text: string; subject: string } {
  const subject = "You are in. Let us build your personal AI team 🤍"
  const accessButton = passwordSetupUrl
    ? `<div style="margin:8px 0 0;">${renderStoneButton("Set up your access", passwordSetupUrl, "outline")}</div>`
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">You are in, and I am so glad. We have one job now: build a personal AI team that knows your business and helps carry the work that keeps coming back to you.</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;"><strong>Start with your private client home.</strong> Complete the intake there, then book our kickoff call.</p>
    <div style="margin:0 0 12px;">${renderStoneButton("Open your client home", welcomeUrl)}</div>
    <div style="margin:0 0 28px;">${renderStoneButton("Book your kickoff call", bookingUrl, "outline")}</div>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9189;">Your six weeks</p>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.75;">First I learn your business and build your Business Brain. Then we choose and train three personal AI roles around your real workload. We use them on real work, build three repeatable workflows, and finish with a 30-day working plan you can keep using.</p>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9189;">You stay in control</p>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.75;">Your team prepares the work we choose together. You review it, keep every client relationship, and make every final decision.</p>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9B9189;">Your supporting library</p>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.75;">Your Masterclass, Selfie to Brand Shoot System, and Prompt Vault are included. They are there to support the work, but you do not need to finish everything before we begin.</p>
    ${accessButton}
    <div style="margin:8px 0 0;">${renderStoneButton("Open the Masterclass", masterclassUrl, "outline")}</div>
    <div style="margin:8px 0 0;">${renderStoneButton("Open Selfie to Brand Shoot", selfieToBrandShootUrl, "outline")}</div>
    <div style="margin:8px 0 22px;">${renderStoneButton("Open Prompt Vault", promptVaultUrl, "outline")}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Complete the intake and book the call. Then I get to work.</p>
  `

  const html = renderStoneShell({
    title: "You are in.",
    eyebrow: "Work With Me",
    subtitle: "Your Personal AI Team. Six weeks, just us.",
    bodyHtml,
    footerLead: "Private. Six weeks. Built around you.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

You are in, and I am so glad. We have one job now: build a personal AI team that knows your business and helps carry the work that keeps coming back to you.

YOUR NEXT STEP
Open your client home and complete the intake: ${welcomeUrl}
Book our kickoff call: ${bookingUrl}

YOUR SIX WEEKS
First I learn your business and build your Business Brain. Then we choose and train three personal AI roles around your real workload. We use them on real work, build three repeatable workflows, and finish with a 30-day working plan you can keep using.

YOU STAY IN CONTROL
Your team prepares the work we choose together. You review it, keep every client relationship, and make every final decision.

YOUR SUPPORTING LIBRARY
${passwordSetupUrl ? `Set up your access: ${passwordSetupUrl}\n` : ""}Open the Masterclass: ${masterclassUrl}
Open Selfie to Brand Shoot: ${selfieToBrandShootUrl}
Open Prompt Vault: ${promptVaultUrl}

Complete the intake and book the call. Then I get to work.

Sandra x`

  return { html, text, subject }
}
