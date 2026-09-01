// @vitest-environment node
import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"

import {
  normalizeSkoolMembershipEnvelope,
  signSkoolIngressForTest,
  SKOOL_GROUP_ID,
  SKOOL_PLAN_CODE,
  verifySkoolIngressSignature,
} from "@/lib/skool/membership-contract"

const SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY"

function envelope(overrides: Record<string, unknown> = {}) {
  const email = "member@example.com"
  const digest = createHmac("sha256", Buffer.from(SECRET, "base64url"))
    .update(`${SKOOL_GROUP_ID}\0${email}`)
    .digest("hex")
    .slice(0, 32)
  const membershipKey = `skool:${SKOOL_GROUP_ID}:${digest}`
  return {
    schemaVersion: 1,
    source: "skool",
    eventType: "membership.present",
    groupId: SKOOL_GROUP_ID,
    planCode: SKOOL_PLAN_CODE,
    observedAt: "2026-09-01T06:00:00+02:00",
    membershipKey,
    dedupeKey: `${membershipKey}:present`,
    privateProvisioning: { email },
    ...overrides,
  }
}

describe("Skool signed membership contract", () => {
  it("accepts the exact paid plan and verifies the email-bound membership key", () => {
    const normalized = normalizeSkoolMembershipEnvelope(envelope(), SECRET)
    expect(normalized).toMatchObject({
      groupId: SKOOL_GROUP_ID,
      planCode: SKOOL_PLAN_CODE,
      observedAt: "2026-09-01T04:00:00.000Z",
      privateProvisioning: { email: "member@example.com" },
    })
  })

  it("rejects a free plan, wrong group, mismatched email, or missing audit secret", () => {
    expect(normalizeSkoolMembershipEnvelope(envelope({ planCode: "free" }), SECRET)).toBeNull()
    expect(normalizeSkoolMembershipEnvelope(envelope({ groupId: "other" }), SECRET)).toBeNull()
    expect(
      normalizeSkoolMembershipEnvelope(
        envelope({ privateProvisioning: { email: "different@example.com" } }),
        SECRET,
      ),
    ).toBeNull()
    expect(normalizeSkoolMembershipEnvelope(envelope(), null)).toBeNull()
  })

  it("accepts a fresh HMAC and rejects tampering or stale delivery", () => {
    const rawBody = JSON.stringify(envelope())
    const timestamp = "1788249600"
    const signature = signSkoolIngressForTest(rawBody, timestamp, SECRET)

    expect(
      verifySkoolIngressSignature({
        rawBody,
        timestamp,
        signature,
        secret: SECRET,
        now: new Date("2026-09-01T08:00:00.000Z"),
      }),
    ).toBe(true)
    expect(
      verifySkoolIngressSignature({
        rawBody: `${rawBody} `,
        timestamp,
        signature,
        secret: SECRET,
        now: new Date("2026-09-01T08:00:00.000Z"),
      }),
    ).toBe(false)
    expect(
      verifySkoolIngressSignature({
        rawBody,
        timestamp,
        signature,
        secret: SECRET,
        now: new Date("2026-09-01T08:10:00.000Z"),
      }),
    ).toBe(false)
  })

  it("keeps email out of the stable audit identifiers", () => {
    const normalized = normalizeSkoolMembershipEnvelope(envelope(), SECRET)!
    expect(normalized.membershipKey).not.toContain("member@example.com")
    expect(normalized.dedupeKey).not.toContain("member@example.com")
  })
})
