import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"

// BRIDGE-01 Phase D - SUITE trial lifecycle emails.
// Copy approved by Sandra 2026-06-11 (tasks/BRIDGE-01-suite-bridge.md, Appendix 1.4-1.6).

export interface TrialUnlockParams {
  customerName?: string | null
  customerEmail: string
  /** "Prompt Vault" or "Starter Kit" - used in subject + body. */
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
      ? `What you bought still works. But my Studio has grown since then. Maya is the creative director inside it now. She pulls the looks for you, keeps it looking like you in every photo, and gets smarter the more you use her.`
      : `The prompts you bought work anywhere. But inside my Studio, Maya already knows the SSELFIE worlds. She pulls the looks for you, keeps it looking like you in every photo, and gets sharper the more you use her.`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">${intro}</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">${bridge}</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">So here's your trial: 7 days inside the SUITE, with 20 photos on me. No card needed. Nothing turns into a charge. It just ends.</p>
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

So here's your trial: 7 days inside the SUITE, with 20 photos on me. No card needed. Nothing turns into a charge. It just ends.

Claim your 7 days: ${claimUrl}

Whatever you make is yours to keep, trial or not.

Sandra`

  return { html, text, subject }
}

// TRIAL-SEQUENCE-2026-07-03: day-0 activation for fresh trials. Copy approved by Sandra.
export function generateTrialDay0Email(params: {
  customerName?: string | null
  customerEmail: string
}): { html: string; text: string; subject: string } {
  const { customerName, customerEmail } = params
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const appUrl = `${siteUrl}/app`
  const subject = "your 7 days start now. do this first"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You're in. 7 days, 20 photos, everything I've made.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here's the only thing to do today: add one clear selfie. That's how Maya keeps every photo looking like you. Not an AI stranger. You, on your best day.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It takes two minutes. Open the Studio, Maya asks for your selfie, you pick a look you like, and she makes your first photo while you watch.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Make my first photo", appUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">By tomorrow you'll have photos you'd actually post. That's the whole point of this week.</p>
  `

  const html = renderStoneShell({
    title: "Meet Maya",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

You're in. 7 days, 20 photos, everything I've made.

Here's the only thing to do today: add one clear selfie. That's how Maya keeps every photo looking like you. Not an AI stranger. You, on your best day.

It takes two minutes. Open the Studio, Maya asks for your selfie, you pick a look you like, and she makes your first photo while you watch.

Make my first photo: ${appUrl}

By tomorrow you'll have photos you'd actually post. That's the whole point of this week.

Sandra x`

  return { html, text, subject }
}

export function generateTrialNoFirstImageEmail(params: {
  customerName?: string | null
  customerEmail: string
}): { html: string; text: string; subject: string } {
  const { customerName, customerEmail } = params
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const appUrl = `${siteUrl}/app?view=create`
  const subject = "two minutes, love. that's all this takes"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You claimed your 7 days but haven't made a photo yet. Can I guess why?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Either life got busy (fair, you're a woman with a life). Or there's a little voice saying you'll do it later, when you find a better selfie.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You don't need a better selfie. The one already in your camera roll from a good day is enough. Maya just needs to see your face once, and everything she makes stays recognizably you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here's exactly what happens: you open the Studio, add one selfie, tap a look you like. Two minutes later you're looking at your first photo.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Add my selfie", appUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">The first one doesn't need to be perfect. It just needs to exist.</p>
  `

  const html = renderStoneShell({
    title: "Make your first photo",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

You claimed your 7 days but haven't made a photo yet. Can I guess why?

Either life got busy (fair, you're a woman with a life). Or there's a little voice saying you'll do it later, when you find a better selfie.

You don't need a better selfie. The one already in your camera roll from a good day is enough. Maya just needs to see your face once, and everything she makes stays recognizably you.

Here's exactly what happens: you open the Studio, add one selfie, tap a look you like. Two minutes later you're looking at your first photo.

Add my selfie: ${appUrl}

The first one doesn't need to be perfect. It just needs to exist.

Sandra x`

  return { html, text, subject }
}

// TRIAL-SEQUENCE-2026-07-03: day-3 momentum email for trials that DID generate. The
// activated women previously heard nothing between first photo and "2 days left" - this
// is the email that turns photos into a posting win (and quietly sells the monthly rhythm).
export const TRIAL_DAY3_EMAIL_TYPE = "suite_trial_day3_post_one"

export function generateTrialDay3Email(params: {
  customerName?: string | null
  customerEmail: string
}): { html: string; text: string; subject: string } {
  const { customerName, customerEmail } = params
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const appUrl = `${siteUrl}/app`
  const subject = "did you post one yet?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You've made your first photos with Maya. Go look at them again. I'll wait.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Now here's what I want you to do, because this is the part most women skip: pick the one that feels most like you and post it today. Story or feed, doesn't matter. Just say something true next to it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That's the whole method. The photo gets you past "I have nothing to post." The true sentence does the rest.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">And if none of them feel quite right yet? Tell Maya. Literally type "this doesn't feel like me" and what's off. She adjusts, and she remembers for next time.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open my Studio", appUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">This is what the SUITE is every month: new looks, new photos, Maya knowing your style a little better each time. But today, just post one.</p>
  `

  const html = renderStoneShell({
    title: "Post one today",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

You've made your first photos with Maya. Go look at them again. I'll wait.

Now here's what I want you to do, because this is the part most women skip: pick the one that feels most like you and post it today. Story or feed, doesn't matter. Just say something true next to it.

That's the whole method. The photo gets you past "I have nothing to post." The true sentence does the rest.

And if none of them feel quite right yet? Tell Maya. Literally type "this doesn't feel like me" and what's off. She adjusts, and she remembers for next time.

Open my Studio: ${appUrl}

This is what the SUITE is every month: new looks, new photos, Maya knowing your style a little better each time. But today, just post one.

Sandra x`

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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Quick one: your trial ends ${endsOn}.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If Maya made you photos you'd actually post, that feeling doesn't have to end. The SUITE is &euro;97 a month: 200 photos, every look I make, and Maya remembering what feels like you. Cancel anytime.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Keep my Studio", joinUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">And if it's not for you, that's honestly fine. Everything you made stays yours.</p>
  `

  const html = renderStoneShell({
    title: "2 days left",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

Quick one: your trial ends ${endsOn}.

If Maya made you photos you'd actually post, that feeling doesn't have to end. The SUITE is €97 a month: 200 photos, every look I make, and Maya remembering what feels like you. Cancel anytime.

Keep my Studio: ${joinUrl}

And if it's not for you, that's honestly fine. Everything you made stays yours.

Sandra x`

  return { html, text, subject }
}

// TRIAL-CAP-01: one-time "trial credits used up" email. She burned all 20 credits, which is
// the moment of maximum demonstrated value, and until now nothing asked for the upgrade.
// Sent from the suite-trial-expiry cron, gated by TRIAL_CAP_UPGRADE_EMAIL_ENABLED, idempotent
// via email_logs (email_type below, status IN sent/delivered/suppressed).
export const TRIAL_CAP_UPGRADE_EMAIL_TYPE = "trial-cap-upgrade"

export function generateTrialCapUpgradeEmail(params: {
  customerName?: string | null
  customerEmail: string
}): { html: string; text: string; subject: string } {
  const { customerName, customerEmail } = params
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const joinUrl = `${siteUrl}/checkout/membership?interval=month&source=trial_cap_email&utm_source=email&utm_medium=email&utm_campaign=trial_cap_upgrade`
  const galleryUrl = `${siteUrl}/app`
  const subject = "You used all 20. I love that"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">I noticed something today. You used every single trial credit. All 20 photos.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Go look at them again. Every one started from your selfie, and it's still you. Not a filter. Not some AI stranger. You, in photos you'd actually post.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That's exactly what I built this for.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you want to keep going, the SUITE is the next step: 200 credits a month, every look I make, and Maya remembers what feels like you. It's &euro;97 a month, cancel anytime.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Keep creating with Maya", joinUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">And if now's not the moment, that's okay. Your photos are yours to keep either way.</p>
  `

  const html = renderStoneShell({
    title: "Look what you made",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

I noticed something today. You used every single trial credit. All 20 photos.

Go look at them again: ${galleryUrl}

Every one started from your selfie, and it's still you. Not a filter. Not some AI stranger. You, in photos you'd actually post.

That's exactly what I built this for.

If you want to keep going, the SUITE is the next step: 200 credits a month, every look I make, and Maya remembers what feels like you. It's €97 a month, cancel anytime.

Keep creating with Maya: ${joinUrl}

And if now's not the moment, that's okay. Your photos are yours to keep either way.

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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your 7 days are up, so photo-making is paused. Everything you made is still yours, and your gallery stays open.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you weren't done creating, the door isn't locked:</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Rejoin the SUITE", joinUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">No pressure from me. But if you posted even one photo this week and it felt good? That feeling is repeatable.</p>
  `

  const html = renderStoneShell({
    title: "Your photos are still yours",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

Your 7 days are up, so photo-making is paused. Everything you made is still yours, and your gallery stays open.

If you weren't done creating, the door isn't locked. Rejoin the SUITE: ${joinUrl}

No pressure from me. But if you posted even one photo this week and it felt good? That feeling is repeatable.

Sandra x`

  return { html, text, subject }
}
