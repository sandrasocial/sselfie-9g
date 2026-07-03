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
  if (brief.growthTruth) {
    console.log("Growth truth:", {
      followers: brief.growthTruth.instagram.followers,
      emailSubscribed: brief.growthTruth.email.subscribedContacts,
      activePaidMembers: brief.growthTruth.suite.activePaidMembers,
      activeTrials: brief.growthTruth.suite.activeTrials,
      manychatCaptures: brief.growthTruth.manychat.captures,
      promptVaultPurchases: brief.growthTruth.promptVault.payments,
      leaks: brief.growthTruth.leaks,
    })
  }
  console.log("Recap posts:", brief.performanceRecap.length)
  console.log("Hooks:", brief.hookIntelligence.length)
  if (brief.demandMap) {
    console.log("Demand signal:", brief.demandMap.strongestDemandSignal)
    console.log("Demand bridge:", brief.demandMap.primaryOfferBridge)
  }
  console.log("Pieces:", brief.contentPlan.map((p) => `${p.day} ${p.format}: ${p.title}`))
  console.log("Story:", brief.storySequence.theme, `(${brief.storySequence.frames.length} frames)`)

  // A 9-minute generation must never be lost to one flaky connection: write a local
  // backup first, then retry the store (2026-07-03: a transient "fetch failed" on the
  // final INSERT threw away a fully generated brief).
  const { writeFileSync } = await import("fs")
  const backupPath = `output/content-brief-${new Date().toISOString().slice(0, 10)}.json`
  writeFileSync(backupPath, JSON.stringify(brief, null, 2))
  console.log(`Backup written to ${backupPath}`)

  let stored = false
  for (let attempt = 1; attempt <= 4 && !stored; attempt++) {
    try {
      await storeAnalyticsReport({
        reportType: "content_brief_weekly",
        periodStart: new Date(brief.periodStart),
        periodEnd: new Date(brief.periodEnd),
        payload: brief,
      })
      stored = true
    } catch (error) {
      console.error(`Store attempt ${attempt} failed:`, (error as Error)?.message)
      if (attempt === 4) throw error
      await new Promise((r) => setTimeout(r, attempt * 3000))
    }
  }
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
