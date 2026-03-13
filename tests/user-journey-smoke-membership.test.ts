import { beforeEach, describe, expect, it, vi } from "vitest"

const testState = vi.hoisted(() => ({
  mockPage: null as any,
}))

vi.mock("@playwright/test", () => {
  const launchMock = vi.fn(async () => ({
    newPage: vi.fn(async () => testState.mockPage),
    close: vi.fn(async () => {}),
  }))

  return {
    chromium: {
      launch: launchMock,
    },
  }
})

import { resolveDirectCheckout } from "../scripts/user-journey-smoke"

describe("resolveDirectCheckout", () => {
  beforeEach(() => {
    let currentUrl = "https://sselfie.ai/checkout/membership"
    let waitForUrlCalls = 0

    testState.mockPage = {
      goto: vi.fn(async () => {}),
      waitForURL: vi.fn(async () => {
        waitForUrlCalls += 1
        if (waitForUrlCalls === 1) {
          throw new Error("Timeout")
        }
        currentUrl = "https://sselfie.ai/checkout?client_secret=test_secret"
      }),
      url: vi.fn(() => currentUrl),
      getByRole: vi.fn(() => ({
        count: vi.fn(async () => 1),
        click: vi.fn(async () => {}),
      })),
    }
  })

  it("passes when membership checkout requires an intermediate continue click", async () => {
    const result = await resolveDirectCheckout({
      name: "Studio Membership",
      path: "/checkout/membership",
    })

    expect(result.status).toBe("pass")
    expect(result.detail).toMatch(/resolved successfully/i)
    expect(testState.mockPage.getByRole).toHaveBeenCalledWith("button", {
      name: /continue to checkout/i,
    })
    expect(testState.mockPage.waitForURL).toHaveBeenCalledTimes(2)
  })
})
