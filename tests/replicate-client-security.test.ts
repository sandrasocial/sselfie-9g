import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Replicate client secret handling", () => {
  it("never logs any part or length of the API token", () => {
    const source = readFileSync("lib/replicate-client.ts", "utf8")

    expect(source).not.toContain("tokenPreview")
    expect(source).not.toContain("API token preview")
    expect(source).not.toContain("API token length")
  })
})
