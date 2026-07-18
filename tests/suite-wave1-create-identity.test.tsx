// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useIdentityReferences } from "@/components/app-v3/use-identity-references"

function IdentityProbe({ initialUrl }: { initialUrl: string }) {
  const identity = (
    useIdentityReferences as (
      initialHasSelfie: boolean,
      initialPrimarySelfieUrl: string
    ) => ReturnType<typeof useIdentityReferences>
  )(true, initialUrl)

  return (
    <div>
      <span data-testid="primary-selfie">{identity.primarySelfieUrl ?? "missing"}</span>
      <span data-testid="identity-loading">{identity.loading ? "loading" : "ready"}</span>
    </div>
  )
}

describe("Wave 1 Create identity continuity", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("keeps the server-confirmed selfie while the live identity library hydrates", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {}))
    )

    render(<IdentityProbe initialUrl="https://example.com/server-selfie.jpg" />)

    expect(screen.getByTestId("identity-loading")).toHaveTextContent("loading")
    expect(screen.getByTestId("primary-selfie")).toHaveTextContent(
      "https://example.com/server-selfie.jpg"
    )
  })

  it("keeps the server-confirmed selfie when hydration fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))

    render(<IdentityProbe initialUrl="https://example.com/server-selfie.jpg" />)

    await waitFor(() => expect(screen.getByTestId("identity-loading")).toHaveTextContent("ready"))
    expect(screen.getByTestId("primary-selfie")).toHaveTextContent(
      "https://example.com/server-selfie.jpg"
    )
  })

  it("does not erase the server-confirmed selfie when a refresh returns partial identity data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          images: [],
          extras: { threeQuarter: "https://example.com/angle.jpg" },
        }),
      } as Response)
    )

    render(<IdentityProbe initialUrl="https://example.com/server-selfie.jpg" />)

    await waitFor(() => expect(screen.getByTestId("identity-loading")).toHaveTextContent("ready"))
    expect(screen.getByTestId("primary-selfie")).toHaveTextContent(
      "https://example.com/server-selfie.jpg"
    )
  })
})
