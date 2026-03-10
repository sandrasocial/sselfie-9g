// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("maya welcome flow wiring hygiene", () => {
  it("mounts the first-generation Maya flow from the live Maya screen", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")

    expect(mayaChatScreen).toContain('"/api/onboarding/welcome-first-generation-state"')
    expect(mayaChatScreen).toContain("showWelcomeFirstGenerationFlow")
    expect(mayaChatScreen).toContain("<WelcomeFirstGenerationFlow")
  })
})
