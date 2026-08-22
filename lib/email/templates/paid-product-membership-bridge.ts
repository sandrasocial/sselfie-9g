import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

const MEMBERSHIP_PATH = "/checkout/membership"

type MembershipBridgeInput = {
  firstName: string
}

function membershipUrl(campaign: string, content: string): string {
  return buildRevenueEmailLink(MEMBERSHIP_PATH, {
    campaign,
    content,
    emailType: campaign,
  })
}

export function generateStarterKitMembershipBridgeEmail({
  firstName,
}: MembershipBridgeInput): { html: string; text: string; subject: string } {
  const ctaUrl = membershipUrl(
    "starter-kit-day10-membership-bridge",
    "see_sselfie_membership"
  )

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">By now you have the part I wanted the Starter Kit to give you: a simpler way to take a photo, finish it, and actually use it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">The problem after that is usually not another tutorial. It is having to start from zero again next week.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That is the job of the SSELFIE membership. It is the ongoing system around <strong>TAKE → EDIT → EXPAND → USE</strong>, so you can keep creating photos and turn them into content instead of rebuilding your process every time you need to post.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If you only needed the Starter Kit, keep it and use it. You already own it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If what you want now is somewhere to keep doing the work every week, this is the next step.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("See SSELFIE membership", ctaUrl)}</div>
  `

  return {
    subject: "you have the photo system. here's the next part",
    html: renderStoneShell({
      eyebrow: "SSELFIE",
      title: "Keep it going next week.",
      subtitle: "The Starter Kit was the first result. This is the ongoing system.",
      bodyHtml,
      footerLead: "You do not need another standalone product if what you need is consistency.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

By now you have the part I wanted the Starter Kit to give you: a simpler way to take a photo, finish it, and actually use it.

The problem after that is usually not another tutorial. It is having to start from zero again next week.

That is the job of the SSELFIE membership. It is the ongoing system around TAKE → EDIT → EXPAND → USE, so you can keep creating photos and turn them into content instead of rebuilding your process every time you need to post.

If you only needed the Starter Kit, keep it and use it. You already own it.

If what you want now is somewhere to keep doing the work every week, this is the next step.

See SSELFIE membership:
${ctaUrl}

Sandra x`,
  }
}

export function generatePromptVaultMembershipBridgeEmail({
  firstName,
}: MembershipBridgeInput): { html: string; text: string; subject: string } {
  const ctaUrl = membershipUrl(
    "prompt-vault-day14-membership-bridge",
    "see_sselfie_membership"
  )

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">The Vault solves one very specific problem: you should not have to invent a new photo from a blank prompt every time.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">But eventually the problem gets bigger than the prompt.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You need the photo, the edit, the next missing shot, and then something useful to do with all of it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That is what the SSELFIE membership is built around: <strong>TAKE → EDIT → EXPAND → USE</strong>. The Vault can stay in your toolkit. The membership is the place you come back to when you want the whole process to keep moving.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the Vault is enough for you, nothing changes. It is yours.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If you are ready for the ongoing system, you can see it here.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("See SSELFIE membership", ctaUrl)}</div>
  `

  return {
    subject: "the Vault gives you the prompts. this is the whole system",
    html: renderStoneShell({
      eyebrow: "SSELFIE",
      title: "When the prompt is not the problem anymore.",
      subtitle: "Keep the Vault. Add the system when you are ready for more.",
      bodyHtml,
      footerLead: "One clear next step, only when you need the ongoing system.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

The Vault solves one very specific problem: you should not have to invent a new photo from a blank prompt every time.

But eventually the problem gets bigger than the prompt.

You need the photo, the edit, the next missing shot, and then something useful to do with all of it.

That is what the SSELFIE membership is built around: TAKE → EDIT → EXPAND → USE. The Vault can stay in your toolkit. The membership is the place you come back to when you want the whole process to keep moving.

If the Vault is enough for you, nothing changes. It is yours.

If you are ready for the ongoing system, you can see it here:
${ctaUrl}

Sandra x`,
  }
}
