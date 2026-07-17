import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CalendarTextStudio } from "@/components/feed-planner/calendar-text-studio"

vi.mock("@/components/app-v3/text-overlay-layer", () => ({
  TextOverlayLayer: () => <div data-testid="text-overlay-preview" />,
}))

describe("Calendar baked text flow", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("keeps the clean image until Maya's text version is approved for the grid", async () => {
    const onClose = vi.fn()
    const onApplied = vi.fn()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ bakedUrl: "https://assets.public.blob.vercel-storage.com/baked.png", aiImageId: 42 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ post: { id: 9, image_url: "https://assets.public.blob.vercel-storage.com/baked.png" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    render(
      <CalendarTextStudio
        open
        feedId={7}
        postId={9}
        position={2}
        cleanImageUrl="https://assets.public.blob.vercel-storage.com/clean.png"
        initialHeadline="A clear point of view"
        onClose={onClose}
        onApplied={onApplied}
      />
    )

    expect(screen.getByText(/clean photo stays safe/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /create text version/i }))

    await screen.findByRole("button", { name: /use in grid/i })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/app-v3/maya/bake-text",
      expect.objectContaining({ method: "POST" })
    )
    expect(onApplied).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: /use in grid/i }))
    await waitFor(() => expect(onApplied).toHaveBeenCalledWith(expect.objectContaining({ id: 9 })))
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/feed/7/replace-post-image",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"aiImageId":42'),
      })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
