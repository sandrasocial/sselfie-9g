import { renderPersonalLink, renderPersonalNote } from "@/lib/email/templates/stone-email"

export const CAMPAIGN_RECOVERY_EMAIL_TYPES = {
  oneHour: "campaign-checkout-recovery-1",
  dayOne: "campaign-checkout-recovery-2",
  dayThree: "campaign-checkout-recovery-3",
} as const

function checkoutUrl(email: string, stage: string): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
  const url = new URL("/checkout/campaign", origin)
  url.searchParams.set("source", "campaign_recovery")
  url.searchParams.set("utm_source", "email")
  url.searchParams.set("utm_medium", "checkout_recovery")
  url.searchParams.set("utm_campaign", "campaign_outcome_test")
  url.searchParams.set("utm_content", stage)
  url.searchParams.set("cta_keyword", "CAMPAIGN")
  url.searchParams.set("checkout_email", email)
  return url.toString()
}

export function campaignRecoveryEmail(input: {
  firstName: string
  email: string
  stage: 1 | 2 | 3
}) {
  const link = checkoutUrl(input.email, `recovery_${input.stage}`)
  if (input.stage === 1) {
    const bodyHtml = `
      <p style="margin:0 0 18px;">Hi ${input.firstName},</p>
      <p style="margin:0 0 18px;">You were almost finished with Your Next Campaign, so here is the link back.</p>
      <p style="margin:0 0 18px;">Your email is already added. You can continue with the $97 one-time checkout.</p>
      <p style="margin:0;">${renderPersonalLink("Return to my campaign checkout", link)}</p>
    `
    return {
      emailType: CAMPAIGN_RECOVERY_EMAIL_TYPES.oneHour,
      subject: "your campaign checkout is still here",
      html: renderPersonalNote({ title: "Your checkout is still here", bodyHtml }),
      text: `Hi ${input.firstName},\n\nYou were almost finished with Your Next Campaign, so here is the link back.\n\n${link}\n\nIt is still $97 once.\n\nSandra x`,
    }
  }

  if (input.stage === 2) {
    const bodyHtml = `
      <p style="margin:0 0 18px;">Hi ${input.firstName},</p>
      <p style="margin:0 0 18px;">One quick note about what Maya prepares for you.</p>
      <p style="margin:0 0 18px;">You add one selfie and a short brief. Maya prepares a reel ready to assemble, six brand photos, three feed posts, a seven-slide carousel, two Story sequences, and a five-day plan for one campaign.</p>
      <p style="margin:0 0 18px;">Sandra checks the founding-batch work before delivery. You do not need to learn a new tool.</p>
      <p style="margin:0;">${renderPersonalLink("Finish my campaign order", link)}</p>
    `
    return {
      emailType: CAMPAIGN_RECOVERY_EMAIL_TYPES.dayOne,
      subject: "what Maya prepares for you",
      html: renderPersonalNote({ title: "What Maya prepares", bodyHtml }),
      text: `Hi ${input.firstName},\n\nYou add one selfie and a short brief. Maya prepares a reel ready to assemble, six brand photos, three feed posts, a seven-slide carousel, two Story sequences, and a five-day plan for one campaign.\n\nSandra checks the founding-batch work before delivery.\n\n${link}\n\nSandra x`,
    }
  }

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${input.firstName},</p>
    <p style="margin:0 0 18px;">Last note from me about Your Next Campaign.</p>
    <p style="margin:0 0 18px;">If checkout gave you trouble, reply and tell me. If the timing is not right, you do not need to do anything.</p>
    <p style="margin:0 0 18px;">If you still want the campaign, it is $97 once and the link is below.</p>
    <p style="margin:0;">${renderPersonalLink("Return to checkout", link)}</p>
  `
  return {
    emailType: CAMPAIGN_RECOVERY_EMAIL_TYPES.dayThree,
    subject: "last note about your campaign",
    html: renderPersonalNote({ title: "Last note about your campaign", bodyHtml }),
    text: `Hi ${input.firstName},\n\nLast note from me about Your Next Campaign.\n\nIf checkout gave you trouble, reply and tell me. If the timing is not right, you do not need to do anything.\n\n${link}\n\nSandra x`,
  }
}
