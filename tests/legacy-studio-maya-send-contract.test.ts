import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync("components/sselfie/maya-chat-screen.tsx", "utf8")

describe("legacy Studio Maya send contract", () => {
  it("keeps ImageUploadFlow Start Creating on the AI SDK v5 sendMessage shape", () => {
    const startCreatingBlock = source.match(/onStartCreating=\{async \(library\) => \{[\s\S]+?onManageCategory=/)

    expect(startCreatingBlock?.[0]).toBeTruthy()
    expect(startCreatingBlock?.[0]).toContain("sendMessageParts(")
    expect(startCreatingBlock?.[0]).not.toContain('role: "user"')
  })
})
