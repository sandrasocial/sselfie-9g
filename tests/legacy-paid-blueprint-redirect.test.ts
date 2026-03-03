import { beforeEach, describe, expect, it, vi } from "vitest"

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

import LegacyPaidBlueprintPage from "@/app/blueprint/paid/page"

describe("legacy paid blueprint route", () => {
  beforeEach(() => {
    redirectMock.mockReset()
  })

  it("redirects to /feed-planner with no query string", async () => {
    await LegacyPaidBlueprintPage({ searchParams: Promise.resolve({}) })

    expect(redirectMock).toHaveBeenCalledWith("/feed-planner")
  })

  it("forwards string query params to /feed-planner", async () => {
    await LegacyPaidBlueprintPage({
      searchParams: Promise.resolve({
        access: "token-123",
        utm_source: "email",
        utm_campaign: "paid_blueprint",
      }),
    })

    expect(redirectMock).toHaveBeenCalledWith(
      "/feed-planner?access=token-123&utm_source=email&utm_campaign=paid_blueprint",
    )
  })

  it("forwards repeated params from array values", async () => {
    await LegacyPaidBlueprintPage({
      searchParams: Promise.resolve({
        access: ["a", "b"],
        empty: "",
      }),
    })

    expect(redirectMock).toHaveBeenCalledWith("/feed-planner?access=a&access=b")
  })
})
