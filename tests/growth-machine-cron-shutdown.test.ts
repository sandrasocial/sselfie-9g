import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { getCronRouteOwnership } from "@/lib/cron/ownership"

const ROOT = process.cwd()

function scheduledCronPaths(): string[] {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")) as {
    crons: Array<{ path: string; schedule: string }>
  }
  return config.crons.map((cron) => cron.path)
}

describe("growth machine cron shutdown", () => {
  it("does not register retired or duplicate schedules", () => {
    const scheduled = scheduledCronPaths()
    const retired = [
      "/api/cron/content-brief-weekly?phase=research",
      "/api/cron/content-brief-weekly",
      "/api/cron/content-brief-weekly?phase=stories",
      "/api/cron/content-brief-jobs",
      "/api/cron/send-scheduled-newsletters",
      "/api/cron/product-qa-daily",
      "/api/cron/selfie-to-brand-shoot-checkout-recovery",
    ]

    for (const cronPath of retired) {
      expect(scheduled, cronPath).not.toContain(cronPath)
    }
  })

  it("preserves the retired route code for a dependency-audited deletion pass", () => {
    const heldRoutes = [
      "app/api/cron/content-brief-weekly/route.ts",
      "app/api/cron/content-brief-jobs/route.ts",
      "app/api/cron/send-scheduled-newsletters/route.ts",
      "app/api/cron/product-qa-daily/route.ts",
      "app/api/cron/selfie-to-brand-shoot-checkout-recovery/route.ts",
    ]

    for (const route of heldRoutes) {
      expect(fs.existsSync(path.join(ROOT, route)), route).toBe(true)
    }
  })

  it("keeps money, membership, and active-offer protection scheduled", () => {
    const scheduled = scheduledCronPaths()
    const protectedCrons = [
      "/api/cron/resolve-pending-payments",
      "/api/cron/reconcile-subscriptions",
      "/api/cron/payment-reconciliation",
      "/api/cron/membership-checkout-recovery",
      "/api/cron/prompt-vault-checkout-recovery",
      "/api/cron/starter-kit-checkout-recovery",
      "/api/cron/daily-sandra-briefing",
    ]

    for (const cronPath of protectedCrons) {
      expect(scheduled, cronPath).toContain(cronPath)
    }
  })

  it("classifies the retained legacy newsletter processor as manual", () => {
    expect(getCronRouteOwnership("/api/cron/send-scheduled-newsletters")?.lifecycle).toBe("manual")
  })
})
