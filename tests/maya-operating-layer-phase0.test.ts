// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { sanitizeMayaJobAnalyticsProperties } from "@/lib/app-v3/maya/job-analytics"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("Maya operating layer Phase 0 contract", () => {
  it("takes the current Maya product and browser journeys as the beta contract", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const spec = read("tests/maya-operating-layer.spec.ts")

    expect(concierge).toContain("One idea in. One finished post out.")
    expect(spec).toContain("Maya Home starts as one neutral conversation above the fold")
    expect(spec).toContain("turns the next-post outcome into one confirmed creation path")
    expect(spec).toContain("ordinary writing help stays in the same neutral conversation")
    expect(spec).toContain("returning members land with Maya")
    expect(spec).toContain("creates a multi-slide concept")
  })

  it("allows only the four privacy-safe operating-layer events", () => {
    const analytics = read("lib/analytics/event-contract.ts")
    const jobAnalytics = read("lib/app-v3/maya/job-analytics.ts")

    for (const event of [
      "suite_maya_job_started",
      "suite_maya_job_finished",
      "suite_maya_context_mismatch",
      "suite_maya_guidance_served",
    ]) {
      expect(analytics).toContain(`"${event}"`)
    }

    expect(jobAnalytics).toContain("MAYA_JOB_ANALYTICS_PROPERTY_KEYS")
    expect(jobAnalytics).not.toContain("question:")
    expect(jobAnalytics).not.toContain("prompt:")
    expect(jobAnalytics).not.toContain("caption:")
    expect(jobAnalytics).not.toContain("email:")

    expect(
      sanitizeMayaJobAnalyticsProperties({
        task_id: "opaque-task",
        job: "create_content",
        surface: "create",
        prompt: "private member prompt",
        caption: "private member caption",
        email: "member@example.com",
        question: "private Academy question",
        entry: "private member entry",
        reason: "private member reason",
      })
    ).toEqual({
      task_id: "opaque-task",
      job: "create_content",
      surface: "create",
    })
  })

  it("keeps rollout server-owned, disabled by default, and identity allowlisted", () => {
    const rollout = read("lib/app-v3/maya/operating-layer-rollout.ts")
    const page = read("app/app/page.tsx")
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(rollout).toContain("FEATURE_MAYA_OPERATING_LAYER")
    expect(rollout).toContain("MAYA_OPERATING_LAYER_ALLOWLIST")
    expect(rollout).not.toContain("NEXT_PUBLIC")
    expect(rollout).toContain("return false")
    expect(page).toContain("isMayaOperatingLayerEnabled")
    expect(page).toContain("mayaOperatingLayerEnabled")
    expect(shell).toContain("mayaOperatingLayerEnabled?: boolean")
  })

  it("adds current App v3 desktop and 390x844 Playwright coverage", () => {
    const config = read("playwright.config.ts")
    const spec = read("tests/maya-operating-layer.spec.ts")
    const fixture = read("app/e2e/maya-operating-layer/page.tsx")

    expect(config).toContain("maya-operating-layer-desktop")
    expect(config).toContain("maya-operating-layer-mobile")
    expect(config).toContain("width: 390")
    expect(config).toContain("height: 844")
    expect(spec).toContain("Maya Home starts as one neutral conversation above the fold")
    expect(spec).toContain("Create a three-slide visibility carousel")
    expect(spec).toContain('test.skip("Decide what to post and Finish a selected Calendar post')
    expect(spec).toContain('test.skip("Learn starts with one source-backed Maya recommendation')
    expect(fixture).toContain('process.env.PLAYWRIGHT_TEST !== "1"')
  })
})
