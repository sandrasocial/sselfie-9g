import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  conversationalEditInstructionDigest,
  decideConversationalEditReservation,
  type ConversationalEditReservation,
} from "@/lib/app-v3/maya/conversational-photo-edit-reservation"

const migration = fs.readFileSync(
  path.join(process.cwd(), "db/migrations/75-create-app-v3-maya-edit-reservations.sql"),
  "utf8"
)
const service = fs.readFileSync(
  path.join(process.cwd(), "lib/app-v3/maya/conversational-photo-edit-reservation.ts"),
  "utf8"
)
const route = fs.readFileSync(
  path.join(process.cwd(), "app/api/app-v3/maya/edit/route.ts"),
  "utf8"
)

function reservation(
  overrides: Partial<ConversationalEditReservation> = {}
): ConversationalEditReservation {
  return {
    requestId: "request_123456",
    creditReference: "app-v3-gen-user-edit-request_123456",
    sourceImageId: 10,
    rootImageId: 10,
    instructionDigest: conversationalEditInstructionDigest("Move me to Paris"),
    status: "reserved",
    creditState: "not_charged",
    resultImageId: null,
    resultImageUrl: null,
    failureCode: null,
    ...overrides,
  }
}

const expected = {
  sourceImageId: 10,
  rootImageId: 10,
  instructionDigest: conversationalEditInstructionDigest("Move me to Paris"),
}

describe("Maya conversational edit durable reservations", () => {
  it("uses a stable instruction digest without storing the member's edit text in the ledger", () => {
    expect(conversationalEditInstructionDigest("Move me to Paris")).toMatch(
      /^sha256:[a-f0-9]{64}$/
    )
    expect(conversationalEditInstructionDigest("Move me to Paris")).toBe(
      conversationalEditInstructionDigest("Move me to Paris")
    )
    expect(migration).not.toContain("instruction TEXT")
    expect(migration).toContain("instruction_digest TEXT NOT NULL")
  })

  it("classifies exactly one inserted claim as acquired and a simultaneous observer as in progress", () => {
    expect(decideConversationalEditReservation(reservation(), expected, true).kind).toBe("acquired")
    expect(decideConversationalEditReservation(reservation(), expected, false).kind).toBe(
      "in_progress"
    )
  })

  it("replays only a completed owned result and makes failures terminal", () => {
    expect(
      decideConversationalEditReservation(
        reservation({
          status: "succeeded",
          creditState: "charged",
          resultImageId: 11,
          resultImageUrl: "https://assets.public.blob.vercel-storage.com/result.png",
        }),
        expected
      ).kind
    ).toBe("replay")
    expect(
      decideConversationalEditReservation(
        reservation({
          status: "failed",
          creditState: "refunded",
          failureCode: "openai_edit_failed",
        }),
        expected
      ).kind
    ).toBe("already_used")
  })

  it("rejects request-id reuse for another source, root, or instruction", () => {
    expect(
      decideConversationalEditReservation(reservation({ sourceImageId: 99 }), expected).kind
    ).toBe("conflict")
    expect(
      decideConversationalEditReservation(
        reservation({ instructionDigest: conversationalEditInstructionDigest("Different edit") }),
        expected
      ).kind
    ).toBe("conflict")
  })

  it("makes the database claim atomic and user-scoped", () => {
    expect(migration).toContain(
      "CONSTRAINT app_v3_maya_edit_requests_user_request_key UNIQUE (user_id, request_id)"
    )
    expect(service).toContain("ON CONFLICT (user_id, request_id) DO NOTHING")
    expect(service).toContain("source.user_id = ${input.userId}")
    expect(service).toContain("root.user_id = ${input.userId}")
    expect(service).toContain("source.id = root.id OR source.variant_of = root.id")
  })

  it("enforces source, root, and result ownership in the schema", () => {
    expect(migration).toContain("enforce_app_v3_maya_edit_request_ownership")
    expect(migration).toContain("source.user_id = NEW.user_id")
    expect(migration).toContain("root.user_id = NEW.user_id")
    expect(migration).toContain("result.user_id = NEW.user_id")
    expect(migration).toContain("result.variant_of = NEW.root_image_id")
  })

  it("persists the Gallery result and succeeded reservation in one statement", () => {
    expect(service).toMatch(/WITH active_request AS MATERIALIZED[\s\S]*inserted AS[\s\S]*completed AS/)
    expect(service).toContain("AND status = 'charged'")
    expect(service).toContain("SET status = 'succeeded', result_image_id = inserted.id")
    expect(route).toContain("persistConversationalEditResult")
    expect(route).toContain("persistence reconciliation failed")
  })

  it("claims before credit deduction and records every terminal credit state", () => {
    expect(route.indexOf("claimConversationalEditReservation({")).toBeLessThan(
      route.indexOf("deductCredits(")
    )
    expect(route).toContain("markConversationalEditReservationCharged")
    expect(route).toContain('"not_charged"')
    expect(route).toContain('"refunded"')
    expect(route).toContain('"refund_pending"')
    expect(migration).toContain("credit_state IN ('not_charged', 'charged', 'refunded', 'refund_pending')")
  })

  it("never creates a refund when unlimited access skipped the original deduction", () => {
    expect(route).toMatch(
      /FROM credit_transactions[\s\S]*transaction_type = 'image'[\s\S]*amount = \$\{-amount\}[\s\S]*reference_id = \$\{ref\}/
    )
    expect(route).toContain("if (usageRows.length === 0) return true")
  })
})
