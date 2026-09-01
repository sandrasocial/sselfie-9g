// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

const sql = vi.hoisted(() => {
  const query = vi.fn()
  Object.assign(query, { transaction: vi.fn() })
  return query
})

vi.mock("@/lib/db/client", () => ({ sql }))
vi.mock("@/lib/credits-cached", () => ({ invalidateCreditCache: vi.fn() }))

describe("Skool membership persistence", () => {
  it("returns a first 100-credit grant and a zero-credit replay", async () => {
    const tx = vi.fn().mockResolvedValue([])
    ;(sql.transaction as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(async callback => {
        const statements = callback(tx)
        await Promise.all(statements)
        return [[], [{ entitlement_upserted: true, event_claimed: true, credits_granted: true, balance: 100 }]]
      })
      .mockImplementationOnce(async callback => {
        const statements = callback(tx)
        await Promise.all(statements)
        return [[], [{ entitlement_upserted: true, event_claimed: false, credits_granted: false, balance: 100 }]]
      })

    const { grantSkoolMembership } = await import("@/lib/skool/membership-service")
    const envelope = {
      schemaVersion: 1 as const,
      source: "skool" as const,
      eventType: "membership.present" as const,
      groupId: "sselfie-photo-club-2569" as const,
      planCode: "sselfie-skool-monthly" as const,
      observedAt: "2026-09-01T04:00:00.000Z",
      membershipKey: `skool:sselfie-photo-club-2569:${"a".repeat(32)}`,
      dedupeKey: `skool:sselfie-photo-club-2569:${"a".repeat(32)}:present`,
      privateProvisioning: { email: "member@example.com" },
    }

    await expect(grantSkoolMembership({ userId: "user_1", envelope })).resolves.toEqual({
      replay: false,
      creditsGranted: 100,
      balance: 100,
    })
    await expect(grantSkoolMembership({ userId: "user_1", envelope })).resolves.toEqual({
      replay: true,
      creditsGranted: 0,
      balance: 100,
    })
  })

  it("fails closed when a membership key is already bound to another identity", async () => {
    const tx = vi.fn().mockResolvedValue([])
    ;(sql.transaction as ReturnType<typeof vi.fn>).mockImplementationOnce(async callback => {
      const statements = callback(tx)
      await Promise.all(statements)
      return [[], [{ entitlement_upserted: false, event_claimed: false, credits_granted: false, balance: 0 }]]
    })

    const { grantSkoolMembership } = await import("@/lib/skool/membership-service")
    const membershipKey = `skool:sselfie-photo-club-2569:${"b".repeat(32)}`
    await expect(grantSkoolMembership({
      userId: "different_user",
      envelope: {
        schemaVersion: 1,
        source: "skool",
        eventType: "membership.present",
        groupId: "sselfie-photo-club-2569",
        planCode: "sselfie-skool-monthly",
        observedAt: "2026-09-01T04:00:00.000Z",
        membershipKey,
        dedupeKey: `${membershipKey}:present`,
        privateProvisioning: { email: "member@example.com" },
      },
    })).rejects.toThrow("SKOOL_ENTITLEMENT_CONFLICT")
  })

  it("treats an active external entitlement as membership access", async () => {
    sql.mockResolvedValueOnce([{ exists: 1 }]).mockResolvedValueOnce([])
    const { hasActiveSkoolMembership } = await import("@/lib/skool/membership-service")
    await expect(hasActiveSkoolMembership("user_1")).resolves.toBe(true)
    await expect(hasActiveSkoolMembership("user_2")).resolves.toBe(false)
  })

  it("makes roster misses review-only and contains no automatic access revocation", () => {
    const source = readFileSync("lib/skool/membership-service.ts", "utf8")
    const reconciliation = source.slice(source.indexOf("export async function recordSkoolRosterObservation"))
    expect(reconciliation).toContain("churn_review_required")
    expect(reconciliation).toContain("accessRevoked: false")
    expect(reconciliation).not.toMatch(/SET\s+access_status/i)
    expect(reconciliation).not.toMatch(/DELETE\s+FROM/i)
  })

  it("does not let an idempotent present-event replay erase newer roster evidence", () => {
    const source = readFileSync("lib/skool/membership-service.ts", "utf8")
    const grant = source.slice(
      source.indexOf("export async function grantSkoolMembership"),
      source.indexOf("export async function hasActiveSkoolMembership"),
    )
    expect(grant).toContain(
      "EXCLUDED.last_observed_at > skool_membership_entitlements.last_observed_at",
    )
    expect(grant).toContain("ELSE skool_membership_entitlements.reconciliation_status")
    expect(grant).toContain("ELSE skool_membership_entitlements.consecutive_roster_misses")
  })

  it("does not count the same roster-miss observation twice", () => {
    const source = readFileSync("lib/skool/membership-service.ts", "utf8")
    const reconciliation = source.slice(source.indexOf("export async function recordSkoolRosterObservation"))
    expect(reconciliation).toContain("<= last_observed_at THEN reconciliation_status")
    expect(reconciliation).toContain("<= last_observed_at THEN consecutive_roster_misses")
    expect(reconciliation).toContain("> last_observed_at THEN NOW()")
  })
})
