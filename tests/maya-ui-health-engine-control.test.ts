import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const enginePath = "scripts/maya-ui-health-engine.mjs"

describe("Maya UI health engine control inventory", () => {
  it("does not audit the retired customer feedback UI", () => {
    const engine = readFileSync(enginePath, "utf8")

    expect(existsSync("components/feedback/feedback-button.tsx")).toBe(false)
    expect(existsSync("tests/feedback-button.test.tsx")).toBe(false)
    expect(engine).not.toContain("components/feedback/feedback-button.tsx")
    expect(engine).not.toContain("tests/feedback-button.test.tsx")
  })
})
