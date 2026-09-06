// @vitest-environment node
import { readFileSync } from "node:fs"
import { Client, Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ pool: null as Pool | null }))
vi.mock("@/lib/db/client", () => ({
  sql: async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const text = parts.reduce((query, part, i) => query + (i ? `$${i}` : "") + part, "")
    return (await state.pool!.query(text, values)).rows
  },
}))
// The library fixture is account scoped in PostgreSQL. All storage queries below
// are the real application SQL, executed over separate pool connections.
vi.mock("@/lib/data/images", () => ({
  getAllUserImages: async (userId: string) =>
    (await state.pool!.query("SELECT * FROM test_images WHERE user_id = $1", [userId])).rows,
}))

const suppliedUrl = process.env.TEST_DATABASE_URL
if (process.env.REQUIRE_MAYA_UPGRADE_POSTGRES_TESTS === "1" && !suppliedUrl) {
  throw new Error("TEST_DATABASE_URL is required for the Maya storage PostgreSQL gate")
}

const memory = () => import("@/lib/app-v3/maya/memory-store")
const gallery = () => import("@/lib/app-v3/gallery-details")

;(suppliedUrl ? describe : describe.skip)("Maya upgrade real PostgreSQL storage", () => {
  let admin: Client | undefined
  let databaseName: string | undefined

  beforeAll(async () => {
    const url = new URL(String(suppliedUrl))
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      throw new Error("Only an explicitly local PostgreSQL server is allowed")
    }
    admin = new Client({ connectionString: suppliedUrl })
    await admin.connect()
    const name = `maya_storage_${process.pid}_${Date.now()}`
    await admin.query(`CREATE DATABASE ${name}`)
    databaseName = name
    url.pathname = `/${name}`
    state.pool = new Pool({ connectionString: url.toString(), max: 8 })
    await state.pool.query(readFileSync("migrations/20260609_app_v3_memory.sql", "utf8"))
    await state.pool.query("INSERT INTO app_v3_memory (user_id, brand_notes) VALUES ('legacy', 'Keep my history')")
    await state.pool.query(`
      CREATE TABLE test_images (id text PRIMARY KEY, user_id text, image_url text);
      INSERT INTO test_images VALUES ('ai_1', 'alice', 'https://assets.example/one.jpg'), ('ai_2', 'bob', 'https://assets.example/two.jpg');
      CREATE TABLE feed_layouts (id integer PRIMARY KEY, user_id text);
      CREATE TABLE feed_posts (feed_layout_id integer, image_url text, is_posted boolean);
      INSERT INTO feed_layouts VALUES (1, 'alice'), (2, 'bob');
    `)
  })

  afterAll(async () => {
    await state.pool?.end()
    if (databaseName) await admin?.query(`DROP DATABASE ${databaseName} WITH (FORCE)`)
    await admin?.end()
  })

  it("applies both migrations twice without changing existing memory", async () => {
    for (let pass = 0; pass < 2; pass++) {
      for (const file of ["20260906_maya_memory_facts.sql", "20260906_maya_asset_details.sql"]) {
        await state.pool!.query(readFileSync(`migrations/${file}`, "utf8"))
      }
    }
    expect(await (await memory()).getMemory("legacy")).toMatchObject({ brandNotes: "Keep my history", facts: {} })
  })

  it("preserves concurrent updates to separate memory fields and topics", async () => {
    const { saveMemory, saveMemoryFact, getMemory } = await memory()
    await Promise.all([
      saveMemory("alice", { brandNotes: "My business" }),
      saveMemory("alice", { preferences: "Natural photos" }),
      saveMemoryFact("alice", { key: "voice", value: "Warm", source: "Warm" }),
      saveMemoryFact("alice", { key: "offer", value: "Coaching", source: "Coaching" }),
    ])
    expect(await getMemory("alice")).toMatchObject({
      brandNotes: "My business", preferences: "Natural photos",
      facts: { voice: { value: "Warm" }, offer: { value: "Coaching" } },
    })
  })

  it("persists correction and forgetting without affecting another member", async () => {
    const { saveMemoryFact, getMemory } = await memory()
    await saveMemoryFact("bob", { key: "offer", value: "Courses", source: "Courses" })
    await saveMemoryFact("alice", { key: "offer", value: "Workshops", source: "Workshops" })
    expect((await getMemory("alice")).facts?.offer?.value).toBe("Workshops")
    await saveMemoryFact("alice", { key: "offer", value: null, source: "Forget my offer" })
    expect((await getMemory("alice")).facts?.offer?.value).toBeNull()
    expect((await getMemory("bob")).facts?.offer?.value).toBe("Courses")
  })

  it("keeps concurrent photo patches and persists explicit clearing", async () => {
    const { saveGalleryDetails, readGalleryDetails } = await gallery()
    await Promise.all([
      saveGalleryDetails("alice", "ai_1", { description: "Coffee by a window" }),
      saveGalleryDetails("alice", "ai_1", { labels: "morning, coffee" }),
      saveGalleryDetails("alice", "ai_1", { used: true }),
    ])
    expect((await readGalleryDetails("alice"))[0]).toMatchObject({ description: "Coffee by a window", labels: "morning, coffee", used_at: expect.any(Date) })
    await saveGalleryDetails("alice", "ai_1", { labels: "", used: false })
    expect((await readGalleryDetails("alice"))[0]).toMatchObject({ description: "Coffee by a window", labels: "", used_at: null })
  })

  it("rejects another member's asset before any metadata write", async () => {
    const { saveGalleryDetails, readGalleryDetails } = await gallery()
    expect(await saveGalleryDetails("bob", "ai_1", { description: "Overwrite" })).toBeNull()
    expect(await readGalleryDetails("bob")).toEqual([])
    expect((await readGalleryDetails("alice"))[0].description).toBe("Coffee by a window")
  })

  it("uses account-scoped posted status even when manual use is cleared", async () => {
    const { ownedGalleryPhotos } = await gallery()
    await state.pool!.query("INSERT INTO feed_posts VALUES (2, 'https://assets.example/one.jpg', true)")
    expect((await ownedGalleryPhotos("alice"))[0].isUsed).toBe(false)
    await state.pool!.query("INSERT INTO feed_posts VALUES (1, 'https://assets.example/one.jpg', true)")
    expect((await ownedGalleryPhotos("alice"))[0].isUsed).toBe(true)
  })
})
