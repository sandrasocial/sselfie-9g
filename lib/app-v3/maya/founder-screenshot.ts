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
