// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn() as any,
  transaction: vi.fn() as any,
}))

mocks.sql.transaction = mocks.transaction

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("server-only", () => ({}))

import {
  claimIntegrationWork,
  completeIntegrationWork,
  failIntegrationWork,
  recordControlPlaneIntent,
  upsertExternalAccount,
} from "@/lib/integrations/control-plane"
import {
  assertBusinessEventInput,
  assertIntegrationDestination,
  assertIntegrationOutboxInput,
  sanitizeIntegrationError,
} from "@/lib/integrations/contracts"
import {
  getIntegrationDeadLetters,
  getIntegrationOperatorQueue,
} from "@/lib/integrations/operator-queue"
import { runMigration73 } from "@/scripts/run-migration-73"

const event = {
  eventType: "product_purchased" as const,
  schemaVersion: 1 as const,
  aggregateType: "purchase",
  aggregateId: "purchase_1",
  subjectType: "product",
  subjectId: "prompt_vault",
  userId: "user_1",
  sourceProvider: "stripe" as const,
  sourceEventId: "evt_1",
  idempotencyKey: "product-purchased:checkout_1",
  occurredAt: new Date("2026-08-21T08:00:00.000Z"),
  attributes: { product_id: "prompt_vault", amount_minor: 3700, currency: "usd" },
}

describe("integration contracts", () => {
  it("accepts the exact versioned event contract", () => {
    expect(assertBusinessEventInput(event)).toEqual(event)
  })

  it.each([
    "customer_email",
    "fullName",
    "phone_number",
    "accessToken",
    "raw_payload",
    "returnUrl",
  ])("recursively rejects forbidden attribute key %s", key => {
    expect(() =>
      assertBusinessEventInput({ ...event, attributes: { product_id: [{ [key]: "hidden" }] } })
    ).toThrow(/forbidden/i)
  })

  it("rejects arrays, null attributes, unknown events and destinations", () => {
    expect(() => assertBusinessEventInput({ ...event, attributes: [] as any })).toThrow(/object/i)
    expect(() => assertBusinessEventInput({ ...event, attributes: null as any })).toThrow(/object/i)
    expect(() => assertBusinessEventInput({ ...event, eventType: "invoice_paid" as any })).toThrow(
      /event type/i
    )
    expect(() =>
      assertIntegrationDestination({
        provider: "zapier" as any,
        scopeKey: "membership",
        operation: "provision",
      })
    ).toThrow(/provider/i)
    expect(() =>
      assertIntegrationDestination({
        provider: "studio" as any,
        scopeKey: "membership",
        operation: "provision",
      })
    ).toThrow(/provider/i)
    expect(() =>
      assertBusinessEventInput({ ...event, attributes: { arbitrary: true } as any })
    ).toThrow(/attribute key/i)
    expect(() =>
      assertBusinessEventInput({
        ...event,
        attributes: { product_id: "buyer@example.com" },
      })
    ).toThrow(/PII-like/i)
    expect(() =>
      assertIntegrationOutboxInput({
        provider: "skool",
        scopeKey: "community",
        operation: "provision",
        businessKey: "purchase:1",
        destinationKey: "studio:member",
        idempotencyKey: "work:1",
      })
    ).toThrow(/provider prefix/i)
    expect(() =>
      assertIntegrationOutboxInput({
        provider: "skool",
        scopeKey: "community",
        operation: "provision",
        businessKey: "studio:member",
        destinationKey: "skool:community:user_1",
        idempotencyKey: "work:1",
      })
    ).toThrow(/reserved internal/i)
    expect(() =>
      assertIntegrationOutboxInput({
        provider: "skool",
        scopeKey: "community",
        operation: "provision",
        businessKey: "buyer-email:person",
        destinationKey: "skool:community:user_1",
        idempotencyKey: "work:1",
      })
    ).toThrow(/PII-like/i)
  })

  it("sanitizes operator errors without leaking PII", () => {
    expect(
      sanitizeIntegrationError(
        new Error("Failed for sandra@example.com at https://provider.test/path token=super-secret")
      )
    ).toEqual({
      code: "INTEGRATION_ERROR",
      message: "Integration provider operation failed",
    })
  })
})

describe("integration control plane", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sql.transaction = mocks.transaction
  })

  it("records event, desired state and outbox in one transaction", async () => {
    mocks.transaction.mockResolvedValue([
      [
        {
          event_id: "event-1",
          event_inserted: true,
          state_id: "state-1",
          desired_revision: 1,
          outbox_id: "work-1",
          outbox_inserted: true,
        },
      ],
    ])

    await expect(
      recordControlPlaneIntent({
        event,
        desiredState: {
          userId: "user_1",
          provider: "skool",
          scopeKey: "community",
          resourceType: "community_membership",
          resourceId: "sselfie_membership",
          desiredState: "present",
        },
        outbox: {
          provider: "skool",
          scopeKey: "community",
          operation: "provision",
          businessKey: "product-purchased:checkout_1",
          destinationKey: "skool:community:user_1:sselfie_membership",
          idempotencyKey: "skool:provision:checkout_1",
        },
      })
    ).resolves.toEqual({
      eventId: "event-1",
      eventInserted: true,
      stateId: "state-1",
      desiredRevision: 1,
      outboxId: "work-1",
      outboxInserted: true,
    })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })

  it("locks the resource in transaction statement one before the fresh-snapshot intent statement", async () => {
    const statements: string[] = []
    mocks.transaction.mockImplementationOnce((factory: (tx: any) => unknown[]) => {
      const queries = factory((strings: TemplateStringsArray) => {
        statements.push(String(strings))
        return { queryData: strings }
      })
      expect(queries).toHaveLength(2)
      return Promise.resolve([
        [],
        [
          {
            event_id: "event-1",
            event_inserted: true,
            state_id: "state-1",
            desired_revision: 1,
            outbox_id: "work-1",
            outbox_inserted: true,
          },
        ],
      ])
    })

    await recordControlPlaneIntent({
      event,
      desiredState: {
        userId: "user_1",
        provider: "skool",
        scopeKey: "community",
        resourceType: "community_membership",
        resourceId: "sselfie_membership",
        desiredState: "present",
      },
      outbox: {
        provider: "skool",
        scopeKey: "community",
        operation: "provision",
        businessKey: "purchase:checkout_1",
        destinationKey: "skool:community:user_1",
        idempotencyKey: "skool:checkout_1",
      },
    })

    expect(statements).toHaveLength(2)
    expect(statements[0]).toContain("pg_advisory_xact_lock")
    expect(statements[1]).toContain("existing_state AS")
    expect(statements[1]).not.toContain("pg_advisory_xact_lock")
  })

  it("surfaces transaction failure and cannot report partial success", async () => {
    mocks.transaction.mockRejectedValue(new Error("state insert failed"))
    await expect(recordControlPlaneIntent({ event })).rejects.toThrow("state insert failed")
  })

  it("allows one immutable event to fan out to Skool and Studio Platform families", async () => {
    mocks.transaction
      .mockResolvedValueOnce([
        [
          {
            event_id: "event-1",
            event_inserted: true,
            state_id: "state-skool",
            desired_revision: 1,
            outbox_id: "work-skool",
            outbox_inserted: true,
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            event_id: "event-1",
            event_inserted: false,
            state_id: "state-studio",
            desired_revision: 1,
            outbox_id: "work-studio",
            outbox_inserted: true,
          },
        ],
      ])
    const skool = await recordControlPlaneIntent({
      event,
      desiredState: {
        userId: "user_1",
        provider: "skool",
        scopeKey: "community",
        resourceType: "community_membership",
        resourceId: "sselfie_membership",
        desiredState: "present",
      },
      outbox: {
        provider: "skool",
        scopeKey: "community",
        operation: "provision",
        businessKey: "purchase:checkout_1",
        destinationKey: "skool:community:user_1",
        idempotencyKey: "skool:checkout_1",
      },
    })
    const studio = await recordControlPlaneIntent({
      event,
      desiredState: {
        userId: "user_1",
        provider: "studio_platform_partner",
        scopeKey: "creator_program",
        resourceType: "creator_enrollment",
        resourceId: "flagship",
        desiredState: "present",
      },
      outbox: {
        provider: "studio_platform_partner",
        scopeKey: "creator_program",
        operation: "provision",
        businessKey: "purchase:checkout_1",
        destinationKey: "studio_platform_partner:flagship:user_1",
        idempotencyKey: "studio_platform_partner:checkout_1",
      },
    })
    expect(skool.eventId).toBe(studio.eventId)
    expect([skool.outboxId, studio.outboxId]).toEqual(["work-skool", "work-studio"])
  })

  it("rejects immutable intent reuse instead of partially changing canonical state", async () => {
    mocks.transaction.mockResolvedValue([[]])
    await expect(
      recordControlPlaneIntent({
        event,
        desiredState: {
          userId: "user_1",
          provider: "skool",
          scopeKey: "community",
          resourceType: "community_membership",
          resourceId: "different_resource",
          desiredState: "present",
        },
        outbox: {
          provider: "skool",
          scopeKey: "community",
          operation: "provision",
          businessKey: "changed:business",
          destinationKey: "skool:changed:user_1",
          idempotencyKey: "skool:provision:checkout_1",
          maxAttempts: 7,
        },
      })
    ).rejects.toThrow(/idempotency conflict/i)
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib/integrations/control-plane.ts"),
      "utf8"
    )
    expect(source).toContain("ON CONFLICT (provider, idempotency_key) DO UPDATE")
    expect(source).not.toContain("ON CONFLICT (idempotency_key) DO NOTHING")
    for (const immutableField of [
      "integration_outbox.resource_id = EXCLUDED.resource_id",
      "integration_outbox.captured_user_id = EXCLUDED.captured_user_id",
      "integration_outbox.operation = EXCLUDED.operation",
      "integration_outbox.business_key = EXCLUDED.business_key",
      "integration_outbox.destination_key = EXCLUDED.destination_key",
      "integration_outbox.max_attempts = EXCLUDED.max_attempts",
    ]) {
      expect(source).toContain(immutableField)
    }
  })

  it.each([
    {
      eventType: "lead_captured" as const,
      sourceProvider: "manychat" as const,
      attributes: { lead_source: "manychat" },
    },
    {
      eventType: "result_completed" as const,
      sourceProvider: "resend" as const,
      attributes: { result_type: "delivery" },
    },
  ])("allows $sourceProvider event-only facts", async variant => {
    mocks.transaction.mockResolvedValue([[{ event_id: "event-1", event_inserted: true }]])
    await expect(
      recordControlPlaneIntent({
        event: {
          ...event,
          ...variant,
          idempotencyKey: `${variant.sourceProvider}:fact:1`,
        },
      })
    ).resolves.toMatchObject({ eventId: "event-1" })
  })

  it.each([
    ["lead_captured", "manychat"],
    ["checkout_started", "stripe"],
    ["result_completed", "resend"],
    ["product_purchased", "manychat"],
    ["membership_started", "skool"],
    ["membership_ended", "studio_platform_partner"],
  ] as const)(
    "rejects %s/%s provisioning before a transaction",
    async (eventType, sourceProvider) => {
      const attributes =
        eventType === "lead_captured"
          ? { lead_source: "manychat" }
          : eventType === "checkout_started"
            ? { product_id: "prompt_vault" }
            : eventType === "result_completed"
              ? { result_type: "delivery" }
              : eventType === "product_purchased"
                ? { product_id: "prompt_vault" }
                : { membership_id: "suite" }
      await expect(
        recordControlPlaneIntent({
          event: { ...event, eventType, sourceProvider, attributes } as any,
          desiredState: {
            userId: "user_1",
            provider: "skool",
            scopeKey: "community",
            resourceType: "community_membership",
            resourceId: "sselfie_membership",
            desiredState: eventType === "membership_ended" ? "absent" : "present",
          },
        })
      ).rejects.toThrow(/authoritative|provisioning/i)
      expect(mocks.transaction).not.toHaveBeenCalled()
    }
  )

  it.each([
    ["product_purchased", "absent"],
    ["membership_started", "absent"],
    ["membership_ended", "present"],
  ] as const)(
    "rejects invalid %s -> %s direction before a transaction",
    async (eventType, desiredState) => {
      await expect(
        recordControlPlaneIntent({
          event: {
            ...event,
            eventType,
            attributes:
              eventType === "product_purchased"
                ? { product_id: "prompt_vault" }
                : { membership_id: "suite" },
          } as any,
          desiredState: {
            userId: "user_1",
            provider: "skool",
            scopeKey: "community",
            resourceType: "community_membership",
            resourceId: "sselfie_membership",
            desiredState,
          },
        })
      ).rejects.toThrow(/direction/i)
      expect(mocks.transaction).not.toHaveBeenCalled()
    }
  )

  it("converges an exact duplicate event onto the original id", async () => {
    mocks.transaction.mockResolvedValue([[{ event_id: "event-1", event_inserted: false }]])
    await expect(recordControlPlaneIntent({ event })).resolves.toEqual({
      eventId: "event-1",
      eventInserted: false,
    })
  })

  it("rejects an immutable idempotency mismatch and cross-user desired state", async () => {
    mocks.transaction.mockResolvedValue([[]])
    await expect(
      recordControlPlaneIntent({
        event: { ...event, attributes: { product_id: "other" } },
      })
    ).rejects.toThrow(/idempotency conflict/i)
    await expect(
      recordControlPlaneIntent({
        event,
        desiredState: {
          userId: "user_2",
          provider: "skool",
          scopeKey: "community",
          resourceType: "community_membership",
          resourceId: "sselfie_membership",
          desiredState: "present",
        },
      })
    ).rejects.toThrow(/exactly match/i)
  })

  it("allows two facts from one provider delivery when their fact keys differ", async () => {
    mocks.transaction
      .mockResolvedValueOnce([[{ event_id: "event-1", event_inserted: true }]])
      .mockResolvedValueOnce([[{ event_id: "event-2", event_inserted: true }]])
    const first = await recordControlPlaneIntent({ event })
    const second = await recordControlPlaneIntent({
      event: {
        ...event,
        aggregateId: "purchase_2",
        idempotencyKey: "product-purchased:checkout_1:line_2",
      },
    })
    expect([first.eventId, second.eventId]).toEqual(["event-1", "event-2"])
  })

  it("claims with a lease, SKIP LOCKED and returns independently tokened work", async () => {
    mocks.sql.mockResolvedValue([
      {
        id: "work-1",
        provider: "skool",
        scope_key: "community",
        operation: "provision",
        resource_type: "community_membership",
        resource_id: "sselfie_community",
        captured_user_id: "user_1",
        captured_desired_state: "present",
        idempotency_key: "skool:provision:sub_1",
        claim_token: "00000000-0000-4000-8000-000000000001",
        captured_desired_revision: 2,
        attempts: 1,
        max_attempts: 5,
        lease_expires_at: "2026-08-21T08:05:00.000Z",
      },
    ])
    const rows = await claimIntegrationWork({
      provider: "skool",
      limit: 10,
      leaseSeconds: 300,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      id: "work-1",
      provider: "skool",
      scopeKey: "community",
      operation: "provision",
      resourceType: "community_membership",
      resourceId: "sselfie_community",
      capturedUserId: "user_1",
      capturedDesiredState: "present",
      idempotencyKey: "skool:provision:sub_1",
      claimToken: "00000000-0000-4000-8000-000000000001",
      capturedDesiredRevision: 2,
      attempts: 1,
      maxAttempts: 5,
      leaseExpiresAt: "2026-08-21T08:05:00.000Z",
    })
    expect(String(mocks.sql.mock.calls[0]?.[0])).toMatch(/FOR UPDATE(?: OF o)? SKIP LOCKED/)
    expect(String(mocks.sql.mock.calls[0]?.[0])).toContain("lease_expires_at")
    expect(String(mocks.sql.mock.calls[0]?.[0])).toContain("prior_claim_token")
    expect(String(mocks.sql.mock.calls[0]?.[0])).toContain("o.status = c.prior_status")
    expect(String(mocks.sql.mock.calls[0]?.[0])).toContain("active.lease_expires_at")
    const claimSql = String(mocks.sql.mock.calls[0]?.[0])
    expect(claimSql).toContain("integration_outbox.provider =")
    expect(claimSql).toContain("o.provider =")
    expect(claimSql).toMatch(/AND o\.provider =[^]*RETURNING/)
    expect(mocks.sql.mock.calls[0]?.slice(1).filter(value => value === "skool")).toHaveLength(3)
  })

  it("rejects a missing or unknown provider before attempting a claim", async () => {
    await expect(claimIntegrationWork({} as any)).rejects.toThrow(/provider/i)
    await expect(claimIntegrationWork({ provider: "studio" } as any)).rejects.toThrow(/provider/i)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("requires the exact claim token on complete and fail", async () => {
    mocks.sql.mockResolvedValueOnce([])
    await expect(
      completeIntegrationWork({
        provider: "skool",
        outboxId: "work-1",
        claimToken: "00000000-0000-4000-8000-000000000001",
        result: { kind: "confirmed_converged" },
      })
    ).rejects.toThrow(/claim/i)

    mocks.sql.mockResolvedValueOnce([])
    await expect(
      failIntegrationWork({
        provider: "skool",
        outboxId: "work-1",
        claimToken: "00000000-0000-4000-8000-000000000002",
        error: new Error("provider unavailable"),
      })
    ).rejects.toThrow(/claim/i)
  })

  it("cancels stale completion and bounds retry/dead-letter transitions", async () => {
    mocks.sql.mockResolvedValueOnce([{ id: "work-1", status: "cancelled" }])
    await expect(
      completeIntegrationWork({
        provider: "skool",
        outboxId: "work-1",
        claimToken: "00000000-0000-4000-8000-000000000001",
        result: { kind: "confirmed_converged" },
      })
    ).resolves.toEqual({ status: "cancelled" })
    expect(String(mocks.sql.mock.calls[0]?.[0])).toContain("captured_desired_revision")

    mocks.sql.mockResolvedValueOnce([{ id: "work-2", status: "retry" }])
    await expect(
      failIntegrationWork({
        provider: "skool",
        outboxId: "work-2",
        claimToken: "00000000-0000-4000-8000-000000000002",
        error: new Error("temporary"),
      })
    ).resolves.toEqual({ status: "retry" })
    expect(String(mocks.sql.mock.calls[1]?.[0])).toContain("POWER(2")

    mocks.sql.mockResolvedValueOnce([{ id: "work-3", status: "dead_letter" }])
    await expect(
      failIntegrationWork({
        provider: "skool",
        outboxId: "work-3",
        claimToken: "00000000-0000-4000-8000-000000000003",
        error: new Error("permanent"),
      })
    ).resolves.toEqual({ status: "dead_letter" })
  })

  it("stores an explicit pending observation without inferring desired state", async () => {
    mocks.sql.mockResolvedValueOnce([{ id: "work-async", status: "succeeded" }])

    await expect(
      completeIntegrationWork({
        provider: "skool",
        outboxId: "work-async",
        claimToken: "00000000-0000-4000-8000-000000000004",
        result: { kind: "accepted_pending" },
        providerReference: "invite_opaque_1",
      })
    ).resolves.toEqual({ status: "succeeded" })

    const completeSql = String(mocks.sql.mock.calls[0]?.[0])
    expect(completeSql).toContain("SET observed_state =")
    expect(completeSql).toContain("ELSE finished.captured_desired_state")
    expect(completeSql).toContain("s.desired_revision = finished.captured_desired_revision")
    expect(completeSql).toContain("AND o.claim_token =")
    expect(completeSql).toMatch(/locked_outbox[^]*o\.provider =/)
    expect(completeSql).toMatch(/FROM locked[^]*AND o\.provider =/)
    expect(completeSql).toContain("THEN 'pending'")
    expect(mocks.sql.mock.calls[0]?.slice(1)).toContain("accepted_pending")
  })

  it.each([
    undefined,
    { kind: "unknown" },
    { kind: "accepted_pending", observedState: "present" },
    { kind: "confirmed_converged", observedState: "present" },
    { kind: "confirmed_observation", observedState: "pending" },
    { kind: "confirmed_observation", observedState: "failed" },
  ])("rejects malformed completion result %s before touching the database", async result => {
    await expect(
      completeIntegrationWork({
        provider: "skool",
        outboxId: "work-invalid",
        claimToken: "00000000-0000-4000-8000-000000000005",
        result: result as any,
      })
    ).rejects.toThrow(/observed/i)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("derives a confirmed convergence observation only from the locked captured intent", async () => {
    mocks.sql.mockResolvedValueOnce([{ id: "work-converged", status: "succeeded" }])

    await completeIntegrationWork({
      provider: "studio_platform_partner",
      outboxId: "work-converged",
      claimToken: "00000000-0000-4000-8000-000000000008",
      result: { kind: "confirmed_converged" },
      providerReference: "invite_opaque_1",
    })

    const completeSql = String(mocks.sql.mock.calls[0]?.[0])
    expect(completeSql).toContain("o.captured_desired_state")
    expect(completeSql).toContain("ELSE finished.captured_desired_state")
    expect(completeSql).not.toContain("confirmed_observation")
    expect(mocks.sql.mock.calls[0]?.slice(1)).not.toContain("present")
    expect(mocks.sql.mock.calls[0]?.slice(1)).not.toContain("absent")
  })

  it.each([
    "https:provider.example",
    "provider.example.com",
    "buyer_email_value",
    "password_reset_1",
    "invite_token_1",
    "sk_live_opaque",
    "eyJabc.def.ghi",
  ])("rejects sensitive-looking provider reference %s before SQL", async providerReference => {
    await expect(
      completeIntegrationWork({
        provider: "skool",
        outboxId: "work-sensitive",
        claimToken: "00000000-0000-4000-8000-000000000009",
        result: { kind: "accepted_pending" },
        providerReference,
      })
    ).rejects.toThrow(/provider reference/i)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("rejects missing or wrong providers on complete and fail before SQL", async () => {
    await expect(
      completeIntegrationWork({
        outboxId: "work-cross-provider",
        claimToken: "00000000-0000-4000-8000-000000000006",
        result: { kind: "accepted_pending" },
      } as any)
    ).rejects.toThrow(/provider/i)
    await expect(
      failIntegrationWork({
        provider: "studio",
        outboxId: "work-cross-provider",
        claimToken: "00000000-0000-4000-8000-000000000006",
        error: new Error("unavailable"),
      } as any)
    ).rejects.toThrow(/provider/i)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("rechecks the exact provider in failure lock and final mutation boundaries", async () => {
    mocks.sql.mockResolvedValueOnce([{ id: "work-fail", status: "retry" }])
    await failIntegrationWork({
      provider: "studio_platform_partner",
      outboxId: "work-fail",
      claimToken: "00000000-0000-4000-8000-000000000007",
      error: new Error("temporary"),
    })

    const failureSql = String(mocks.sql.mock.calls[0]?.[0])
    expect(failureSql).toMatch(/locked_outbox[^]*o\.provider =/)
    expect(failureSql).toMatch(/FROM locked[^]*AND o\.provider =/)
    expect(failureSql).toContain("AND o.claim_token =")
    expect(
      mocks.sql.mock.calls[0]?.slice(1).filter(value => value === "studio_platform_partner")
    ).toHaveLength(2)
  })

  it("relies on both cross-user account uniqueness constraints", async () => {
    mocks.sql.mockRejectedValue(new Error("external_accounts_provider_scope_external_key"))
    await expect(
      upsertExternalAccount({
        userId: "user_2",
        provider: "skool",
        scopeKey: "community",
        externalAccountId: "opaque_1",
        status: "active",
      })
    ).rejects.toThrow(/external_accounts/)
  })

  it("never replaces an existing external identity for the same user scope", async () => {
    mocks.sql.mockResolvedValue([])
    await expect(
      upsertExternalAccount({
        userId: "user_1",
        provider: "skool",
        scopeKey: "community",
        externalAccountId: "different_opaque_id",
        status: "active",
      })
    ).rejects.toThrow(/upsert failed/i)
    expect(String(mocks.sql.mock.calls[0]?.[0])).toContain(
      "external_accounts.external_account_id = EXCLUDED.external_account_id"
    )
  })

  it("keeps provider-worker safety primitives database-only with no external effects", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib/integrations/control-plane.ts"),
      "utf8"
    )
    expect(source).not.toMatch(/@\/lib\/(?:stripe|email|supabase)/)
    expect(source).not.toMatch(/\bfetch\s*\(|axios|resend|provider sdk/i)
  })
})

describe("operator projection", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns only opaque identifiers and sanitized operational summaries", async () => {
    mocks.sql.mockResolvedValueOnce([
      {
        id: "work-1",
        user_id: "user_1",
        status: "retry",
        provider: "skool",
        scope_key: "community",
        operation: "provision",
        business_key: "purchase:1",
        destination_key: "skool:community:user_1",
        attempts: 1,
        max_attempts: 5,
        available_at: "2026-08-21T08:00:00.000Z",
        lease_expires_at: null,
        captured_desired_revision: 1,
        desired_revision: 1,
        desired_state: "present",
        observed_state: "failed",
        last_error_code: "INTEGRATION_ERROR",
        last_error_message: "Provider unavailable",
        created_at: "2026-08-21T07:00:00.000Z",
        updated_at: "2026-08-21T07:05:00.000Z",
      },
    ])
    const [item] = await getIntegrationOperatorQueue()
    expect(item).toMatchObject({ userId: "user_1", errorSummary: "Provider unavailable" })
    expect(item).not.toHaveProperty("attributes")
    expect(item).not.toHaveProperty("externalAccountId")

    mocks.sql.mockResolvedValueOnce([])
    await expect(getIntegrationDeadLetters()).resolves.toEqual([])
    expect(String(mocks.sql.mock.calls[1]?.[0])).toContain("integration_dead_letters_v")
  })
})

describe("migration 73 runner", () => {
  it("submits trusted DDL once as one transaction, then verifies aggregate schema", async () => {
    const transactionQueries: string[] = []
    const migrationSql = {
      transaction: vi.fn((factory: (tx: any) => unknown[]) => {
        const queries = factory({
          query: vi.fn((statement: string) => {
            transactionQueries.push(statement)
            return { queryData: statement }
          }),
        })
        expect(queries).toHaveLength(2)
        return Promise.resolve([[], []])
      }),
      query: vi
        .fn()
        .mockResolvedValueOnce([
          { table_name: "business_events" },
          { table_name: "external_accounts" },
          { table_name: "external_provisioning_states" },
          { table_name: "integration_outbox" },
        ])
        .mockResolvedValueOnce([
          { table_name: "integration_dead_letters_v" },
          { table_name: "integration_operator_queue_v" },
        ])
        .mockResolvedValueOnce([
          { indexname: "business_events_idempotency_key_key" },
          { indexname: "external_accounts_provider_scope_external_key" },
          { indexname: "external_accounts_user_provider_scope_key" },
          { indexname: "external_provisioning_states_resource_key" },
          { indexname: "integration_outbox_event_destination_operation_key" },
          { indexname: "integration_outbox_event_destination_family_key" },
          { indexname: "integration_outbox_one_claim_per_resource_idx" },
          { indexname: "integration_outbox_provider_idempotency_key" },
        ])
        .mockResolvedValueOnce([{ constraint_count: 9 }]),
    } as any

    await runMigration73(
      migrationSql,
      "BEGIN; CREATE TABLE a(id int); CREATE VIEW b AS SELECT 1; COMMIT;"
    )
    expect(migrationSql.transaction).toHaveBeenCalledTimes(1)
    expect(transactionQueries).toEqual(["CREATE TABLE a(id int)", "CREATE VIEW b AS SELECT 1"])
    expect(migrationSql.query).toHaveBeenCalledTimes(4)
  })

  it("propagates transaction failure and never starts verification", async () => {
    const migrationSql = {
      transaction: vi.fn().mockRejectedValue(new Error("DDL failed")),
      query: vi.fn(),
    } as any
    await expect(
      runMigration73(migrationSql, "BEGIN; CREATE TABLE a(id int); COMMIT;")
    ).rejects.toThrow("DDL failed")
    expect(migrationSql.query).not.toHaveBeenCalled()
  })
})

describe("migration and architecture", () => {
  const root = process.cwd()
  const migrationPath = path.join(root, "db/migrations/73-create-integration-control-plane.sql")

  it("is additive, constrained and contains no PII storage columns", () => {
    const sql = fs.readFileSync(migrationPath, "utf8")
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS business_events")
    expect(sql).toContain("integration_operator_queue_v")
    expect(sql).toContain("integration_dead_letters_v")
    expect(sql).not.toContain("FOR UPDATE SKIP LOCKED")
    expect(sql).toContain("integration_outbox_one_claim_per_resource_idx")
    expect(sql).toContain("integration_outbox_event_destination_operation_key")
    expect(sql).toContain("integration_outbox_event_destination_family_key")
    expect(sql).toContain("captured_desired_state")
    expect(sql).toContain("captured_user_id")
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS business_events_source_idx/)
    expect(sql).not.toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS business_events_source_idx/)
    expect(sql).not.toMatch(/\{\d+,\s*(?:25[6-9]|2[6-9]\d|[3-9]\d{2,}|\d{4,})\}/)
    const boundedTypedIdentifiers = sql.match(
      /char_length\([a-z_]+\) BETWEEN 1 AND 256\s+AND [a-z_]+ ~ '\^\[A-Za-z0-9_\.:-\]\+\$'/g
    )
    expect(boundedTypedIdentifiers).toHaveLength(9)
    expect(sql).not.toMatch(/\b(?:ALTER|DROP|TRUNCATE)\b/i)
    expect(sql).not.toMatch(
      /^\s*(?:email|first_name|last_name|phone|recipient|access_token|refresh_token|payload)\s+/im
    )
    for (const type of [
      "lead_captured",
      "checkout_started",
      "product_purchased",
      "membership_started",
      "membership_ended",
      "result_completed",
    ]) {
      expect(sql).toContain(type)
    }
  })

  it("does not cut the dark control plane into runtime consumers", () => {
    const guardedRoots = ["app", "lib/payments"]
    const files: string[] = []
    const visit = (entry: string) => {
      for (const item of fs.readdirSync(entry, { withFileTypes: true })) {
        const full = path.join(entry, item.name)
        if (item.isDirectory()) visit(full)
        else if (/\.(?:ts|tsx)$/.test(item.name)) files.push(full)
      }
    }
    for (const guardedRoot of guardedRoots) visit(path.join(root, guardedRoot))
    files.push(
      path.join(root, "lib/academy-entitlements.ts"),
      path.join(root, "lib/subscription.ts")
    )
    const exactAllowedFile = path.join(root, "lib/payments/lifecycle/upsert-studio-membership.ts")
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8")
      const integrationImports =
        source.match(/(?:@\/lib|lib)\/integrations\/[A-Za-z0-9_./-]+/g) ?? []
      if (file === exactAllowedFile) {
        expect(integrationImports, file).toEqual(["@/lib/integrations/contracts"])
        expect(source, file).not.toMatch(/integrations\/(?:control-plane|operator-queue)/)
        expect(source, file).not.toMatch(/integration_outbox|external_provisioning_states/)
      } else {
        expect(integrationImports, file).toEqual([])
      }
    }
  })

  it("has a migration-first runner that verifies schema evidence without selecting rows", () => {
    const runner = fs.readFileSync(path.join(root, "scripts/run-migration-73.ts"), "utf8")
    expect(runner).toContain("sql.transaction")
    expect(runner).toContain("tx.query(statement)")
    expect(runner).toContain("information_schema.tables")
    expect(runner).toContain("information_schema.views")
    expect(runner).toContain("integration_outbox_one_claim_per_resource_idx")
    expect(runner).not.toMatch(/SELECT\s+\*/i)
    expect(runner).not.toMatch(/email|external_account_id|attributes/i)
  })
})
