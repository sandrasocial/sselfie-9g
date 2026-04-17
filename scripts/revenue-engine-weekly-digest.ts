import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { generateRevenueEngineWeeklyReport } from "@/lib/analytics/reports"

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

async function main() {
  const report = await generateRevenueEngineWeeklyReport({
    days: Number(process.env.REVENUE_ENGINE_REPORT_WINDOW_DAYS || 30),
  })

  const now = new Date()
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const filePath = resolve(
    dir,
    `revenue-engine-weekly-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`,
  )

  const lines = [
    "# Revenue engine weekly digest",
    "",
    `Generated: ${now.toISOString()}`,
    `Window: ${report.periodStart} -> ${report.periodEnd}`,
    "",
    "## Summary",
    `- Sessions: ${report.summary.sessions}`,
    `- Purchases: ${report.summary.purchases}`,
    `- Conversion: ${report.summary.conversionPct}%`,
    `- Revenue: €${(report.summary.revenueCents / 100).toFixed(0)}`,
    `- AOV: €${(report.summary.averageOrderValueCents / 100).toFixed(0)}`,
    `- Email-attributed revenue: €${(report.summary.emailAttributedRevenueCents / 100).toFixed(0)}`,
    `- Referral-attributed revenue: €${(report.summary.referralRevenueCents / 100).toFixed(0)}`,
    `- Bridge -> Studio rate: ${report.summary.bridgeToStudioRatePct}%`,
    "",
    "## Top offers",
    ...report.offers.slice(0, 5).map(
      (offer) =>
        `- ${offer.offerSlug} (${offer.funnelStage}): ${offer.purchases}/${offer.sessions} purchases, ${offer.conversionPct}% conversion, €${(offer.revenueCents / 100).toFixed(0)} revenue`,
    ),
    "",
    "## Top channels",
    ...report.channels.slice(0, 5).map(
      (channel) =>
        `- ${channel.utmSource}/${channel.utmMedium} -> ${channel.utmCampaign}: ${channel.purchases}/${channel.sessions} purchases, €${(channel.revenueCents / 100).toFixed(0)} revenue`,
    ),
    "",
    "## Lifecycle",
    ...report.lifecycle.slice(0, 5).map(
      (campaign) =>
        `- ${campaign.utmCampaign} (campaign ${campaign.campaignId ?? "n/a"}): ${campaign.purchases} purchases, €${(campaign.revenueCents / 100).toFixed(0)} revenue`,
    ),
    "",
    "## Referrals",
    `- Signups: ${report.referrals.signups}`,
    `- Completed: ${report.referrals.completed}`,
    `- Influenced purchases: ${report.referrals.influencedPurchases}`,
    `- Influenced revenue: €${(report.referrals.influencedRevenueCents / 100).toFixed(0)}`,
    "",
    "## Top drop-offs",
    ...report.topDropoffs.map((dropoff) => `- ${dropoff.offerSlug}: ${dropoff.dropoffCount}`),
  ]

  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8")
  console.log(`[revenue-engine-weekly] wrote ${filePath}`)
}

main().catch((error) => {
  console.error("[revenue-engine-weekly] failed", error)
  process.exitCode = 1
})
