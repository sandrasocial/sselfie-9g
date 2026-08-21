import "server-only"

import { randomUUID } from "node:crypto"
import { sql } from "@/lib/db/client"
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_SCOPES,
  type BusinessEventInput,
  type DesiredProvisioningInput,
  type ExternalAccountStatus,
  type IntegrationOperation,
  type IntegrationOutboxInput,
  type IntegrationProvider,
  type IntegrationResourceType,
  type IntegrationScope,
  assertBusinessEventInput,
  assertDesiredProvisioningInput,
  assertIntegrationOutboxInput,
  sanitizeIntegrationError,
} from "./contracts"

type QueryRow = Record<string, unknown>

export interface RecordControlPlaneIntentInput {
  event: BusinessEventInput
  desiredState?: DesiredProvisioningInput
  outbox?: IntegrationOutboxInput
}

export interface RecordControlPlaneIntentResult {
  eventId: string
  eventInserted: boolean
  stateId?: string
  desiredRevision?: number
  outboxId?: string
  outboxInserted?: boolean
}

function firstRow(rows: unknown): QueryRow | undefined {
  return Array.isArray(rows) ? (rows[0] as QueryRow | undefined) : undefined
}

function requiredString(row: QueryRow | undefined, key: string, message: string): string {
  const value = row?.[key]
  if (typeof value !== "string" || !value) throw new Error(message)
  return value
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : Number(value)
}

function assertTypedProviderReference(value: string | null | undefined): void {
  if (value === null || value === undefined) return
  if (!/^[A-Za-z0-9_.:-]{1,256}$/.test(value)) {
    throw new Error("Provider reference must be an opaque typed identifier")
  }
  const resemblesSensitiveValue =
    /^(?:https?|ftp):/i.test(value) ||
    /^www\./i.test(value) ||
    /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?::\d+)?$/.test(value) ||
    /(?:^|[_.:-])(?:email|e-mail|password|passwd|credential|secret|token|authorization|bearer|api[_-]?key)(?:[_.:-]|$)/i.test(
      value
    ) ||
    /^(?:sk|pk|rk)_(?:live|test)_/i.test(value) ||
    /^(?:ghp_|github_pat_|xox[baprs]-|AKIA)/i.test(value) ||
    /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
  if (resemblesSensitiveValue) {
    throw new Error(
      "Provider reference must not resemble a URL, email, credential, secret, or token"
    )
  }
}

function assertExactIntegrationProvider(value: unknown): asserts value is IntegrationProvider {
  if (!INTEGRATION_PROVIDERS.includes(value as IntegrationProvider)) {
    throw new Error("An exact integration provider is required")
  }
}

export type IntegrationCompletionResult =
  // An async provider acknowledgement is not proof that the resource exists.
  // It deliberately remains observed=pending until a later drift/reconciliation read confirms it.
  { kind: "accepted_pending" } | { kind: "confirmed_converged" }

function resolveCompletionKind(result: unknown): IntegrationCompletionResult["kind"] {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Integration completion requires an explicit observed result")
  }
  const record = result as Record<string, unknown>
  if (record.kind === "accepted_pending" && Object.keys(record).length === 1) {
    return "accepted_pending"
  }
  if (record.kind === "confirmed_converged" && Object.keys(record).length === 1) {
    return "confirmed_converged"
  }
  throw new Error("Integration completion requires an explicit observed result")
}

function assertProvisioningQualification(
  event: BusinessEventInput,
  desiredState: DesiredProvisioningInput | undefined,
  outbox: IntegrationOutboxInput | undefined
): void {
  if (!desiredState && !outbox) return
  if (!desiredState) throw new Error("Provisioning outbox work requires an exact desired state")
  if (
    event.eventType !== "product_purchased" &&
    event.eventType !== "membership_started" &&
    event.eventType !== "membership_ended"
  ) {
    throw new Error("This business event is not authoritative for provisioning")
  }
  if (event.sourceProvider !== "sselfie" && event.sourceProvider !== "stripe") {
    throw new Error("This event source is not authoritative for provisioning")
  }
  const expectedDesiredState = event.eventType === "membership_ended" ? "absent" : "present"
  if (desiredState.desiredState !== expectedDesiredState) {
    throw new Error(`Invalid provisioning direction for ${event.eventType}`)
  }
  if (outbox) {
    const validOperation =
      outbox.operation === "synchronize" ||
      (expectedDesiredState === "present" && outbox.operation === "provision") ||
      (expectedDesiredState === "absent" && outbox.operation === "deprovision")
    if (!validOperation) throw new Error("Outbox operation does not match provisioning direction")
  }
}

/**
 * Records the provider-neutral fact and any requested projection work in one database transaction.
 * This module intentionally does not perform the external operation.
 */
export async function recordControlPlaneIntent(
  input: RecordControlPlaneIntentInput
): Promise<RecordControlPlaneIntentResult> {
  const event = assertBusinessEventInput(input.event)
  if (input.desiredState) assertDesiredProvisioningInput(input.desiredState)
  if (input.outbox) assertIntegrationOutboxInput(input.outbox)
  assertProvisioningQualification(event, input.desiredState, input.outbox)
  if (input.outbox && input.desiredState) {
    if (
      input.outbox.provider !== input.desiredState.provider ||
      input.outbox.scopeKey !== input.desiredState.scopeKey
    ) {
      throw new Error("Outbox destination must match desired-state provider and scope")
    }
  }
  if (input.desiredState && (!event.userId || event.userId !== input.desiredState.userId)) {
    throw new Error("Business event user must exactly match desired-state user")
  }

  const desired = input.desiredState
  const outbox = input.outbox
  const attributes = JSON.stringify(event.attributes)
  const candidateEventId = randomUUID()

  if (!desired && !outbox) {
    const transactionRows = (await sql.transaction(tx => [
      tx`
        INSERT INTO business_events (
          id, event_type, schema_version, aggregate_type, aggregate_id,
          subject_type, subject_id, user_id, source_provider, source_event_id,
          idempotency_key, occurred_at, attributes
        ) VALUES (
          ${candidateEventId}::uuid, ${event.eventType}, ${event.schemaVersion},
          ${event.aggregateType}, ${event.aggregateId}, ${event.subjectType}, ${event.subjectId},
          ${event.userId ?? null}, ${event.sourceProvider ?? null}, ${event.sourceEventId ?? null},
          ${event.idempotencyKey}, ${event.occurredAt.toISOString()}, ${attributes}::jsonb
        )
        ON CONFLICT (idempotency_key) DO UPDATE
        SET idempotency_key = EXCLUDED.idempotency_key
        WHERE business_events.event_type = EXCLUDED.event_type
          AND business_events.schema_version = EXCLUDED.schema_version
          AND business_events.aggregate_type = EXCLUDED.aggregate_type
          AND business_events.aggregate_id = EXCLUDED.aggregate_id
          AND business_events.subject_type = EXCLUDED.subject_type
          AND business_events.subject_id = EXCLUDED.subject_id
          AND business_events.user_id IS NOT DISTINCT FROM EXCLUDED.user_id
          AND business_events.source_provider IS NOT DISTINCT FROM EXCLUDED.source_provider
          AND business_events.source_event_id IS NOT DISTINCT FROM EXCLUDED.source_event_id
          AND business_events.occurred_at = EXCLUDED.occurred_at
          AND business_events.attributes = EXCLUDED.attributes
        RETURNING id AS event_id, id = ${candidateEventId}::uuid AS event_inserted
      `,
    ])) as unknown[]
    const row = firstRow(transactionRows[0])
    return {
      eventId: requiredString(row, "event_id", "Business event idempotency conflict"),
      eventInserted: row?.event_inserted === true,
    }
  }

  if (!desired || !outbox)
    throw new Error("Provisioning requires desired state and outbox together")
  const candidateStateId = randomUUID()
  const candidateOutboxId = randomUUID()
  const maxAttempts = outbox.maxAttempts ?? 5
  const resourceLockKey = [
    "integration-resource",
    desired.userId,
    desired.provider,
    desired.scopeKey,
    desired.resourceType,
    desired.resourceId,
  ].join(":")
  const transactionRows = (await sql.transaction(tx => [
    tx`SELECT pg_advisory_xact_lock(hashtextextended(${resourceLockKey}, 0))`,
    tx`
      WITH prior_event AS (
        SELECT id
        FROM business_events
        WHERE idempotency_key = ${event.idempotencyKey}
          AND event_type = ${event.eventType}
          AND schema_version = ${event.schemaVersion}
          AND aggregate_type = ${event.aggregateType}
          AND aggregate_id = ${event.aggregateId}
          AND subject_type = ${event.subjectType}
          AND subject_id = ${event.subjectId}
          AND user_id IS NOT DISTINCT FROM ${event.userId ?? null}::text
          AND source_provider IS NOT DISTINCT FROM ${event.sourceProvider ?? null}::text
          AND source_event_id IS NOT DISTINCT FROM ${event.sourceEventId ?? null}::text
          AND occurred_at = ${event.occurredAt.toISOString()}::timestamptz
          AND attributes = ${attributes}::jsonb
      ), event_upsert AS (
        INSERT INTO business_events (
          id, event_type, schema_version, aggregate_type, aggregate_id,
          subject_type, subject_id, user_id, source_provider, source_event_id,
          idempotency_key, occurred_at, attributes
        )
        SELECT
          ${candidateEventId}::uuid, ${event.eventType}, ${event.schemaVersion},
          ${event.aggregateType}, ${event.aggregateId}, ${event.subjectType}, ${event.subjectId},
          ${event.userId ?? null}, ${event.sourceProvider ?? null}, ${event.sourceEventId ?? null},
          ${event.idempotencyKey}, ${event.occurredAt.toISOString()}, ${attributes}::jsonb
        WHERE NOT EXISTS (
          SELECT 1 FROM integration_outbox conflict
          WHERE conflict.provider = ${outbox.provider}
            AND conflict.idempotency_key = ${outbox.idempotencyKey}
            AND conflict.business_event_id IS DISTINCT FROM (SELECT id FROM prior_event)
        )
        ON CONFLICT (idempotency_key) DO UPDATE
        SET idempotency_key = EXCLUDED.idempotency_key
        WHERE business_events.event_type = EXCLUDED.event_type
          AND business_events.schema_version = EXCLUDED.schema_version
          AND business_events.aggregate_type = EXCLUDED.aggregate_type
          AND business_events.aggregate_id = EXCLUDED.aggregate_id
          AND business_events.subject_type = EXCLUDED.subject_type
          AND business_events.subject_id = EXCLUDED.subject_id
          AND business_events.user_id IS NOT DISTINCT FROM EXCLUDED.user_id
          AND business_events.source_provider IS NOT DISTINCT FROM EXCLUDED.source_provider
          AND business_events.source_event_id IS NOT DISTINCT FROM EXCLUDED.source_event_id
          AND business_events.occurred_at = EXCLUDED.occurred_at
          AND business_events.attributes = EXCLUDED.attributes
        RETURNING id AS event_id, id = ${candidateEventId}::uuid AS event_inserted
      ), existing_state AS (
        SELECT s.id, s.desired_revision, s.desired_state
        FROM external_provisioning_states s
        WHERE s.user_id = ${desired.userId}
          AND s.provider = ${desired.provider}
          AND s.scope_key = ${desired.scopeKey}
          AND s.resource_type = ${desired.resourceType}
          AND s.resource_id = ${desired.resourceId}
        FOR UPDATE OF s
      ), state_snapshot AS (
        SELECT
          COALESCE(s.id, ${candidateStateId}::uuid) AS state_id,
          CASE
            WHEN s.id IS NULL THEN 1
            WHEN s.desired_state IS DISTINCT FROM ${desired.desiredState} THEN s.desired_revision + 1
            ELSE s.desired_revision
          END AS desired_revision
        FROM (SELECT 1) seed
        LEFT JOIN existing_state s ON TRUE
      ), outbox_upsert AS (
        INSERT INTO integration_outbox (
          id, business_event_id, provisioning_state_id, provider, scope_key,
          resource_type, resource_id, captured_user_id, operation,
          business_key, destination_key, idempotency_key, captured_desired_revision,
          captured_desired_state, max_attempts
        )
        SELECT
          ${candidateOutboxId}::uuid, e.event_id, s.state_id, ${outbox.provider},
          ${outbox.scopeKey}, ${desired.resourceType}, ${desired.resourceId}, ${desired.userId},
          ${outbox.operation}, ${outbox.businessKey}, ${outbox.destinationKey},
          ${outbox.idempotencyKey}, s.desired_revision, ${desired.desiredState}, ${maxAttempts}
        FROM event_upsert e CROSS JOIN state_snapshot s
        ON CONFLICT (provider, idempotency_key) DO UPDATE
        SET idempotency_key = EXCLUDED.idempotency_key
        WHERE integration_outbox.business_event_id = EXCLUDED.business_event_id
          AND integration_outbox.provider = EXCLUDED.provider
          AND integration_outbox.scope_key = EXCLUDED.scope_key
          AND integration_outbox.resource_type = EXCLUDED.resource_type
          AND integration_outbox.resource_id = EXCLUDED.resource_id
          AND integration_outbox.captured_user_id = EXCLUDED.captured_user_id
          AND integration_outbox.operation = EXCLUDED.operation
          AND integration_outbox.business_key = EXCLUDED.business_key
          AND integration_outbox.destination_key = EXCLUDED.destination_key
          AND integration_outbox.captured_desired_state = EXCLUDED.captured_desired_state
          AND integration_outbox.max_attempts = EXCLUDED.max_attempts
        RETURNING
          id AS outbox_id,
          id = ${candidateOutboxId}::uuid AS outbox_inserted,
          provisioning_state_id AS state_id,
          captured_desired_revision AS desired_revision
      ), state_upsert AS (
        INSERT INTO external_provisioning_states (
          id, user_id, provider, scope_key, resource_type, resource_id,
          desired_state, observed_state, desired_revision,
          source_business_event_id, source_provider, source_event_id
        )
        SELECT
          o.state_id, ${desired.userId}, ${desired.provider}, ${desired.scopeKey},
          ${desired.resourceType}, ${desired.resourceId}, ${desired.desiredState}, 'unknown', 1,
          e.event_id, ${event.sourceProvider ?? null}, ${event.sourceEventId ?? null}
        FROM event_upsert e CROSS JOIN outbox_upsert o
        WHERE o.outbox_inserted
        ON CONFLICT (user_id, provider, scope_key, resource_type, resource_id)
        DO UPDATE SET
          desired_state = EXCLUDED.desired_state,
          desired_revision = CASE
            WHEN external_provisioning_states.desired_state IS DISTINCT FROM EXCLUDED.desired_state
              THEN external_provisioning_states.desired_revision + 1
            ELSE external_provisioning_states.desired_revision
          END,
          source_business_event_id = EXCLUDED.source_business_event_id,
          source_provider = EXCLUDED.source_provider,
          source_event_id = EXCLUDED.source_event_id,
          updated_at = NOW()
        RETURNING id AS state_id, desired_revision
      ), state_result AS (
        SELECT state_id, desired_revision FROM state_upsert
        UNION ALL
        SELECT state_id, desired_revision FROM outbox_upsert WHERE NOT outbox_inserted
      )
      SELECT
        e.event_id, e.event_inserted, s.state_id, s.desired_revision,
        o.outbox_id, o.outbox_inserted
      FROM event_upsert e CROSS JOIN state_result s CROSS JOIN outbox_upsert o
    `,
  ])) as unknown[]

  const row = firstRow(transactionRows[transactionRows.length - 1])
  if (!row) throw new Error("Control-plane event or intent idempotency conflict")
  return {
    eventId: requiredString(row, "event_id", "Missing business event id"),
    eventInserted: row.event_inserted === true,
    stateId: requiredString(row, "state_id", "Missing provisioning state id"),
    desiredRevision: numberValue(row.desired_revision),
    outboxId: requiredString(row, "outbox_id", "Missing outbox id"),
    outboxInserted: row.outbox_inserted === true,
  }
}

export async function upsertExternalAccount(input: {
  userId: string
  provider: IntegrationProvider
  scopeKey: IntegrationScope
  externalAccountId: string
  status: ExternalAccountStatus
}): Promise<{ accountId: string }> {
  if (
    !/^[A-Za-z0-9_.:-]{1,256}$/.test(input.userId) ||
    !/^[A-Za-z0-9_.:-]{1,256}$/.test(input.externalAccountId)
  )
    throw new Error("External account identifiers are required")
  if (
    !INTEGRATION_PROVIDERS.includes(input.provider) ||
    !INTEGRATION_SCOPES.includes(input.scopeKey)
  ) {
    throw new Error("Unknown external account provider or scope")
  }
  if (!(["pending", "active", "disabled", "failed", "blocked"] as const).includes(input.status)) {
    throw new Error("Unknown external account status")
  }
  const rows = (await sql`
    INSERT INTO external_accounts (user_id, provider, scope_key, external_account_id, status)
    VALUES (${input.userId}, ${input.provider}, ${input.scopeKey}, ${input.externalAccountId}, ${input.status})
    ON CONFLICT (user_id, provider, scope_key)
    DO UPDATE SET
      external_account_id = EXCLUDED.external_account_id,
      status = EXCLUDED.status,
      updated_at = NOW()
    WHERE external_accounts.external_account_id = EXCLUDED.external_account_id
    RETURNING id AS account_id
  `) as QueryRow[]
  return {
    accountId: requiredString(firstRow(rows), "account_id", "External account upsert failed"),
  }
}

export interface ClaimedIntegrationWork {
  id: string
  provider: IntegrationProvider
  scopeKey: IntegrationScope
  operation: IntegrationOperation
  resourceType: IntegrationResourceType
  resourceId: string
  capturedUserId: string
  capturedDesiredState: "present" | "absent" | null
  idempotencyKey: string
  claimToken: string
  capturedDesiredRevision: number | null
  attempts: number
  maxAttempts: number
  leaseExpiresAt: string
}

export async function claimIntegrationWork(input: {
  provider: IntegrationProvider
  limit?: number
  leaseSeconds?: number
  now?: Date
}): Promise<ClaimedIntegrationWork[]> {
  assertExactIntegrationProvider(input.provider)
  const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 25)))
  const leaseSeconds = Math.min(3600, Math.max(30, Math.trunc(input.leaseSeconds ?? 300)))
  const now = input.now ?? new Date()
  const rows = (await sql`
    WITH exhausted AS (
      UPDATE integration_outbox
      SET status = 'dead_letter', claim_token = NULL, lease_expires_at = NULL,
          completed_at = NOW(), updated_at = NOW()
      WHERE integration_outbox.provider = ${input.provider}
        AND (
          status IN ('pending', 'retry')
          OR (status = 'claimed' AND lease_expires_at <= ${now.toISOString()})
        )
        AND attempts >= max_attempts
      RETURNING id
    ), eligible AS (
      SELECT
        o.id,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(o.provisioning_state_id::text, o.id::text)
          ORDER BY CASE WHEN o.status = 'claimed' THEN 0 ELSE 1 END,
                   o.available_at, o.created_at, o.id
        ) AS resource_order
      FROM integration_outbox o
      WHERE o.provider = ${input.provider}
        AND (
          (o.status IN ('pending', 'retry') AND o.available_at <= ${now.toISOString()})
          OR (o.status = 'claimed' AND o.lease_expires_at <= ${now.toISOString()})
        )
        AND o.attempts < o.max_attempts
        AND NOT EXISTS (SELECT 1 FROM exhausted WHERE exhausted.id = o.id)
        AND NOT EXISTS (
          SELECT 1 FROM integration_outbox active
          WHERE active.provisioning_state_id = o.provisioning_state_id
            AND active.id <> o.id
            AND active.status = 'claimed'
            AND active.lease_expires_at > ${now.toISOString()}
        )
    ), candidates AS (
      SELECT
        o.id,
        o.status AS prior_status,
        o.available_at AS prior_available_at,
        o.attempts AS prior_attempts,
        o.max_attempts AS prior_max_attempts,
        o.claim_token AS prior_claim_token,
        o.lease_expires_at AS prior_lease_expires_at,
        o.provisioning_state_id
      FROM integration_outbox o
      JOIN eligible e ON e.id = o.id AND e.resource_order = 1
      ORDER BY o.available_at, o.created_at, o.id
      LIMIT ${limit}
      FOR UPDATE OF o SKIP LOCKED
    ), stale AS (
      UPDATE integration_outbox o
      SET status = 'cancelled', claim_token = NULL, lease_expires_at = NULL, updated_at = NOW()
      FROM candidates c, external_provisioning_states s
      WHERE o.id = c.id
        AND s.id = o.provisioning_state_id
        AND o.captured_desired_revision IS DISTINCT FROM s.desired_revision
      RETURNING o.id
    )
    UPDATE integration_outbox o
    SET
      status = 'claimed',
      attempts = o.attempts + 1,
      claim_token = gen_random_uuid(),
      lease_expires_at = ${now.toISOString()}::timestamptz + (${leaseSeconds} * INTERVAL '1 second'),
      updated_at = NOW()
    FROM candidates c
    WHERE o.id = c.id
      AND o.provider = ${input.provider}
      AND NOT EXISTS (SELECT 1 FROM stale WHERE stale.id = o.id)
      AND o.status = c.prior_status
      AND o.available_at = c.prior_available_at
      AND o.attempts = c.prior_attempts
      AND o.max_attempts = c.prior_max_attempts
      AND o.claim_token IS NOT DISTINCT FROM c.prior_claim_token
      AND o.lease_expires_at IS NOT DISTINCT FROM c.prior_lease_expires_at
      AND (
        (o.status IN ('pending', 'retry') AND o.available_at <= ${now.toISOString()})
        OR (o.status = 'claimed' AND o.lease_expires_at <= ${now.toISOString()})
      )
      AND o.attempts < o.max_attempts
      AND NOT EXISTS (
        SELECT 1 FROM integration_outbox active
        WHERE active.provisioning_state_id = c.provisioning_state_id
          AND active.id <> o.id
          AND active.status = 'claimed'
          AND active.lease_expires_at > ${now.toISOString()}
      )
    RETURNING
      o.id, o.provider, o.scope_key, o.operation, o.claim_token,
      o.resource_type, o.resource_id, o.captured_user_id, o.captured_desired_state,
      o.idempotency_key, o.captured_desired_revision, o.attempts, o.max_attempts,
      o.lease_expires_at
  `) as QueryRow[]
  return rows.map(row => ({
    id: String(row.id),
    provider: row.provider as IntegrationProvider,
    scopeKey: String(row.scope_key) as IntegrationScope,
    operation: row.operation as IntegrationOperation,
    resourceType: row.resource_type as IntegrationResourceType,
    resourceId: String(row.resource_id),
    capturedUserId: String(row.captured_user_id),
    capturedDesiredState:
      row.captured_desired_state === null
        ? null
        : (row.captured_desired_state as "present" | "absent"),
    idempotencyKey: String(row.idempotency_key),
    claimToken: String(row.claim_token),
    capturedDesiredRevision:
      row.captured_desired_revision === null ? null : numberValue(row.captured_desired_revision),
    attempts: numberValue(row.attempts),
    maxAttempts: numberValue(row.max_attempts),
    leaseExpiresAt: new Date(String(row.lease_expires_at)).toISOString(),
  }))
}

export async function completeIntegrationWork(input: {
  provider: IntegrationProvider
  outboxId: string
  claimToken: string
  result: IntegrationCompletionResult
  providerReference?: string | null
}): Promise<{ status: "succeeded" | "cancelled" }> {
  assertExactIntegrationProvider(input.provider)
  const completionKind = resolveCompletionKind(input.result)
  assertTypedProviderReference(input.providerReference)
  const rows = (await sql`
    WITH locked_outbox AS (
      SELECT o.id, o.provisioning_state_id, o.captured_desired_revision,
             o.captured_desired_state
      FROM integration_outbox o
      WHERE o.id = ${input.outboxId}::uuid
        AND o.provider = ${input.provider}
        AND o.claim_token = ${input.claimToken}::uuid
        AND o.status = 'claimed'
      FOR UPDATE OF o
    ), locked_state AS (
      SELECT s.id, s.desired_revision
      FROM external_provisioning_states s
      JOIN locked_outbox o ON o.provisioning_state_id = s.id
      FOR UPDATE OF s
    ), locked AS (
      SELECT o.id, o.provisioning_state_id, o.captured_desired_revision,
             o.captured_desired_state, s.desired_revision
      FROM locked_outbox o
      LEFT JOIN locked_state s ON s.id = o.provisioning_state_id
    ), finished AS (
      UPDATE integration_outbox o
      SET
        status = CASE
          WHEN locked.provisioning_state_id IS NOT NULL
            AND locked.captured_desired_revision IS DISTINCT FROM locked.desired_revision
          THEN 'cancelled'
          ELSE 'succeeded'
        END,
        provider_reference = CASE
          WHEN locked.provisioning_state_id IS NULL
            OR locked.captured_desired_revision = locked.desired_revision
          THEN ${input.providerReference ?? null}
          ELSE o.provider_reference
        END,
        claim_token = NULL,
        lease_expires_at = NULL,
        completed_at = NOW(),
        updated_at = NOW()
      FROM locked
      WHERE o.id = locked.id
        AND o.provider = ${input.provider}
        AND o.status = 'claimed'
        AND o.claim_token = ${input.claimToken}::uuid
      RETURNING o.id, o.status, locked.provisioning_state_id,
                locked.captured_desired_revision, locked.captured_desired_state,
                locked.desired_revision
    ), observed AS (
      UPDATE external_provisioning_states s
      SET observed_state = CASE
            WHEN ${completionKind} = 'accepted_pending' THEN 'pending'
            ELSE finished.captured_desired_state
          END,
          observed_at = NOW(), last_error_code = NULL, last_error_message = NULL, updated_at = NOW()
      FROM finished
      WHERE s.id = finished.provisioning_state_id
        AND finished.status = 'succeeded'
        AND s.desired_revision = finished.captured_desired_revision
      RETURNING s.id
    )
    SELECT id, status FROM finished
  `) as QueryRow[]
  const row = firstRow(rows)
  if (!row) throw new Error("Integration claim is missing, expired, or has a different token")
  return { status: row.status as "succeeded" | "cancelled" }
}

export async function failIntegrationWork(input: {
  provider: IntegrationProvider
  outboxId: string
  claimToken: string
  error: unknown
  now?: Date
  baseBackoffSeconds?: number
  maximumBackoffSeconds?: number
}): Promise<{ status: "retry" | "dead_letter" | "cancelled" }> {
  assertExactIntegrationProvider(input.provider)
  const safeError = sanitizeIntegrationError(input.error)
  const now = input.now ?? new Date()
  const base = Math.min(3600, Math.max(5, Math.trunc(input.baseBackoffSeconds ?? 30)))
  const maximum = Math.min(86400, Math.max(base, Math.trunc(input.maximumBackoffSeconds ?? 3600)))
  const rows = (await sql`
    WITH locked_outbox AS (
      SELECT o.id, o.attempts, o.max_attempts, o.provisioning_state_id,
             o.captured_desired_revision
      FROM integration_outbox o
      WHERE o.id = ${input.outboxId}::uuid
        AND o.provider = ${input.provider}
        AND o.claim_token = ${input.claimToken}::uuid
        AND o.status = 'claimed'
      FOR UPDATE OF o
    ), locked_state AS (
      SELECT s.id, s.desired_revision
      FROM external_provisioning_states s
      JOIN locked_outbox o ON o.provisioning_state_id = s.id
      FOR UPDATE OF s
    ), locked AS (
      SELECT o.id, o.attempts, o.max_attempts, o.provisioning_state_id,
             o.captured_desired_revision, s.desired_revision
      FROM locked_outbox o
      LEFT JOIN locked_state s ON s.id = o.provisioning_state_id
    ), failed AS (
      UPDATE integration_outbox o
      SET
        status = CASE
          WHEN locked.provisioning_state_id IS NOT NULL
            AND locked.captured_desired_revision IS DISTINCT FROM locked.desired_revision
          THEN 'cancelled'
          WHEN locked.attempts >= locked.max_attempts THEN 'dead_letter'
          ELSE 'retry'
        END,
        available_at = CASE
          WHEN locked.attempts < locked.max_attempts
          THEN ${now.toISOString()}::timestamptz
            + LEAST(${maximum}, ${base} * POWER(2, GREATEST(locked.attempts - 1, 0))) * INTERVAL '1 second'
          ELSE o.available_at
        END,
        claim_token = NULL,
        lease_expires_at = NULL,
        last_error_code = ${safeError.code},
        last_error_message = ${safeError.message},
        completed_at = CASE WHEN locked.attempts >= locked.max_attempts THEN NOW() ELSE NULL END,
        updated_at = NOW()
      FROM locked
      WHERE o.id = locked.id
        AND o.provider = ${input.provider}
        AND o.status = 'claimed'
        AND o.claim_token = ${input.claimToken}::uuid
      RETURNING o.id, o.status, o.provisioning_state_id, o.captured_desired_revision
    ), observed AS (
      UPDATE external_provisioning_states s
      SET observed_state = 'failed', last_error_code = ${safeError.code},
          last_error_message = ${safeError.message}, observed_at = NOW(), updated_at = NOW()
      FROM failed
      WHERE s.id = failed.provisioning_state_id
        AND failed.status <> 'cancelled'
        AND s.desired_revision = failed.captured_desired_revision
      RETURNING s.id
    )
    SELECT id, status FROM failed
  `) as QueryRow[]
  const row = firstRow(rows)
  if (!row) throw new Error("Integration claim is missing, expired, or has a different token")
  return { status: row.status as "retry" | "dead_letter" | "cancelled" }
}

export type { IntegrationProvider, IntegrationResourceType, IntegrationScope }
