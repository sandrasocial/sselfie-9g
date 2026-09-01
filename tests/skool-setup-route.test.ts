// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  generateLink: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { generateLink: mocks.generateLink } },
  }),
}))

const SECRET = Buffer.alloc(32, 7).toString("base64url")
const MEMBERSHIP = `skool:sselfie-photo-club-2569:${"a".repeat(32)}`

async function validBody() {
  const { buildSkoolSetupEntryLink } = await import("@/lib/skool/setup-link")
  const link = new URL(buildSkoolSetupEntryLink({
    membershipKey: MEMBERSHIP,
    secret: SECRET,
  }))
  return {
    membershipKey: MEMBERSHIP,
    token: new URLSearchParams(link.hash.slice(1)).get("token"),
  }
}

describe("Skool setup exchange", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.sql.mockReset()
    mocks.generateLink.mockReset()
    process.env.SKOOL_MEMBERSHIP_INGRESS_SECRET = SECRET
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
  })

  it("rejects an invalid stable token before looking up membership or minting recovery", async () => {
    const { POST } = await import("@/app/api/auth/skool-setup/route")
    const response = await POST(new Request("https://sselfie.ai/api/auth/skool-setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipKey: MEMBERSHIP, token: "invalid" }),
    }))

    expect(response.status).toBe(401)
    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it("requires an active exact Skool entitlement", async () => {
    mocks.sql.mockResolvedValueOnce([])
    const { POST } = await import("@/app/api/auth/skool-setup/route")
    const response = await POST(new Request("https://sselfie.ai/api/auth/skool-setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(await validBody()),
    }))

    expect(response.status).toBe(404)
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it("sends an already-configured member to login without minting another recovery credential", async () => {
    mocks.sql.mockResolvedValueOnce([{
      user_id: "user_1",
      email: "member@example.com",
      password_setup_complete: true,
    }])
    const { POST } = await import("@/app/api/auth/skool-setup/route")
    const response = await POST(new Request("https://sselfie.ai/api/auth/skool-setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(await validBody()),
    }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      state: "ready",
      redirectUrl: "https://sselfie.ai/auth/login?returnTo=%2Fapp",
    })
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it("mints the one-time provider credential only after a valid customer click", async () => {
    mocks.sql.mockResolvedValueOnce([{
      user_id: "user_1",
      email: "member@example.com",
      password_setup_complete: false,
    }])
    mocks.generateLink.mockResolvedValueOnce({
      data: {
        properties: {
          action_link: "https://auth.example.com/verify?token=one_time_customer_token&type=recovery",
        },
      },
      error: null,
    })

    const { POST } = await import("@/app/api/auth/skool-setup/route")
    const response = await POST(new Request("https://sselfie.ai/api/auth/skool-setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(await validBody()),
    }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.generateLink).toHaveBeenCalledWith({
      type: "recovery",
      email: "member@example.com",
      options: { redirectTo: "https://sselfie.ai/auth/setup-password?next=%2Fapp" },
    })
    expect(data.state).toBe("recovery_required")
    expect(data.redirectUrl).toContain("https://sselfie.ai/auth/confirm?")
    expect(data.redirectUrl).toContain("token=one_time_customer_token")
    expect(data.redirectUrl).toContain("type=recovery")
    expect(data.redirectUrl).toContain("redirect_to=%2Fauth%2Fsetup-password%3Fnext%3D%252Fapp")
  })
})
