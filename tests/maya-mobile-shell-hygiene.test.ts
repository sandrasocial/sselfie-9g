// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("maya mobile shell hygiene", () => {
  it("keeps the Maya tab out of the shared stone shell container", () => {
    const appContents = fs.readFileSync(path.join(ROOT, "components/sselfie/sselfie-app.tsx"), "utf8")

    expect(appContents).toContain('const appShellClassName = activeTab === "maya" ? "h-full overflow-visible" : `h-full ${DesignClasses.container} overflow-hidden`')
    expect(appContents).not.toContain('<div className={`h-full ${DesignClasses.container} ${activeTab === "maya" ? "overflow-visible" : "overflow-hidden"}`}>')
  })
})
