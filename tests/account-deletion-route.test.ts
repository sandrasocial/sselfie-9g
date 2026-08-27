import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  sql: vi.fn(),
  queries: [] as Array<{ text: string; values: unknown[] }>,
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
  getUserByAuthId: vi.fn(async () => ({ id: "neon-qa-user", email: "qa@example.com" })),
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
    mocks.queries.length = 0
    mocks.deleteUser.mockReset().mockResolvedValue({ error: null })
    mocks.sql
      .mockReset()
      .mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = strings.join("?")
        mocks.queries.push({ text: query, values })
        if (query.includes("user_style_guide")) {
          return Promise.reject(
            Object.assign(new Error("relation does not exist"), { code: "42P01" })
          )
        }
        return Promise.resolve([])
      })
  })

  it("finishes deletion when a retired optional table is absent", async () => {
    const { DELETE } = await import("@/app/api/user/delete/route")

    const generation = "44444444-4444-4444-8444-444444444444"
    const response = await DELETE(
      new NextRequest("https://sselfie.ai/api/user/delete", {
        method: "DELETE",
        headers: { "x-sselfie-analytics-generation": generation },
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mocks.deleteUser).toHaveBeenCalledWith("auth-qa-user")
    expect(response.headers.get("set-cookie")).toContain(
      "sselfie_anon_id_44444444444444448444444444444444="
    )
    expect(response.headers.get("set-cookie")).toContain("sselfie_posthog_reset=1")
    expect(mocks.queries).toContainEqual(
      expect.objectContaining({
        text: expect.stringContaining("DELETE FROM freebie_brand_strategies WHERE email"),
        values: ["qa@example.com"],
      })
    )
  })

  it("rotates analytics identity when Neon deletion succeeds but auth deletion fails", async () => {
    mocks.deleteUser.mockResolvedValue({ error: new Error("auth provider unavailable") })
    const { DELETE } = await import("@/app/api/user/delete/route")

    const response = await DELETE(
      new NextRequest("https://sselfie.ai/api/user/delete", { method: "DELETE" })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toContain("sselfie_anon_id=")
    expect(response.headers.get("set-cookie")).toContain("sselfie_posthog_reset=1")
  })
})
