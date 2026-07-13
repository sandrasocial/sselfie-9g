import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

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

  it("removes retired engines and route-only helpers after dependency audits", () => {
    const deletedWeeklyEngine = [
      "app/api/cron/content-brief-weekly/route.ts",
      "app/api/cron/content-brief-jobs/route.ts",
      "lib/content-engine/brief-generator.ts",
      "lib/content-engine/brief-jobs.ts",
      "lib/content-engine/audience-signals.ts",
      "lib/content-engine/instagram-performance.ts",
      "scripts/run-content-brief.ts",
      "scripts/run-content-brief-jobs.ts",
    ]

    for (const file of deletedWeeklyEngine) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(false)
    }

    expect(fs.existsSync(path.join(ROOT, "scripts/weekly-brief-prep.ts"))).toBe(true)
    expect(fs.existsSync(path.join(ROOT, "lib/content/weekly-brief-contract.ts"))).toBe(true)

    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>
    }
    expect(packageJson.scripts["content-brief:worker"]).toBeUndefined()

    const deletedRetiredRoutes = [
      "app/api/cron/send-scheduled-newsletters/route.ts",
      "app/api/cron/product-qa-daily/route.ts",
      "app/api/cron/selfie-to-brand-shoot-checkout-recovery/route.ts",
      "lib/email/send-newsletter-broadcast.ts",
      "lib/email/get-active-sequences.ts",
      "lib/email/templates/selfie-to-brand-shoot-checkout-recovery.ts",
      "scripts/product-qa-digest.ts",
      "scripts/product-qa-digest.mjs",
    ]

    for (const file of deletedRetiredRoutes) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(false)
    }

    expect(packageJson.scripts["product-qa-digest"]).toBeUndefined()
    expect(packageJson.scripts["product-qa-digest:node"]).toBeUndefined()
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

  it("contains no retired North, OpenClaw, or Telegram runtime", () => {
    expect(fs.existsSync(path.join(ROOT, "lib/north-notifier.ts"))).toBe(false)
    expect(fs.existsSync(path.join(ROOT, "app/api/telegram/webhook/route.ts"))).toBe(false)

    const subscriptionEvents = fs.readFileSync(
      path.join(ROOT, "lib/payments/lifecycle/subscription-events.ts"),
      "utf8"
    )
    expect(subscriptionEvents).not.toContain("notifyNorth")
    expect(subscriptionEvents).not.toContain("north-notifier")
  })
})
