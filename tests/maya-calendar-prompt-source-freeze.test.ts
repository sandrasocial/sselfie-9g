// @vitest-environment node

import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Sandra's explicit Create-redesign lock (2026-07-17): the proven Calendar/feed templates and
// Maya's existing Suite prompt system must not change as a side effect of this visual/state UX
// project. These source hashes intentionally cover every prompt-bearing surface in scope. A hash
// may only be updated for a separately approved prompt change, never to make this test pass.
const FROZEN_PROMPT_SOURCES = {
  "lib/feed-planner/feed-style-prompt-loader.ts":
    "52d5337598fd7ad8f32d0b90d7abda306cd139ef6026177d09ce10cb1030e931",
  "lib/feed-planner/feed-style-generation.ts":
    "f605f9110916ef9ad22c6e1fae5ac233cf1696b07ac8db1d1a7a19b08030d987",
  "lib/feed-planner/feed-prompt-expert.ts":
    "682148dbea18652332c5dfd03afc6487a5f502d014eadafcb99ca128480d219b",
  "lib/app-v3/prompt-compiler.ts":
    // Sandra-approved Track B carousel copy contract (2026-07-20).
    "7e8d25e36014eb0ba089c9b6290ad98e547345b2d0969bb187373e87be36cebc",
  "lib/app-v3/maya/persona.ts":
    // Sandra-approved global Maya Hook Intelligence upgrade (2026-07-31).
    "6d8edd4ae61588b6266d0e3eebcae00be6b1dbe60808b55896cf224f19e87ec2",
  "lib/content/hook-intelligence.ts":
    "9a995884f5cea518bd21a72527b279448b6c2b7918c0a23e8c5638dcb430d450",
  "lib/app-v3/maya/visual-rules.ts":
    "bd53cdf79d1e96dbc0a47cd2ca3e26140c2ffcad3daa369ce5e85d055cdabb27",
  "lib/app-v3/maya/ingredients.ts":
    "aa7df713897336f5c47d427292d36d27cbcc28e9e1dece1151b0ee2cc3ddee05",
  "lib/app-v3/maya/creative-plan.ts":
    "0f8019c71c33e17fc5b63e8e40c787c5d022fd61250fe940e62a7a8714e13ac1",
  "lib/app-v3/maya/vault-styles.ts":
    "a6cd5f6b87605de396fa846addb25f6652a914cc6ab9cf459240f087a62100bc",
  "lib/app-v3/maya/vault-styles-server.ts":
    "c6670ec5a543a36c1f99804300e6e7b57e25505c65026c2bc7277e3ce2fc9c96",
  "lib/app-v3/text-bake.ts": "a6783e82ba930b38c69fe8c447aab01a6ce8cd5da7a55fb6591d019e177af1e4",
  "app/api/app-v3/maya/chat/route.ts":
    // Sandra-approved format confirmation (2026-08-18): neutral Maya recommends one format
    // through a visible confirmation instead of silently committing it. The dormant Calendar
    // boundary remains explicit-task-only.
    "fbdf35d39b0e3d423d9cde2b1e8459eda64a98275b6ee271e1e03e39dff74fa3",
  "app/api/app-v3/maya/calendar-agent/route.ts":
    // Sandra-approved API cost controls (2026-07-21): use Haiku and omit repeated captions
    // while preserving the selected post context and existing system prompt.
    "3cc7b5e768c21494f953810d60ae0a6a64a8f7c3984656fc8ebfbd5e1d4516de",
} as const

function sourceHash(path: string) {
  return createHash("sha256")
    .update(readFileSync(resolve(process.cwd(), path)))
    .digest("hex")
}

describe("Maya and Calendar prompt source freeze", () => {
  for (const [path, expectedHash] of Object.entries(FROZEN_PROMPT_SOURCES)) {
    it(`keeps ${path} byte-identical`, () => {
      expect(sourceHash(path)).toBe(expectedHash)
    })
  }
})
