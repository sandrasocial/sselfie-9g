import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

export type FounderScreenshotEncryption = {
  body: Buffer
  key: string
  iv: string
  authTag: string
  contentType: string
}

export type FounderScreenshotDecryption = Pick<
  FounderScreenshotEncryption,
  "key" | "iv" | "authTag"
>

export type FounderScreenshotContentType = "image/jpeg" | "image/png" | "image/webp"

function hasSignature(input: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => input[offset + index] === byte)
}

export function detectFounderScreenshotContentType(
  input: Uint8Array
): FounderScreenshotContentType | null {
  if (hasSignature(input, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png"
  }
  if (hasSignature(input, [0xff, 0xd8, 0xff])) return "image/jpeg"
  if (
    hasSignature(input, [0x52, 0x49, 0x46, 0x46]) &&
    hasSignature(input, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp"
  }
  return null
}

export function encryptFounderScreenshot(
  input: Uint8Array,
  contentType: string
): FounderScreenshotEncryption {
  const key = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const body = Buffer.concat([cipher.update(input), cipher.final()])

  return {
    body,
    key: key.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    contentType,
  }
}

export function decryptFounderScreenshot(
  input: Uint8Array,
  encryption: FounderScreenshotDecryption
): Buffer {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(encryption.key, "base64"),
    Buffer.from(encryption.iv, "base64")
  )
  decipher.setAuthTag(Buffer.from(encryption.authTag, "base64"))
  return Buffer.concat([decipher.update(input), decipher.final()])
}
