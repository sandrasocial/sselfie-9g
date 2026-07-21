// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const concierge = readFileSync("components/app-v3/maya-concierge.tsx", "utf8")

describe("Maya carousel ideas CTA feedback", () => {
  it("reveals the pre-generation thread when a graphic format still needs its text choice", () => {
    const handler = concierge.slice(
      concierge.indexOf("function handlePickFormat"),
      concierge.indexOf("function intentForCurrentVibeChoice")
    )

    expect(handler).toContain("setPreMessageThreadOpen(true)")
    expect(concierge).toContain("const threadVisible = hasStarted || preMessageThreadOpen")
    expect(concierge).toContain("aria-hidden={!threadVisible || setupOpen}")
  })

  it("scrolls the newly revealed text choice into view immediately", () => {
    const scrollEffect = concierge.slice(
      concierge.indexOf("scrollThreadToBottom()"),
      concierge.indexOf("// When a new look", concierge.indexOf("scrollThreadToBottom()"))
    )

    expect(scrollEffect).toContain("preMessageThreadOpen")
  })
})
