import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("maya chat type constraint hygiene", () => {
  it("includes the videos chat type in the latest maya chat constraint migration", () => {
    const migrationPath = join(
      process.cwd(),
      "migrations",
      "20260311_add_maya_videos_chat_type.sql",
    )
    const sql = readFileSync(migrationPath, "utf-8")

    expect(sql).toContain("CHECK (chat_type IN ('maya', 'pro', 'videos', 'feed_planner', 'prompt_builder', 'pro-photoshoot'))")
  })
})
