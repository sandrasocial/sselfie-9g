// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("selfie guide public landing", () => {
  it("uses the approved free landing component for /selfie-guide", () => {
    const route = fs.readFileSync(path.join(ROOT, "app/selfie-guide/page.tsx"), "utf8")

    expect(route).toContain('import SelfieGuideFree from "@/components/freebie/selfie-guide-free-landing"')
    expect(route).toContain("return <SelfieGuideFree")
    expect(route).not.toContain("One Good Selfie. Your Entire Brand.")
  })

  it("ships the approved public landing content", () => {
    const componentPath = path.join(ROOT, "components/selfie-guide/selfie-guide-paid-landing.tsx")
    expect(fs.existsSync(componentPath)).toBe(true)

    const component = fs.readFileSync(componentPath, "utf8")
    expect(component).toContain("Selfies you feel good posting.")
    expect(component).toContain("This is the calmest place to start.")
    expect(component).toContain("ONE-TIME · €97")
    expect(component).toContain("GET INSTANT ACCESS")
    expect(component).toContain("THE SELFIE GUIDE")
  })
})
