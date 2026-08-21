import "server-only"

import { randomUUID } from "node:crypto"
import { sql } from "@/lib/db/client"
import { digestEvidence, type SuiteFounderPreflightReport } from "./suite-founder-preflight"
import type { SuiteProviderPilotProvider } from "./suite-provider-pilot"

type Row = Record<string, unknown>

export type SuitePilotAuthorizationDecision =
  | "consent_confirmed"
  | "founder_approved"
  | "consent_withdrawn"
  | "founder_revoked"

export type SuitePilotRevocationReason =
  | "consent_withdrawn"
  | "founder_cancelled"
  | "provider_contract_changed"
  | "preflight_invalidated"
  | "operator_kill_switch"

export function deriveSuitePilotDecisionArtifactDigest(input: {
  reportDigest: string
  decisionEvidenceDigest: string
  decision: SuitePilotAuthorizationDecision
  actorUserId: string
  targetEventId?: string
  reasonCode?: SuitePilotRevocationReason
}): string {
  assertDigest(input.reportDigest, "Report digest")
  assertDigest(input.decisionEvidenceDigest, "Decision evidence")
  assertOpaque(input.actorUserId, "Actor user ID")
  if (input.targetEventId !== undefined) assertOpaque(input.targetEventId, "Target event ID")
  return digestEvidence({
    contract: "suite_pilot_authorization_decision.v1",
    report_digest: input.reportDigest,
    evidence_digest: input.decisionEvidenceDigest,
    decision: input.decision,
    actor_user_id: input.actorUserId,
    target_event_id: input.targetEventId ?? null,
    reason_code: input.reasonCode ?? null,
  })
}

export interface SuitePilotPreflightSnapshotResult {
  snapshotId: string
  inserted: boolean
  approvalDeadline: string
}

export interface SuitePilotAuthorizationEventResult {
  eventId: string
  inserted: boolean
  revision: number
  state: "consent_confirmed" | "authorized_non_dispatchable" | "revoked_non_dispatchable"
  externalEffectsAllowed: false
  adapterEnablementAllowed: false
  dispatchAllowed: false
}

const opaquePattern = /^[A-Za-z0-9_.:-]{1,256}$/
const digestPattern = /^sha256:[a-f0-9]{64}$/

function rowAt(value: unknown, index = 0): Row | undefined {
  if (!Array.isArray(value)) return undefined
  return value[index] as Row | undefined
}

function requiredString(row: Row | undefined, key: string, message: string): string {
  const value = row?.[key]
  if (typeof value !== "string" || !value) throw new Error(message)
  return value
}

function assertOpaque(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !opaquePattern.test(value) || value.includes("@")) {
    throw new Error(`${label} must be an opaque identifier`)
  }
}

function assertDigest(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !digestPattern.test(value)) {
    throw new Error(`${label} must be a SHA256 digest`)
  }
}

function validateReadyReport(
  report: SuiteFounderPreflightReport
): asserts report is SuiteFounderPreflightReport & {
  state: "ready_for_sandra_approval"
  provider: SuiteProviderPilotProvider
  resourceId: string
  founderUserId: string
  passwordState: "password_ready" | "recovery_required"
  baselines: NonNullable<SuiteFounderPreflightReport["baselines"]>
  academyAccessSummary: NonNullable<SuiteFounderPreflightReport["academyAccessSummary"]>
  approvalSummary: NonNullable<SuiteFounderPreflightReport["approvalSummary"]>
  validUntil: string
} {
  if (
    report.state !== "ready_for_sandra_approval" ||
    report.blockers.length !== 0 ||
    report.pilotMode !== "founder_only" ||
    report.approvalState !== "not_requested" ||
    report.proposal !== null ||
    report.externalEffectsAllowed ||
    report.adapterEnablementAllowed ||
    report.dispatchAllowed
  ) {
    throw new Error("Only a ready, non-dispatchable 3C3 report can be snapshotted")
  }
  assertOpaque(report.founderUserId, "Founder user ID")
  assertOpaque(report.resourceId, "Resource ID")
  assertDigest(report.evidenceDigest, "Report digest")
  if (
    (report.provider !== "skool" && report.provider !== "studio_platform_partner") ||
    !report.baselines ||
    !report.academyAccessSummary ||
    !report.approvalSummary ||
    !report.passwordState ||
    !report.validUntil
  ) {
    throw new Error("Ready report is missing exact pilot evidence")
  }
  const completedAt = Date.parse(report.completedAt)
  const validUntil = Date.parse(report.validUntil)
  if (!Number.isFinite(completedAt) || !Number.isFinite(validUntil) || validUntil <= completedAt) {
    throw new Error("Ready report approval window is invalid")
  }
  if (
    report.approvalSummary.dataCategories.length !== 1 ||
    report.approvalSummary.dataCategories[0] !== "email_address"
  ) {
    throw new Error("Pilot data category must be exactly email_address")
  }
}

export async function recordSuitePilotPreflightSnapshot(input: {
  snapshotKey: string
  report: SuiteFounderPreflightReport
}): Promise<SuitePilotPreflightSnapshotResult> {
  assertOpaque(input.snapshotKey, "Snapshot key")
  validateReadyReport(input.report)
  const report = input.report
  const candidateId = randomUUID()
  const approvalSummaryDigest = digestEvidence(report.approvalSummary)
  const baselineDigest = digestEvidence(report.baselines)
  const academyAccessDigest = digestEvidence(report.academyAccessSummary)
  const lockKey = ["suite-pilot", report.founderUserId, report.provider, report.resourceId].join(
    ":"
  )
  const transactionRows = (await sql.transaction(tx => [
    tx`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    tx`
      WITH candidate AS (
        SELECT
          ${candidateId}::uuid AS id, ${input.snapshotKey}::text AS snapshot_key,
          ${report.founderUserId}::text AS user_id, ${report.provider}::text AS provider,
          ${report.resourceId}::text AS resource_id, ${report.evidenceDigest}::text AS report_digest,
          ${approvalSummaryDigest}::text AS approval_summary_digest,
          ${baselineDigest}::text AS baseline_digest, ${academyAccessDigest}::text AS academy_access_digest,
          ${report.passwordState}::text AS password_state,
          ${report.observedAt}::timestamptz AS observed_at,
          ${report.completedAt}::timestamptz AS completed_at,
          ${report.approvalSummary.consent.capturedAt}::timestamptz AS consent_captured_at,
          ${report.approvalSummary.consent.checkAt}::timestamptz AS consent_check_at,
          ${report.approvalSummary.consent.expiresAt}::timestamptz AS consent_expires_at,
          ${report.approvalSummary.providerCapability.verifiedAt}::timestamptz AS capability_verified_at,
          ${report.approvalSummary.providerCapability.expiresAt}::timestamptz AS capability_expires_at,
          ${report.validUntil}::timestamptz AS approval_deadline
      ), inserted AS (
      INSERT INTO suite_pilot_preflight_snapshots (
        id, snapshot_key, user_id, provider, resource_id, report_digest,
        approval_summary_digest, baseline_digest, academy_access_digest,
        provider_identity_digest, provider_terms_digest, provider_privacy_digest,
        provider_removal_digest, consent_evidence_digest, capability_evidence_digest,
        rollback_sla_hours,
        data_categories, password_state, observed_at, completed_at,
        consent_captured_at, consent_check_at, consent_expires_at,
        capability_verified_at, capability_expires_at, approval_deadline
      )
      SELECT c.id, c.snapshot_key, c.user_id, c.provider, c.resource_id, c.report_digest,
             c.approval_summary_digest, c.baseline_digest, c.academy_access_digest,
             ${report.approvalSummary.artifactDigests.providerIdentity},
             ${report.approvalSummary.artifactDigests.providerTerms},
             ${report.approvalSummary.artifactDigests.providerPrivacy},
             ${report.approvalSummary.artifactDigests.providerRemoval},
             ${report.approvalSummary.artifactDigests.consent},
             ${report.approvalSummary.artifactDigests.providerCapability},
             ${report.approvalSummary.rollback.slaHours},
             '["email_address"]'::jsonb, c.password_state, c.observed_at, c.completed_at,
             c.consent_captured_at, c.consent_check_at, c.consent_expires_at,
             c.capability_verified_at, c.capability_expires_at, c.approval_deadline
      FROM candidate c WHERE c.approval_deadline > clock_timestamp()
      ON CONFLICT DO NOTHING
      RETURNING id AS snapshot_id, TRUE AS inserted, approval_deadline
      ), exact_existing AS (
        SELECT s.id AS snapshot_id, FALSE AS inserted, s.approval_deadline
        FROM suite_pilot_preflight_snapshots s CROSS JOIN candidate c
        WHERE s.snapshot_key = c.snapshot_key AND s.user_id = c.user_id
          AND s.provider = c.provider AND s.resource_id = c.resource_id
          AND s.report_digest = c.report_digest
          AND s.approval_summary_digest = c.approval_summary_digest
          AND s.baseline_digest = c.baseline_digest
          AND s.academy_access_digest = c.academy_access_digest
          AND s.provider_identity_digest = ${report.approvalSummary.artifactDigests.providerIdentity}
          AND s.provider_terms_digest = ${report.approvalSummary.artifactDigests.providerTerms}
          AND s.provider_privacy_digest = ${report.approvalSummary.artifactDigests.providerPrivacy}
          AND s.provider_removal_digest = ${report.approvalSummary.artifactDigests.providerRemoval}
          AND s.consent_evidence_digest = ${report.approvalSummary.artifactDigests.consent}
          AND s.capability_evidence_digest = ${report.approvalSummary.artifactDigests.providerCapability}
          AND s.rollback_sla_hours = ${report.approvalSummary.rollback.slaHours}
          AND s.data_categories = '["email_address"]'::jsonb
          AND s.password_state = c.password_state AND s.observed_at = c.observed_at
          AND s.completed_at = c.completed_at AND s.consent_captured_at = c.consent_captured_at
          AND s.consent_check_at = c.consent_check_at AND s.consent_expires_at = c.consent_expires_at
          AND s.capability_verified_at = c.capability_verified_at
          AND s.capability_expires_at = c.capability_expires_at
          AND s.approval_deadline = c.approval_deadline
      )
      SELECT snapshot_id, inserted, approval_deadline::text AS approval_deadline FROM inserted
      UNION ALL SELECT snapshot_id, inserted, approval_deadline::text FROM exact_existing
      WHERE NOT EXISTS (SELECT 1 FROM inserted)
    `,
  ])) as unknown[]
  const row = rowAt(transactionRows[1])
  return {
    snapshotId: requiredString(row, "snapshot_id", "Preflight snapshot idempotency conflict"),
    inserted: row?.inserted === true,
    approvalDeadline: requiredString(row, "approval_deadline", "Missing approval deadline"),
  }
}

export async function recordSuitePilotAuthorizationEvent(input: {
  snapshotId: string
  eventKey: string
  decision: SuitePilotAuthorizationDecision
  reportDigest: string
  decisionEvidenceDigest: string
  actorUserId: string
  expectedRevision: number
  targetEventId?: string
  reasonCode?: SuitePilotRevocationReason
}): Promise<SuitePilotAuthorizationEventResult> {
  assertOpaque(input.snapshotId, "Snapshot ID")
  assertOpaque(input.eventKey, "Event key")
  assertDigest(input.reportDigest, "Report digest")
  assertDigest(input.decisionEvidenceDigest, "Decision evidence")
  assertOpaque(input.actorUserId, "Actor user ID")
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
    throw new Error("Expected revision must be a non-negative integer")
  }
  if (
    !(
      ["consent_confirmed", "founder_approved", "consent_withdrawn", "founder_revoked"] as const
    ).includes(input.decision)
  ) {
    throw new Error("Unknown suite pilot authorization decision")
  }
  if (input.targetEventId !== undefined) assertOpaque(input.targetEventId, "Target event ID")
  const isRevocation =
    input.decision === "consent_withdrawn" || input.decision === "founder_revoked"
  if (isRevocation !== Boolean(input.targetEventId)) {
    throw new Error("Revocation decisions require the exact current consent or approval event")
  }
  const reasons: SuitePilotRevocationReason[] = [
    "consent_withdrawn",
    "founder_cancelled",
    "provider_contract_changed",
    "preflight_invalidated",
    "operator_kill_switch",
  ]
  if (isRevocation !== Boolean(input.reasonCode && reasons.includes(input.reasonCode))) {
    throw new Error("Revocation decisions require a closed reason code")
  }
  if (
    (input.decision === "consent_withdrawn" && input.reasonCode !== "consent_withdrawn") ||
    (input.decision === "founder_revoked" && input.reasonCode === "consent_withdrawn")
  ) {
    throw new Error("Revocation reason must match the exact decision")
  }
  const decisionArtifactDigest = deriveSuitePilotDecisionArtifactDigest(input)
  const candidateId = randomUUID()
  const transactionRows = (await sql.transaction(tx => [
    tx`
      SELECT pg_advisory_xact_lock(hashtextextended(
        'suite-pilot:' || user_id || ':' || provider || ':' || resource_id, 0
      ))
      FROM suite_pilot_preflight_snapshots WHERE id = ${input.snapshotId}::uuid
    `,
    tx`
      WITH snapshot AS (
        SELECT * FROM suite_pilot_preflight_snapshots
        WHERE id = ${input.snapshotId}::uuid
          AND report_digest = ${input.reportDigest}
        FOR SHARE
      ), exact_existing AS (
        SELECT e.id AS event_id, FALSE AS inserted, e.revision
        FROM suite_pilot_authorization_events e
        WHERE e.event_key = ${input.eventKey}
          AND e.snapshot_id = ${input.snapshotId}::uuid
          AND e.user_id = ${input.actorUserId}
          AND e.actor_user_id = ${input.actorUserId}
          AND e.revision IN (
            ${input.expectedRevision + 1}, ${input.expectedRevision + 2}, ${input.expectedRevision + 3}
          )
          AND e.decision = ${input.decision}
          AND e.decision_evidence_digest = ${input.decisionEvidenceDigest}
          AND e.decision_binding_digest = ${decisionArtifactDigest}
          AND e.reason_code IS NOT DISTINCT FROM ${input.reasonCode ?? null}::text
          AND e.target_event_id IS NOT DISTINCT FROM ${input.targetEventId ?? null}::uuid
      ), latest AS (
        SELECT e.* FROM suite_pilot_authorization_events e
        WHERE e.snapshot_id = ${input.snapshotId}::uuid
        ORDER BY e.revision DESC LIMIT 1
      ), latest_prior AS (
        SELECT p.* FROM suite_pilot_authorization_events p
        JOIN latest l ON l.prior_event_id = p.id
      ), qualified AS (
        SELECT s.*, l.id AS prior_event_id, l.decision AS prior_decision,
               COALESCE(l.revision, 0) AS prior_revision
        FROM snapshot s LEFT JOIN latest l ON TRUE
        WHERE NOT EXISTS (SELECT 1 FROM suite_pilot_authorization_events WHERE event_key = ${input.eventKey})
          AND s.user_id = ${input.actorUserId}
          AND (
            COALESCE(l.revision, 0) = ${input.expectedRevision}
            OR (${input.decision} = 'consent_withdrawn'
              AND (
                (l.decision = 'founder_approved' AND l.revision = ${input.expectedRevision + 1}
                  AND l.prior_event_id = ${input.targetEventId ?? null}::uuid) OR
                (l.decision = 'founder_revoked' AND l.revision = ${input.expectedRevision + 1}
                  AND EXISTS (
                    SELECT 1 FROM latest_prior p
                    WHERE p.decision = 'founder_approved'
                      AND p.prior_event_id = ${input.targetEventId ?? null}::uuid
                  ))
              ))
          )
          AND (
            (${input.decision} = 'consent_confirmed' AND l.id IS NULL AND s.approval_deadline > clock_timestamp()) OR
            (${input.decision} = 'founder_approved' AND l.decision = 'consent_confirmed'
              AND l.decision_evidence_digest <> ${input.decisionEvidenceDigest}
              AND s.approval_deadline > clock_timestamp()) OR
            (${input.decision} = 'consent_withdrawn' AND (
              (l.decision = 'consent_confirmed' AND l.id = ${input.targetEventId ?? null}::uuid) OR
              (l.decision = 'founder_approved' AND l.prior_event_id = ${input.targetEventId ?? null}::uuid) OR
              (l.decision = 'founder_revoked' AND EXISTS (
                SELECT 1 FROM latest_prior p
                WHERE p.decision = 'founder_approved'
                  AND p.prior_event_id = ${input.targetEventId ?? null}::uuid
              ))
            )) OR
            (${input.decision} = 'founder_revoked' AND l.decision = 'founder_approved'
              AND l.id = ${input.targetEventId ?? null}::uuid)
          )
      ), inserted AS (
      INSERT INTO suite_pilot_authorization_events (
        id, event_key, snapshot_id, user_id, provider, resource_id, revision,
        decision, decision_evidence_digest, decision_binding_digest, actor_user_id, reason_code,
        prior_event_id, prior_snapshot_id, target_event_id, target_snapshot_id
      )
      SELECT ${candidateId}::uuid, ${input.eventKey}, q.id, q.user_id, q.provider, q.resource_id,
             q.prior_revision + 1, ${input.decision}, ${input.decisionEvidenceDigest},
             ${decisionArtifactDigest},
             ${input.actorUserId}, ${input.reasonCode ?? null}, q.prior_event_id,
             CASE WHEN q.prior_event_id IS NULL THEN NULL ELSE q.id END,
             ${input.targetEventId ?? null}::uuid,
             CASE WHEN ${input.targetEventId ?? null}::uuid IS NULL THEN NULL ELSE q.id END
      FROM qualified q
      ON CONFLICT DO NOTHING
      RETURNING id AS event_id, TRUE AS inserted, revision
      )
      SELECT event_id, inserted, revision FROM inserted
      UNION ALL SELECT event_id, inserted, revision FROM exact_existing
      WHERE NOT EXISTS (SELECT 1 FROM inserted)
    `,
  ])) as unknown[]
  const row = rowAt(transactionRows[1])
  const revision = Number(row?.revision)
  if (!row || !Number.isInteger(revision)) {
    throw new Error("Authorization decision is stale, expired, out of order, or conflicts")
  }
  return {
    eventId: requiredString(row, "event_id", "Missing authorization event ID"),
    inserted: row.inserted === true,
    revision,
    state:
      input.decision === "founder_approved"
        ? "authorized_non_dispatchable"
        : isRevocation
          ? "revoked_non_dispatchable"
          : "consent_confirmed",
    externalEffectsAllowed: false,
    adapterEnablementAllowed: false,
    dispatchAllowed: false,
  }
}
