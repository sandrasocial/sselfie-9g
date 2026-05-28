import { createHmac, timingSafeEqual } from "crypto"

export function verifyMetaSignature(params: {
  body: string
  signature: string | null
  appSecret?: string
}): boolean {
  if (!params.appSecret || !params.signature?.startsWith("sha256=")) return false

  const expected = `sha256=${createHmac("sha256", params.appSecret).update(params.body).digest("hex")}`
  const actualBuffer = Buffer.from(params.signature)
  const expectedBuffer = Buffer.from(expected)

  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}

