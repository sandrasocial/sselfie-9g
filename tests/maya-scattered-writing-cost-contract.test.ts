import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("scattered writing routes use the metered Maya lane", () => {
  it.each([
    "app/api/selfie-to-brand-shoot/prompt-pack/route.ts",
    "app/api/academy/visibility-suite/chat/route.ts",
    "app/api/academy/visibility-suite/workbook/route.ts",
    "app/api/academy/visibility-suite/plan/generate/route.ts",
  ])("routes %s through the centralized model factory", relativePath => {
    expect(read(relativePath)).toContain("createMayaOpenRouterModel(")
  })

  it("does not spend money for a missing or invalid selfie-guide token", () => {
    const source = read("app/api/selfie-guide/maya-preview/route.ts")
    expect(source).toContain("if (!token || !(await validateToken(token)))")
    expect(source.indexOf("if (!token || !(await validateToken(token)))")).toBeLessThan(
      source.indexOf("generateText({")
    )
  })
})
