import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

// FUNNEL-2026-06-11: repointed from the Masterclass ($147, zero sales across 744 sends)
// to the 7-day SUITE trial. File name kept so the sequence registry and email_logs
// idempotency stay stable. Copy adapted from the Sandra-approved trial-unlock email.

interface FreebieGuideTouchParams {
  firstName: string
  recipientEmail: string
  accessUrl: string
  /** Personal trial claim link (/claim/[token]). Falls back to /join/studio when absent. */
  claimUrl?: string
}

export function generateFreebieGuideDay14MasterclassBridgeEmail({
  firstName,
  claimUrl,
}: FreebieGuideTouchParams): { html: string; text: string; subject: string } {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const fallbackUrl = buildRevenueEmailLink(`${siteUrl}/join/studio?source=guide_day14`, {
    campaign: "freebie_guide_day14_trial_bridge",
    content: "see_suite",
    emailType: "freebie-guide-day14-masterclass-bridge",
  })
  const ctaUrl = claimUrl || fallbackUrl
  const ctaLabel = claimUrl ? "Claim your 7 days" : "See the SUITE"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Two weeks in.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the guide helped and your photos are better than they were, the next question is usually: what do I do with them now?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That's what my Studio is for. Maya is the creative director inside it. She turns one selfie into full photoshoots, carousels, reel covers, and captions that sound like you. No prompts to write. You tap, she does the heavy lifting.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Want to try her? Here's 7 days inside the SUITE, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton(ctaLabel, ctaUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Whatever you make is yours to keep, trial or not.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "Your photos are better. Now meet Maya",
    html: renderStoneShell({
      eyebrow: "SSELFIE SUITE",
      title: "If the photos are starting to work.",
      subtitle: "The next question is what to do with them.",
      bodyHtml,
      footerLead: "No rush. Keep using the guide.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

Two weeks in.

If the guide helped and your photos are better than they were, the next question is usually: what do I do with them now?

That's what my Studio is for. Maya is the creative director inside it. She turns one selfie into full photoshoots, carousels, reel covers, and captions that sound like you. No prompts to write. You tap, she does the heavy lifting.

Want to try her? Here's 7 days inside the SUITE, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.

${ctaLabel}:
${ctaUrl}

Whatever you make is yours to keep, trial or not.

Sandra x`,
  }
}
