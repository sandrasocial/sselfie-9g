// @vitest-environment node
// Regression test for a fixed double-execution bug: the paid-blueprint webhook handler
// used to run the "expand feed from 1 post to 9 posts" logic twice in a row for users who
// already had a blueprint_subscribers record (once inline inside the `if` branch, once more
// unconditionally right after the if/else). It was harmless only because the position filter
// made the second run a no-op, but it doubled DB round-trips and logs on every webhook.
//
// The fix extracts the logic into a single named function (`expandFeedToNinePosts`) that is
// defined once and called exactly once. This test source-checks the file so the duplication
// can never silently creep back in.
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("paid-blueprint feed expansion is not duplicated", () => {
  const contents = read("lib/payments/handlers/paid-blueprint.ts")

  it("defines the feed-expansion helper exactly once", () => {
    const definitionMatches = contents.match(/async function expandFeedToNinePosts\(/g) ?? []
    expect(definitionMatches).toHaveLength(1)
  })

  it("calls the feed-expansion helper exactly once", () => {
    const callMatches = contents.match(/(?<!async function )expandFeedToNinePosts\(userId\)/g) ?? []
    expect(callMatches).toHaveLength(1)
  })

  it("does not contain a second inline copy of the expansion SQL", () => {
    // The expansion logic queries feed_layouts then feed_posts by position, and builds a
    // positionsToCreate list. Each of these markers must appear exactly as many times as
    // the single helper definition uses them -- if a duplicate inline block ever creeps
    // back in, these counts double.
    const feedLayoutsLookups = contents.match(/FROM feed_layouts/g) ?? []
    const positionsToCreateOccurrences = contents.match(/positionsToCreate/g) ?? []
    const feedExpansionLogTag = contents.match(/\[FEED EXPANSION\]/g) ?? []

    // One SELECT against feed_layouts inside expandFeedToNinePosts itself.
    expect(feedLayoutsLookups).toHaveLength(1)
    // "positionsToCreate" appears 5 times within the single helper (const declaration,
    // the log call, the string interpolation, the length check, and the for-loop).
    expect(positionsToCreateOccurrences).toHaveLength(5)
    // The "[FEED EXPANSION]" log tag appears 6 times within the single helper (start,
    // positions log, creating log, created log, no-positions log, no-feed log) plus
    // once more in the error log -- 7 total for exactly one copy of the block.
    expect(feedExpansionLogTag).toHaveLength(7)
  })
})
