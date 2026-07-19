// @vitest-environment node

import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const KERNEL = "docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md"
const read = (path: string) => readFileSync(path, "utf8")

describe("SSELFIE Company Kernel", () => {
  it("is the controlling business authority for every active agent entrypoint", () => {
    expect(existsSync(KERNEL)).toBe(true)

    const kernel = read(KERNEL)
    expect(kernel).toContain("Media capability")
    expect(kernel).toContain("Software engine")
    expect(kernel).toContain("IP capability")
    expect(kernel).toContain("Commerce base")
    expect(kernel).toContain("Sandra is the public voice")
    expect(kernel).toContain("No income guarantees")
    expect(kernel).toContain("New idea | EXPLORATION UNTIL DECIDED")
    expect(kernel).toContain("A hypothesis is not forbidden simply because it is unproven")

    for (const path of [
      "CLAUDE.md",
      "AGENTS.md",
      "docs/CODEX_CONTEXT.md",
      "docs/README.md",
      "tasks/README.md",
      ".agents/claude-templates/README.md",
      ".agents/claude-templates/skills/funnel-expert/SKILL.md",
      ".agents/claude-templates/skills/funnel-expert.md",
    ]) {
      expect(read(path), path).toContain(KERNEL)
    }
  })

  it("retire-marks old operating contracts instead of letting them compete", () => {
    for (const path of [
      "docs/business/SSELFIE_GROWTH_MACHINE_2026-07-12.md",
      "docs/business/SSELFIE_HIGHER_SELF_OPERATING_SYSTEM_2026-07-07.md",
      "docs/business/VISIBILITY_TO_PAID_OFFER_DECISION_2026-07-11.md",
      "docs/business/WORK_WITH_ME_PLAYBOOK.md",
      "docs/business/ONE_SELFIE_WEEK_OUTCOME_TEST_2026-07-16.md",
    ]) {
      const content = read(path)
      expect(content, path).toMatch(/SUPERSEDED|HISTORICAL|DORMANT/)
      expect(content, path).toContain(KERNEL)
    }
  })

  it("keeps private high-value sales out of unattended public content tasks", () => {
    for (const path of [
      ".agents/claude-templates/scheduled-tasks/daily-email-draft/SKILL.md",
      ".agents/claude-templates/scheduled-tasks/daily-story-sequence-draft/SKILL.md",
      ".agents/claude-templates/scheduled-tasks/weekly-content-brief-draft/SKILL.md",
    ]) {
      const content = read(path)
      expect(content, path).toContain(KERNEL)
      expect(content, path).toMatch(/Never sends|never sends|Never post|never post/)
      expect(content, path).toMatch(/Private and unvalidated|private and unvalidated|private.*offer/i)
      expect(content, path).not.toContain("reply WORK")
    }
  })

  it("classifies the held campaign as internal capability, not the current public offer", () => {
    const kernel = read(KERNEL)
    expect(kernel).toContain("Your Next Campaign")
    expect(kernel).toContain("Your Next Campaign | DORMANT CAPABILITY")

    const feature = read("lib/campaign-outcome/feature.ts")
    expect(feature).toContain('CAMPAIGN_OUTCOME_DISABLED === "false"')
  })

  it("removes legacy private-service promotion from public and unattended surfaces", () => {
    expect(read("components/sselfie/public-marketing.tsx")).not.toContain(
      '{ href: "/work-with-me",  label: "Work With Me" }'
    )
    expect(read("app/bio/page.tsx")).not.toContain('href="/work-with-me"')
    expect(read("app/work-with-me/page.tsx")).toContain("index: false")
    for (const path of [
      "components/checkout/success-content.tsx",
      "components/selfie-guide/maya-moment.tsx",
      "app/academy/_lib/course-library.ts",
      "app/academy/access/visibility-suite/page.tsx",
      "app/academy/visibility-plan/[token]/page.tsx",
      "app/checkout/membership/page.tsx",
    ]) {
      expect(read(path), path).not.toContain('href: "/work-with-me"')
      expect(read(path), path).not.toContain('href="/work-with-me"')
    }
    expect(read("lib/email/masterclass-email-sequence.ts")).not.toContain(
      '{ days: 7, emailType: "masterclass-day7-soft-work-with-me" }'
    )
    expect(read("lib/email/masterclass-email-sequence.ts")).not.toContain(
      '{ days: 10, emailType: "masterclass-day10-direct-invite" }'
    )
  })
})
