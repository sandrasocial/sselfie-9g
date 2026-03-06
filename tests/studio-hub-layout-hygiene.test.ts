// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("studio hub layout hygiene", () => {
  it("renders collapsible content sections and hides pages/workbooks surface", () => {
    const source = read("components/sselfie/studio-hub-screen.tsx")
    expect(source).toContain("details")
    expect(source).toContain("Recent Photos")
    expect(source).toContain("Recent Videos")
    expect(source).toContain("Feed Systems")
    expect(source).toContain("Quick Actions")
    expect(source).not.toContain("Pages & Workbooks")
  })
})
