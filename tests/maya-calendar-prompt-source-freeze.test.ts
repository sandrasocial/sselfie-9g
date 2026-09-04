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
    // Sandra-approved Maya creative-treatment and exact-output contract (2026-09-04).
    "2748483b02b6638efdc4f06818593291c91a0b3391ee1ed72e576cffda963fbd",
  "lib/app-v3/maya/persona.ts":
    // Sandra-approved Maya creative-treatment selection (2026-09-04).
    "b39e9858bed01d14ace7e4337e2400c6d6961edf690b2fae991adbe44b7bac3c",
  "lib/content/hook-intelligence.ts":
    "9a995884f5cea518bd21a72527b279448b6c2b7918c0a23e8c5638dcb430d450",
  "lib/app-v3/maya/visual-rules.ts":
    "9a8f406553d3952af2945c1ecceabc56e05ff51e9a612990f1271f04e9611552",
  "lib/app-v3/maya/ingredients.ts":
    "2a0c0a3b2fb468668c30d5949a8cc46fdab409874d6b8de2ae054204641338dc",
  "lib/app-v3/maya/creative-plan.ts":
    "0f8019c71c33e17fc5b63e8e40c787c5d022fd61250fe940e62a7a8714e13ac1",
  "lib/app-v3/maya/vault-styles.ts":
    "a6cd5f6b87605de396fa846addb25f6652a914cc6ab9cf459240f087a62100bc",
  "lib/app-v3/maya/vault-styles-server.ts":
    "a4da8c2ac8c320c220ac372c3dbc6ac34b08ddc8e96af9478836169e70019877",
  "lib/app-v3/text-bake.ts": "a6783e82ba930b38c69fe8c447aab01a6ce8cd5da7a55fb6591d019e177af1e4",
  "app/api/app-v3/maya/chat/route.ts":
    // Sandra-approved Maya creative-treatment planner fields (2026-09-04).
    "465e1ebc35a30f761fcc8f4b5ab610bd35e53eab16a95358bc6c6297692e3a26",
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
