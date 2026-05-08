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
    expect(source).toContain("Recent photos")
    expect(source).toContain("Recent videos")
    expect(source).toContain("Feed plans")
    expect(source).toContain("Chat with Maya")
    expect(source).not.toContain("Pages & Workbooks")
  })
})
