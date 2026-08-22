import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitCheckoutUrl } from "./selfie-education-links"

interface FreebieGuideTouchParams {
  firstName: string
  recipientEmail: string
  accessUrl: string
}

export function generateFreebieGuideDay8StarterKitDirectEmail({
  firstName,
  recipientEmail,
}: FreebieGuideTouchParams): { html: string; text: string; subject: string } {
  const starterKitUrl = new URL(buildRevenueEmailLink(starterKitCheckoutUrl(), {
    campaign: "freebie_guide_day8_starter_kit_direct",
    content: "get_starter_kit",
    emailType: "freebie-guide-day8-starter-kit-direct",
    checkoutEmail: recipientEmail,
  }))
  starterKitUrl.searchParams.set("checkout_source", "freebie_guide_day8_starter_kit_direct")
  starterKitUrl.searchParams.set("cta_keyword", "SELFIE")
  starterKitUrl.searchParams.set("buyer_stage", "lead")

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">By now, you probably see the point.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">A better selfie isn't about looking perfect.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">It's about giving yourself one photo you can actually use.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">The Starter Kit is the next step if you want the shortcut: the posing cheatsheet, the exact presets I use, and a simple content starter so your photos have somewhere to go.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Start with one camera-ready selfie. Then it can become your profile photo, your first brand image, or the source photo for an AI brand shoot.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Get the Starter Kit · $37", starterKitUrl.toString())}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the free guide is enough for now, keep using it. No pressure.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "your selfie is the starting point",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Make the selfie camera-ready.",
      subtitle: "The next step after the free guide.",
      bodyHtml,
      footerLead: "Start with one photo you actually want to use.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

By now, you probably see the point.

A better selfie isn't about looking perfect.

It's about giving yourself one photo you can actually use.

The Starter Kit is the next step if you want the shortcut: the posing cheatsheet, the exact presets I use, and a simple content starter so your photos have somewhere to go.

Start with one camera-ready selfie. Then it can become your profile photo, your first brand image, or the source photo for an AI brand shoot.

Get the Starter Kit · $37:
${starterKitUrl.toString()}

If the free guide is enough for now, keep using it. No pressure.

Sandra x`,
  }
}
