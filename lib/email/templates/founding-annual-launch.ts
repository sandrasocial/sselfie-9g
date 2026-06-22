// Founding Annual launch (2026-06) — the $20K engine. Sandra-approved 2026-06-22.
// €697/year founding rate, lifetime-locked, first 25. 5 touches: open -> proof ->
// value -> objection -> last call. No em-dashes, No-Fake, real scarcity. Broadcast
// sends are Sandra's (after Codex builds the €697 price + trial fix). Nothing auto-sends.

import { buildRevenueEmailLink } from "./revenue-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface FoundingAnnualParams {
  firstName: string
  recipientEmail?: string | null
}

const FOUNDING_PATH = "/checkout/membership?interval=annual&plan=founding"

function foundingUrl(campaign: string, content: string, recipientEmail?: string | null): string {
  return buildRevenueEmailLink(FOUNDING_PATH, {
    campaign,
    content,
    medium: "launch",
    source: "founding_launch",
    emailType: campaign,
    checkoutEmail: recipientEmail ?? undefined,
  })
}

export function generateFoundingAnnualOpenEmail({
  firstName,
  recipientEmail,
}: FoundingAnnualParams): { html: string; text: string; subject: string } {
  const url = foundingUrl("founding_annual_open", "claim_founding", recipientEmail)
  const subject = "I'm opening 25 founding spots"
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">I&apos;m doing something I&apos;ve only done once before. I&apos;m opening a founding rate for the SUITE, and then I&apos;m closing it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here&apos;s the honest why. The SUITE is the whole thing: Maya pulls your looks, keeps every photo looking like you, writes the captions, and 200 photos a month are yours. Every product I&apos;ve made is included. Every new drop too.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">For the first 25 women who join for the year, it&apos;s &euro;697 instead of &euro;970, locked at that rate for as long as you stay. After 25, or after Sunday, it goes back to &euro;970.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One member, 50 and fabulous, put it best: &ldquo;best one so far, I love that it looks real, and me.&rdquo; That&apos;s the whole SUITE in one line. Still you, just framed well.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Claim a founding spot · €697/year", url)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">🤍 Sandra</p>
  `
  const html = renderStoneShell({
    title: "25 founding spots in the SUITE.",
    eyebrow: "SSELFIE SUITE",
    subtitle: "€697/year, locked for life. Then it's gone.",
    bodyHtml,
    footerLead: "Everything included. Cancel anytime.",
    footerSignoff: "",
  })
  const text = `Hey ${firstName},

I'm doing something I've only done once before. I'm opening a founding rate for the SUITE, and then I'm closing it.

Here's the honest why. The SUITE is the whole thing: Maya pulls your looks, keeps every photo looking like you, writes the captions, and 200 photos a month are yours. Every product I've made is included. Every new drop too.

For the first 25 women who join for the year, it's €697 instead of €970, locked at that rate for as long as you stay. After 25, or after Sunday, it goes back to €970.

One member, 50 and fabulous, put it best: "best one so far, I love that it looks real, and me." That's the whole SUITE in one line. Still you, just framed well.

Claim a founding spot (€697/year):
${url}

Sandra`
  return { html, text, subject }
}

export function generateFoundingAnnualProofEmail({
  firstName,
  recipientEmail,
}: FoundingAnnualParams): { html: string; text: string; subject: string } {
  const url = foundingUrl("founding_annual_proof", "join_founding", recipientEmail)
  const subject = "“I used to hate taking photos”"
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">A member told me: &ldquo;I used to hate taking photos. Now I feel like a queen.&rdquo; Another: &ldquo;I just took the best photo of myself in years.&rdquo;</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Neither booked a studio. They opened Maya, gave her one selfie, and she did the rest. That&apos;s what the SUITE is. Not an app you have to learn. A creative director who already knows your brand.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Founding annual is &euro;697, locked for life, for the first 25. Everything included, cancel anytime.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Join founding · €697/year", url)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra x</p>
  `
  const html = renderStoneShell({
    title: "She used to hate taking photos.",
    eyebrow: "SSELFIE SUITE",
    subtitle: "One selfie. Maya does the rest. Still her.",
    bodyHtml,
    footerLead: "€697/year founding, locked for life.",
    footerSignoff: "",
  })
  const text = `Hey ${firstName},

A member told me: "I used to hate taking photos. Now I feel like a queen." Another: "I just took the best photo of myself in years."

Neither booked a studio. They opened Maya, gave her one selfie, and she did the rest. That's what the SUITE is. Not an app you have to learn. A creative director who already knows your brand.

Founding annual is €697, locked for life, for the first 25. Everything included, cancel anytime.

Join founding (€697/year):
${url}

Sandra x`
  return { html, text, subject }
}

export function generateFoundingAnnualValueEmail({
  firstName,
  recipientEmail,
}: FoundingAnnualParams): { html: string; text: string; subject: string } {
  const url = foundingUrl("founding_annual_value", "lock_founding", recipientEmail)
  const subject = "everything that's inside (and what it would cost separately)"
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Quick map of what &euro;697 a year gets you, all in one place:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Maya and 200 photos a month. The Prompt Vault. The Starter Kit. The Masterclass. The Selfie to Brand Shoot System. And every new collection I drop, free, forever.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Bought separately that&apos;s well over a thousand dollars, and none of it has Maya. Founding annual is &euro;697, locked, for the first 25 women. Buy nothing twice.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Lock in founding · €697/year", url)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra</p>
  `
  const html = renderStoneShell({
    title: "Everything I've made, in one place.",
    eyebrow: "SSELFIE SUITE",
    subtitle: "€697/year founding. Buy nothing twice.",
    bodyHtml,
    footerLead: "First 25, then it's €970.",
    footerSignoff: "",
  })
  const text = `Hey ${firstName},

Quick map of what €697 a year gets you, all in one place:

Maya and 200 photos a month. The Prompt Vault. The Starter Kit. The Masterclass. The Selfie to Brand Shoot System. And every new collection I drop, free, forever.

Bought separately that's well over a thousand dollars, and none of it has Maya. Founding annual is €697, locked, for the first 25 women. Buy nothing twice.

Lock in founding (€697/year):
${url}

Sandra`
  return { html, text, subject }
}

export function generateFoundingAnnualObjectionEmail({
  firstName,
  recipientEmail,
}: FoundingAnnualParams): { html: string; text: string; subject: string } {
  const url = foundingUrl("founding_annual_objection", "claim_founding", recipientEmail)
  const subject = "will it actually look like me?"
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The question I get most: will the photos look like me, or like a filtered stranger?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Like you. Maya works from your real selfies and keeps what makes you recognizable. AI should not erase you. It should frame you. That&apos;s the rule the whole SUITE is built on.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">And yes, you can cancel anytime. Your photos stay yours either way. The only thing the founding rate asks is that you decide before the spots are gone.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Claim your founding spot", url)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra x</p>
  `
  const html = renderStoneShell({
    title: "Will it actually look like me?",
    eyebrow: "SSELFIE SUITE",
    subtitle: "Like you. That's the rule the SUITE is built on.",
    bodyHtml,
    footerLead: "Cancel anytime. Your photos stay yours.",
    footerSignoff: "",
  })
  const text = `Hey ${firstName},

The question I get most: will the photos look like me, or like a filtered stranger?

Like you. Maya works from your real selfies and keeps what makes you recognizable. AI should not erase you. It should frame you. That's the rule the whole SUITE is built on.

And yes, you can cancel anytime. Your photos stay yours either way. The only thing the founding rate asks is that you decide before the spots are gone.

Claim your founding spot:
${url}

Sandra x`
  return { html, text, subject }
}

export function generateFoundingAnnualLastCallEmail({
  firstName,
  recipientEmail,
}: FoundingAnnualParams): { html: string; text: string; subject: string } {
  const url = foundingUrl("founding_annual_lastcall", "join_before_close", recipientEmail)
  const subject = "founding closes tonight"
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Tonight the founding rate closes. After this it&apos;s &euro;970.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you&apos;ve been waiting for the sign: the whole SUITE, Maya, 200 photos a month, every product, every future drop, &euro;697 a year locked for life.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Join founding before it closes", url)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If anything snags at checkout, just reply. A real person answers, usually me.</p>
    <p style="margin:16px 0 0;font-size:16px;line-height:1.75;">Sandra</p>
  `
  const html = renderStoneShell({
    title: "Founding closes tonight.",
    eyebrow: "SSELFIE SUITE",
    subtitle: "After this, €970. Last call for €697 locked for life.",
    bodyHtml,
    footerLead: "The whole SUITE. Every future drop.",
    footerSignoff: "",
  })
  const text = `Hey ${firstName},

Tonight the founding rate closes. After this it's €970.

If you've been waiting for the sign: the whole SUITE, Maya, 200 photos a month, every product, every future drop, €697 a year locked for life.

Join founding before it closes:
${url}

If anything snags at checkout, just reply. A real person answers, usually me.

Sandra`
  return { html, text, subject }
}
