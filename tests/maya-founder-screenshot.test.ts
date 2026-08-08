import { describe, expect, it } from "vitest"

import {
  decryptFounderScreenshot,
  encryptFounderScreenshot,
} from "@/lib/app-v3/maya/founder-screenshot"

describe("Maya founder screenshot privacy", () => {
  it("stores only ciphertext and restores the image through the authenticated proxy", () => {
    const original = Buffer.from("private maya screenshot bytes")
    const encrypted = encryptFounderScreenshot(original, "image/png")

    expect(encrypted.body.equals(original)).toBe(false)
    expect(encrypted.body.toString("utf8")).not.toContain("private maya screenshot bytes")
    expect(
      decryptFounderScreenshot(encrypted.body, {
        key: encrypted.key,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      })
    ).toEqual(original)
  })

  it("fails closed when the stored encryption key is wrong", () => {
    const encrypted = encryptFounderScreenshot(Buffer.from("private"), "image/webp")

    expect(() =>
      decryptFounderScreenshot(encrypted.body, {
        key: Buffer.alloc(32).toString("base64"),
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      })
    ).toThrow()
  })
})
