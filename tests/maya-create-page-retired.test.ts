import { describe, expect, it } from "vitest"

describe("POST /api/maya/create-page", () => {
  it("returns gone while landing page drafts are retired", async () => {
    const { POST } = await import("@/app/api/maya/create-page/route")

    const response = await POST(new Request("http://localhost:3000/api/maya/create-page", { method: "POST" }) as any)
    const payload = await response.json()

    expect(response.status).toBe(410)
    expect(payload.error).toMatch(/retired/i)
  })
})
