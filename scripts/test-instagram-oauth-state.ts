// Quick verification of the signed Instagram OAuth state (lib/instagram/oauth-state).
// Run: npx tsx scripts/test-instagram-oauth-state.ts

process.env.INSTAGRAM_STATE_SECRET = process.env.INSTAGRAM_STATE_SECRET || "test-secret"

import { createInstagramOAuthState, verifyInstagramOAuthState } from "../lib/instagram/oauth-state"

const state = createInstagramOAuthState("facebook_page", "user-123")
const checks: Array<[string, boolean]> = [
  ["valid state verifies", verifyInstagramOAuthState(state)?.userId === "user-123"],
  ["valid provider round-trips", verifyInstagramOAuthState(state)?.provider === "facebook_page"],
  ["tampered userId rejected", verifyInstagramOAuthState(state.replace("user-123", "victim-9")) === null],
  ["tampered provider rejected", verifyInstagramOAuthState(state.replace("facebook_page", "instagram_login")) === null],
  ["legacy bare userId rejected", verifyInstagramOAuthState("some-user-id") === null],
  ["legacy prefixed state rejected", verifyInstagramOAuthState("instagram_login:some-user-id") === null],
  ["empty state rejected", verifyInstagramOAuthState("") === null],
  ["null state rejected", verifyInstagramOAuthState(null) === null],
]

let failed = 0
for (const [name, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"}: ${name}`)
  if (!pass) failed += 1
}
if (failed > 0) {
  console.error(`${failed} check(s) failed`)
  process.exit(1)
}
console.log("all checks passed")
