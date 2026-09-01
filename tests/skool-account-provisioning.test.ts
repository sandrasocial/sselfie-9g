// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  findByEmail: vi.fn(),
  getUserById: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  generateLink: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/supabase/find-auth-user-by-email", () => ({
  findAuthUserByEmail: mocks.findByEmail,
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        getUserById: mocks.getUserById,
        listUsers: mocks.listUsers,
        createUser: mocks.createUser,
        generateLink: mocks.generateLink,
      },
    },
  }),
}))

describe("Skool account provisioning", () => {
  beforeEach(() => {
    vi.resetModules()
    Object.values(mocks).forEach(mock => mock.mockReset())
  })

  it("reuses a verified existing account without creating recovery credentials", async () => {
    mocks.sql.mockResolvedValueOnce([
      {
        id: "local_1",
        email: "member@example.com",
        supabase_user_id: "auth_1",
        password_setup_complete: true,
      },
    ])
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_1",
          email: "member@example.com",
          last_sign_in_at: "2026-08-31T10:00:00.000Z",
        },
      },
      error: null,
    })

    const { ensureSkoolMemberAccount } = await import("@/lib/skool/account-provisioning")
    const result = await ensureSkoolMemberAccount({ email: " Member@Example.com " })

    expect(result).toEqual({
      userId: "local_1",
      authUserId: "auth_1",
      accountState: "ready",
    })
    expect(mocks.findByEmail).not.toHaveBeenCalled()
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it("creates one missing Auth/local account but does not mint recovery credentials in the webhook", async () => {
    mocks.sql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "local_new" }])
      .mockResolvedValueOnce([])
    mocks.findByEmail.mockResolvedValue(null)
    mocks.createUser.mockResolvedValue({
      data: {
        user: {
          id: "auth_new",
          email: "new@example.com",
          last_sign_in_at: null,
        },
      },
      error: null,
    })

    const { ensureSkoolMemberAccount } = await import("@/lib/skool/account-provisioning")
    const result = await ensureSkoolMemberAccount({
      email: "new@example.com",
    })

    expect(mocks.createUser).toHaveBeenCalledWith({
      email: "new@example.com",
      email_confirm: true,
      user_metadata: { created_via: "skool_membership" },
    })
    expect(result).toEqual({
      userId: "local_new",
      authUserId: "auth_new",
      accountState: "recovery_required",
    })
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it("returns the same recovery-required state on retry without replacing a customer credential", async () => {
    mocks.sql
      .mockResolvedValueOnce([
        {
          id: "local_new",
          email: "new@example.com",
          supabase_user_id: "auth_new",
          password_setup_complete: false,
        },
      ])
      .mockResolvedValueOnce([])
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_new",
          email: "new@example.com",
          last_sign_in_at: null,
        },
      },
      error: null,
    })

    const { ensureSkoolMemberAccount } = await import("@/lib/skool/account-provisioning")
    await expect(ensureSkoolMemberAccount({ email: "new@example.com" })).resolves.toEqual({
      userId: "local_new",
      authUserId: "auth_new",
      accountState: "recovery_required",
    })
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it("keeps recovery-link sign-ins in setup until the password marker is complete", async () => {
    mocks.sql
      .mockResolvedValueOnce([
        {
          id: "local_new",
          email: "new@example.com",
          supabase_user_id: "auth_new",
          password_setup_complete: false,
        },
      ])
      .mockResolvedValueOnce([])
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_new",
          email: "new@example.com",
          last_sign_in_at: "2026-09-01T12:00:00.000Z",
        },
      },
      error: null,
    })

    const { ensureSkoolMemberAccount } = await import("@/lib/skool/account-provisioning")
    await expect(ensureSkoolMemberAccount({ email: "new@example.com" })).resolves.toEqual({
      userId: "local_new",
      authUserId: "auth_new",
      accountState: "recovery_required",
    })
    expect(mocks.sql).toHaveBeenCalledTimes(2)
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it("stops on a conflicting mapped Auth identity", async () => {
    mocks.sql.mockResolvedValueOnce([
      {
        id: "local_1",
        email: "member@example.com",
        supabase_user_id: "auth_wrong",
        password_setup_complete: true,
      },
    ])
    mocks.getUserById.mockResolvedValue({
      data: { user: { id: "auth_wrong", email: "someone@example.com" } },
      error: null,
    })

    const { ensureSkoolMemberAccount } = await import("@/lib/skool/account-provisioning")
    await expect(
      ensureSkoolMemberAccount({ email: "member@example.com" }),
    ).rejects.toThrow("SKOOL_IDENTITY_CONFLICT")
  })
})
