// @vitest-environment node

import { describe, expect, it, vi } from "vitest"

import { findAuthUserByEmail } from "@/lib/supabase/find-auth-user-by-email"

describe("findAuthUserByEmail", () => {
  it("paginates and matches email without case sensitivity", async () => {
    const listUsers = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 2 }, (_, index) => ({
            id: `other_${index}`,
            email: `other${index}@example.com`,
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { users: [{ id: "existing_user", email: "Buyer@Example.COM" }] },
        error: null,
      })

    await expect(
      findAuthUserByEmail({ email: "buyer@example.com", listUsers, perPage: 2 }),
    ).resolves.toEqual({ id: "existing_user", email: "Buyer@Example.COM" })
    expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 2 })
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 2 })
  })

  it("stops at the final short page when no account exists", async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: { users: [{ id: "other_user", email: "other@example.com" }] },
      error: null,
    })

    await expect(
      findAuthUserByEmail({ email: "new@example.com", listUsers, perPage: 1000 }),
    ).resolves.toBeNull()
    expect(listUsers).toHaveBeenCalledTimes(1)
  })

  it("fails closed when Supabase cannot safely check for an existing account", async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: { users: [] },
      error: { message: "temporary auth failure" },
    })

    await expect(
      findAuthUserByEmail({ email: "buyer@example.com", listUsers }),
    ).rejects.toThrow("temporary auth failure")
  })
})
