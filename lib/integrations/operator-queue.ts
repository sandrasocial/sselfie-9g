import "server-only"

import { sql } from "@/lib/db/client"
import type {
  DesiredProvisioningState,
  IntegrationOperation,
  IntegrationOutboxStatus,
  IntegrationProvider,
  IntegrationScope,
  ObservedProvisioningState,
} from "./contracts"

export interface IntegrationOperatorQueueItem {
  id: string
  userId: string | null
  status: Extract<IntegrationOutboxStatus, "pending" | "claimed" | "retry">
  provider: IntegrationProvider
  scopeKey: IntegrationScope
  operation: IntegrationOperation
  businessKey: string
  destinationKey: string
  attempts: number
  maxAttempts: number
  availableAt: string
  leaseExpiresAt: string | null
  capturedDesiredRevision: number | null
  desiredRevision: number | null
  desiredState: DesiredProvisioningState | null
  observedState: ObservedProvisioningState | null
  errorCode: string | null
  errorSummary: string | null
  createdAt: string
  updatedAt: string
}

export interface IntegrationDeadLetterItem {
  id: string
  userId: string | null
  provider: IntegrationProvider
  scopeKey: IntegrationScope
  operation: IntegrationOperation
  businessKey: string
  destinationKey: string
  attempts: number
  maxAttempts: number
  capturedDesiredRevision: number | null
  desiredRevision: number | null
  desiredState: DesiredProvisioningState | null
  observedState: ObservedProvisioningState | null
  errorCode: string | null
  errorSummary: string | null
  createdAt: string
  updatedAt: string
}

type Row = Record<string, unknown>

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function integerOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function getIntegrationOperatorQueue(
  limit = 100
): Promise<IntegrationOperatorQueueItem[]> {
  const boundedLimit = Math.min(500, Math.max(1, Math.trunc(limit)))
  const rows = (await sql`
    SELECT
      id, user_id, status, provider, scope_key, operation, business_key, destination_key,
      attempts, max_attempts, available_at, lease_expires_at,
      captured_desired_revision, desired_revision, desired_state, observed_state,
      last_error_code, last_error_message, created_at, updated_at
    FROM integration_operator_queue_v
    ORDER BY available_at, created_at, id
    LIMIT ${boundedLimit}
  `) as Row[]
  return rows.map(row => ({
    id: String(row.id),
    userId: textOrNull(row.user_id),
    status: row.status as IntegrationOperatorQueueItem["status"],
    provider: row.provider as IntegrationProvider,
    scopeKey: row.scope_key as IntegrationScope,
    operation: row.operation as IntegrationOperation,
    businessKey: String(row.business_key),
    destinationKey: String(row.destination_key),
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    availableAt: String(row.available_at),
    leaseExpiresAt: textOrNull(row.lease_expires_at),
    capturedDesiredRevision: integerOrNull(row.captured_desired_revision),
    desiredRevision: integerOrNull(row.desired_revision),
    desiredState: row.desired_state as DesiredProvisioningState | null,
    observedState: row.observed_state as ObservedProvisioningState | null,
    errorCode: textOrNull(row.last_error_code),
    errorSummary: textOrNull(row.last_error_message),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }))
}

export async function getIntegrationDeadLetters(limit = 100): Promise<IntegrationDeadLetterItem[]> {
  const boundedLimit = Math.min(500, Math.max(1, Math.trunc(limit)))
  const rows = (await sql`
    SELECT
      id, user_id, provider, scope_key, operation, business_key, destination_key,
      attempts, max_attempts, captured_desired_revision, desired_revision,
      desired_state, observed_state, last_error_code, last_error_message, created_at, updated_at
    FROM integration_dead_letters_v
    ORDER BY updated_at DESC, id
    LIMIT ${boundedLimit}
  `) as Row[]
  return rows.map(row => ({
    id: String(row.id),
    userId: textOrNull(row.user_id),
    provider: row.provider as IntegrationProvider,
    scopeKey: row.scope_key as IntegrationScope,
    operation: row.operation as IntegrationOperation,
    businessKey: String(row.business_key),
    destinationKey: String(row.destination_key),
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    capturedDesiredRevision: integerOrNull(row.captured_desired_revision),
    desiredRevision: integerOrNull(row.desired_revision),
    desiredState: row.desired_state as DesiredProvisioningState | null,
    observedState: row.observed_state as ObservedProvisioningState | null,
    errorCode: textOrNull(row.last_error_code),
    errorSummary: textOrNull(row.last_error_message),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }))
}
