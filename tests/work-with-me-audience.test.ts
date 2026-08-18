// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  WORK_WITH_ME_PRIVATE_AUDIENCE,
  classifyWorkWithMeAudience,
  scoreWorkWithMeCandidate,
} from "@/lib/work-with-me/audience"

const strongCandidate = {
  userId: "user-1",
  email: "founder@example.com",
  hasPaid: true,
  repeatBuyerOrHighValue: true,
  active90d: true,
  activeMember: false,
  existingBusinessSignal: true,
  founderBottleneckSignal: true,
  audienceDefined: true,
  publicBusiness: true,
  usedAiContent: true,
  marketingPermissionKnown: true,
  unsubscribed: false,
  latestDeliveryStatus: "delivered",
  lastMarketingDeliveryAt: "2026-08-10T09:00:00.000Z",
  lastPurchaseAt: "2026-08-12T09:00:00.000Z",
  hasOpenWorkWithMeApplication: false,
}

describe("Work With Me private audience", () => {
  it("requires real business, a founder bottleneck, and prior buying behavior", () => {
    expect(WORK_WITH_ME_PRIVATE_AUDIENCE.maxCandidates).toBe(10)
    expect(WORK_WITH_ME_PRIVATE_AUDIENCE.minFitScore).toBe(8)
    expect(scoreWorkWithMeCandidate(strongCandidate)).toBeGreaterThanOrEqual(8)

    expect(
      classifyWorkWithMeAudience({
        candidates: [{ ...strongCandidate, existingBusinessSignal: false }],
        now: new Date("2026-08-18T12:00:00.000Z"),
      }).eligible
    ).toHaveLength(0)
    expect(
      classifyWorkWithMeAudience({
        candidates: [{ ...strongCandidate, founderBottleneckSignal: false }],
        now: new Date("2026-08-18T12:00:00.000Z"),
      }).eligible
    ).toHaveLength(0)
  })

  it("excludes unsafe, recently mailed, and already active sales conversations", () => {
    const now = new Date("2026-08-18T12:00:00.000Z")
    const result = classifyWorkWithMeAudience({
      now,
      candidates: [
        strongCandidate,
        { ...strongCandidate, userId: "user-2", email: "unsub@example.com", unsubscribed: true },
        {
          ...strongCandidate,
          userId: "user-3",
          email: "bounced@example.com",
          latestDeliveryStatus: "bounced",
        },
        {
          ...strongCandidate,
          userId: "user-4",
          email: "cooldown@example.com",
          lastMarketingDeliveryAt: "2026-08-17T12:00:00.000Z",
        },
        {
          ...strongCandidate,
          userId: "user-5",
          email: "pipeline@example.com",
          hasOpenWorkWithMeApplication: true,
        },
      ],
    })

    expect(result.eligible.map(candidate => candidate.email)).toEqual(["founder@example.com"])
    expect(result.excluded).toMatchObject({
      unsubscribed: 1,
      bounced_or_suppressed: 1,
      marketing_cooldown: 1,
      already_in_pipeline: 1,
    })
  })

  it("caps the invitation audience after ranking strongest and newest first", () => {
    const candidates = Array.from({ length: 14 }, (_, index) => ({
      ...strongCandidate,
      userId: `user-${index}`,
      email: `founder-${index}@example.com`,
      lastPurchaseAt: new Date(Date.UTC(2026, 7, index + 1)).toISOString(),
    }))
    const result = classifyWorkWithMeAudience({
      candidates,
      now: new Date("2026-08-20T12:00:00.000Z"),
    })

    expect(result.eligible).toHaveLength(10)
    expect(result.eligible[0]?.email).toBe("founder-13@example.com")
    expect(result.excluded.audience_cap).toBe(4)
  })

  it("keeps the live audit aggregate-only and read-only", () => {
    const script = readFileSync("scripts/audit-work-with-me-audience.ts", "utf8")
    for (const forbidden of [
      "INSERT ",
      "UPDATE ",
      "DELETE ",
      "CREATE TABLE",
      "ALTER TABLE",
      "contacts.segments.add",
      "broadcasts.create",
      "emails.send",
    ]) {
      expect(script).not.toContain(forbidden)
    }
    expect(script).toContain("cohortFingerprint")
    expect(script).toContain("identitiesPrinted: false")
    expect(script).toContain("mutationsPerformed: false")
  })
})
