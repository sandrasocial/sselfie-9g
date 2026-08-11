// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  SSELFIE_COMEBACK_ENGINES,
  SSELFIE_COMEBACK_PHASE,
  SSELFIE_REVENUE_PORTFOLIO,
} from "@/lib/business/company-kernel"

const read = (path: string) => readFileSync(path, "utf8")

describe("SSELFIE comeback strategy lock", () => {
  it("keeps exactly three active engines in the approved order", () => {
    expect(SSELFIE_COMEBACK_ENGINES.map(engine => engine.id)).toEqual([
      "owned-commerce",
      "maya-recurring",
      "media-ip",
    ])
    expect(SSELFIE_COMEBACK_PHASE.status).toBe("active")
    expect(SSELFIE_COMEBACK_PHASE.publicTierExpansion).toBe("paused")
    expect(SSELFIE_COMEBACK_PHASE.mayaBroadExpansion).toBe("paused")
  })

  it("does not mislabel unproven media or IP hypotheses as active cash lanes", () => {
    expect(SSELFIE_REVENUE_PORTFOLIO.media.status).toBe("unproven-secondary-engine")
    expect(SSELFIE_REVENUE_PORTFOLIO.ip.status).toBe("unproven-secondary-engine")
    expect(SSELFIE_REVENUE_PORTFOLIO.commerce.status).toBe("active-primary-engine")
    expect(SSELFIE_REVENUE_PORTFOLIO.software.status).toBe("active-validation-engine")
  })

  it("locks the strategy and operating sequence in the controlling authorities", () => {
    const kernel = read("docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md")
    expect(kernel).toContain("Approved comeback architecture")
    expect(kernel).toContain("Owned-product commerce")
    expect(kernel).toContain("Maya recurring membership")
    expect(kernel).toContain("Creator media, partnerships, and licensing")
    expect(kernel).toContain("Broad Maya expansion is paused")
    expect(kernel).toContain("One owner, one weekly priority")
    expect(kernel).toContain("30-day execution sequence")
    expect(kernel).toContain("Sandra does not manage")
    expect(read("docs/README.md")).toContain("SSELFIE_COMPANY_KERNEL_2026-07-16.md")
    const execution = read("docs/business/SSELFIE_COMEBACK_EXECUTION_PACK_2026-08-09.md")
    expect(execution).toContain("NOT A COMMERCIAL AUTHORITY OR SEND APPROVAL")
    expect(execution).toMatch(/No second email\s+campaign is added/)
    expect(execution).toContain("Maximum cohort: 20")
    expect(execution).toContain("Private two-price evidence test")
    expect(execution).toContain("Maya Essential · EUR 29/month")
    expect(execution).toContain("Maya Pro · EUR 97/month")
    expect(execution).toContain("Annual · EUR 970 · held")
    expect(execution).toContain("does not change the public Prompt Vault priority")
    expect(execution).toContain("ShiftCam")
    expect(read("docs/business/SSELFIE_PARTNERSHIP_PILOT_PACK_2026-08-11.md")).toContain(
      "DRAFT ONLY — NO OUTREACH OR PUBLICATION AUTHORITY"
    )
  })

  it("keeps the legacy revenue audit aggregate-only and refuses invented MRR", () => {
    const audit = read("scripts/audit-revenue-sources.ts")

    expect(audit).not.toContain("u.email")
    expect(audit).not.toContain("row.email")
    expect(audit).not.toContain("active subscriptions × $29")
    expect(audit).toContain("MRR is unavailable from credit_transactions")
  })
})
