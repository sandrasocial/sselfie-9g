// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("selfie guide public landing", () => {
  it("uses the approved paid landing component for /selfie-guide", () => {
    const route = fs.readFileSync(path.join(ROOT, "app/selfie-guide/page.tsx"), "utf8")

    expect(route).toContain('import SelfieGuidePaidLanding from "@/components/selfie-guide/selfie-guide-paid-landing"')
    expect(route).toContain("return <SelfieGuidePaidLanding")
    expect(route).not.toContain("One Good Selfie. Your Entire Brand.")
  })

  it("ships the approved public landing content", () => {
    const componentPath = path.join(ROOT, "components/selfie-guide/selfie-guide-paid-landing.tsx")
    expect(fs.existsSync(componentPath)).toBe(true)

    const component = fs.readFileSync(componentPath, "utf8")
    expect(component).toContain("BECOME A SELFIE QUEEN")
    expect(component).toContain("ONE-TIME · $17")
    expect(component).toContain("GET INSTANT ACCESS")
    expect(component).toContain("THE SELFIE GUIDE")
  })
})
