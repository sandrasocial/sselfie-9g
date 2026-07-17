import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "auth-qa-user" } },
      })),
    },
  })),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { deleteUser: mocks.deleteUser } },
  })),
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserByAuthId: vi.fn(async () => ({ id: "neon-qa-user" })),
}))

vi.mock("@/lib/subscription", () => ({
  getUserSubscription: vi.fn(async () => null),
}))

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({
  sql: mocks.sql,
}))

describe("DELETE /api/user/delete", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.deleteUser.mockReset().mockResolvedValue({ error: null })
    mocks.sql.mockReset().mockImplementation((strings: TemplateStringsArray) => {
      const query = strings.join("?")
      if (query.includes("user_style_guide")) {
        return Promise.reject(Object.assign(new Error("relation does not exist"), { code: "42P01" }))
      }
      return Promise.resolve([])
    })
  })

  it("finishes deletion when a retired optional table is absent", async () => {
    const { DELETE } = await import("@/app/api/user/delete/route")

    const response = await DELETE()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mocks.deleteUser).toHaveBeenCalledWith("auth-qa-user")
  })
})
