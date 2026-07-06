// @vitest-environment node
// Guards the shared admin fetch helper: Vercel timeout/error pages are plain text
// ("An error occurred..."), and raw response.json() on them surfaced as
// "Unexpected token 'A' ... is not valid JSON" across admin pages.

import { describe, expect, it } from "vitest"
import { readAdminJson, readJsonResponse } from "@/lib/admin/safe-fetch-json"

function textResponse(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain" } })
}

describe("readJsonResponse (strict)", () => {
  it("parses valid JSON", async () => {
    const res = new Response(JSON.stringify({ success: true, n: 1 }), { status: 200 })
    await expect(readJsonResponse(res)).resolves.toEqual({ success: true, n: 1 })
  })

  it("returns an empty object for an empty body", async () => {
    await expect(readJsonResponse(textResponse(""))).resolves.toEqual({})
  })

  it("throws a readable error (with status) for plain-text error pages", async () => {
    await expect(
      readJsonResponse(textResponse("An error occurred with your deployment", 500))
    ).rejects.toThrow(/non-JSON error \(500\).*An error occurred/)
  })
})

describe("readAdminJson (lenient)", () => {
  it("parses valid JSON", async () => {
    const res = new Response(JSON.stringify({ events: [] }), { status: 200 })
    await expect(readAdminJson(res)).resolves.toEqual({ events: [] })
  })

  it("returns null for an empty body", async () => {
    await expect(readAdminJson(textResponse(""))).resolves.toBeNull()
  })

  it("never throws: 504 timeouts become a friendly error payload", async () => {
    const result = await readAdminJson(textResponse("An error occurred", 504))
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timed out/)
  })

  it("never throws: other plain-text errors keep the status and an excerpt", async () => {
    const result = await readAdminJson(textResponse("An error occurred", 500))
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/non-JSON error \(500\).*An error occurred/)
  })
})
