import { existsSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("tutorial partnership order form generator", () => {
  it("declares the ReportLab runtime used by the Python generator", () => {
    expect(existsSync("requirements-pdf.txt")).toBe(true)
    expect(read("requirements-pdf.txt")).toMatch(/^reportlab==\d+\.\d+\.\d+$/m)
  })

  it("passes a flowable list to KeepTogether", () => {
    const generator = read("scripts/generate-creator-order-form.py")

    expect(generator).toContain("KeepTogether([approval])")
    expect(generator).not.toContain("KeepTogether(approval)")
  })

  it("locks one evidence-backed tutorial offer and hard-excludes Unlocked Foundation", () => {
    const commandBoard = read("docs/business/JULY_25_CASH_COMMAND_BOARD_2026-07-16.md")
    const closeKit = read("docs/business/JULY_25_DEAL_CLOSE_KIT_2026-07-16.md")
    const generator = read("scripts/generate-creator-order-form.py")

    expect(commandBoard).toContain("Unlocked Foundation is excluded from outreach.")
    expect(closeKit).toContain("Unlocked Foundation is excluded from outreach.")
    expect(commandBoard).not.toContain("| Unlocked Foundation |")
    expect(closeKit).not.toContain("| Unlocked Foundation |")
    expect(commandBoard).toContain("EUR 15,000 across five unsent drafts")
    expect(commandBoard).toContain("Buyer-confirmed fixed-fee budget | EUR 0")
    expect(commandBoard).toContain("Hypothesis:** EUR 3,000")
    expect(commandBoard).toContain("UGC was a separate EUR 750 production service")
    expect(closeKit).toContain("--offer tutorial-partnership")
    expect(generator).toContain('"tutorial-partnership": Offer(')
    expect(generator).toContain("Publication on one agreed primary platform")
    expect(generator).not.toContain('"creator-ad-sprint": Offer(')
    expect(generator).not.toContain('"campaign-batch": Offer(')
    expect(generator).not.toContain('"visibility-workshop": Offer(')
  })
})
