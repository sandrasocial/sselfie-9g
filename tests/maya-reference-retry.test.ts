// @vitest-environment node

import { describe, expect, it, vi } from "vitest"
import { retryWithRecoveredIdentity } from "@/lib/app-v3/maya/reference-retry"

describe("Maya identity reference recovery", () => {
  it("retries the same creation once with the newest active saved selfie", async () => {
    const stale = { faceUrl: "https://blob.example/stale.jpg", angles: ["stale-angle"] }
    const active = { faceUrl: "https://blob.example/active.jpg", angles: [] }
    const request = vi
      .fn<(references: typeof stale) => Promise<Response>>()
      .mockResolvedValueOnce(
        Response.json(
          { code: "reference_selfie_unavailable", action: "choose_reference_selfie" },
          { status: 422 }
        )
      )
      .mockResolvedValueOnce(Response.json({ imageUrls: ["https://blob.example/result.jpg"] }))
    const recover = vi.fn(async () => active)

    const response = await retryWithRecoveredIdentity({ references: stale, request, recover })

    expect(response.ok).toBe(true)
    expect(request).toHaveBeenNthCalledWith(1, stale)
    expect(request).toHaveBeenNthCalledWith(2, active)
    expect(recover).toHaveBeenCalledTimes(1)
  })

  it("does not retry credit, access, or transient generation failures", async () => {
    const references = { faceUrl: "https://blob.example/active.jpg" }
    const request = vi.fn(async () =>
      Response.json({ code: "insufficient_credits" }, { status: 402 })
    )
    const recover = vi.fn(async () => references)

    const response = await retryWithRecoveredIdentity({ references, request, recover })

    expect(response.status).toBe(402)
    expect(request).toHaveBeenCalledTimes(1)
    expect(recover).not.toHaveBeenCalled()
  })

  it("can retire more than one stale optional identity angle before creating", async () => {
    const first = { faceUrl: "face", angles: ["stale-angle", "stale-body"] }
    const second = { faceUrl: "face", angles: ["stale-body"] }
    const clean = { faceUrl: "face", angles: [] }
    const request = vi
      .fn<(references: typeof first) => Promise<Response>>()
      .mockResolvedValueOnce(
        Response.json({ code: "reference_selfie_unavailable" }, { status: 422 })
      )
      .mockResolvedValueOnce(
        Response.json({ code: "reference_selfie_unavailable" }, { status: 422 })
      )
      .mockResolvedValueOnce(Response.json({ imageUrls: ["result"] }))
    const recover = vi.fn().mockResolvedValueOnce(second).mockResolvedValueOnce(clean)

    const response = await retryWithRecoveredIdentity({ references: first, request, recover })

    expect(response.ok).toBe(true)
    expect(request).toHaveBeenCalledTimes(3)
    expect(recover).toHaveBeenCalledTimes(2)
  })

  it("keeps the original recovery UI when no usable selfie remains", async () => {
    const references = { faceUrl: "https://blob.example/stale.jpg" }
    const request = vi.fn(async () =>
      Response.json({ code: "reference_selfie_unavailable" }, { status: 422 })
    )
    const recover = vi.fn(async () => null)

    const response = await retryWithRecoveredIdentity({ references, request, recover })

    expect(response.status).toBe(422)
    expect(request).toHaveBeenCalledTimes(1)
    expect(recover).toHaveBeenCalledTimes(1)
  })
})
