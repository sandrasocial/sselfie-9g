import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  MAYA_CHAT_TYPE_DEFAULT,
  MAYA_CHAT_TYPE_PRO,
  MAYA_CHAT_TYPE_VIDEOS,
  MAYA_CHAT_TYPE_FEED_PLANNER,
  MAYA_CHAT_TYPE_PLAN,
  MAYA_CHAT_TYPE_PROMPT_BUILDER,
  MAYA_CHAT_TYPE_PRO_PHOTOSHOOT,
} from "@/lib/maya/chat-type"

// The latest maya_chats.chat_type CHECK-constraint migration. When a new chat_type is added,
// bump this to the new migration file so the guard below verifies the live constraint allows it.
const LATEST_CHAT_TYPE_MIGRATION = "20260615_add_maya_plan_chat_type.sql"

// Every chat_type the app PERSISTS into maya_chats. Each must be allowed by the latest
// constraint migration, or Postgres rejects the insert (error 23514) and Maya crashes on load —
// exactly the maya_plan regression this guard now prevents.
const PERSISTED_CHAT_TYPES = [
  MAYA_CHAT_TYPE_DEFAULT,
  MAYA_CHAT_TYPE_PRO,
  MAYA_CHAT_TYPE_VIDEOS,
  MAYA_CHAT_TYPE_FEED_PLANNER,
  MAYA_CHAT_TYPE_PLAN,
  MAYA_CHAT_TYPE_PROMPT_BUILDER,
  MAYA_CHAT_TYPE_PRO_PHOTOSHOOT,
]

describe("maya chat type constraint hygiene", () => {
  const sql = readFileSync(
    join(process.cwd(), "migrations", LATEST_CHAT_TYPE_MIGRATION),
    "utf-8",
  )

  it.each(PERSISTED_CHAT_TYPES)(
    "allows persisted chat_type '%s' in the latest constraint migration",
    (chatType) => {
      expect(sql).toContain(`'${chatType}'`)
    },
  )

  it("rebuilds the maya_chats_chat_type_check constraint", () => {
    expect(sql).toContain("maya_chats_chat_type_check")
    expect(sql).toContain("CHECK (chat_type IN")
  })
})
