// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: vi.fn(async () => ({
    user: { id: "auth-vault-1", email: "member@example.com" },
    error: null,
  })),
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserIdFromSupabase: vi.fn(async () => "neon-vault-1"),
}))

vi.mock("@/lib/admin-feature-flags", () => ({ isAdminEmail: vi.fn(() => false) }))
vi.mock("@/lib/trial/suite-trial", () => ({
  getSuiteAccess: vi.fn(async () => ({ level: "vault" })),
}))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@vercel/blob", () => ({ put: mocks.put, del: mocks.del }))

describe("Vault Maya next-drop inspiration upload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sql.mockResolvedValueOnce([{ n: 0 }]).mockResolvedValueOnce([])
    mocks.put.mockResolvedValue({ url: "https://blob.example.com/inspiration.png" })
    mocks.del.mockResolvedValue(undefined)
  })

  it("accepts an image and message and saves the uploaded URL with the request", async () => {
    const { POST } = await import("@/app/api/vault-maya/drop-requests/route")
    const form = new FormData()
    form.append("message", "A soft studio shoot")
    form.append("inspiration", new Blob(["image"], { type: "image/png" }), "idea.png")

    const response = await POST(
      new Request("http://localhost/api/vault-maya/drop-requests", {
        method: "POST",
        body: form,
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.put).toHaveBeenCalledTimes(1)
    expect(mocks.sql).toHaveBeenCalledTimes(2)
    expect(mocks.del).not.toHaveBeenCalled()
  })

  it("allows an inspiration image without forcing a text message", async () => {
    const { POST } = await import("@/app/api/vault-maya/drop-requests/route")
    const form = new FormData()
    form.append("inspiration", new Blob(["image"], { type: "image/jpeg" }), "idea.jpg")

    const response = await POST(
      new Request("http://localhost/api/vault-maya/drop-requests", {
        method: "POST",
        body: form,
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.put).toHaveBeenCalledTimes(1)
  })

  it("rejects unsupported attachments before uploading", async () => {
    const { POST } = await import("@/app/api/vault-maya/drop-requests/route")
    const form = new FormData()
    form.append("message", "Use this")
    form.append("inspiration", new Blob(["not an image"], { type: "text/plain" }), "idea.txt")

    const response = await POST(
      new Request("http://localhost/api/vault-maya/drop-requests", {
        method: "POST",
        body: form,
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.put).not.toHaveBeenCalled()
  })
})
