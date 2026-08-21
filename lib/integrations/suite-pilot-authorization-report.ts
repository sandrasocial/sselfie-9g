import "server-only"

import { sql } from "@/lib/db/client"
import type { SuiteProviderPilotProvider } from "./suite-provider-pilot"

type Row = Record<string, unknown>
type Query = (query: string, params?: unknown[]) => Promise<Row[]>

export const SUITE_PILOT_AUTHORIZATION_STATES = [
  "no_evidence",
  "preflight_ready_unapproved",
  "consent_confirmed",
  "authorized_non_dispatchable",
  "authorization_expired",
  "revoked_non_dispatchable",
  "ambiguous",
] as const

export type SuitePilotAuthorizationState = (typeof SUITE_PILOT_AUTHORIZATION_STATES)[number]

export interface SuitePilotAuthorizationReportRow {
  snapshotId: string
  userId: string
  provider: SuiteProviderPilotProvider
  resourceId: string
  latestEventId: string | null
  latestRevision: number
  state: Exclude<SuitePilotAuthorizationState, "no_evidence">
  observedAt: string
  completedAt: string
  approvalDeadline: string
  reportDigest: string
  latestDecisionEvidenceDigest: string | null
  latestDecisionBindingDigest: string | null
}

export interface SuitePilotAuthorizationReport {
  version: 1
  status: "ok" | "failure"
  state: SuitePilotAuthorizationState
  provider: SuiteProviderPilotProvider
  observedAt: string
  externalEffectsAllowed: false
  adapterEnablementAllowed: false
  dispatchAllowed: false
  rows: SuitePilotAuthorizationReportRow[]
  error?: "database_unavailable"
}

function runtimeQuery(query: string, params: unknown[] = []): Promise<Row[]> {
  return sql.query(query, params) as Promise<Row[]>
}

export async function getSuitePilotAuthorizationReport(
  provider: SuiteProviderPilotProvider,
  observedAt: Date,
  query: Query = runtimeQuery
): Promise<SuitePilotAuthorizationReport> {
  if (provider !== "skool" && provider !== "studio_platform_partner") {
    throw new Error("An exact protected provider is required")
  }
  try {
    const rows = await query(
      `WITH bounded_snapshots AS (
         SELECT s.id, s.user_id, s.provider, s.resource_id, s.observed_at, s.completed_at,
                s.approval_deadline, s.report_digest
         FROM suite_pilot_preflight_snapshots s
         WHERE s.provider = $1
           AND s.created_at <= $2::timestamptz
       ), ranked_events AS (
         SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.snapshot_id ORDER BY e.revision DESC) AS rank
         FROM suite_pilot_authorization_events e
         JOIN bounded_snapshots s ON s.id = e.snapshot_id
         WHERE e.created_at <= $2::timestamptz
       )
       SELECT s.id AS snapshot_id, s.user_id, s.provider, s.resource_id,
              e.id AS latest_event_id, COALESCE(e.revision, 0) AS latest_revision,
              e.decision AS latest_decision,
              e.decision_evidence_digest AS latest_decision_evidence_digest,
              e.decision_binding_digest AS latest_decision_binding_digest,
              s.observed_at, s.completed_at,
              s.approval_deadline, s.report_digest
       FROM bounded_snapshots s
       LEFT JOIN ranked_events e ON e.snapshot_id = s.id AND e.rank = 1
       ORDER BY s.user_id, s.resource_id, s.observed_at, s.id`,
      [provider, observedAt.toISOString()]
    )
    const projected = rows.map(row => {
      const decision = typeof row.latest_decision === "string" ? row.latest_decision : null
      const deadline = new Date(String(row.approval_deadline))
      let state: SuitePilotAuthorizationReportRow["state"]
      if (decision === "consent_withdrawn" || decision === "founder_revoked") {
        state = "revoked_non_dispatchable"
      } else if (deadline.getTime() <= observedAt.getTime()) {
        state = "authorization_expired"
      } else if (decision === "founder_approved") {
        state = "authorized_non_dispatchable"
      } else if (decision === "consent_confirmed") {
        state = "consent_confirmed"
      } else {
        state = "preflight_ready_unapproved"
      }
      return {
        snapshotId: String(row.snapshot_id),
        userId: String(row.user_id),
        provider,
        resourceId: String(row.resource_id),
        latestEventId: row.latest_event_id ? String(row.latest_event_id) : null,
        latestRevision: Number(row.latest_revision),
        state,
        observedAt: new Date(String(row.observed_at)).toISOString(),
        completedAt: new Date(String(row.completed_at)).toISOString(),
        approvalDeadline: deadline.toISOString(),
        reportDigest: String(row.report_digest),
        latestDecisionEvidenceDigest: row.latest_decision_evidence_digest
          ? String(row.latest_decision_evidence_digest)
          : null,
        latestDecisionBindingDigest: row.latest_decision_binding_digest
          ? String(row.latest_decision_binding_digest)
          : null,
      }
    })
    let state: SuitePilotAuthorizationState = "no_evidence"
    const currentRows = projected.filter(
      row => row.state !== "revoked_non_dispatchable" && row.state !== "authorization_expired"
    )
    if (currentRows.length === 1) state = currentRows[0].state
    else if (currentRows.length > 1) state = "ambiguous"
    else if (projected.length > 0) state = projected[projected.length - 1].state
    return {
      version: 1,
      status: "ok",
      state,
      provider,
      observedAt: observedAt.toISOString(),
      externalEffectsAllowed: false,
      adapterEnablementAllowed: false,
      dispatchAllowed: false,
      rows: projected,
    }
  } catch {
    return {
      version: 1,
      status: "failure",
      state: "no_evidence",
      provider,
      observedAt: observedAt.toISOString(),
      externalEffectsAllowed: false,
      adapterEnablementAllowed: false,
      dispatchAllowed: false,
      rows: [],
      error: "database_unavailable",
    }
  }
}

export function serializeSuitePilotAuthorizationReport(
  report: SuitePilotAuthorizationReport
): string {
  return `${JSON.stringify(report, null, 2)}\n`
}
