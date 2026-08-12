// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChatHistoryModal } from "@/components/app-v3/chat-history-modal"

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={typeof alt === "string" ? alt : ""} {...props} />
  ),
}))

describe("Wave 1 Create history", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          chats: [
            {
              id: "past-task",
              title: "Past task",
              updatedAt: "2026-07-17T12:00:00.000Z",
              taskStatus: "ready",
              thumbnailUrl: "https://example.com/past.jpg",
              outputCount: 1,
            },
            {
              id: "current-task",
              title: "Current task",
              updatedAt: "2026-07-18T12:00:00.000Z",
              taskStatus: "planning",
              thumbnailUrl: "https://example.com/current.jpg",
              outputCount: 0,
            },
          ],
        }),
      } as Response)
    )
  })

  it("reopens a non-current task when its thumbnail is pressed", async () => {
    const onSelect = vi.fn().mockResolvedValue(undefined)
    const { container } = render(
      <ChatHistoryModal open currentChatId="current-task" onClose={vi.fn()} onSelect={onSelect} />
    )

    const thumbnail = await waitFor(() => {
      const image = container.querySelector<HTMLImageElement>(
        'img[src="https://example.com/past.jpg"]'
      )
      expect(image).not.toBeNull()
      return image as HTMLImageElement
    })
    fireEvent.click(thumbnail)

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("past-task"))
  })

  it("presents saved conversations as resumable post projects", async () => {
    render(
      <ChatHistoryModal
        open
        currentChatId="current-task"
        onClose={vi.fn()}
        onSelect={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(await screen.findByRole("dialog", { name: "Your post projects" })).toBeInTheDocument()
    expect(screen.getByText(/Ready to use/)).toBeInTheDocument()
    expect(screen.getByText(/Keep working/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Archive Past task" })).toBeInTheDocument()
    expect(screen.queryByText("Creative tasks")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete Past task" })).not.toBeInTheDocument()
  })

  it("dismisses history when the current task row is pressed", async () => {
    const onClose = vi.fn()
    render(
      <ChatHistoryModal
        open
        currentChatId="current-task"
        onClose={onClose}
        onSelect={vi.fn().mockResolvedValue(undefined)}
      />
    )

    fireEvent.click(await screen.findByRole("button", { name: /Current task/ }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("keeps close and load failures visible and actionable", async () => {
    const onClose = vi.fn()
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response)
    render(
      <ChatHistoryModal
        open
        currentChatId="current-task"
        onClose={onClose}
        onSelect={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load your chats.")
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
