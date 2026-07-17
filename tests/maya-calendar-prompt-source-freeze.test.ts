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
    "f783c56642ec9dadafffc7a17d035dd8a35f228607f385efb223d0b0dd79c1d2",
  "lib/app-v3/maya/persona.ts": "e995f9938c50e7c557cec69dc2814330e27968b691df8afc4d915f235e82745a",
  "lib/app-v3/maya/visual-rules.ts":
    "bd53cdf79d1e96dbc0a47cd2ca3e26140c2ffcad3daa369ce5e85d055cdabb27",
  "lib/app-v3/maya/ingredients.ts":
    "aa7df713897336f5c47d427292d36d27cbcc28e9e1dece1151b0ee2cc3ddee05",
  "lib/app-v3/maya/creative-plan.ts":
    "2fe9e39c8d5b6088640a7b52418e3527cac8cb500d9cce128829443cd57fc9d7",
  "lib/app-v3/maya/vault-styles.ts":
    "a6cd5f6b87605de396fa846addb25f6652a914cc6ab9cf459240f087a62100bc",
  "lib/app-v3/maya/vault-styles-server.ts":
    "c6670ec5a543a36c1f99804300e6e7b57e25505c65026c2bc7277e3ce2fc9c96",
  "lib/app-v3/text-bake.ts": "a6783e82ba930b38c69fe8c447aab01a6ce8cd5da7a55fb6591d019e177af1e4",
  "app/api/app-v3/maya/chat/route.ts":
    "c6a0808bcacf55422f5e576fb1e506aeeee7a73fe939421bcdd760e482914ba0",
  "app/api/app-v3/maya/calendar-agent/route.ts":
    // Approved Calendar truth-gate change: Maya asks for one real story detail instead of
    // proposing invented autobiography.
    "efb2ebde7634a1459f400b4c0cd8e31c149e2f62e3d58dc9bdd3f3b791b26774",
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
