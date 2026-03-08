// @vitest-environment node
import fs from "fs"
import path from "path"

const ROOT = process.cwd()

const broadcastOnlyRoutes = [
  "app/api/cron/onboarding-sequence/route.ts",
]

const archivedRoutes = [
  "archived/email/cron/blueprint-discovery-funnel/route.ts",
  "archived/email/cron/cold-reeducation-sequence/route.ts",
  "archived/email/cron/milestone-bonuses/route.ts",
  "archived/email/cron/monthly-usage-recap/route.ts",
  "archived/email/cron/reactivation-campaigns/route.ts",
  "archived/email/cron/reengagement-campaigns/route.ts",
  "archived/email/cron/referral-rewards/route.ts",
  "archived/email/cron/send-blueprint-followups/route.ts",
  "archived/email/cron/send-scheduled-campaigns/route.ts",
  "archived/email/cron/subscription-ending-soon/route.ts",
  "archived/email/cron/upsell-campaigns/route.ts",
]

const transactionalRoutes = [
  "app/api/cron/nurture-sequence/route.ts",
  "app/api/cron/admin-alerts/route.ts",
  "app/api/cron/win-back-sequence/route.ts",
]

const disabledLegacyRoutes = ["app/api/cron/welcome-sequence/route.ts"]

describe("Email routing separation", () => {
  it("broadcast-only routes should not call sendEmail", () => {
    for (const route of broadcastOnlyRoutes) {
      const contents = fs.readFileSync(path.join(ROOT, route), "utf8")
      expect(contents).not.toContain("sendEmail(")
      expect(contents).toContain("enqueueAndProcessMarketingRun")
    }
  })

  it("disabled legacy routes should not send mail directly", () => {
    for (const route of disabledLegacyRoutes) {
      const contents = fs.readFileSync(path.join(ROOT, route), "utf8")
      expect(contents).toContain("DISABLED")
      expect(contents).not.toContain("enqueueAndProcessMarketingRun")
      expect(contents).not.toContain("sendEmail(")
    }
  })

  it("transactional routes still use sendEmail", () => {
    for (const route of transactionalRoutes) {
      const contents = fs.readFileSync(path.join(ROOT, route), "utf8")
      expect(contents).toContain("sendEmail(")
    }
  })

  it("archives unscheduled cron routes outside the live app tree", () => {
    for (const route of archivedRoutes) {
      expect(fs.existsSync(path.join(ROOT, route))).toBe(true)
    }
  })
})
