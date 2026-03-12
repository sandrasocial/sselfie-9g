// @vitest-environment node
import fs from "fs"
import path from "path"

const ROOT = process.cwd()

const broadcastOnlyRoutes: string[] = []

const removedLegacyRoutes = [
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

  it("onboarding sequence uses both broadcast and transactional sends", () => {
    const contents = fs.readFileSync(path.join(ROOT, "app/api/cron/onboarding-sequence/route.ts"), "utf8")
    // Marketing batch sends (e.g. D0 activation, D2 nurture)
    expect(contents).toContain("enqueueAndProcessMarketingRun")
    // Transactional behavioral sends (e.g. first-gen nudge, post-activation upgrade)
    expect(contents).toContain("sendEmail(")
  })

  it("nurture sequence does not query the removed users.name column", () => {
    const contents = fs.readFileSync(path.join(ROOT, "app/api/cron/nurture-sequence/route.ts"), "utf8")
    expect(contents).not.toContain("u.name")
  })

  it("removes unscheduled legacy cron routes from the repo", () => {
    for (const route of removedLegacyRoutes) {
      expect(fs.existsSync(path.join(ROOT, route))).toBe(false)
    }
  })
})
