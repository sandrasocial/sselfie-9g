// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CalendarBulkCreate } from "@/components/feed-planner/calendar-bulk-create"

const read = (path: string) => readFileSync(path, "utf8")

afterEach(() => {
  vi.restoreAllMocks()
})

describe("Calendar current image engine contract", () => {
  it("keeps bulk progress in the grid instead of replacing it with a full-feed overlay", () => {
    const calendar = read("components/feed-planner/instagram-feed-view.tsx")

    expect(calendar).not.toContain("FeedLoadingOverlay")
    expect(calendar).toContain("generationStatus: post.generation_status")
    expect(calendar).toContain("predictionId: post.prediction_id")
  })

  it("does not let a historic Maya mode preference select the trained model", () => {
    const calendar = read("components/feed-planner/instagram-feed-view.tsx")
    const route = read("app/api/feed/[feedId]/generate-single/route.ts")

    expect(calendar).not.toContain("readMayaProModePreference")
    expect(calendar).not.toContain('"classic"')
    expect(route).toMatch(/function calendarGenerationMode\(\): ["']pro["'] \| ["']classic["']/)
    expect(route).toMatch(/return ["']pro["']/)
    expect(route).toContain("const generationMode = calendarGenerationMode()")
    expect(route).not.toContain("generationMode = requestedMode")
    expect(route).not.toContain("FEED_PLANNER_IMAGE_ENGINE")
    expect(route).not.toContain("generateWithNanoBanana")
  })

  it("keeps the trained-model choice in Account instead of Maya Create", () => {
    const account = read("components/app-v3/account-view.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(account).toContain("Use my trained model")
    expect(concierge).not.toContain("Photo source")
    expect(concierge).not.toContain("Your trained model from Studio came with you.")
  })
})

describe("Calendar bulk creation", () => {
  it("shows which post is queued and which post is being created", async () => {
    let finishFirst: ((response: Response) => void) | undefined
    const firstRequest = new Promise<Response>(resolve => {
      finishFirst = resolve
    })
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      if (String(input).endsWith("/generate-captions")) {
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }
      return firstRequest
    })

    const onComplete = vi.fn().mockResolvedValue(undefined)
    render(
      <CalendarBulkCreate
        feedId={17}
        posts={[
          { id: 101, position: 1, image_url: null, caption: "Ready" },
          { id: 102, position: 2, image_url: null, caption: "Ready" },
          { id: 103, position: 3, image_url: null, caption: "Ready" },
        ]}
        onComplete={onComplete}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /create in bulk/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /captions/i }))
    fireEvent.click(screen.getByRole("button", { name: /create 3 images/i }))

    expect(
      await screen.findByRole("status", { name: "Post 1 image status: Creating" })
    ).toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Post 3 image status: Queued" })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await act(async () => {
      finishFirst?.(
        new Response(JSON.stringify({ success: true, completed: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    })
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
  })

  it("lets the user explicitly choose images, captions, or both", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input)
      if (url.endsWith("/generate-captions")) {
        return new Response(JSON.stringify({ success: true, captionsGenerated: 2 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      return new Response(JSON.stringify({ success: true, completed: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    const onComplete = vi.fn().mockResolvedValue(undefined)

    render(
      <CalendarBulkCreate
        feedId={17}
        posts={[
          { id: 101, position: 1, image_url: null, caption: null },
          { id: 102, position: 2, image_url: null, caption: "Already written" },
          { id: 103, position: 3, image_url: "ready.jpg", caption: null },
        ]}
        onComplete={onComplete}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /create in bulk/i }))
    expect(screen.getByText(/you stay in control/i)).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /images/i })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: /captions/i })).toBeChecked()

    expect(screen.getByText(/1 personal caption needs your real story/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /create 2 images and 1 caption/i }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feed/17/generate-captions",
      expect.objectContaining({ method: "POST" })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feed/17/generate-single",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ postId: 101 }),
      })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feed/17/generate-single",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ postId: 102 }),
      })
    )
  })

  it("keeps the existing one-post path clear beside bulk creation", () => {
    render(
      <CalendarBulkCreate
        feedId={17}
        posts={[{ id: 101, position: 1, image_url: null, caption: null }]}
        onComplete={vi.fn()}
      />
    )

    expect(screen.getByText(/tap any post to create just that one/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create in bulk/i })).toBeInTheDocument()
  })

  it("continues with images and explains the failure when caption creation loses connection", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      if (String(input).endsWith("/generate-captions")) throw new Error("Network offline")
      return new Response(JSON.stringify({ success: true, completed: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    const onComplete = vi.fn().mockResolvedValue(undefined)

    render(
      <CalendarBulkCreate
        feedId={17}
        posts={[{ id: 101, position: 2, image_url: null, caption: null }]}
        onComplete={onComplete}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /create in bulk/i }))
    fireEvent.click(screen.getByRole("button", { name: /create 1 image and 1 caption/i }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feed/17/generate-single",
      expect.objectContaining({ method: "POST" })
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Network offline")
  })

  it("does not leave unstarted posts stuck as queued after a credit stop", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Not enough credits" }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      })
    )
    const onComplete = vi.fn().mockResolvedValue(undefined)

    render(
      <CalendarBulkCreate
        feedId={17}
        posts={[
          { id: 101, position: 1, image_url: null, caption: "Ready" },
          { id: 102, position: 2, image_url: null, caption: "Ready" },
          { id: 103, position: 3, image_url: null, caption: "Ready" },
        ]}
        onComplete={onComplete}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /create in bulk/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /captions/i }))
    fireEvent.click(screen.getByRole("button", { name: /create 3 images/i }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole("status", { name: /image status: Queued/ })).not.toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Post 3 image status: Failed" })).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent(/not started/i)
  })
})
