// @vitest-environment node

import { Client, type QueryResult } from "pg"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: {} }))
vi.mock("@/lib/analytics/schema", () => ({ ensureAnalyticsSchema: vi.fn() }))

const suppliedUrl = process.env.TEST_DATABASE_URL
if (process.env.REQUIRE_READY_POST_POSTGRES_TESTS === "1" && !suppliedUrl) {
  throw new Error("TEST_DATABASE_URL is required for the ready-post PostgreSQL gate")
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

localDescribe("Maya ready-post real PostgreSQL transaction", () => {
  let admin: Client
  let first: Client
  let second: Client
  let databaseName: string

  async function executeReadyPost(
    client: Client,
    input: {
      userId: string
      assetIds: number[]
      finishedCaption: string
      conceptTitle?: string
      periodMonth: string
      feedStyle: string
    }
  ): Promise<QueryResult> {
    const { buildMayaReadyPostTransactionQueries, normalizeReadyPostInput } =
      await import("@/lib/app-v3/maya/ready-post")
    const queries = buildMayaReadyPostTransactionQueries(
      pgTag,
      input,
      normalizeReadyPostInput(input)
    ) as PgQuery[]

    await client.query("BEGIN")
    try {
      let result: QueryResult = await client.query("SELECT 1 WHERE FALSE")
      for (const query of queries) result = await client.query(query.text, query.values)
      await client.query("COMMIT")
      return result
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  }

  beforeAll(async () => {
    const parsed = new URL(String(suppliedUrl))
    if (!(["127.0.0.1", "localhost", "::1"] as const).includes(parsed.hostname as never)) {
      throw new Error("TEST_DATABASE_URL must point to an explicitly local PostgreSQL server")
    }
    databaseName = `sselfie_ready_post_${process.pid}_${Date.now()}`.toLowerCase()
    admin = new Client({ connectionString: suppliedUrl })
    await admin.connect()
    await admin.query(`CREATE DATABASE ${databaseName}`)
    parsed.pathname = `/${databaseName}`
    first = new Client({ connectionString: parsed.toString() })
    second = new Client({ connectionString: parsed.toString() })
    await Promise.all([first.connect(), second.connect()])
    await first.query(`
      CREATE TABLE feed_layouts (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        layout_type TEXT,
        status TEXT,
        feed_style TEXT,
        feed_style_variation_id TEXT,
        period_month TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE ai_images (
        id BIGINT PRIMARY KEY,
        user_id TEXT NOT NULL,
        image_url TEXT
      );
      CREATE TABLE feed_posts (
        id BIGSERIAL PRIMARY KEY,
        feed_layout_id BIGINT NOT NULL REFERENCES feed_layouts(id),
        user_id TEXT NOT NULL,
        position INT NOT NULL,
        post_type TEXT,
        content_pillar TEXT,
        scheduled_at DATE NOT NULL,
        generation_status TEXT,
        image_url TEXT,
        ai_image_id BIGINT,
        caption TEXT,
        media_urls JSONB NOT NULL DEFAULT '[]'::jsonb
      );
      CREATE TABLE analytics_events (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT,
        event_name TEXT NOT NULL,
        path TEXT,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO ai_images (id, user_id, image_url) VALUES
        (1, 'new-layout', 'https://assets.example/one.jpg'),
        (2, 'full-layout', 'https://assets.example/two.jpg'),
        (3, 'rollback-user', 'https://assets.example/three.jpg'),
        (4, 'concurrent-user', 'https://assets.example/four.jpg');
    `)
  }, 20_000)

  afterAll(async () => {
    await Promise.allSettled([first?.end(), second?.end()])
    if (admin && databaseName) {
      await admin.query(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`)
      await admin.end()
    }
  }, 20_000)

  it("creates a fully populated first post and returns the same receipt on retry", async () => {
    const input = {
      userId: "new-layout",
      assetIds: [1],
      finishedCaption: "Ready once.",
      periodMonth: "2026-08",
      feedStyle: "editorial",
    }
    const firstSave = await executeReadyPost(first, input)
    const retry = await executeReadyPost(first, input)

    expect(firstSave.rows[0]).toMatchObject({ position: 1, already_placed: false })
    expect(retry.rows[0]).toMatchObject({ position: 1, already_placed: true })
    const stored = await first.query(
      `SELECT generation_status, image_url, caption, media_urls FROM feed_posts WHERE user_id=$1`,
      [input.userId]
    )
    expect(stored.rows).toEqual([
      {
        generation_status: "completed",
        image_url: "https://assets.example/one.jpg",
        caption: "Ready once.",
        media_urls: ["https://assets.example/one.jpg"],
      },
    ])
    const events = await first.query(
      `SELECT COUNT(*)::int AS count FROM analytics_events WHERE user_id=$1`,
      [input.userId]
    )
    expect(events.rows[0].count).toBe(1)
  })

  it("directly inserts the completed extension slot when the existing layout is full", async () => {
    const layout = await first.query<{ id: string }>(
      `INSERT INTO feed_layouts (user_id, period_month, feed_style) VALUES ($1,$2,$3) RETURNING id`,
      ["full-layout", "2026-08", "editorial"]
    )
    await first.query(
      `INSERT INTO feed_posts (
         feed_layout_id,user_id,position,post_type,scheduled_at,generation_status,image_url,media_urls
       ) VALUES ($1,$2,1,'selfie',CURRENT_DATE,'completed','https://assets.example/old.jpg','["https://assets.example/old.jpg"]')`,
      [layout.rows[0].id, "full-layout"]
    )

    const result = await executeReadyPost(first, {
      userId: "full-layout",
      assetIds: [2],
      finishedCaption: "Second slot.",
      periodMonth: "2026-08",
      feedStyle: "editorial",
    })

    expect(result.rows[0]).toMatchObject({ position: 2, already_placed: false })
    const rows = await first.query(
      `SELECT position,generation_status,image_url FROM feed_posts WHERE user_id=$1 ORDER BY position`,
      ["full-layout"]
    )
    expect(rows.rows[1]).toEqual({
      position: 2,
      generation_status: "completed",
      image_url: "https://assets.example/two.jpg",
    })
  })

  it("rolls back layout and post when the canonical event insert fails", async () => {
    await first.query(`
      CREATE FUNCTION reject_ready_post_event() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.user_id = 'rollback-user' THEN RAISE EXCEPTION 'event rejected'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER reject_ready_post_event
        BEFORE INSERT ON analytics_events FOR EACH ROW EXECUTE FUNCTION reject_ready_post_event();
    `)

    await expect(
      executeReadyPost(first, {
        userId: "rollback-user",
        assetIds: [3],
        finishedCaption: "Must roll back.",
        periodMonth: "2026-08",
        feedStyle: "editorial",
      })
    ).rejects.toThrow("event rejected")
    const counts = await first.query(
      `SELECT
         (SELECT COUNT(*)::int FROM feed_layouts WHERE user_id=$1) AS layouts,
         (SELECT COUNT(*)::int FROM feed_posts WHERE user_id=$1) AS posts`,
      ["rollback-user"]
    )
    expect(counts.rows[0]).toEqual({ layouts: 0, posts: 0 })
  })

  it("does not create hidden Calendar state for a missing or foreign asset", async () => {
    await expect(
      executeReadyPost(first, {
        userId: "foreign-asset-user",
        assetIds: [1],
        finishedCaption: "Must not write.",
        periodMonth: "2026-08",
        feedStyle: "editorial",
      })
    ).resolves.toMatchObject({ rows: [] })

    const counts = await first.query(
      `SELECT
         (SELECT COUNT(*)::int FROM feed_layouts WHERE user_id=$1) AS layouts,
         (SELECT COUNT(*)::int FROM feed_posts WHERE user_id=$1) AS posts,
         (SELECT COUNT(*)::int FROM analytics_events WHERE user_id=$1) AS events`,
      ["foreign-asset-user"]
    )
    expect(counts.rows[0]).toEqual({ layouts: 0, posts: 0, events: 0 })
  })

  it("serializes concurrent identical first saves into one post and one event", async () => {
    const input = {
      userId: "concurrent-user",
      assetIds: [4],
      finishedCaption: "One concurrent save.",
      periodMonth: "2026-08",
      feedStyle: "editorial",
    }
    const [a, b] = await Promise.all([
      executeReadyPost(first, input),
      executeReadyPost(second, input),
    ])

    expect([a.rows[0].already_placed, b.rows[0].already_placed].sort()).toEqual([false, true])
    const counts = await first.query(
      `SELECT
         (SELECT COUNT(*)::int FROM feed_layouts WHERE user_id=$1) AS layouts,
         (SELECT COUNT(*)::int FROM feed_posts WHERE user_id=$1) AS posts,
         (SELECT COUNT(*)::int FROM analytics_events WHERE user_id=$1) AS events`,
      [input.userId]
    )
    expect(counts.rows[0]).toEqual({ layouts: 1, posts: 1, events: 1 })
  })
})
