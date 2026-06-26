// Dev utility: generate and store one content brief outside the cron.
// Run with: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/run-content-brief.ts
import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { generateContentBrief } = await import("@/lib/content-engine/brief-generator")
  const { storeAnalyticsReport } = await import("@/lib/analytics/reports")

  console.log("Generating content brief (Instagram pull + signals + research + writing)...")
  const started = Date.now()
  const brief = await generateContentBrief()
  console.log(`Generated in ${Math.round((Date.now() - started) / 1000)}s`)
  console.log("Account:", brief.accountSnapshot)
  console.log("Recap posts:", brief.performanceRecap.length)
  console.log("Hooks:", brief.hookIntelligence.length)
  if (brief.demandMap) {
    console.log("Demand signal:", brief.demandMap.strongestDemandSignal)
    console.log("Demand bridge:", brief.demandMap.primaryOfferBridge)
  }
  console.log("Pieces:", brief.contentPlan.map((p) => `${p.day} ${p.format}: ${p.title}`))
  console.log("Story:", brief.storySequence.theme, `(${brief.storySequence.frames.length} frames)`)

  await storeAnalyticsReport({
    reportType: "content_brief_weekly",
    periodStart: new Date(brief.periodStart),
    periodEnd: new Date(brief.periodEnd),
    payload: brief,
  })
  console.log("Stored to analytics_reports as content_brief_weekly.")

  const sampleHook = brief.contentPlan[0]
  console.log("\n--- SAMPLE PIECE ---")
  console.log("HOOK:", sampleHook?.hook)
  console.log("DEMAND:", sampleHook?.demandSignal)
  console.log("BEFORE:", sampleHook?.painfulBefore)
  console.log("AFTER:", sampleHook?.desiredAfter)
  console.log("CAPTION:\n" + sampleHook?.caption)
  console.log("WHY DEMAND:", sampleHook?.whyThisCreatesDemand)
  console.log("WHY POST:", sampleHook?.whyThisWorks)
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error("FAILED:", error?.message || error)
    process.exit(1)
  },
)
