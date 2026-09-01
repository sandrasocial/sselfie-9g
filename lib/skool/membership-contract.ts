import { createHmac, timingSafeEqual } from "node:crypto"

export const SKOOL_GROUP_ID = "sselfie-photo-club-2569"
export const SKOOL_PLAN_CODE = "sselfie-skool-monthly"
export const SKOOL_MEMBERSHIP_CREDITS = 100

const MEMBERSHIP_KEY = /^skool:sselfie-photo-club-2569:[a-f0-9]{32}$/
const BASE64URL_32_BYTES = /^[A-Za-z0-9_-]{43}$/

export type SkoolMembershipEnvelope = {
  schemaVersion: 1
  source: "skool"
  eventType: "membership.present"
  groupId: typeof SKOOL_GROUP_ID
  planCode: typeof SKOOL_PLAN_CODE
  observedAt: string
  membershipKey: string
  dedupeKey: string
  privateProvisioning: { email: string }
}

function decodeSecret(value: string | null | undefined): Buffer | null {
  const normalized = value?.trim() || ""
  if (!BASE64URL_32_BYTES.test(normalized)) return null
  const secret = Buffer.from(normalized, "base64url")
  if (secret.length !== 32 || secret.toString("base64url") !== normalized) return null
  return secret
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    /\s/.test(normalized) ||
    !/^[^@]+@[^@]+\.[^@]+$/.test(normalized)
  ) {
    return null
  }
  return normalized
}

function identityDigest(secret: Buffer, email: string): string {
  return createHmac("sha256", secret)
    .update(`${SKOOL_GROUP_ID}\0${email}`, "utf8")
    .digest("hex")
    .slice(0, 32)
}

export function normalizeSkoolMembershipEnvelope(
  input: unknown,
  auditKeySecret: string | null | undefined,
  options?: { now?: Date; maxFutureSkewSeconds?: number },
): SkoolMembershipEnvelope | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  const value = input as Record<string, unknown>
  const privateProvisioning = value.privateProvisioning
  if (!privateProvisioning || typeof privateProvisioning !== "object") return null

  const email = normalizeEmail((privateProvisioning as Record<string, unknown>).email)
  const secret = decodeSecret(auditKeySecret)
  const observedAtMillis = typeof value.observedAt === "string" ? Date.parse(value.observedAt) : NaN
  const membershipKey = typeof value.membershipKey === "string" ? value.membershipKey : ""
  const dedupeKey = typeof value.dedupeKey === "string" ? value.dedupeKey : ""
  const nowMillis = (options?.now ?? new Date()).getTime()
  const maxFutureSkewSeconds = Math.max(
    0,
    Math.min(900, options?.maxFutureSkewSeconds ?? 300),
  )

  if (
    value.schemaVersion !== 1 ||
    value.source !== "skool" ||
    value.eventType !== "membership.present" ||
    value.groupId !== SKOOL_GROUP_ID ||
    value.planCode !== SKOOL_PLAN_CODE ||
    !email ||
    !secret ||
    !Number.isFinite(observedAtMillis) ||
    !Number.isFinite(nowMillis) ||
    observedAtMillis > nowMillis + maxFutureSkewSeconds * 1000 ||
    !MEMBERSHIP_KEY.test(membershipKey) ||
    dedupeKey !== `${membershipKey}:present`
  ) {
    return null
  }

  const expectedMembershipKey = `skool:${SKOOL_GROUP_ID}:${identityDigest(secret, email)}`
  if (membershipKey !== expectedMembershipKey) return null

  return {
    schemaVersion: 1,
    source: "skool",
    eventType: "membership.present",
    groupId: SKOOL_GROUP_ID,
    planCode: SKOOL_PLAN_CODE,
    observedAt: new Date(observedAtMillis).toISOString(),
    membershipKey,
    dedupeKey,
    privateProvisioning: { email },
  }
}

export function verifySkoolIngressSignature(input: {
  rawBody: string
  timestamp: string | null
  signature: string | null
  secret: string | null | undefined
  now?: Date
  toleranceSeconds?: number
}): boolean {
  const timestamp = input.timestamp?.trim() || ""
  const supplied = input.signature?.trim() || ""
  const secret = decodeSecret(input.secret)
  const timestampSeconds = Number(timestamp)
  const toleranceSeconds = Math.max(30, Math.min(900, input.toleranceSeconds ?? 300))
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)

  if (
    !secret ||
    !/^\d{10}$/.test(timestamp) ||
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds ||
    !supplied.startsWith("v1=")
  ) {
    return false
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${input.rawBody}`, "utf8")
    .digest("base64url")
  const actual = supplied.slice(3)
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  )
}

export function signSkoolIngressForTest(
  rawBody: string,
  timestamp: string,
  secretValue: string,
): string {
  const secret = decodeSecret(secretValue)
  if (!secret) throw new Error("Invalid test signing secret")
  return `v1=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("base64url")}`
}
