import { buildRevenueEmailLink } from "./revenue-links"
import { renderPersonalLink, renderPersonalNote } from "./stone-email"
import { EMAIL_CONFIG } from "../config"

export interface OneSelfieVisibilityLaunchParams {
  firstName: string
  recipientEmail?: string | null
}

export type OneSelfieVisibilityLaunchEmail = {
  subject: string
  html: string
  text: string
}

const OFFER_PATH = "/one-selfie"
const CLOSE_LABEL = "Wednesday, July 15 at 6:00 PM Oslo time"

function addMarketingCompliance(html: string, text: string): { html: string; text: string } {
  const footerHtml = `<div style="margin:34px 0 0;padding-top:18px;border-top:1px solid #D8D9DA;color:#818283;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;text-align:center;">${EMAIL_CONFIG.compliance.unsubscribeHtml}${EMAIL_CONFIG.compliance.addressHtml}</div>`
  return {
    html: html.replace("</body>", `${footerHtml}</body>`),
    text: `${text}\n\n${EMAIL_CONFIG.compliance.unsubscribeText}\n${EMAIL_CONFIG.compliance.addressText}`,
  }
}

function offerUrl(content: string, recipientEmail?: string | null): string {
  return buildRevenueEmailLink(OFFER_PATH, {
    campaign: "one_selfie_visibility_48h",
    content,
    medium: "launch",
    source: "email",
    emailType: content,
    checkoutEmail: recipientEmail,
  })
}

function existingMemberNote(): string {
  return "If you already pay for SUITE, you do not need this bundle. You already have the important part, so please don't buy it twice."
}

function alreadyJoinedNote(): string {
  return "Already joined? You're done. Open your bundle from the delivery email. Please don't buy it again."
}

export function generateOneSelfieVisibilityOpenEmail({
  firstName,
  recipientEmail,
}: OneSelfieVisibilityLaunchParams): OneSelfieVisibilityLaunchEmail {
  const url = offerUrl("open", recipientEmail)
  const subject = "I put the whole path behind one selfie"
  const html = renderPersonalNote({
    title: subject,
    bodyHtml: `
      <p style="margin:0 0 18px;">Hey ${firstName},</p>
      <p style="margin:0 0 18px;">I've noticed something a little ridiculous.</p>
      <p style="margin:0 0 18px;">Most women don't need more photos on their phone. They need a simple way to turn one real selfie into something they can actually post.</p>
      <p style="margin:0 0 18px;">So I put the full path in one place for 48 hours.</p>
      <p style="margin:0 0 18px;"><strong>The One Selfie Visibility Bundle is $97 once.</strong> You get the Starter Kit, every SSELFIE preset, the Editing Masterclass, Branded by SSELFIE, and the Prompt Vault for life. You also get 30 days inside SUITE with 200 credits. That part ends automatically. Nothing renews.</p>
      <p style="margin:0 0 18px;">The one-time tools cost $260 separately. But honestly, the point isn't to collect five products. It is to start with one selfie and finally know what to do next.</p>
      <p style="margin:0 0 18px;">${renderPersonalLink("See the One Selfie Bundle", url)}</p>
      <p style="margin:0 0 18px;">It closes ${CLOSE_LABEL}.</p>
      <p style="margin:0;color:#818283;font-size:14px;">${existingMemberNote()}</p>
    `,
  })
  const text = `Hey ${firstName},

I've noticed something a little ridiculous.

Most women don't need more photos on their phone. They need a simple way to turn one real selfie into something they can actually post.

So I put the full path in one place for 48 hours.

The One Selfie Visibility Bundle is $97 once. You get the Starter Kit, every SSELFIE preset, the Editing Masterclass, Branded by SSELFIE, and the Prompt Vault for life. You also get 30 days inside SUITE with 200 credits. That part ends automatically. Nothing renews.

The one-time tools cost $260 separately. But honestly, the point isn't to collect five products. It is to start with one selfie and finally know what to do next.

See the One Selfie Bundle:
${url}

It closes ${CLOSE_LABEL}.

${existingMemberNote()}

Sandra x`
  return { subject, ...addMarketingCompliance(html, text) }
}

export function generateOneSelfieVisibilityInsideEmail({
  firstName,
  recipientEmail,
}: OneSelfieVisibilityLaunchParams): OneSelfieVisibilityLaunchEmail {
  const url = offerUrl("inside", recipientEmail)
  const subject = "the best photo of herself in years"
  const html = renderPersonalNote({
    title: subject,
    bodyHtml: `
      <p style="margin:0 0 18px;">Hey ${firstName},</p>
      <p style="margin:0 0 18px;">A woman using SSELFIE told me, “I just took the best photo of myself in years.”</p>
      <p style="margin:0 0 18px;">Another said, “Best one so far. I love that it looks real, and me.”</p>
      <p style="margin:0 0 18px;">That is the part I care about. Not making you look like someone else. Helping you start with the face and story you already have, and finally know how to use them.</p>
      <p style="margin:0 0 8px;"><strong>First, take and edit the selfie.</strong></p>
      <p style="margin:0 0 18px;">The Starter Kit and my full preset collection help you make the photo feel like you before AI touches anything.</p>
      <p style="margin:0 0 8px;"><strong>Then, turn it into more.</strong></p>
      <p style="margin:0 0 18px;">The Prompt Vault and 30 days with Maya help you create a bank of recognizable photos without learning how to write prompts.</p>
      <p style="margin:0 0 8px;"><strong>Then, know what to post.</strong></p>
      <p style="margin:0 0 18px;">Editing Masterclass and Branded by SSELFIE help you use the photos as part of a visible personal brand, instead of letting them disappear into your camera roll.</p>
      <p style="margin:0 0 18px;">It is one path. Not another course library you have to finish.</p>
      <p style="margin:0 0 18px;">This was never just about selfies. It was about becoming visible enough to build something of your own.</p>
      <p style="margin:0 0 18px;">${renderPersonalLink("Look inside the bundle", url)}</p>
      <p style="margin:0 0 18px;">$97 once. The five learning tools stay yours. The 30-day SUITE pass ends automatically. Nothing renews. It closes ${CLOSE_LABEL}.</p>
      <p style="margin:0 0 18px;color:#818283;font-size:14px;">${alreadyJoinedNote()}</p>
      <p style="margin:0;color:#818283;font-size:14px;">${existingMemberNote()}</p>
    `,
  })
  const text = `Hey ${firstName},

A woman using SSELFIE told me, "I just took the best photo of myself in years."

Another said, "Best one so far. I love that it looks real, and me."

That is the part I care about. Not making you look like someone else. Helping you start with the face and story you already have, and finally know how to use them.

First, take and edit the selfie.
The Starter Kit and my full preset collection help you make the photo feel like you before AI touches anything.

Then, turn it into more.
The Prompt Vault and 30 days with Maya help you create a bank of recognizable photos without learning how to write prompts.

Then, know what to post.
Editing Masterclass and Branded by SSELFIE help you use the photos as part of a visible personal brand, instead of letting them disappear into your camera roll.

It is one path. Not another course library you have to finish.

This was never just about selfies. It was about becoming visible enough to build something of your own.

Look inside the bundle:
${url}

$97 once. The five learning tools stay yours. The 30-day SUITE pass ends automatically. Nothing renews. It closes ${CLOSE_LABEL}.

${alreadyJoinedNote()}

${existingMemberNote()}

Sandra x`
  return { subject, ...addMarketingCompliance(html, text) }
}

export function generateOneSelfieVisibilityLastCallEmail({
  firstName,
  recipientEmail,
}: OneSelfieVisibilityLaunchParams): OneSelfieVisibilityLaunchEmail {
  const url = offerUrl("last_call", recipientEmail)
  const subject = "the One Selfie Bundle closes today"
  const html = renderPersonalNote({
    title: subject,
    bodyHtml: `
      <p style="margin:0 0 18px;">Hey ${firstName},</p>
      <p style="margin:0 0 18px;">Just one last note.</p>
      <p style="margin:0 0 18px;">The One Selfie Visibility Bundle closes today at 6:00 PM Oslo time. No new checkout can start after 6:00 PM, and I won't quietly reset the clock tomorrow. If you already opened checkout before then, you get a short payment window to finish.</p>
      <p style="margin:0 0 18px;">If you want one clear path from the selfie already on your phone to photos and content you can actually use, it is $97 once.</p>
      <p style="margin:0 0 18px;">The Starter Kit, full presets, Editing Masterclass, Branded by SSELFIE, and Prompt Vault stay yours for life. Your 30 days with Maya and 200 credits end automatically. Nothing renews.</p>
      <p style="margin:0 0 18px;">${renderPersonalLink("Get the bundle before it closes", url)}</p>
      <p style="margin:0 0 18px;">If it isn't for you right now, that is completely okay too.</p>
      <p style="margin:0 0 18px;color:#818283;font-size:14px;">${alreadyJoinedNote()}</p>
      <p style="margin:0;color:#818283;font-size:14px;">${existingMemberNote()}</p>
    `,
  })
  const text = `Hey ${firstName},

Just one last note.

The One Selfie Visibility Bundle closes today at 6:00 PM Oslo time. No new checkout can start after 6:00 PM, and I won't quietly reset the clock tomorrow. If you already opened checkout before then, you get a short payment window to finish.

If you want one clear path from the selfie already on your phone to photos and content you can actually use, it is $97 once.

The Starter Kit, full presets, Editing Masterclass, Branded by SSELFIE, and Prompt Vault stay yours for life. Your 30 days with Maya and 200 credits end automatically. Nothing renews.

Get the bundle before it closes:
${url}

If it isn't for you right now, that is completely okay too.

${alreadyJoinedNote()}

${existingMemberNote()}

Sandra x`
  return { subject, ...addMarketingCompliance(html, text) }
}
