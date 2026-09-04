// @vitest-environment node
//
// Maya inference is a paid surface. These pin that.
//
// The bug: /api/app-v3/maya/chat (7 LLM call sites), /api/maya/chat (28) and
// /api/app-v3/maya/recommendations (4) each authenticated the caller and then
// called a language model — no membership check, no credit cost, no ceiling —
// while the image route beside them gated on all three. Account creation is
// free, so the most expensive surface in the product was the one anybody could
// use without paying.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const source = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8")

const LLM_ROUTES = [
  "app/api/app-v3/maya/chat/route.ts",
  "app/api/maya/chat/route.ts",
  "app/api/app-v3/maya/recommendations/route.ts",
]

describe("every LLM route is gated", () => {
  it.each(LLM_ROUTES)("%s calls requireMayaInferenceAccess", path => {
    const s = source(path)
    expect(s).toContain("requireMayaInferenceAccess")
    expect(s).toContain("inferenceAccess.allowed")
  })

  it.each(LLM_ROUTES)("%s refuses before reaching the model", path => {
    const s = source(path)
    const gate = s.indexOf("if (!inferenceAccess.allowed)")
    expect(gate).toBeGreaterThan(-1)

    // Every provider call site must sit after the gate.
    for (const call of ["streamText(", "generateText(", "generateObject("]) {
      let from = 0
      for (;;) {
        const at = s.indexOf(call, from)
        if (at === -1) break
        expect(at).toBeGreaterThan(gate)
        from = at + 1
      }
    }
  })

  it("uses one shared helper, not three copies of the rule", () => {
    for (const path of LLM_ROUTES) {
      expect(source(path)).toContain('from "@/lib/maya/require-inference-access"')
    }
  })

  it("leaves chat history ungated — reading is not inference", () => {
    // History is a different route and must stay open to excluded plans.
    expect(source("app/api/app-v3/maya/chats/route.ts")).not.toContain(
      "requireMayaInferenceAccess"
    )
  })
})

describe("requireMayaInferenceAccess", () => {
  const getSuiteAccess = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    getSuiteAccess.mockReset()
    vi.doMock("@/lib/trial/suite-trial", () => ({ getSuiteAccess }))
    vi.doMock("@/lib/admin-feature-flags", () => ({
      isAdminEmail: (email?: string | null) => email === "ssa@ssasocial.com",
    }))
  })

  afterEach(() => {
    vi.doUnmock("@/lib/trial/suite-trial")
    vi.doUnmock("@/lib/admin-feature-flags")
    vi.resetModules()
  })

  const load = async () => (await import("@/lib/maya/require-inference-access")).requireMayaInferenceAccess

  it.each(["member", "trial", "vault"])("allows %s", async level => {
    getSuiteAccess.mockResolvedValue({ level })
    const fn = await load()
    await expect(fn({ neonUserId: "u1", email: "her@example.com" })).resolves.toMatchObject({
      allowed: true,
      level,
    })
  })

  it.each(["limited", "none"])("refuses %s", async level => {
    getSuiteAccess.mockResolvedValue({ level })
    const fn = await load()
    const result = await fn({ neonUserId: "u1", email: "her@example.com" })
    expect(result.allowed).toBe(false)
    expect(result).toMatchObject({
      status: 403,
      body: { code: "maya_membership_required" },
    })
  })

  it("lets the admin through without an entitlement lookup", async () => {
    const fn = await load()
    await expect(fn({ neonUserId: null, email: "ssa@ssasocial.com" })).resolves.toMatchObject({
      allowed: true,
      level: "admin",
    })
    expect(getSuiteAccess).not.toHaveBeenCalled()
  })

  it("refuses when the user cannot be resolved", async () => {
    const fn = await load()
    await expect(fn({ neonUserId: null, email: "her@example.com" })).resolves.toMatchObject({
      allowed: false,
    })
    expect(getSuiteAccess).not.toHaveBeenCalled()
  })

  it("FAILS CLOSED when the entitlement lookup throws", async () => {
    // The /app gate's old catch did the opposite and silently downgraded members.
    // Here the cost of being wrong is an unbounded provider bill, so deny.
    getSuiteAccess.mockRejectedValue(new Error("connection terminated"))
    const fn = await load()
    await expect(fn({ neonUserId: "u1", email: "her@example.com" })).resolves.toMatchObject({
      allowed: false,
      status: 403,
    })
  })
})
