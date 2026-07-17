import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const layout = readFileSync("app/layout.tsx", "utf8")

describe("SSELFIE Google Analytics tag", () => {
  it("installs the dedicated SSELFIE stream once in the global layout", () => {
    expect(layout).toContain('const GOOGLE_ANALYTICS_MEASUREMENT_ID = "G-VNGYFYJNCM"')
    expect(layout).not.toContain("NEXT_PUBLIC_GA_MEASUREMENT_ID")
    expect(layout.match(/googletagmanager\.com\/gtag\/js/g)).toHaveLength(1)
    expect(layout.match(/gtag\('config'/g)).toHaveLength(1)
  })
})
