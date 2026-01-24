// @vitest-environment node
import fs from "fs"
import path from "path"

const ROOT = process.cwd()

const broadcastOnlyRoutes = [
  "app/api/cron/nurture-sequence/route.ts",
  "app/api/cron/onboarding-sequence/route.ts",
  "app/api/cron/cold-reeducation-sequence/route.ts",
  "app/api/cron/blueprint-discovery-funnel/route.ts",
  "app/api/cron/reactivation-campaigns/route.ts",
  "app/api/cron/reengagement-campaigns/route.ts",
  "app/api/cron/upsell-campaigns/route.ts",
  "app/api/cron/win-back-sequence/route.ts",
]

const mixedRoutes = [
  "app/api/cron/send-blueprint-followups/route.ts",
  "app/api/cron/welcome-sequence/route.ts",
]

const transactionalRoutes = [
  "app/api/cron/subscription-ending-soon/route.ts",
  "app/api/cron/admin-alerts/route.ts",
  "app/api/cron/referral-rewards/route.ts",
  "app/api/cron/milestone-bonuses/route.ts",
]

describe("Email routing separation", () => {
  it("broadcast-only routes should not call sendEmail", () => {
    for (const route of broadcastOnlyRoutes) {
      const contents = fs.readFileSync(path.join(ROOT, route), "utf8")
      expect(contents).not.toContain("sendEmail(")
      expect(contents).toContain("enqueueAndProcessMarketingRun")
    }
  })

  it("mixed routes should include broadcast path", () => {
    for (const route of mixedRoutes) {
      const contents = fs.readFileSync(path.join(ROOT, route), "utf8")
      expect(contents).toContain("enqueueAndProcessMarketingRun")
    }
  })

  it("transactional routes still use sendEmail", () => {
    for (const route of transactionalRoutes) {
      const contents = fs.readFileSync(path.join(ROOT, route), "utf8")
      expect(contents).toContain("sendEmail(")
    }
  })
})
