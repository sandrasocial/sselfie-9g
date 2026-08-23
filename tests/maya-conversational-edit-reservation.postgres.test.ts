// @vitest-environment node

import fs from "node:fs"
import path from "node:path"

import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const suppliedUrl = process.env.TEST_DATABASE_URL
if (process.env.REQUIRE_EDIT_RESERVATION_POSTGRES_TESTS === "1" && !suppliedUrl) {
  throw new Error("TEST_DATABASE_URL is required for the edit reservation PostgreSQL gate")
}
const localDescribe = suppliedUrl ? describe : describe.skip

localDescribe("Maya conversational edit reservation real PostgreSQL races", () => {
  let admin: Client
  let first: Client
  let second: Client
  let databaseName: string

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
      INSERT INTO users (id) VALUES ('member-a'), ('member-b');
      INSERT INTO ai_images (id, user_id, image_url) VALUES
        (1, 'member-a', 'https://assets.example/a.png'),
        (2, 'member-b', 'https://assets.example/b.png');
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
    const claim = (client: Client) =>
      client.query(
        `INSERT INTO app_v3_maya_edit_requests (
           user_id, request_id, credit_reference, source_image_id, root_image_id,
           instruction_digest
         ) VALUES ('member-a', 'request_123456', 'credit.member-a.request_123456', 1, 1, $1)
         ON CONFLICT (user_id, request_id) DO NOTHING RETURNING id`,
        [`sha256:${"a".repeat(64)}`]
      )
    const [a, b] = await Promise.all([claim(first), claim(second)])
    expect([a.rowCount, b.rowCount].sort()).toEqual([0, 1])
    const rows = await first.query(
      `SELECT status, credit_state FROM app_v3_maya_edit_requests
       WHERE user_id='member-a' AND request_id='request_123456'`
    )
    expect(rows.rows).toEqual([{ status: "reserved", credit_state: "not_charged" }])
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
