import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

// FUNNEL-2026-06-11: repointed from the Masterclass ($147, zero sales across 744 sends)
// to the 7-day SUITE trial. File name kept so the sequence registry and email_logs
// idempotency stay stable.
// REWRITE-2026-07-03 (Sandra-approved email audit): 4,534 sends and 0 conversions on the
// old feature-list copy. Rewritten story-first per the locked voice standard: world ->
// problem -> desire -> real story -> after -> No-Fake -> soft CTA -> heart-line.
// Link/token mechanics unchanged: personal claim link when present, /join/studio fallback.

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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Two weeks ago you grabbed my selfie guide. So I already know something about you: you want to show up. The photos were just the thing standing in the way.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Can I ask the honest question? Did you post any of them?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Because that's where it usually stops. Not the taking. The posting. You get one photo you almost like, and then the spiral starts: is this good enough, what would I even say, who am I to take up space here.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">I know that spiral. I sat in it for years. Phone full of selfies, profile still hiding.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">What finally changed it for me wasn't a better photo. It was having enough of them. When you've got a whole shoot of images that look like you on a good day, one photo stops carrying all that pressure. Posting becomes normal.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That's what my Studio is for. You bring one selfie. Maya, the creative director inside, turns it into full photoshoots, reel covers, and captions that sound like you. And everything still looks like you. Not a shinier stranger. You, on your best day, recognizable to everyone who already knows your face.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Want to try it? Here's 7 days inside the SUITE with 20 photos on me. No card. Nothing quietly turns into a charge. It just ends.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton(ctaLabel, ctaUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Whatever you make in those 7 days is yours to keep, trial or not.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You didn't download that guide because of photos, love. You downloaded it because you're ready to be seen. This is the next step.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "did you post any of them?",
    html: renderStoneShell({
      eyebrow: "SSELFIE SUITE",
      title: "Two weeks ago you wanted better photos.",
      subtitle: "Here's the part nobody talks about.",
      bodyHtml,
      footerLead: "No rush. The guide is yours forever.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

Two weeks ago you grabbed my selfie guide. So I already know something about you: you want to show up. The photos were just the thing standing in the way.

Can I ask the honest question? Did you post any of them?

Because that's where it usually stops. Not the taking. The posting. You get one photo you almost like, and then the spiral starts: is this good enough, what would I even say, who am I to take up space here.

I know that spiral. I sat in it for years. Phone full of selfies, profile still hiding.

What finally changed it for me wasn't a better photo. It was having enough of them. When you've got a whole shoot of images that look like you on a good day, one photo stops carrying all that pressure. Posting becomes normal.

That's what my Studio is for. You bring one selfie. Maya, the creative director inside, turns it into full photoshoots, reel covers, and captions that sound like you. And everything still looks like you. Not a shinier stranger. You, on your best day, recognizable to everyone who already knows your face.

Want to try it? Here's 7 days inside the SUITE with 20 photos on me. No card. Nothing quietly turns into a charge. It just ends.

${ctaLabel}:
${ctaUrl}

Whatever you make in those 7 days is yours to keep, trial or not.

You didn't download that guide because of photos, love. You downloaded it because you're ready to be seen. This is the next step.

Sandra x`,
  }
}
