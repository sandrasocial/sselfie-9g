// @vitest-environment node

import fs from "node:fs"
import path from "node:path"

import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  buildConversationalEditChargeQuery,
  type ConversationalEditChargeInput,
} from "@/lib/app-v3/maya/conversational-photo-edit-reservation"

const suppliedUrl = process.env.TEST_DATABASE_URL
if (process.env.REQUIRE_EDIT_RESERVATION_POSTGRES_TESTS === "1" && !suppliedUrl) {
  throw new Error("TEST_DATABASE_URL is required for the edit reservation PostgreSQL gate")
}
const localDescribe = suppliedUrl ? describe : describe.skip

type PgQuery = { text: string; values: unknown[] }

function pgTag(strings: TemplateStringsArray, ...values: unknown[]): PgQuery {
  let text = strings[0]
  values.forEach((_, index) => {
    text += `$${index + 1}${strings[index + 1]}`
  })
  return { text, values }
}

localDescribe("Maya conversational edit reservation real PostgreSQL races", () => {
  let admin: Client
  let first: Client
  let second: Client
  let databaseName: string

  async function reserve(input: {
    client: Client
    userId: string
    requestId: string
    creditReference: string
    sourceImageId: number
    rootImageId: number
  }) {
    return input.client.query(
      `INSERT INTO app_v3_maya_edit_requests (
         user_id, request_id, credit_reference, source_image_id, root_image_id,
         instruction_digest
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, request_id) DO NOTHING RETURNING id`,
      [
        input.userId,
        input.requestId,
        input.creditReference,
        input.sourceImageId,
        input.rootImageId,
        `sha256:${"a".repeat(64)}`,
      ]
    )
  }

  async function charge(client: Client, input: ConversationalEditChargeInput) {
    const query = buildConversationalEditChargeQuery(pgTag, input)
    const result = await client.query(query.text, query.values)
    return result.rows[0]
  }

  beforeAll(async () => {
    const parsed = new URL(String(suppliedUrl))
    if (!(<readonly string[]>["127.0.0.1", "localhost", "::1"]).includes(parsed.hostname)) {
      throw new Error("TEST_DATABASE_URL must point to an explicitly local PostgreSQL server")
    }
    databaseName = `sselfie_edit_reservation_${process.pid}_${Date.now()}`.toLowerCase()
    admin = new Client({ connectionString: suppliedUrl })
    await admin.connect()
    await admin.query(`CREATE DATABASE ${databaseName}`)
    parsed.pathname = `/${databaseName}`
    first = new Client({ connectionString: parsed.toString() })
    second = new Client({ connectionString: parsed.toString() })
    await Promise.all([first.connect(), second.connect()])
    await first.query(`
      CREATE TABLE users (id TEXT PRIMARY KEY);
      CREATE TABLE ai_images (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        image_url TEXT NOT NULL,
        variant_of INTEGER REFERENCES ai_images(id)
      );
      CREATE TABLE user_credits (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        balance INTEGER NOT NULL,
        total_used INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE credit_transactions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        description TEXT,
        reference_id TEXT,
        balance_after INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO users (id) VALUES ('member-a'), ('member-b'), ('admin-a');
      INSERT INTO ai_images (id, user_id, image_url) VALUES
        (1, 'member-a', 'https://assets.example/a.png'),
        (2, 'member-b', 'https://assets.example/b.png'),
        (3, 'admin-a', 'https://assets.example/admin.png');
      INSERT INTO user_credits (user_id, balance) VALUES
        ('member-a', 2), ('member-b', 0), ('admin-a', 10);
    `)
    const migration = fs.readFileSync(
      path.join(process.cwd(), "db/migrations/75-create-app-v3-maya-edit-reservations.sql"),
      "utf8"
    )
    await first.query(migration)
  }, 20_000)

  afterAll(async () => {
    await Promise.allSettled([first?.end(), second?.end()])
    if (admin && databaseName) {
      await admin.query(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`)
      await admin.end()
    }
  }, 20_000)

  it("allows exactly one winner for two simultaneous claims", async () => {
    const claimInput = {
      userId: "member-a",
      requestId: "request_123456",
      creditReference: "credit.member-a.request_123456",
      sourceImageId: 1,
      rootImageId: 1,
    }
    const [a, b] = await Promise.all([
      reserve({ client: first, ...claimInput }),
      reserve({ client: second, ...claimInput }),
    ])
    expect([a.rowCount, b.rowCount].sort()).toEqual([0, 1])
    const rows = await first.query(
      `SELECT status, credit_state FROM app_v3_maya_edit_requests
       WHERE user_id='member-a' AND request_id='request_123456'`
    )
    expect(rows.rows).toEqual([{ status: "reserved", credit_state: "not_charged" }])
  })

  it("serializes simultaneous charge attempts into one balance change and one ledger row", async () => {
    await reserve({
      client: first,
      userId: "member-a",
      requestId: "charge_race_123",
      creditReference: "credit.member-a.charge_race_123",
      sourceImageId: 1,
      rootImageId: 1,
    })
    const input: ConversationalEditChargeInput = {
      userId: "member-a",
      requestId: "charge_race_123",
      creditReference: "credit.member-a.charge_race_123",
      amount: 1,
      description: "atomic race",
      adminBypass: false,
    }
    const [a, b] = await Promise.all([charge(first, input), charge(second, input)])
    expect([a.outcome, b.outcome].sort()).toEqual(["charged", "unavailable"])
    const state = await first.query(`
      SELECT
        (SELECT balance FROM user_credits WHERE user_id='member-a') AS balance,
        (SELECT total_used FROM user_credits WHERE user_id='member-a') AS total_used,
        (SELECT COUNT(*)::int FROM credit_transactions
          WHERE reference_id='credit.member-a.charge_race_123') AS ledger_count,
        (SELECT status FROM app_v3_maya_edit_requests
          WHERE user_id='member-a' AND request_id='charge_race_123') AS status
    `)
    expect(state.rows[0]).toEqual({ balance: 1, total_used: 1, ledger_count: 1, status: "charged" })
  })

  it("rolls back balance, ledger, and reservation together when the ledger insert fails", async () => {
    await reserve({
      client: first,
      userId: "member-a",
      requestId: "rollback_123456",
      creditReference: "credit.member-a.rollback_123456",
      sourceImageId: 1,
      rootImageId: 1,
    })
    await first.query(`
      CREATE FUNCTION reject_atomic_edit_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.reference_id = 'credit.member-a.rollback_123456' THEN
          RAISE EXCEPTION 'ledger rejected';
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER reject_atomic_edit_ledger
        BEFORE INSERT ON credit_transactions FOR EACH ROW
        EXECUTE FUNCTION reject_atomic_edit_ledger();
    `)
    await expect(
      charge(first, {
        userId: "member-a",
        requestId: "rollback_123456",
        creditReference: "credit.member-a.rollback_123456",
        amount: 1,
        description: "must roll back",
        adminBypass: false,
      })
    ).rejects.toThrow(/ledger rejected/)
    const state = await first.query(`
      SELECT
        (SELECT balance FROM user_credits WHERE user_id='member-a') AS balance,
        (SELECT total_used FROM user_credits WHERE user_id='member-a') AS total_used,
        (SELECT COUNT(*)::int FROM credit_transactions
          WHERE reference_id='credit.member-a.rollback_123456') AS ledger_count,
        (SELECT status FROM app_v3_maya_edit_requests
          WHERE user_id='member-a' AND request_id='rollback_123456') AS status
    `)
    expect(state.rows[0]).toEqual({ balance: 1, total_used: 1, ledger_count: 0, status: "reserved" })
  })

  it("fails insufficient requests atomically and charges admins without a ledger deduction", async () => {
    await reserve({
      client: first,
      userId: "member-b",
      requestId: "no_credit_123",
      creditReference: "credit.member-b.no_credit_123",
      sourceImageId: 2,
      rootImageId: 2,
    })
    const insufficient = await charge(first, {
      userId: "member-b",
      requestId: "no_credit_123",
      creditReference: "credit.member-b.no_credit_123",
      amount: 1,
      description: "no credit",
      adminBypass: false,
    })
    expect(insufficient).toMatchObject({ outcome: "insufficient", new_balance: 0 })

    await reserve({
      client: first,
      userId: "admin-a",
      requestId: "admin_edit_123",
      creditReference: "credit.admin-a.admin_edit_123",
      sourceImageId: 3,
      rootImageId: 3,
    })
    const admin = await charge(first, {
      userId: "admin-a",
      requestId: "admin_edit_123",
      creditReference: "credit.admin-a.admin_edit_123",
      amount: 1,
      description: "admin edit",
      adminBypass: true,
    })
    expect(admin).toMatchObject({ outcome: "charged", new_balance: 10, credits_deducted: 0 })
    const state = await first.query(`
      SELECT
        (SELECT status FROM app_v3_maya_edit_requests
          WHERE user_id='member-b' AND request_id='no_credit_123') AS insufficient_status,
        (SELECT status FROM app_v3_maya_edit_requests
          WHERE user_id='admin-a' AND request_id='admin_edit_123') AS admin_status,
        (SELECT balance FROM user_credits WHERE user_id='admin-a') AS admin_balance,
        (SELECT COUNT(*)::int FROM credit_transactions
          WHERE reference_id='credit.admin-a.admin_edit_123') AS admin_ledger_count
    `)
    expect(state.rows[0]).toEqual({
      insufficient_status: "failed",
      admin_status: "charged",
      admin_balance: 10,
      admin_ledger_count: 0,
    })
  })

  it("rejects another member's source and a result outside the root lineage", async () => {
    await expect(
      first.query(
        `INSERT INTO app_v3_maya_edit_requests (
           user_id, request_id, credit_reference, source_image_id, root_image_id,
           instruction_digest
         ) VALUES ('member-a', 'foreign_123456', 'credit.member-a.foreign_123456', 2, 2, $1)`,
        [`sha256:${"b".repeat(64)}`]
      )
    ).rejects.toThrow(/same user and lineage/)

    await first.query(
      `UPDATE app_v3_maya_edit_requests
       SET status='charged', credit_state='charged'
       WHERE user_id='member-a' AND request_id='request_123456'`
    )
    await expect(
      first.query(
        `UPDATE app_v3_maya_edit_requests
         SET status='succeeded', result_image_id=2, completed_at=NOW()
         WHERE user_id='member-a' AND request_id='request_123456'`
      )
    ).rejects.toThrow(/same user and lineage/)
  })
})
