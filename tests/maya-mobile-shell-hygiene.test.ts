// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("maya mobile shell hygiene", () => {
  it("keeps Maya in the shared stone shell container", () => {
    const appContents = fs.readFileSync(path.join(ROOT, "components/sselfie/sselfie-app.tsx"), "utf8")

    expect(appContents).toContain("${DesignClasses.container}")
    expect(appContents).toContain('activeTab === "maya" ? "overflow-visible" : "overflow-hidden"')
    expect(appContents).not.toContain("const appShellClassName =")
  })
})
