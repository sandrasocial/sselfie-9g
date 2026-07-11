import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { envFlag, envNumber } from "@/lib/env-flags"

const ROOT = process.cwd()
const read = (path: string) => readFileSync(join(ROOT, path), "utf8")

describe("VOICE-LOOP-01 apprentice loop", () => {
  it("captures Sandra's edited IG replies as admin memory", () => {
    const route = read("app/api/admin/ig-inbox/[conversationId]/reply/route.ts")

    expect(route).toContain("addAdminMemoryNote")
    expect(route).toContain("draft_response")
    expect(route).toContain("Sandra edited a DM reply")
    expect(route).toContain('kind: "voice"')
  })

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
  it("adds Product QA to Vercel cron and the daily briefing system health block", () => {
    const vercel = JSON.parse(read("vercel.json")) as { crons: Array<{ path: string; schedule: string }> }
    const dailyRoute = read("app/api/cron/daily-sandra-briefing/route.ts")
    const dailyBuilder = read("lib/admin/daily-sandra-briefing.ts")

    expect(vercel.crons).toContainEqual({
      path: "/api/cron/product-qa-daily",
      schedule: "55 5 * * *",
    })
    expect(dailyRoute).toContain('reportType: "product_qa_daily"')
    expect(dailyRoute).toContain("buildSystemHealthFromProductQa")
    expect(dailyBuilder).toContain("System health")
  })

  it("surfaces a Team panel with live employees, paused employees, and DM bridge truth", () => {
    const report = read("lib/admin/home-report.ts")
    const adminPage = read("app/admin/page.tsx")

    expect(report).toContain("Product QA Reporter")
    expect(report).toContain("Cron Health Watchdog")
    expect(report).toContain("daily-sandra-briefing")
    expect(report).toContain("sent_at > NOW() - INTERVAL '7 days'")
    expect(report).toContain("Dormant-by-choice automation")
    expect(adminPage).toContain("Team")
    expect(adminPage).toContain("DM bridge truth")
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
