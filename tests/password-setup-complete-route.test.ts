// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  sql: vi.fn(),
  queries: [] as Array<{ text: string; values: unknown[] }>,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
  })),
}))

vi.mock("@/lib/db/client", () => ({
  sql: mocks.sql,
}))

describe("POST /api/auth/password-setup-complete", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getUser.mockReset()
    mocks.sql.mockReset()
    mocks.queries.length = 0
    mocks.sql.mockImplementation(
      (strings: TemplateStringsArray, ...values: unknown[]) => {
        mocks.queries.push({ text: strings.join("?"), values })
        return Promise.resolve([{ id: "neon-user-1" }])
      }
    )
  })

  it("rejects unauthenticated requests", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { POST } = await import("@/app/api/auth/password-setup-complete/route")
    const response = await POST()

    expect(response.status).toBe(401)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("marks only the authenticated user's password setup complete", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "auth-user-1", email: "member@example.com" } },
      error: null,
    })

    const { POST } = await import("@/app/api/auth/password-setup-complete/route")
    const response = await POST()

    expect(response.status).toBe(200)
    expect(mocks.queries).toContainEqual({
      text: expect.stringContaining("SET password_setup_complete = TRUE"),
      values: ["auth-user-1", "member@example.com"],
    })
  })
})
