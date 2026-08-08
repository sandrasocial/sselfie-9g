import { describe, expect, it } from "vitest"

import {
  detectFounderScreenshotContentType,
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

  it("uses the actual image signature instead of trusting the uploaded filename", () => {
    expect(
      detectFounderScreenshotContentType(
        Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
      )
    ).toBe("image/jpeg")
    expect(
      detectFounderScreenshotContentType(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      )
    ).toBe("image/png")
    expect(detectFounderScreenshotContentType(Buffer.from("not an image"))).toBeNull()
  })
})
