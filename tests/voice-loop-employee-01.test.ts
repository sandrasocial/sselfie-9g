import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { envFlag, envNumber } from "@/lib/env-flags"

const ROOT = process.cwd()
const read = (path: string) => readFileSync(join(ROOT, path), "utf8")

describe("VOICE-LOOP-01 apprentice loop", () => {
  it("injects learned admin memory into all admin content generators", () => {
    const generators = [
      "lib/content-engine/brief-generator.ts",
      "lib/content-kit/carousel-generator.ts",
      "lib/content-kit/story-generator.ts",
      "lib/admin/daily-briefing-intelligence.ts",
    ]

    for (const file of generators) {
      const source = read(file)
      expect(source, file).toContain("getAdminMemoryContext")
      expect(source, file).toContain("adminMemoryContext")
    }
  })

  it("captures content-kit approval decisions as memory", () => {
    const carouselRoute = read("app/api/admin/content-kit/route.ts")
    const storyRoute = read("app/api/admin/content-kit/stories/route.ts")

    expect(carouselRoute).toContain('sourceType: "carousel"')
    expect(carouselRoute).toContain("Sandra approved carousel")
    expect(storyRoute).toContain('sourceType: "story"')
    expect(storyRoute).toContain("Sandra approved story sequence")
  })

  it("keeps grounding synced from canonical docs by command", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> }
    const script = read("scripts/sync-grounding.ts")
    const grounding = read("lib/content/grounding.ts")

    expect(packageJson.scripts["sync:grounding"]).toBe("tsx scripts/sync-grounding.ts")
    expect(script).toContain("docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md")
    expect(script).toContain("docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md")
    expect(script).toContain("docs/brand/source/2026-06-27/SSELFIE_VOICE_STYLE_GUIDE.md")
    expect(grounding).toContain("synced from Sandra's canonical brand docs")
  })
})

describe("EMPLOYEE-01 roster and dormant cron visibility", () => {
  it("removes the retired Product QA report from both scheduling and the daily briefing", () => {
    const vercel = JSON.parse(read("vercel.json")) as { crons: Array<{ path: string; schedule: string }> }
    const dailyRoute = read("app/api/cron/daily-sandra-briefing/route.ts")

    expect(vercel.crons.map((cron) => cron.path)).not.toContain("/api/cron/product-qa-daily")
    expect(dailyRoute).not.toContain('reportType: "product_qa_daily"')
    expect(dailyRoute).not.toContain("buildSystemHealthFromProductQa")
  })

  it("surfaces only live protection systems in the Team panel", () => {
    const report = read("lib/admin/home-report.ts")
    const adminPage = read("app/admin/page.tsx")

    expect(report).not.toContain("Product QA Reporter")
    expect(report).not.toContain("Content Brief Worker")
    expect(report).not.toContain("Dormant-by-choice automation")
    expect(report).toContain("Cron Health Watchdog")
    expect(report).toContain("Payment Reconciliation")
    expect(report).toContain("daily-sandra-briefing")
    expect(adminPage).toContain("Team")
    expect(adminPage).not.toContain("DM bridge truth")
  })

  it("alerts once when bounces or complaints cross the configured threshold", () => {
    const webhook = read("app/api/webhooks/resend/route.ts")

    expect(webhook).toContain("maybeSendDeliverabilityAlert")
    expect(webhook).toContain('eventType !== "email.bounced" && eventType !== "email.complained"')
    expect(webhook).toContain("EMAIL_BOUNCE_ALERT_THRESHOLD")
    expect(webhook).toContain("admin_alert_sent")
    expect(webhook).toContain("email_deliverability_alert")
  })

  it("normalizes env flags so poisoned newline values do not disable workers", () => {
    process.env.__CODEX_FLAG_TRUE__ = "true\n"
    process.env.__CODEX_FLAG_FALSE__ = " false "
    process.env.__CODEX_NUMBER__ = " 12\n"

    expect(envFlag("__CODEX_FLAG_TRUE__")).toBe(true)
    expect(envFlag("__CODEX_FLAG_FALSE__", true)).toBe(false)
    expect(envNumber("__CODEX_NUMBER__", 1)).toBe(12)
  })
})
