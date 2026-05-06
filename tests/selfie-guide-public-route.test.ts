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

  it("ships the approved free public landing content", () => {
    const componentPath = path.join(ROOT, "components/freebie/selfie-guide-free-landing.tsx")
    expect(fs.existsSync(componentPath)).toBe(true)

    const component = fs.readFileSync(componentPath, "utf8")
    expect(component).toContain("Your first visible post.")
    expect(component).toContain("Take one phone photo and turn it into a post that says something.")
    expect(component).toContain("One phone photo. Four simple jobs.")
    expect(component).toContain("The photo is not the strategy.")
    expect(component).toContain("Get the free guide")
  })
})
