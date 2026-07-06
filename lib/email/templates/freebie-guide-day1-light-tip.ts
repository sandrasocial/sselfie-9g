import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitCheckoutUrl } from "./selfie-education-links"

interface FreebieGuideTouchParams {
  firstName: string
  recipientEmail: string
  accessUrl: string
}

export function generateFreebieGuideDay1LightTipEmail({
  firstName,
  recipientEmail,
}: FreebieGuideTouchParams): { html: string; text: string; subject: string } {
  const starterKitUrl = new URL(buildRevenueEmailLink(starterKitCheckoutUrl(), {
    campaign: "freebie_guide_day1_light_tip",
    content: "get_starter_kit",
    emailType: "freebie-guide-day1-light-tip",
  }))
  starterKitUrl.searchParams.set("checkout_email", recipientEmail)
  starterKitUrl.searchParams.set("checkout_source", "freebie_guide_day1_starter_kit")
  starterKitUrl.searchParams.set("cta_keyword", "SELFIE")
  starterKitUrl.searchParams.set("buyer_stage", "lead")

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Did you get to try the angle trick? I hope your photos are already looking more like you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Here&apos;s the honest part. The guide gets you a better selfie. But the photos you save and wish were yours usually have two more things going on: a good edit and a pose that actually works for you.</p>
    <p style="margin:0 0 10px;font-size:16px;line-height:1.8;">That&apos;s what&apos;s in the Starter Kit:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:2;color:#3a3a3a;">
      <li>My SSELFIE presets, so one tap gives your photo that warm, editorial look</li>
      <li>A simple posing guide with the angles that flatter everyone</li>
      <li>Captions and a 7-day content plan, so your photos actually become posts</li>
    </ul>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">It&apos;s $37, one time, yours to keep. Still you, just the version you&apos;d actually post.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Get the Starter Kit · $37", starterKitUrl.toString())}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Either way, keep shooting. You&apos;re closer than you think.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "how did your selfies turn out?",
    html: renderStoneShell({
      eyebrow: "Selfie Guide",
      title: "How did your selfies turn out?",
      subtitle: "The little toolset that makes them look like you, on your best day.",
      bodyHtml,
      footerLead: "",
      footerSignoff: "",
    }),
    text: `Hey ${firstName},

Did you get to try the angle trick? I hope your photos are already looking more like you.

Here's the honest part. The guide gets you a better selfie. But the photos you save and wish were yours usually have two more things going on: a good edit and a pose that actually works for you.

That's what's in the Starter Kit:
- My SSELFIE presets, so one tap gives your photo that warm, editorial look
- A simple posing guide with the angles that flatter everyone
- Captions and a 7-day content plan, so your photos actually become posts

It's $37, one time, yours to keep. Still you, just the version you'd actually post.

Get the Starter Kit · $37:
${starterKitUrl.toString()}

Either way, keep shooting. You're closer than you think.

Sandra x`,
  }
}
