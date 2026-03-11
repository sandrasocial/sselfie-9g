// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("maya mobile shell hygiene", () => {
  it("keeps Maya out of the shared stone shell container", () => {
    const appContents = fs.readFileSync(path.join(ROOT, "components/sselfie/sselfie-app.tsx"), "utf8")

    expect(appContents).toContain("const appShellClassName =")
    expect(appContents).toContain('activeTab === "maya"')
    expect(appContents).toContain('"relative h-full overflow-visible"')
    expect(appContents).toContain('`relative h-full ${DesignClasses.container} overflow-hidden`')
  })
})
