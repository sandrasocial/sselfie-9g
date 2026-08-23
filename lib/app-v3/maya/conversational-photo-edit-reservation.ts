import { createHash } from "node:crypto"

import type { OutputFormat } from "@/components/app-v3/types"
import { getDbClient } from "@/lib/db/client"

const sql = getDbClient()

export type ConversationalEditReservationStatus =
  | "reserved"
  | "charged"
  | "succeeded"
  | "failed"

export type ConversationalEditCreditState =
  | "not_charged"
  | "charged"
  | "refunded"
  | "refund_pending"

export type ConversationalEditReservation = {
  requestId: string
  creditReference: string
  sourceImageId: number
  rootImageId: number
  instructionDigest: string
  status: ConversationalEditReservationStatus
  creditState: ConversationalEditCreditState
  resultImageId: number | null
  resultImageUrl: string | null
  failureCode: string | null
}

export type ConversationalEditReservationDecision =
  | { kind: "acquired"; reservation: ConversationalEditReservation }
  | { kind: "replay"; reservation: ConversationalEditReservation }
  | { kind: "in_progress"; reservation: ConversationalEditReservation }
  | { kind: "already_used"; reservation: ConversationalEditReservation }
  | { kind: "conflict"; reservation: ConversationalEditReservation }

export type ConversationalEditChargeResult =
  | { kind: "charged"; newBalance: number; creditsDeducted: 0 | 1 }
  | { kind: "insufficient"; newBalance: number }
  | { kind: "unavailable"; newBalance: null }
  | { kind: "conflict"; newBalance: null }

export type ConversationalEditChargeInput = {
  userId: string
  requestId: string
  creditReference: string
  amount: 1
  description: string
  adminBypass: boolean
}

type SqlTag<T> = (strings: TemplateStringsArray, ...values: unknown[]) => T

type ChargeRow = {
  outcome: "charged" | "insufficient" | "unavailable" | "conflict"
  new_balance: number | string | null
  credits_deducted: number | string | null
}

type ReservationRow = {
  request_id: string
  credit_reference: string
  source_image_id: number | string
  root_image_id: number | string
  instruction_digest: string
  status: ConversationalEditReservationStatus
  credit_state: ConversationalEditCreditState
  result_image_id: number | string | null
  result_image_url: string | null
  failure_code: string | null
  inserted?: boolean
}

function normalizeReservation(row: ReservationRow): ConversationalEditReservation {
  return {
    requestId: row.request_id,
    creditReference: row.credit_reference,
    sourceImageId: Number(row.source_image_id),
    rootImageId: Number(row.root_image_id),
    instructionDigest: row.instruction_digest,
    status: row.status,
    creditState: row.credit_state,
    resultImageId: row.result_image_id == null ? null : Number(row.result_image_id),
    resultImageUrl: row.result_image_url,
    failureCode: row.failure_code,
  }
}

export function conversationalEditInstructionDigest(instruction: string): string {
  return `sha256:${createHash("sha256").update(instruction).digest("hex")}`
}

export function decideConversationalEditReservation(
  reservation: ConversationalEditReservation,
  expected: {
    sourceImageId: number
    rootImageId: number
    instructionDigest: string
  },
  inserted = false
): ConversationalEditReservationDecision {
  if (
    reservation.sourceImageId !== expected.sourceImageId ||
    reservation.rootImageId !== expected.rootImageId ||
    reservation.instructionDigest !== expected.instructionDigest
  ) {
    return { kind: "conflict", reservation }
  }
  if (inserted) return { kind: "acquired", reservation }
  if (
    reservation.status === "succeeded" &&
    reservation.resultImageId &&
    reservation.resultImageUrl
  ) {
    return { kind: "replay", reservation }
  }
  if (reservation.status === "reserved" || reservation.status === "charged") {
    return { kind: "in_progress", reservation }
  }
  return { kind: "already_used", reservation }
}

export async function claimConversationalEditReservation(input: {
  userId: string
  requestId: string
  creditReference: string
  sourceImageId: number
  rootImageId: number
  instruction: string
}): Promise<ConversationalEditReservationDecision | null> {
  const instructionDigest = conversationalEditInstructionDigest(input.instruction)
  const insertedRows = await sql`
    INSERT INTO app_v3_maya_edit_requests (
      user_id, request_id, credit_reference, source_image_id, root_image_id, instruction_digest
    )
    SELECT
      ${input.userId}, ${input.requestId}, ${input.creditReference},
      source.id, root.id, ${instructionDigest}
    FROM ai_images source
    JOIN ai_images root
      ON root.id = ${input.rootImageId}
     AND root.user_id = ${input.userId}
    WHERE source.id = ${input.sourceImageId}
      AND source.user_id = ${input.userId}
      AND (source.id = root.id OR source.variant_of = root.id)
    ON CONFLICT (user_id, request_id) DO NOTHING
    RETURNING request_id, credit_reference, source_image_id, root_image_id,
      instruction_digest, status, credit_state, result_image_id,
      NULL::text AS result_image_url, failure_code, TRUE AS inserted
  `
  const inserted = insertedRows[0] as ReservationRow | undefined
  if (inserted) {
    return decideConversationalEditReservation(
      normalizeReservation(inserted),
      { sourceImageId: input.sourceImageId, rootImageId: input.rootImageId, instructionDigest },
      true
    )
  }

  const existingRows = await sql`
    SELECT request.request_id, request.credit_reference, request.source_image_id,
      request.root_image_id, request.instruction_digest, request.status,
      request.credit_state, request.result_image_id, result.image_url AS result_image_url,
      request.failure_code
    FROM app_v3_maya_edit_requests request
    LEFT JOIN ai_images result
      ON result.id = request.result_image_id
     AND result.user_id = request.user_id
    WHERE request.user_id = ${input.userId}
      AND request.request_id = ${input.requestId}
    LIMIT 1
  `
  const existing = existingRows[0] as ReservationRow | undefined
  if (!existing) return null
  return decideConversationalEditReservation(normalizeReservation(existing), {
    sourceImageId: input.sourceImageId,
    rootImageId: input.rootImageId,
    instructionDigest,
  })
}

/**
 * Atomically consumes one reserved request. PostgreSQL locks the reservation and credit balance,
 * then either commits all three paid effects (balance, ledger, charged state) or none of them.
 * Admins and the existing 999999-balance unlimited convention take an explicit no-ledger branch
 * that still transitions the reservation under the same lock.
 */
export function buildConversationalEditChargeQuery<T>(
  tag: SqlTag<T>,
  input: ConversationalEditChargeInput
): T {
  return tag`
    WITH candidate AS MATERIALIZED (
      SELECT id, user_id, credit_reference, status, credit_state
      FROM app_v3_maya_edit_requests
      WHERE user_id = ${input.userId}
        AND request_id = ${input.requestId}
      FOR UPDATE
    ), eligible AS MATERIALIZED (
      SELECT *
      FROM candidate
      WHERE credit_reference = ${input.creditReference}
        AND status = 'reserved'
        AND credit_state = 'not_charged'
    ), locked_balance AS MATERIALIZED (
      SELECT balance
      FROM user_credits
      WHERE user_id = ${input.userId}
      FOR UPDATE
    ), charge_policy AS MATERIALIZED (
      SELECT eligible.id, eligible.user_id, eligible.credit_reference,
        COALESCE(locked_balance.balance, 0)::int AS current_balance,
        (${input.adminBypass} OR COALESCE(locked_balance.balance, 0) >= 999999) AS skip_deduction
      FROM eligible
      LEFT JOIN locked_balance ON TRUE
    ), deduction AS (
      UPDATE user_credits credits
      SET balance = credits.balance - ${input.amount},
        total_used = credits.total_used + ${input.amount},
        updated_at = NOW()
      FROM charge_policy
      WHERE credits.user_id = charge_policy.user_id
        AND charge_policy.skip_deduction = FALSE
        AND credits.balance >= ${input.amount}
      RETURNING credits.balance
    ), ledger AS (
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description, reference_id, balance_after
      )
      SELECT charge_policy.user_id, ${-input.amount}, 'image', ${input.description},
        charge_policy.credit_reference, deduction.balance
      FROM charge_policy, deduction
      WHERE charge_policy.skip_deduction = FALSE
      RETURNING id
    ), charged_request AS (
      UPDATE app_v3_maya_edit_requests request
      SET status = 'charged', credit_state = 'charged', updated_at = NOW()
      FROM charge_policy
      WHERE request.id = charge_policy.id
        AND (charge_policy.skip_deduction OR EXISTS (SELECT 1 FROM ledger))
      RETURNING
        COALESCE(
          (SELECT balance::int FROM deduction LIMIT 1),
          charge_policy.current_balance
        ) AS new_balance,
        CASE WHEN charge_policy.skip_deduction THEN 0 ELSE ${input.amount} END AS credits_deducted
    ), insufficient_request AS (
      UPDATE app_v3_maya_edit_requests request
      SET status = 'failed', credit_state = 'not_charged',
        failure_code = 'insufficient_credits', updated_at = NOW(), completed_at = NOW()
      FROM charge_policy
      WHERE request.id = charge_policy.id
        AND charge_policy.skip_deduction = FALSE
        AND NOT EXISTS (SELECT 1 FROM deduction)
      RETURNING charge_policy.current_balance AS new_balance
    )
    SELECT
      CASE
        WHEN EXISTS (SELECT 1 FROM charged_request) THEN 'charged'
        WHEN EXISTS (SELECT 1 FROM insufficient_request) THEN 'insufficient'
        WHEN EXISTS (
          SELECT 1 FROM candidate WHERE credit_reference <> ${input.creditReference}
        ) THEN 'conflict'
        ELSE 'unavailable'
      END AS outcome,
      COALESCE(
        (SELECT new_balance FROM charged_request LIMIT 1),
        (SELECT new_balance FROM insufficient_request LIMIT 1)
      ) AS new_balance,
      (SELECT credits_deducted FROM charged_request LIMIT 1) AS credits_deducted
  `
}

export async function chargeConversationalEditReservation(
  input: ConversationalEditChargeInput
): Promise<ConversationalEditChargeResult> {
  const rows = await buildConversationalEditChargeQuery(
    sql as unknown as SqlTag<Promise<ChargeRow[]>>,
    input
  )
  const row = rows[0]
  if (row?.outcome === "charged") {
    return {
      kind: "charged",
      newBalance: Number(row.new_balance || 0),
      creditsDeducted: Number(row.credits_deducted) === 0 ? 0 : 1,
    }
  }
  if (row?.outcome === "insufficient") {
    return { kind: "insufficient", newBalance: Number(row.new_balance || 0) }
  }
  if (row?.outcome === "conflict") return { kind: "conflict", newBalance: null }
  return { kind: "unavailable", newBalance: null }
}

export async function failConversationalEditReservation(input: {
  userId: string
  requestId: string
  creditState: "not_charged" | "refunded" | "refund_pending"
  failureCode: string
}): Promise<boolean> {
  const rows = await sql`
    UPDATE app_v3_maya_edit_requests
    SET status = 'failed', credit_state = ${input.creditState},
      failure_code = ${input.failureCode}, updated_at = NOW(), completed_at = NOW()
    WHERE user_id = ${input.userId}
      AND request_id = ${input.requestId}
      AND status IN ('reserved', 'charged')
    RETURNING id
  `
  return rows.length === 1
}

/**
 * The Gallery row and terminal reservation state are one PostgreSQL statement. A result can never
 * become replayable without its owned canonical Gallery asset, and a Gallery asset is not inserted
 * unless this request still owns the charged reservation.
 */
export async function persistConversationalEditResult(input: {
  userId: string
  requestId: string
  imageUrl: string
  title: string
  rootImageId: number
  instruction: string
  predictionId: string
  format: OutputFormat
}): Promise<number | null> {
  const rows = await sql`
    WITH active_request AS MATERIALIZED (
      SELECT id, user_id, root_image_id
      FROM app_v3_maya_edit_requests
      WHERE user_id = ${input.userId}
        AND request_id = ${input.requestId}
        AND status = 'charged'
        AND credit_state = 'charged'
        AND root_image_id = ${input.rootImageId}
      FOR UPDATE
    ), inserted AS (
      INSERT INTO ai_images (
        user_id, image_url, title, variant_of, prompt, generated_prompt, prediction_id,
        generation_status, source, category, created_at
      )
      SELECT
        active_request.user_id, ${input.imageUrl}, ${input.title}, active_request.root_image_id,
        ${input.instruction}, ${input.instruction}, ${input.predictionId},
        'completed', 'openai', ${input.format}, NOW()
      FROM active_request
      RETURNING id
    ), completed AS (
      UPDATE app_v3_maya_edit_requests request
      SET status = 'succeeded', result_image_id = inserted.id,
        updated_at = NOW(), completed_at = NOW()
      FROM inserted, active_request
      WHERE request.id = active_request.id
      RETURNING inserted.id
    )
    SELECT id FROM completed
  `
  const id = rows[0]?.id
  return id == null ? null : Number(id)
}
