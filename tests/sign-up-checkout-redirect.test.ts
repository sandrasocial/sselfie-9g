import { createElement } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const pushMock = vi.fn()
const signInWithPasswordMock = vi.fn()
const signUpMock = vi.fn()
const fetchMock = vi.fn()
const { autoConfirmUserMock } = vi.hoisted(() => ({
  autoConfirmUserMock: vi.fn(async () => ({ success: true })),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
    },
  }),
}))

vi.mock("@/app/actions/auto-confirm-user", () => ({
  autoConfirmUser: autoConfirmUserMock,
}))

import SignUpPage from "@/app/auth/sign-up/page"

function setSearch(search: string) {
  window.history.replaceState({}, "", `/auth/sign-up${search}`)
}

function mockUserLookup(hasAccount: boolean) {
  fetchMock.mockImplementation(async () => ({
    ok: true,
    json: async () => ({ userInfo: { hasAccount } }),
  }))
}

async function submitSignUpForm() {
  fireEvent.change(screen.getByLabelText(/^Name$/i), { target: { value: "Test User" } })
  fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: "test@example.com" } })
  fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "super-secret" } })
  fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }))
}

describe("sign-up checkout redirect", () => {
  beforeEach(() => {
    pushMock.mockReset()
    signInWithPasswordMock.mockReset()
    signUpMock.mockReset()
    fetchMock.mockReset()
    autoConfirmUserMock.mockClear()

    mockUserLookup(false)

    signUpMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email_confirmed_at: "2026-03-02T00:00:00.000Z",
        },
      },
      error: null,
    })

    signInWithPasswordMock.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        session: { access_token: "token" },
      },
      error: null,
    })

    global.fetch = fetchMock as unknown as typeof fetch
  })

  it("redirects to /checkout/membership when checkout=studio_membership", async () => {
    setSearch("?checkout=studio_membership")

    render(createElement(SignUpPage))
    await submitSignUpForm()

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/checkout/membership")
    })
  })

  it("falls back to app v3 when next path is not allowlisted", async () => {
    setSearch("?next=/some-path")

    render(createElement(SignUpPage))
    await submitSignUpForm()

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/app")
    })
  })

  it("defaults new accounts to app v3 when no params are provided", async () => {
    setSearch("")

    render(createElement(SignUpPage))
    await submitSignUpForm()

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/app")
    })
  })

  it("syncs an auto-confirmed signup into the application database before redirecting", async () => {
    setSearch("")

    render(createElement(SignUpPage))
    await submitSignUpForm()

    await waitFor(() => {
      expect(autoConfirmUserMock).toHaveBeenCalledWith("test@example.com", "user-1")
      expect(pushMock).toHaveBeenCalledWith("/app")
    })
  })

  it("normalizes legacy studio returnTo links into app v3", async () => {
    setSearch("?returnTo=%2Fstudio%3Ftab%3Dmaya")

    render(createElement(SignUpPage))
    await submitSignUpForm()

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/app")
    })
  })

  it("prioritizes checkout over next when both params are present", async () => {
    setSearch("?checkout=studio_membership&next=/other")

    render(createElement(SignUpPage))
    await submitSignUpForm()

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/checkout/membership")
    })
  })
})
