import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"

// BRIDGE-01 Phase D — SUITE trial lifecycle emails.
// Copy approved by Sandra 2026-06-11 (tasks/BRIDGE-01-suite-bridge.md, Appendix 1.4-1.6).

export interface TrialUnlockParams {
  customerName?: string | null
  customerEmail: string
  /** "Prompt Vault" or "Starter Kit" — used in subject + body. */
  productLabel: string
  claimUrl: string
  /**
   * "purchase" = sent right after buying (default). "backfill" = past Vault/Kit buyers
   * (one-time send). "legacy" = past buyers of non-prompt products (Feed Planner, sessions).
   */
  variant?: "purchase" | "backfill" | "legacy"
}

export function generateTrialUnlockEmail(params: TrialUnlockParams): {
  html: string
  text: string
  subject: string
} {
  const { customerName, customerEmail, productLabel, claimUrl, variant = "purchase" } = params
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })
  const subject =
    variant === "purchase"
      ? `A gift with your ${productLabel}: 7 days inside the SUITE`
      : `A gift for you: 7 days inside the SUITE`
  const intro =
    variant === "purchase"
      ? `Your ${productLabel} is in your inbox. This email is something extra.`
      : `A while back you bought the ${productLabel} from me. This email is something extra.`
  const bridge =
    variant === "legacy"
      ? `What you bought still works. But my Studio has grown since then. Maya is the creative director inside it now. She pulls the looks for you, keeps your face in every photo, and gets smarter the more you use her.`
      : `The prompts you bought work anywhere. But inside my Studio, Maya already knows them by heart. She's a creative director who pulls the looks for you, keeps your face in every photo, and gets smarter the more you use her.`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">${intro}</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">${bridge}</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">So here's your gift: 7 days inside the SUITE, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Claim your 7 days", claimUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Whatever you make is yours to keep, trial or not.</p>
  `

  const html = renderStoneShell({
    title: "Come meet Maya",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

${intro}

${bridge}

So here's your gift: 7 days inside the SUITE, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.

Claim your 7 days: ${claimUrl}

Whatever you make is yours to keep, trial or not.

Sandra`

  return { html, text, subject }
}

// FUNNEL-2026-06-11: day-0 activation for fresh trials (tap-first, mirrors member Day 0).
export function generateTrialDay0Email(params: {
  customerName?: string | null
  customerEmail: string
}): { html: string; text: string; subject: string } {
  const { customerName, customerEmail } = params
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const appUrl = `${siteUrl}/app`
  const subject = "You're in. Here's your first 10 minutes"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your 7 days just started. Here's all you need to do today:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the app. Pick a look. Maya pulls three concepts for you. Tap the one that feels most like you, and your first photos are done in minutes.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That's it. No prompts to write. Nothing to figure out.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your Studio", appUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">One promise before you start: these photos will look like you. AI should not erase you. It should frame you.</p>
  `

  const html = renderStoneShell({
    title: "Meet Maya",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

Your 7 days just started. Here's all you need to do today:

Open the app. Pick a look. Maya pulls three concepts for you. Tap the one that feels most like you, and your first photos are done in minutes.

That's it. No prompts to write. Nothing to figure out.

Open your Studio: ${appUrl}

One promise before you start: these photos will look like you. AI should not erase you. It should frame you.

Sandra`

  return { html, text, subject }
}

export interface TrialReminderParams {
  customerName?: string | null
  customerEmail: string
  /** Human-readable end date, e.g. "June 18". */
  endsOn: string
}

export function generateTrialDay5Email(params: TrialReminderParams): {
  html: string
  text: string
  subject: string
} {
  const { customerName, customerEmail, endsOn } = params
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const joinUrl = `${siteUrl}/checkout/membership?interval=month&source=trial_day5`
  const subject = "2 days left with Maya"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Short check-in: your trial ends ${endsOn}. If you've made photos you love, the SUITE is &euro;97 a month, cancel anytime, and everything I've made is included.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If it's not for you, that's honestly fine. Your photos stay yours either way.</p>
    <div style="margin:26px 0 12px;">${renderStoneButton("Keep your Studio", joinUrl)}</div>
  `

  const html = renderStoneShell({
    title: "2 days left",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

Short check-in: your trial ends ${endsOn}. If you've made photos you love, the SUITE is €97 a month, cancel anytime, and everything I've made is included.

If it's not for you, that's honestly fine. Your photos stay yours either way.

Keep your Studio: ${joinUrl}

Sandra`

  return { html, text, subject }
}

export function generateTrialEndedEmail(params: {
  customerName?: string | null
  customerEmail: string
}): { html: string; text: string; subject: string } {
  const { customerName, customerEmail } = params
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const joinUrl = `${siteUrl}/checkout/membership?interval=month&source=trial_ended`
  const subject = "Your trial ended. Your photos didn't"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your 7 days are up, so photo-making is paused. Your gallery, your photos, and everything you own are still yours and still open.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">When you want Maya back:</p>
    <div style="margin:26px 0 12px;">${renderStoneButton("Join the SUITE", joinUrl)}</div>
  `

  const html = renderStoneShell({
    title: "Your photos are still yours",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

Your 7 days are up, so photo-making is paused. Your gallery, your photos, and everything you own are still yours and still open.

When you want Maya back, join the SUITE: ${joinUrl}

Sandra`

  return { html, text, subject }
}
