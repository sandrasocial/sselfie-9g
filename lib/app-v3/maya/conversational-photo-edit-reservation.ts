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

export async function markConversationalEditReservationCharged(input: {
  userId: string
  requestId: string
}): Promise<boolean> {
  const rows = await sql`
    UPDATE app_v3_maya_edit_requests
    SET status = 'charged', credit_state = 'charged', updated_at = NOW()
    WHERE user_id = ${input.userId}
      AND request_id = ${input.requestId}
      AND status = 'reserved'
      AND credit_state = 'not_charged'
    RETURNING id
  `
  return rows.length === 1
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
