// @vitest-environment node
import { describe, expect, it } from "vitest"

import {
  normalizeSkoolMembershipEnvelope,
  signSkoolIngressForTest,
  SKOOL_GROUP_ID,
  SKOOL_PLAN_CODE,
  verifySkoolIngressSignature,
} from "@/lib/skool/membership-contract"

const SECRET = Buffer.alloc(32, 7).toString("base64url")

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    source: "skool",
    eventType: "membership.present",
    groupId: SKOOL_GROUP_ID,
    planCode: SKOOL_PLAN_CODE,
    observedAt: "2026-09-01T06:00:00+02:00",
    privateProvisioning: { email: "member@example.com" },
    ...overrides,
  }
}

describe("Skool signed membership contract", () => {
  it("accepts the exact paid plan and derives stable private audit identifiers", () => {
    const normalized = normalizeSkoolMembershipEnvelope(envelope(), SECRET)
    expect(normalized).toMatchObject({
      groupId: SKOOL_GROUP_ID,
      planCode: SKOOL_PLAN_CODE,
      observedAt: "2026-09-01T04:00:00.000Z",
      billingPeriodKey: "2026-09-01",
      privateProvisioning: { email: "member@example.com" },
    })
    expect(normalized?.membershipKey).toMatch(
      /^skool:sselfie-photo-club-2569:[a-f0-9]{32}$/,
    )
    expect(normalized?.dedupeKey).toBe(
      `${normalized?.membershipKey}:period:2026-09-01`,
    )
  })

  it("rejects a free plan, wrong group, invalid email, or missing audit secret", () => {
    expect(normalizeSkoolMembershipEnvelope(envelope({ planCode: "free" }), SECRET)).toBeNull()
    expect(normalizeSkoolMembershipEnvelope(envelope({ groupId: "other" }), SECRET)).toBeNull()
    expect(
      normalizeSkoolMembershipEnvelope(
        envelope({ privateProvisioning: { email: "not-an-email" } }),
        SECRET,
      ),
    ).toBeNull()
    expect(normalizeSkoolMembershipEnvelope(envelope(), null)).toBeNull()
  })

  it("ignores sender-supplied membership/dedupe identifiers and derives its own", () => {
    const normalized = normalizeSkoolMembershipEnvelope(
      envelope({ membershipKey: "attacker-value", dedupeKey: "attacker-value" }),
      SECRET,
    )!
    expect(normalized.membershipKey).not.toBe("attacker-value")
    expect(normalized.dedupeKey).not.toBe("attacker-value")
  })

  it("creates a different period claim for a verified payment in the next month", () => {
    const september = normalizeSkoolMembershipEnvelope(envelope(), SECRET)!
    const october = normalizeSkoolMembershipEnvelope(
      envelope({ observedAt: "2026-10-01T04:00:00.000Z" }),
      SECRET,
      { now: new Date("2026-10-01T04:00:00.000Z") },
    )!

    expect(october.membershipKey).toBe(september.membershipKey)
    expect(october.billingPeriodKey).toBe("2026-10-01")
    expect(october.dedupeKey).not.toBe(september.dedupeKey)
  })

  it("rejects observations that are too far ahead of the authenticated ingress time", () => {
    const ingressTime = new Date("2026-09-01T08:00:00.000Z")
    expect(
      normalizeSkoolMembershipEnvelope(
        envelope({ observedAt: "2026-09-01T08:05:00.000Z" }),
        SECRET,
        { now: ingressTime },
      ),
    ).not.toBeNull()
    expect(
      normalizeSkoolMembershipEnvelope(
        envelope({ observedAt: "2026-09-01T08:05:01.000Z" }),
        SECRET,
        { now: ingressTime },
      ),
    ).toBeNull()
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
