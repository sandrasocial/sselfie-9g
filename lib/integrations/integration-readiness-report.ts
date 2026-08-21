import "server-only"

import { sql } from "@/lib/db/client"
import {
  INTEGRATION_PROVIDERS,
  type DesiredProvisioningState,
  type IntegrationOutboxStatus,
  type IntegrationProvider,
  type IntegrationResourceType,
  type IntegrationScope,
  type ObservedProvisioningState,
} from "./contracts"

export const INTEGRATION_READINESS_STATES = [
  "no_evidence",
  "awaiting_provider_confirmation",
  "delivery_in_progress",
  "delivery_failed",
  "missing_current_work",
  "ambiguous_current_work",
  "reconciled",
] as const

export type IntegrationReadinessState = (typeof INTEGRATION_READINESS_STATES)[number]

export interface IntegrationReadinessRow {
  state: Exclude<IntegrationReadinessState, "no_evidence">
  stateId: string
  userId: string
  provider: IntegrationProvider
  scopeKey: IntegrationScope
  resourceType: IntegrationResourceType
  resourceId: string
  desiredState: DesiredProvisioningState
  observedState: ObservedProvisioningState
  desiredRevision: number
  observedAt: string | null
  stateCreatedAt: string
  stateUpdatedAt: string
  currentWorkCount: number
  currentOutboxIds: string[]
  latestOutboxId: string | null
  latestOutboxStatus: IntegrationOutboxStatus | null
  latestAvailableAt: string | null
  latestCreatedAt: string | null
  latestUpdatedAt: string | null
  latestCompletedAt: string | null
}

export interface IntegrationReadinessReport {
  version: 1
  status: "ok" | "failure"
  state: "no_evidence" | "attention_required" | "reconciled" | "unavailable"
  provider: IntegrationProvider
  observedAt: string
  adapterEnablementAllowed: false
  error?: "database_unavailable"
  rows: IntegrationReadinessRow[]
  summary: Record<IntegrationReadinessState, number>
}

type Row = Record<string, unknown>

function assertExactProvider(value: unknown): asserts value is IntegrationProvider {
  if (!INTEGRATION_PROVIDERS.includes(value as IntegrationProvider)) {
    throw new Error("An exact integration provider is required")
  }
}

function emptySummary(): Record<IntegrationReadinessState, number> {
  return {
    no_evidence: 0,
    awaiting_provider_confirmation: 0,
    delivery_in_progress: 0,
    delivery_failed: 0,
    missing_current_work: 0,
    ambiguous_current_work: 0,
    reconciled: 0,
  }
}

function nullableTimestamp(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  const date = new Date(String(value))
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function timestamp(value: unknown): string {
  return nullableTimestamp(value) ?? new Date(0).toISOString()
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item)).sort()
}

function classify(row: Row): IntegrationReadinessRow["state"] {
  const desiredState = String(row.desired_state)
  const observedState = String(row.observed_state)
  const currentWorkCount = Number(row.current_work_count ?? 0)
  const latestStatus = row.latest_outbox_status

  if (currentWorkCount > 1) return "ambiguous_current_work"
  if (desiredState === observedState) return "reconciled"
  if (observedState === "failed" || observedState === "blocked" || latestStatus === "dead_letter") {
    return "delivery_failed"
  }
  if (latestStatus === "pending" || latestStatus === "claimed" || latestStatus === "retry") {
    return "delivery_in_progress"
  }
  if (latestStatus === "succeeded" && observedState === "pending") {
    return "awaiting_provider_confirmation"
  }
  return "missing_current_work"
}

function mapRow(row: Row): IntegrationReadinessRow {
  return {
    state: classify(row),
    stateId: String(row.state_id),
    userId: String(row.user_id),
    provider: row.provider as IntegrationProvider,
    scopeKey: row.scope_key as IntegrationScope,
    resourceType: row.resource_type as IntegrationResourceType,
    resourceId: String(row.resource_id),
    desiredState: row.desired_state as DesiredProvisioningState,
    observedState: row.observed_state as ObservedProvisioningState,
    desiredRevision: Number(row.desired_revision),
    observedAt: nullableTimestamp(row.observed_at),
    stateCreatedAt: timestamp(row.state_created_at),
    stateUpdatedAt: timestamp(row.state_updated_at),
    currentWorkCount: Number(row.current_work_count ?? 0),
    currentOutboxIds: stringArray(row.current_outbox_ids),
    latestOutboxId: row.latest_outbox_id ? String(row.latest_outbox_id) : null,
    latestOutboxStatus: (row.latest_outbox_status as IntegrationOutboxStatus | null) ?? null,
    latestAvailableAt: nullableTimestamp(row.latest_available_at),
    latestCreatedAt: nullableTimestamp(row.latest_created_at),
    latestUpdatedAt: nullableTimestamp(row.latest_updated_at),
    latestCompletedAt: nullableTimestamp(row.latest_completed_at),
  }
}

export async function getIntegrationReadinessReport(
  provider: IntegrationProvider,
  now = new Date()
): Promise<IntegrationReadinessReport> {
  assertExactProvider(provider)
  const observedAt = Number.isFinite(now.getTime()) ? now.toISOString() : new Date(0).toISOString()
  const summary = emptySummary()

  try {
    const sourceRows = (await sql`
      WITH scoped_states AS MATERIALIZED (
        SELECT
          s.id, s.user_id, s.provider, s.scope_key, s.resource_type, s.resource_id,
          s.desired_state, s.observed_state, s.desired_revision, s.observed_at,
          s.created_at, s.updated_at
        FROM external_provisioning_states s
        WHERE s.provider = ${provider}
      ), current_work AS MATERIALIZED (
        SELECT
          o.id, o.provisioning_state_id, o.status, o.available_at,
          o.created_at, o.updated_at, o.completed_at,
          ROW_NUMBER() OVER (
            PARTITION BY o.provisioning_state_id
            ORDER BY o.updated_at DESC, o.created_at DESC, o.id DESC
          ) AS recency
        FROM integration_outbox o
        JOIN scoped_states s
          ON s.id = o.provisioning_state_id
         AND o.captured_desired_revision = s.desired_revision
        WHERE o.provider = ${provider}
      ), work_aggregate AS (
        SELECT
          provisioning_state_id,
          COUNT(*)::integer AS current_work_count,
          ARRAY_AGG(id::text ORDER BY created_at, id) AS current_outbox_ids,
          MAX(id::text) FILTER (WHERE recency = 1) AS latest_outbox_id,
          MAX(status) FILTER (WHERE recency = 1) AS latest_outbox_status,
          MAX(available_at) FILTER (WHERE recency = 1) AS latest_available_at,
          MAX(created_at) FILTER (WHERE recency = 1) AS latest_created_at,
          MAX(updated_at) FILTER (WHERE recency = 1) AS latest_updated_at,
          MAX(completed_at) FILTER (WHERE recency = 1) AS latest_completed_at
        FROM current_work
        GROUP BY provisioning_state_id
      )
      SELECT
        s.id AS state_id, s.user_id, s.provider, s.scope_key, s.resource_type, s.resource_id,
        s.desired_state, s.observed_state, s.desired_revision, s.observed_at,
        s.created_at AS state_created_at, s.updated_at AS state_updated_at,
        COALESCE(w.current_work_count, 0) AS current_work_count,
        COALESCE(w.current_outbox_ids, ARRAY[]::text[]) AS current_outbox_ids,
        w.latest_outbox_id, w.latest_outbox_status, w.latest_available_at,
        w.latest_created_at, w.latest_updated_at, w.latest_completed_at
      FROM scoped_states s
      LEFT JOIN work_aggregate w ON w.provisioning_state_id = s.id
      ORDER BY s.user_id, s.scope_key, s.resource_type, s.resource_id, s.id
    `) as Row[]

    const rows = sourceRows.map(mapRow)
    if (rows.length === 0) {
      summary.no_evidence = 1
      return {
        version: 1,
        status: "ok",
        state: "no_evidence",
        provider,
        observedAt,
        adapterEnablementAllowed: false,
        rows,
        summary,
      }
    }
    for (const row of rows) summary[row.state] += 1
    return {
      version: 1,
      status: "ok",
      state: rows.every(row => row.state === "reconciled") ? "reconciled" : "attention_required",
      provider,
      observedAt,
      adapterEnablementAllowed: false,
      rows,
      summary,
    }
  } catch {
    return {
      version: 1,
      status: "failure",
      state: "unavailable",
      provider,
      observedAt,
      adapterEnablementAllowed: false,
      error: "database_unavailable",
      rows: [],
      summary,
    }
  }
}

export function serializeIntegrationReadinessReport(report: IntegrationReadinessReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}
