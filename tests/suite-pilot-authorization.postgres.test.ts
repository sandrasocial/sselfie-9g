// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const suppliedUrl = process.env.TEST_DATABASE_URL
if (process.env.REQUIRE_AUTHZ_POSTGRES_TESTS === "1" && !suppliedUrl) {
  throw new Error("TEST_DATABASE_URL is required for the authorization PostgreSQL gate")
}
const enabled = Boolean(suppliedUrl)
const localDescribe = enabled ? describe : describe.skip
const HASH = `sha256:${"a".repeat(64)}`

localDescribe("suite pilot authorization real PostgreSQL races", () => {
  let admin: Client
  let first: Client
  let second: Client
  let databaseName: string
  let databaseUrl: string

  async function createSnapshot(
    client: Client,
    key: string,
    completedOffsetSeconds = 0
  ): Promise<string> {
    const digest = (index: number) =>
      `sha256:${createHash("sha256").update(`${key}:${index}`).digest("hex")}`
    const result = await client.query<{ id: string }>(
      `WITH t AS (
         SELECT clock_timestamp() + ($11::int * interval '1 second') AS at
       )
       INSERT INTO suite_pilot_preflight_snapshots (
         snapshot_key, user_id, provider, resource_id, report_digest,
         approval_summary_digest, baseline_digest, academy_access_digest,
         provider_identity_digest, provider_terms_digest, provider_privacy_digest,
         provider_removal_digest, consent_evidence_digest, capability_evidence_digest,
         rollback_sla_hours, data_categories, password_state, observed_at, completed_at,
         consent_captured_at, consent_check_at, consent_expires_at,
         capability_verified_at, capability_expires_at, approval_deadline
       )
       SELECT $1, 'founder_opaque_1', 'skool', 'community_sselfie',
              $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, 24,
              '["email_address"]'::jsonb, 'password_ready', t.at, t.at,
              t.at, t.at, t.at + interval '24 hours', t.at, t.at + interval '24 hours',
              t.at + interval '5 minutes'
       FROM t RETURNING id`,
      [key, ...Array.from({ length: 9 }, (_, index) => digest(index)), completedOffsetSeconds]
    )
    return result.rows[0].id
  }

  async function insertDecision(input: {
    client: Client
    snapshotId: string
    eventKey: string
    decision: "consent_confirmed" | "founder_approved" | "consent_withdrawn" | "founder_revoked"
    revision: number
    priorEventId?: string
    targetEventId?: string
    reasonCode?: string
    digest?: string
  }): Promise<string> {
    const evidenceDigest = input.digest ?? HASH
    const bindingDigest = `sha256:${Buffer.from(`binding:${input.eventKey}`)
      .toString("hex")
      .padEnd(64, "0")
      .slice(0, 64)}`
    const result = await input.client.query<{ id: string }>(
      `INSERT INTO suite_pilot_authorization_events (
         event_key, snapshot_id, user_id, provider, resource_id, revision, decision,
         decision_evidence_digest, decision_binding_digest, actor_user_id, reason_code,
         prior_event_id, prior_snapshot_id, target_event_id, target_snapshot_id
       ) VALUES (
         $1, $2, 'founder_opaque_1', 'skool', 'community_sselfie', $3, $4,
         $5, $6, 'founder_opaque_1', $7, $8,
         CASE WHEN $8::uuid IS NULL THEN NULL ELSE $2::uuid END,
         $9, CASE WHEN $9::uuid IS NULL THEN NULL ELSE $2::uuid END
       ) RETURNING id`,
      [
        input.eventKey,
        input.snapshotId,
        input.revision,
        input.decision,
        evidenceDigest,
        bindingDigest,
        input.reasonCode ?? null,
        input.priorEventId ?? null,
        input.targetEventId ?? null,
      ]
    )
    return result.rows[0].id
  }

  beforeAll(async () => {
    const parsed = new URL(String(suppliedUrl))
    if (!(["127.0.0.1", "localhost", "::1"] as const).includes(parsed.hostname as any)) {
      throw new Error("TEST_DATABASE_URL must point to an explicitly local PostgreSQL server")
    }
    databaseName = `sselfie_authz_${process.pid}_${Date.now()}`.toLowerCase()
    admin = new Client({ connectionString: suppliedUrl })
    await admin.connect()
    await admin.query(`CREATE DATABASE ${databaseName}`)
    parsed.pathname = `/${databaseName}`
    databaseUrl = parsed.toString()
    first = new Client({ connectionString: databaseUrl })
    second = new Client({ connectionString: databaseUrl })
    await Promise.all([first.connect(), second.connect()])
    await first.query(`
      CREATE TABLE users (id TEXT PRIMARY KEY);
      CREATE TABLE transaction_probe (id TEXT PRIMARY KEY);
      INSERT INTO users (id) VALUES ('founder_opaque_1');
    `)
    const controlPlaneMigration = fs.readFileSync(
      path.join(process.cwd(), "db/migrations/73-create-integration-control-plane.sql"),
      "utf8"
    )
    await first.query(controlPlaneMigration)
    const migration = fs.readFileSync(
      path.join(process.cwd(), "db/migrations/74-create-suite-pilot-authorization-ledger.sql"),
      "utf8"
    )
    await first.query(migration)
    await first.query(
      `WITH t AS (SELECT clock_timestamp() AS at)
       INSERT INTO suite_pilot_preflight_snapshots (
         snapshot_key, user_id, provider, resource_id, report_digest,
         approval_summary_digest, baseline_digest, academy_access_digest,
         provider_identity_digest, provider_terms_digest, provider_privacy_digest,
         provider_removal_digest, consent_evidence_digest, capability_evidence_digest,
         rollback_sla_hours, data_categories, password_state, observed_at, completed_at,
         consent_captured_at, consent_check_at, consent_expires_at,
         capability_verified_at, capability_expires_at, approval_deadline
       )
       SELECT 'preflight.race', 'founder_opaque_1', 'skool', 'community_sselfie',
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 24,
              '["email_address"]'::jsonb, 'password_ready', t.at, t.at,
              t.at, t.at, t.at + interval '24 hours', t.at, t.at + interval '24 hours',
              t.at + interval '5 minutes'
       FROM t`,
      Array.from({ length: 10 }, (_, index) => `sha256:${String(index).padStart(64, "0")}`)
    )
  }, 20_000)

  afterAll(async () => {
    await Promise.allSettled([first?.end(), second?.end()])
    if (admin && databaseName) {
      await admin.query(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`)
      await admin.end()
    }
  })

  it("serializes concurrent first decisions and keeps exact replay immutable", async () => {
    const snapshot = await first.query<{ id: string }>(
      `SELECT id FROM suite_pilot_preflight_snapshots WHERE snapshot_key='preflight.race'`
    )
    const snapshotId = snapshot.rows[0].id
    const insert = async (client: Client) => {
      await client.query("BEGIN")
      try {
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtextextended(
             'suite-pilot:founder_opaque_1:skool:community_sselfie', 0))`
        )
        const result = await client.query(
          `INSERT INTO suite_pilot_authorization_events (
           event_key, snapshot_id, user_id, provider, resource_id, revision, decision,
             decision_evidence_digest, decision_binding_digest, actor_user_id
           ) VALUES ('consent.race', $1, 'founder_opaque_1', 'skool', 'community_sselfie', 1,
             'consent_confirmed', $2, $3, 'founder_opaque_1')
           ON CONFLICT DO NOTHING RETURNING id`,
          [snapshotId, HASH, `sha256:${"1".repeat(64)}`]
        )
        await client.query("COMMIT")
        return result.rowCount
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      }
    }
    const outcomes = await Promise.all([insert(first), insert(second)])
    expect(outcomes.sort()).toEqual([0, 1])
    const count = await first.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM suite_pilot_authorization_events WHERE snapshot_id=$1`,
      [snapshotId]
    )
    expect(Number(count.rows[0].count)).toBe(1)
    await expect(
      first.query(
        `UPDATE suite_pilot_authorization_events SET decision_binding_digest=$1 WHERE snapshot_id=$2`,
        [`sha256:${"f".repeat(64)}`, snapshotId]
      )
    ).rejects.toThrow(/append-only/)
  })

  it("records consent then a separate founder approval with exact binding", async () => {
    const snapshotId = await createSnapshot(first, "preflight.consent-approval")
    const consentId = await insertDecision({
      client: first,
      snapshotId,
      eventKey: "consent.approval-flow",
      decision: "consent_confirmed",
      revision: 1,
    })
    await expect(
      insertDecision({
        client: first,
        snapshotId,
        eventKey: "approval.reused-evidence",
        decision: "founder_approved",
        revision: 2,
        priorEventId: consentId,
        digest: HASH,
      })
    ).rejects.toMatchObject({ code: "23505" })
    const approvalId = await insertDecision({
      client: first,
      snapshotId,
      eventKey: "approval.approval-flow",
      decision: "founder_approved",
      revision: 2,
      priorEventId: consentId,
      digest: `sha256:${"b".repeat(64)}`,
    })
    const rows = await first.query(
      `SELECT id, decision, actor_user_id FROM suite_pilot_authorization_events
       WHERE snapshot_id=$1 ORDER BY revision`,
      [snapshotId]
    )
    expect(rows.rows).toEqual([
      expect.objectContaining({
        id: consentId,
        decision: "consent_confirmed",
        actor_user_id: "founder_opaque_1",
      }),
      expect.objectContaining({
        id: approvalId,
        decision: "founder_approved",
        actor_user_id: "founder_opaque_1",
      }),
    ])
    await expect(
      insertDecision({
        client: first,
        snapshotId,
        eventKey: "revoke.stale-revision",
        decision: "founder_revoked",
        revision: 2,
        priorEventId: approvalId,
        targetEventId: approvalId,
        reasonCode: "founder_cancelled",
        digest: `sha256:${"c".repeat(64)}`,
      })
    ).rejects.toMatchObject({ code: expect.stringMatching(/^235(?:05|14)$/) })
  })

  it("withdraws consent before founder approval and makes that snapshot terminal", async () => {
    const snapshotId = await createSnapshot(first, "preflight.withdraw-before-approval")
    const consentId = await insertDecision({
      client: first,
      snapshotId,
      eventKey: "consent.withdraw-before",
      decision: "consent_confirmed",
      revision: 1,
    })
    await insertDecision({
      client: first,
      snapshotId,
      eventKey: "withdraw.before",
      decision: "consent_withdrawn",
      revision: 2,
      priorEventId: consentId,
      targetEventId: consentId,
      reasonCode: "consent_withdrawn",
      digest: `sha256:${"2".repeat(64)}`,
    })
    await expect(
      insertDecision({
        client: first,
        snapshotId,
        eventKey: "approval.too-late",
        decision: "founder_approved",
        revision: 3,
        priorEventId: consentId,
      })
    ).rejects.toThrow(/suite_pilot_authorization_events_snapshot_id_decision_key|check constraint/i)
    const latest = await first.query<{ decision: string }>(
      `SELECT decision FROM suite_pilot_authorization_events WHERE snapshot_id=$1 ORDER BY revision DESC LIMIT 1`,
      [snapshotId]
    )
    expect(latest.rows[0].decision).toBe("consent_withdrawn")
  })

  it("serializes both approval-withdrawal race orders with withdrawal as the final fact", async () => {
    const runRace = async (suffix: string, approvalDelay: number, withdrawalDelay: number) => {
      const snapshotId = await createSnapshot(first, `preflight.approval-withdraw-race.${suffix}`)
      const consentId = await insertDecision({
        client: first,
        snapshotId,
        eventKey: `consent.race-next.${suffix}`,
        decision: "consent_confirmed",
        revision: 1,
        digest: `sha256:${"1".repeat(64)}`,
      })
      const attempt = async (
        client: Client,
        decision: "founder_approved" | "consent_withdrawn",
        delay: number
      ) => {
        await client.query("BEGIN")
        try {
          if (delay) await client.query(`SELECT pg_sleep($1)`, [delay / 1000])
          await client.query(
            `SELECT pg_advisory_xact_lock(hashtextextended(
              'suite-pilot:founder_opaque_1:skool:community_sselfie', 0))`
          )
          const result = await client.query<{ id: string; decision: string }>(
            `WITH latest AS (
               SELECT id, decision, revision, prior_event_id
               FROM suite_pilot_authorization_events
               WHERE snapshot_id=$1 ORDER BY revision DESC LIMIT 1
             )
             INSERT INTO suite_pilot_authorization_events (
               event_key, snapshot_id, user_id, provider, resource_id, revision, decision,
               decision_evidence_digest, decision_binding_digest, actor_user_id, reason_code,
               prior_event_id, prior_snapshot_id, target_event_id, target_snapshot_id
             )
             SELECT $2, $1, 'founder_opaque_1', 'skool', 'community_sselfie', l.revision + 1, $3,
                    $4, $5, 'founder_opaque_1',
                    CASE WHEN $3='consent_withdrawn' THEN 'consent_withdrawn' END,
                    l.id, $1, CASE WHEN $3='consent_withdrawn' THEN $6::uuid END,
                    CASE WHEN $3='consent_withdrawn' THEN $1::uuid END
             FROM latest l
             WHERE ($3='founder_approved' AND l.decision='consent_confirmed' AND l.revision=1)
                OR ($3='consent_withdrawn' AND (
                  (l.decision='consent_confirmed' AND l.id=$6::uuid) OR
                  (l.decision='founder_approved' AND l.prior_event_id=$6::uuid)
                ))
             ON CONFLICT DO NOTHING RETURNING id, decision`,
            [
              snapshotId,
              `race.${decision}.${suffix}`,
              decision,
              decision === "founder_approved"
                ? `sha256:${"2".repeat(64)}`
                : `sha256:${"3".repeat(64)}`,
              decision === "founder_approved"
                ? `sha256:${"4".repeat(64)}`
                : `sha256:${"5".repeat(64)}`,
              consentId,
            ]
          )
          await client.query("COMMIT")
          return result.rows[0] ?? null
        } catch (error) {
          await client.query("ROLLBACK")
          throw error
        }
      }
      await Promise.all([
        attempt(first, "founder_approved", approvalDelay),
        attempt(second, "consent_withdrawn", withdrawalDelay),
      ])
      const latest = await first.query<{ decision: string }>(
        `SELECT decision FROM suite_pilot_authorization_events
         WHERE snapshot_id=$1 ORDER BY revision DESC LIMIT 1`,
        [snapshotId]
      )
      expect(latest.rows[0].decision).toBe("consent_withdrawn")
    }
    await runRace("approval-first", 0, 75)
    await runRace("withdrawal-first", 75, 0)
  })

  it("keeps participant withdrawal final in both founder-revoke race orders", async () => {
    const runRace = async (suffix: string, revokeDelay: number, withdrawalDelay: number) => {
      const snapshotId = await createSnapshot(first, `preflight.revoke-withdraw-race.${suffix}`)
      const consentId = await insertDecision({
        client: first,
        snapshotId,
        eventKey: `consent.revoke-race.${suffix}`,
        decision: "consent_confirmed",
        revision: 1,
        digest: `sha256:${"1".repeat(64)}`,
      })
      const approvalId = await insertDecision({
        client: first,
        snapshotId,
        eventKey: `approval.revoke-race.${suffix}`,
        decision: "founder_approved",
        revision: 2,
        priorEventId: consentId,
        digest: `sha256:${"2".repeat(64)}`,
      })
      const attempt = async (
        client: Client,
        decision: "founder_revoked" | "consent_withdrawn",
        delay: number
      ) => {
        await client.query("BEGIN")
        try {
          if (delay) await client.query(`SELECT pg_sleep($1)`, [delay / 1000])
          await client.query(
            `SELECT pg_advisory_xact_lock(hashtextextended(
              'suite-pilot:founder_opaque_1:skool:community_sselfie', 0))`
          )
          const result = await client.query(
            `WITH latest AS (
               SELECT * FROM suite_pilot_authorization_events
               WHERE snapshot_id=$1 ORDER BY revision DESC LIMIT 1
             ), prior AS (
               SELECT p.* FROM suite_pilot_authorization_events p
               JOIN latest l ON l.prior_event_id=p.id
             )
             INSERT INTO suite_pilot_authorization_events (
               event_key, snapshot_id, user_id, provider, resource_id, revision, decision,
               decision_evidence_digest, decision_binding_digest, actor_user_id, reason_code,
               prior_event_id, prior_snapshot_id, target_event_id, target_snapshot_id
             )
             SELECT $2, $1, 'founder_opaque_1', 'skool', 'community_sselfie', l.revision+1, $3,
                    $4, $5, 'founder_opaque_1',
                    CASE WHEN $3='consent_withdrawn' THEN 'consent_withdrawn'
                         ELSE 'founder_cancelled' END,
                    l.id, $1,
                    CASE WHEN $3='consent_withdrawn' THEN $6::uuid ELSE $7::uuid END, $1
             FROM latest l
             WHERE ($3='founder_revoked' AND l.decision='founder_approved' AND l.id=$7::uuid)
                OR ($3='consent_withdrawn' AND (
                  (l.decision='founder_approved' AND l.prior_event_id=$6::uuid) OR
                  (l.decision='founder_revoked' AND EXISTS (
                    SELECT 1 FROM prior p
                    WHERE p.decision='founder_approved' AND p.prior_event_id=$6::uuid
                  ))
                ))
             ON CONFLICT DO NOTHING RETURNING id`,
            [
              snapshotId,
              `${decision}.${suffix}`,
              decision,
              decision === "founder_revoked"
                ? `sha256:${"3".repeat(64)}`
                : `sha256:${"4".repeat(64)}`,
              decision === "founder_revoked"
                ? `sha256:${"7".repeat(64)}`
                : `sha256:${"8".repeat(64)}`,
              consentId,
              approvalId,
            ]
          )
          await client.query("COMMIT")
          return result.rowCount
        } catch (error) {
          await client.query("ROLLBACK")
          throw error
        }
      }
      await Promise.all([
        attempt(first, "founder_revoked", revokeDelay),
        attempt(second, "consent_withdrawn", withdrawalDelay),
      ])
      const latest = await first.query<{ decision: string; revision: number }>(
        `SELECT decision, revision FROM suite_pilot_authorization_events
         WHERE snapshot_id=$1 ORDER BY revision DESC LIMIT 1`,
        [snapshotId]
      )
      expect(latest.rows[0].decision).toBe("consent_withdrawn")
      expect([3, 4]).toContain(Number(latest.rows[0].revision))
    }
    await runRace("revoke-first", 0, 75)
    await runRace("withdrawal-first", 75, 0)
  })

  it("rejects conflicting event-key replay without leaving a partial event", async () => {
    const snapshotId = await createSnapshot(first, "preflight.event-key-conflict")
    const eventId = await insertDecision({
      client: first,
      snapshotId,
      eventKey: "consent.conflict-key",
      decision: "consent_confirmed",
      revision: 1,
    })
    const original = await first.query<{
      decision_evidence_digest: string
      decision_binding_digest: string
    }>(
      `SELECT decision_evidence_digest, decision_binding_digest
       FROM suite_pilot_authorization_events WHERE id=$1`,
      [eventId]
    )
    const exactReplay = await first.query<{ id: string }>(
      `WITH inserted AS (
         INSERT INTO suite_pilot_authorization_events (
           event_key, snapshot_id, user_id, provider, resource_id, revision, decision,
           decision_evidence_digest, decision_binding_digest, actor_user_id
         ) VALUES ('consent.conflict-key', $1, 'founder_opaque_1', 'skool',
           'community_sselfie', 1, 'consent_confirmed', $2, $3, 'founder_opaque_1')
         ON CONFLICT DO NOTHING RETURNING id
       ), exact_existing AS (
         SELECT id FROM suite_pilot_authorization_events
         WHERE event_key='consent.conflict-key' AND snapshot_id=$1
           AND decision_evidence_digest=$2 AND decision_binding_digest=$3
       )
       SELECT id FROM inserted UNION ALL SELECT id FROM exact_existing
       WHERE NOT EXISTS (SELECT 1 FROM inserted)`,
      [
        snapshotId,
        original.rows[0].decision_evidence_digest,
        original.rows[0].decision_binding_digest,
      ]
    )
    expect(exactReplay.rows).toEqual([{ id: eventId }])
    const conflict = await first.query(
      `WITH inserted AS (
         INSERT INTO suite_pilot_authorization_events (
           event_key, snapshot_id, user_id, provider, resource_id, revision, decision,
           decision_evidence_digest, decision_binding_digest, actor_user_id
         ) VALUES ('consent.conflict-key', $1, 'founder_opaque_1', 'skool', 'community_sselfie', 1,
           'consent_confirmed', $2, $3, 'founder_opaque_1')
         ON CONFLICT DO NOTHING RETURNING id
       ), exact_existing AS (
         SELECT id FROM suite_pilot_authorization_events
         WHERE event_key='consent.conflict-key' AND decision_evidence_digest=$2
           AND decision_binding_digest=$3
       )
       SELECT id FROM inserted UNION ALL SELECT id FROM exact_existing
       WHERE NOT EXISTS (SELECT 1 FROM inserted)`,
      [snapshotId, `sha256:${"e".repeat(64)}`, `sha256:${"5".repeat(64)}`]
    )
    expect(conflict.rowCount).toBe(0)
    const count = await first.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM suite_pilot_authorization_events WHERE snapshot_id=$1`,
      [snapshotId]
    )
    expect(Number(count.rows[0].count)).toBe(1)
  })

  it("uses the database clock to reject authorization after the approval deadline", async () => {
    const snapshotId = await createSnapshot(first, "preflight.expired", -600)
    const result = await first.query(
      `INSERT INTO suite_pilot_authorization_events (
         event_key, snapshot_id, user_id, provider, resource_id, revision, decision,
         decision_evidence_digest, decision_binding_digest, actor_user_id
       )
       SELECT 'consent.expired', id, user_id, provider, resource_id, 1,
              'consent_confirmed', $2, $3, user_id
       FROM suite_pilot_preflight_snapshots
       WHERE id=$1 AND approval_deadline > clock_timestamp()
       RETURNING id`,
      [snapshotId, HASH, `sha256:${"6".repeat(64)}`]
    )
    expect(result.rowCount).toBe(0)
  })

  it("rejects UPDATE, DELETE, and TRUNCATE on both append-only ledgers", async () => {
    const snapshotId = await createSnapshot(first, "preflight.delete-trigger")
    const consentId = await insertDecision({
      client: first,
      snapshotId,
      eventKey: "consent.trigger-coverage",
      decision: "consent_confirmed",
      revision: 1,
    })
    await expect(
      first.query(
        `UPDATE suite_pilot_preflight_snapshots SET snapshot_key=snapshot_key WHERE id=$1`,
        [snapshotId]
      )
    ).rejects.toThrow(/append-only/)
    await expect(
      first.query(`DELETE FROM suite_pilot_preflight_snapshots WHERE id=$1`, [snapshotId])
    ).rejects.toThrow(/append-only/)
    await expect(
      first.query(`DELETE FROM suite_pilot_authorization_events WHERE id=$1`, [consentId])
    ).rejects.toThrow(/append-only/)
    await expect(first.query(`TRUNCATE suite_pilot_authorization_events`)).rejects.toThrow(
      /append-only/
    )
    await first.query("BEGIN")
    await first.query(
      `ALTER TABLE suite_pilot_authorization_events DISABLE TRIGGER suite_pilot_events_no_truncate`
    )
    await expect(
      first.query(`TRUNCATE suite_pilot_authorization_events, suite_pilot_preflight_snapshots`)
    ).rejects.toThrow(/append-only/)
    await first.query("ROLLBACK")
  })

  it("blocks protected outbox rows while preserving internal provider compatibility", async () => {
    const insertOutbox = (provider: "skool" | "sselfie", key: string) =>
      first.query<{ id: string }>(
        `WITH event AS (
           INSERT INTO business_events (
             event_type, aggregate_type, aggregate_id, subject_type, subject_id,
             user_id, idempotency_key, occurred_at, attributes
           ) VALUES (
             'product_purchased', 'purchase', $2, 'product', 'prompt_vault',
             'founder_opaque_1', $3, clock_timestamp(), '{"product_id":"prompt_vault"}'::jsonb
           ) RETURNING id
         )
         INSERT INTO integration_outbox (
           business_event_id, provider, scope_key, resource_type, resource_id,
           captured_user_id, operation, business_key, destination_key, idempotency_key
         )
         SELECT id, $1, CASE WHEN $1='skool' THEN 'community' ELSE 'account' END,
                CASE WHEN $1='skool' THEN 'community_membership' ELSE 'external_account' END,
                'resource_1', 'founder_opaque_1',
                CASE WHEN $1='skool' THEN 'provision' ELSE 'synchronize' END,
                $4, $5, $6 FROM event RETURNING id`,
        [
          provider,
          `purchase_${key}`,
          `event.${key}`,
          `business.${key}`,
          `${provider}:destination.${key}`,
          `outbox.${key}`,
        ]
      )
    await first.query("BEGIN")
    await first.query(`INSERT INTO transaction_probe (id) VALUES ('protected_attempt')`)
    await expect(insertOutbox("skool", "protected")).rejects.toThrow(
      /protected_provider_kill_switch/
    )
    await first.query("ROLLBACK")
    await expect(
      first.query(`SELECT id FROM transaction_probe WHERE id='protected_attempt'`)
    ).resolves.toMatchObject({ rowCount: 0 })

    await first.query("BEGIN")
    await first.query(`INSERT INTO transaction_probe (id) VALUES ('internal_attempt')`)
    const internal = await insertOutbox("sselfie", "internal")
    await first.query("COMMIT")
    await expect(
      first.query(`SELECT id FROM transaction_probe WHERE id='internal_attempt'`)
    ).resolves.toMatchObject({ rowCount: 1 })
    await expect(
      first.query(`UPDATE integration_outbox SET provider='skool' WHERE id=$1`, [
        internal.rows[0].id,
      ])
    ).rejects.toThrow(/protected_provider_kill_switch/)
  })
})
