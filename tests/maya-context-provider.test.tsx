// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConciergeProvider, useConcierge } from "@/components/app-v3/concierge-context"
import { CONCIERGE_STORAGE_KEY, MAYA_DRAFT_STORAGE_KEY } from "@/components/app-v3/continuity"
import type { CalendarPostTarget } from "@/components/app-v3/types"

const aesthetic = {
  id: "qa-look",
  name: "QA look",
  blurb: "A test look",
  coverImage: "",
  thumbnails: [],
  shotCount: 1,
  intent: "Test intent",
}

function target(position: number): CalendarPostTarget {
  return {
    requestId: `calendar:101:${700 + position}`,
    feedId: 101,
    postId: 700 + position,
    position,
    caption: `Post ${position} caption`,
    contentPillar: "Story",
    scheduledAt: null,
    plannedFormat: "photo",
    hasImage: false,
    imageUrl: null,
    mediaUrls: [],
    aiImageId: null,
  }
}

function Harness() {
  const { session, isOpen, open, close, openWithAesthetic, openForCalendarPost, setActiveSurface } =
    useConcierge()

  return (
    <div>
      <button
        onClick={() =>
          openWithAesthetic(aesthetic, {
            format: "video",
            videoSourceUrl: "https://example.com/video-source.jpg",
            inspirationImageUrl: "https://example.com/inspiration.jpg",
            creationIdea: "Founder story",
          })
        }
      >
        Start Create
      </button>
      <button onClick={() => openForCalendarPost(target(7))}>Open post 7</button>
      <button onClick={() => openForCalendarPost(target(8))}>Open post 8</button>
      <button
        onClick={() =>
          openForCalendarPost({
            ...target(9),
            requestedAction: "improve_caption",
            hasImage: true,
            imageUrl: "https://example.com/selected-photo.jpg",
          })
        }
      >
        Improve post 9 caption
      </button>
      <button onClick={() => setActiveSurface("create")}>Go Create</button>
      <button onClick={() => setActiveSurface("gallery")}>Go Gallery</button>
      <button onClick={() => setActiveSurface("calendar", { preserveCurrentTask: true })}>
        Show Calendar with task
      </button>
      <button onClick={open}>Open Maya</button>
      <button onClick={close}>Close Maya</button>
      <output data-testid="session">{JSON.stringify({ isOpen, session })}</output>
    </div>
  )
}

function readSession() {
  return JSON.parse(screen.getByTestId("session").textContent || "{}") as {
    isOpen: boolean
    session: {
      startedAt: number
      outputFormat: string | null
      workspacePath: string | null
      videoSourceUrl: string | null
      inspirationImageUrl: string | null
      creationIdea: string | null
      calendarTarget?: { postId: number; position: number } | null
      mayaContext?: {
        taskId: string
        job: string
        surface: string
        feedId?: number
        postId?: number
        postPosition?: number
        inspirationRef?: { url?: string; explicitlyCarried: boolean }
      } | null
    } | null
  }
}

describe("Sandra-only Maya context provider", () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: null }),
    }) as unknown as typeof fetch
  })

  it("replaces temporary Create context when moving between Calendar posts", async () => {
    render(
      <ConciergeProvider operatingLayerEnabled>
        <Harness />
      </ConciergeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Start Create" }))
    await waitFor(() => expect(readSession().session?.mayaContext?.job).toBe("create_content"))
    const createTask = readSession().session?.mayaContext?.taskId
    expect(readSession().session?.mayaContext?.inspirationRef).toEqual({
      url: "https://example.com/inspiration.jpg",
      explicitlyCarried: true,
    })

    fireEvent.click(screen.getByRole("button", { name: "Open post 7" }))
    await waitFor(() => expect(readSession().session?.mayaContext?.postId).toBe(707))
    const post7 = readSession().session
    expect(post7?.mayaContext).toMatchObject({
      taskId: "maya-calendar-v1-101-707",
      job: "finish_calendar_post",
      surface: "calendar",
      feedId: 101,
      postId: 707,
      postPosition: 7,
    })
    expect(post7?.mayaContext?.taskId).not.toBe(createTask)
    expect(post7?.inspirationImageUrl).toBeNull()
    expect(post7?.videoSourceUrl).toBeNull()
    expect(post7?.creationIdea).toBe("Post 7 caption")

    fireEvent.click(screen.getByRole("button", { name: "Open post 7" }))
    await waitFor(() => expect(readSession().session?.calendarTarget?.postId).toBe(707))
    expect(readSession().session?.mayaContext?.taskId).toBe("maya-calendar-v1-101-707")
    expect(readSession().session?.startedAt).toBe(post7?.startedAt)

    fireEvent.click(screen.getByRole("button", { name: "Open post 8" }))
    await waitFor(() => expect(readSession().session?.mayaContext?.postId).toBe(708))
    expect(readSession().session?.mayaContext?.taskId).toBe("maya-calendar-v1-101-708")
    expect(readSession().session?.calendarTarget?.position).toBe(8)
    expect(readSession().session?.inspirationImageUrl).toBeNull()
  })

  it("replaces an open Calendar task when the visible surface changes", async () => {
    render(
      <ConciergeProvider operatingLayerEnabled>
        <Harness />
      </ConciergeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Open post 7" }))
    await waitFor(() => expect(readSession().session?.mayaContext?.postId).toBe(707))
    fireEvent.click(screen.getByRole("button", { name: "Go Create" }))
    await waitFor(() => expect(readSession().session?.mayaContext?.surface).toBe("create"))

    expect(readSession().session?.mayaContext?.job).toBe("create_content")
    expect(readSession().session?.calendarTarget).toBeNull()
    expect(readSession().session?.outputFormat).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Close Maya" }))
    fireEvent.click(screen.getByRole("button", { name: "Go Gallery" }))
    fireEvent.click(screen.getByRole("button", { name: "Open Maya" }))
    await waitFor(() => expect(readSession().session?.mayaContext?.surface).toBe("gallery"))
    expect(readSession().isOpen).toBe(true)
  })

  it("routes Calendar caption work to the post workspace without visual setup", async () => {
    render(
      <ConciergeProvider operatingLayerEnabled>
        <Harness />
      </ConciergeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Improve post 9 caption" }))
    await waitFor(() => expect(readSession().session?.mayaContext?.postId).toBe(709))

    expect(readSession().session).toMatchObject({
      workspacePath: "build-post",
      outputFormat: null,
      creationIdea: "Post 9 caption",
      calendarTarget: { postId: 709, position: 9 },
      mayaContext: {
        job: "finish_calendar_post",
        surface: "calendar",
        feedId: 101,
        postId: 709,
      },
    })
  })

  it("keeps the finished Create task when its Calendar handoff opens", async () => {
    render(
      <ConciergeProvider operatingLayerEnabled>
        <Harness />
      </ConciergeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Start Create" }))
    await waitFor(() => expect(readSession().session?.mayaContext?.job).toBe("create_content"))
    const taskId = readSession().session?.mayaContext?.taskId
    const startedAt = readSession().session?.startedAt

    fireEvent.click(screen.getByRole("button", { name: "Show Calendar with task" }))
    await waitFor(() => expect(readSession().session?.mayaContext?.surface).toBe("calendar"))

    expect(readSession().session?.mayaContext?.taskId).toBe(taskId)
    expect(readSession().session?.mayaContext?.job).toBe("create_content")
    expect(readSession().session?.startedAt).toBe(startedAt)
    expect(readSession().session?.outputFormat).toBe("video")
  })

  it("migrates a valid legacy draft to Create and clears an ambiguous Calendar target", async () => {
    const startedAt = Date.now() - 1_000
    const legacySession = {
      aesthetic,
      outputFormat: "photo",
      referenceSelfieUrl: "https://example.com/selfie.jpg",
      videoSourceUrl: null,
      inspirationImageUrl: null,
      graphicText: null,
      seedPrompt: null,
      creationIntent: null,
      shotDirector: null,
      generationSource: null,
      initialSetupAction: null,
      creationIdea: "Legacy Create task",
      calendarTarget: target(7),
      startedAt,
    }
    window.localStorage.setItem(
      CONCIERGE_STORAGE_KEY,
      JSON.stringify({ isOpen: false, session: legacySession, savedAt: Date.now() })
    )
    window.localStorage.setItem(
      MAYA_DRAFT_STORAGE_KEY,
      JSON.stringify({
        chatId: "legacy-chat-id",
        sessionStartedAt: startedAt,
        savedAt: Date.now(),
        messages: [],
        genState: {},
        generatedOnce: false,
        setupOpen: false,
      })
    )

    render(
      <ConciergeProvider operatingLayerEnabled>
        <Harness />
      </ConciergeProvider>
    )

    await waitFor(() => expect(readSession().session?.mayaContext?.taskId).toBe("legacy-chat-id"))
    expect(readSession().session?.mayaContext).toMatchObject({
      job: "create_content",
      surface: "create",
    })
    expect(readSession().session?.calendarTarget).toBeNull()
    expect(readSession().session?.referenceSelfieUrl).toBe("https://example.com/selfie.jpg")
  })
})
