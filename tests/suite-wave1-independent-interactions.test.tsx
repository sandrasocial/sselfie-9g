// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AccountView } from "@/components/app-v3/account-view"
import { GalleryView } from "@/components/app-v3/gallery-view"
import { CalendarBulkCreate } from "@/components/feed-planner/calendar-bulk-create"
import type { AppV3GalleryAsset, AppV3GalleryCounts } from "@/lib/app-v3/gallery-assets"

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={typeof alt === "string" ? alt : ""} {...props} />
  ),
}))

vi.mock("@/components/app-v3/image-lightbox", () => ({
  ImageLightbox: ({ onMakeMotion }: { onMakeMotion?: (index: number) => void }) =>
    onMakeMotion ? (
      <button type="button" onClick={() => onMakeMotion(0)}>
        Make video
      </button>
    ) : null,
}))

vi.mock("@/lib/testimonials/review-capture-client", () => ({
  recordSuiteDownloadForReview: vi.fn(),
}))

vi.mock("@/lib/app-v3/download-asset", () => ({
  initiateAssetDownload: vi.fn().mockResolvedValue(true),
}))

const asset: AppV3GalleryAsset = {
  id: "ai_101",
  kind: "image",
  contentType: "photo",
  url: "https://example.com/photo.jpg",
  createdAt: "2026-07-18T08:00:00.000Z",
  isFavorite: false,
  title: "Quiet morning portrait",
  canFavorite: true,
  canDelete: true,
  canDownload: true,
  canMakeMotion: true,
}

const counts: AppV3GalleryCounts = {
  all: 1,
  favorites: 0,
  photos: 1,
  photoshoots: 0,
  reelCovers: 0,
  carousels: 0,
  storySlides: 0,
  videos: 0,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function galleryPayload(assets: AppV3GalleryAsset[] = [asset]) {
  return { assets, counts: { ...counts, all: assets.length } }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("Wave 1 Gallery interaction contracts", () => {
  it("keeps thumbnail titles and secondary actions quiet until requested", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(galleryPayload()))

    render(<GalleryView />)

    await screen.findByAltText(/Quiet morning portrait/)
    expect(screen.queryByText("Quiet morning portrait")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Make video" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Videos" })).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: "More actions for Quiet morning portrait, item 1" })
    )
    expect(screen.getByRole("group", { name: "Photo actions" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()
  })

  it("names each overflow trigger for its asset and restores focus after download", async () => {
    const secondAsset: AppV3GalleryAsset = {
      ...asset,
      id: "ai_102",
      url: "https://example.com/photo-2.jpg",
      title: "Studio portrait",
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(galleryPayload([asset, secondAsset]))
    )

    render(<GalleryView />)

    const firstTrigger = await screen.findByRole("button", {
      name: "More actions for Quiet morning portrait, item 1",
    })
    expect(
      screen.getByRole("button", { name: "More actions for Studio portrait, item 2" })
    ).toBeInTheDocument()

    fireEvent.click(firstTrigger)
    const download = screen.getByRole("button", { name: "Download" })
    download.focus()
    fireEvent.click(download)

    await waitFor(() => expect(firstTrigger).toHaveFocus())
  })

  it("keeps only one overflow panel open and dismisses it for Select mode", async () => {
    const secondAsset: AppV3GalleryAsset = {
      ...asset,
      id: "ai_102",
      url: "https://example.com/photo-2.jpg",
      title: "Studio portrait",
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(galleryPayload([asset, secondAsset]))
    )

    render(<GalleryView />)

    const firstTrigger = await screen.findByRole("button", {
      name: "More actions for Quiet morning portrait, item 1",
    })
    const secondTrigger = screen.getByRole("button", {
      name: "More actions for Studio portrait, item 2",
    })
    fireEvent.click(firstTrigger)
    expect(screen.getAllByRole("group", { name: "Photo actions" })).toHaveLength(1)

    fireEvent.click(secondTrigger)
    expect(firstTrigger).toHaveAttribute("aria-expanded", "false")
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getAllByRole("group", { name: "Photo actions" })).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "Select" }))
    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(
      screen.getByRole("button", { name: "More actions for Studio portrait, item 2" })
    ).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("group", { name: "Photo actions" })).not.toBeInTheDocument()
  })

  it("dismisses overflow actions on Escape and outside interaction", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(galleryPayload()))

    render(<GalleryView />)

    const trigger = await screen.findByRole("button", {
      name: "More actions for Quiet morning portrait, item 1",
    })
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: "Escape" })

    await waitFor(() => {
      expect(trigger).toHaveFocus()
      expect(screen.queryByRole("group", { name: "Photo actions" })).not.toBeInTheDocument()
    })

    fireEvent.click(trigger)
    const thumbnail = screen.getByRole("button", { name: /Open Quiet morning portrait/ })
    fireEvent.pointerDown(thumbnail)
    fireEvent.click(thumbnail)

    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("group", { name: "Photo actions" })).not.toBeInTheDocument()
  })

  it("dismisses overflow actions before a keyboard-driven outside action proceeds", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(galleryPayload()))

    render(<GalleryView />)

    const trigger = await screen.findByRole("button", {
      name: "More actions for Quiet morning portrait, item 1",
    })
    await user.click(trigger)

    const favorite = screen.getByRole("button", { name: "Favorite" })
    await user.tab({ shift: true })
    expect(favorite).toHaveFocus()
    await user.keyboard("{Enter}")

    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("group", { name: "Photo actions" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove favorite" })).toBeInTheDocument()
  })

  it("offers the video handoff only after opening a selected image", async () => {
    const onMakeMotion = vi.fn()
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(galleryPayload()))

    render(<GalleryView onMakeMotion={onMakeMotion} />)

    expect(screen.queryByRole("button", { name: "Make video" })).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole("button", { name: /Open Quiet morning portrait/ }))
    fireEvent.click(screen.getByRole("button", { name: "Make video" }))

    expect(onMakeMotion).toHaveBeenCalledWith(asset.url)
  })

  it("restores the asset action trigger after Compare and Delete dialogs close", async () => {
    const editedAsset: AppV3GalleryAsset = {
      ...asset,
      id: "ai_102",
      url: "https://example.com/photo-edited.jpg",
      title: "Quiet morning portrait edit",
      variantOf: asset.id,
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(galleryPayload([asset, editedAsset]))
    )

    render(<GalleryView />)

    const trigger = await screen.findByRole("button", {
      name: "More actions for Quiet morning portrait, item 1",
    })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole("button", { name: "Compare" }))
    fireEvent.click(screen.getByRole("button", { name: "Close version comparison" }))
    await waitFor(() => expect(trigger).toHaveFocus())

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep it" }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it("exposes favorite selection to assistive technology", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      if (String(input).endsWith("/favorite")) {
        return jsonResponse({ success: true })
      }
      return jsonResponse(galleryPayload())
    })

    render(<GalleryView />)

    const favorite = await screen.findByRole("button", { name: "Favorite" })
    expect(favorite).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(favorite)
    expect(await screen.findByRole("button", { name: "Remove favorite" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("rolls a failed favorite back and tells the member what happened", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      if (String(input).endsWith("/favorite")) {
        return jsonResponse({ error: "favorite_failed" }, 500)
      }
      return jsonResponse(galleryPayload())
    })

    render(<GalleryView />)
    fireEvent.click(await screen.findByRole("button", { name: "Favorite" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Favorite" })).toBeInTheDocument()
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't update favorite")
    })
  })

  it("does not submit a favorite mutation twice while the first request is pending", async () => {
    let resolveFavorite!: (response: Response) => void
    const pendingFavorite = new Promise<Response>(resolve => {
      resolveFavorite = resolve
    })
    const favoriteRequests: RequestInfo[] = []
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      if (String(input).endsWith("/favorite")) {
        favoriteRequests.push(input)
        return pendingFavorite
      }
      return jsonResponse(galleryPayload())
    })

    render(<GalleryView />)
    fireEvent.click(await screen.findByRole("button", { name: "Favorite" }))
    fireEvent.click(screen.getByRole("button", { name: "Remove favorite" }))

    expect(favoriteRequests).toHaveLength(1)
    resolveFavorite(jsonResponse({ success: true }))
    await waitFor(() => expect(screen.getByRole("button", { name: /favorite/i })).toBeEnabled())
  })

  it("reloads a failed Gallery request and restores server-backed work", async () => {
    let galleryRequests = 0
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      galleryRequests += 1
      return galleryRequests === 1
        ? jsonResponse({ error: "offline" }, 503)
        : jsonResponse(galleryPayload())
    })

    render(<GalleryView />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load your gallery")

    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByAltText(/Quiet morning portrait/)).toBeInTheDocument()
    expect(galleryRequests).toBe(2)
  })

  it("keeps a Maya edit source image visible and explains why it cannot be deleted", async () => {
    const historyMessage =
      "This photo is part of your Maya edit history. Keep it in your gallery so the original and edited versions stay available."
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/assets") && init?.method === "DELETE") {
        return jsonResponse(
          {
            error: historyMessage,
            code: "MAYA_EDIT_HISTORY_REFERENCE",
            blockedAssetIds: [asset.id],
          },
          409
        )
      }
      return jsonResponse(galleryPayload())
    })

    render(<GalleryView />)
    fireEvent.click(
      await screen.findByRole("button", {
        name: "More actions for Quiet morning portrait, item 1",
      })
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(historyMessage)
    expect(screen.getByAltText(/Quiet morning portrait/)).toBeInTheDocument()
    expect(screen.queryByRole("dialog", { name: "Delete this photo?" })).not.toBeInTheDocument()
  })

  it("keeps the empty-state Create control keyboard-operable and at least 44px tall", async () => {
    const user = userEvent.setup()
    const onStartCreate = vi.fn()
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(galleryPayload([])))

    render(<GalleryView onStartCreate={onStartCreate} />)
    const create = await screen.findByRole("button", { name: "Create with Maya" })

    create.focus()
    await user.keyboard("{Enter}")
    expect(onStartCreate).toHaveBeenCalledTimes(1)
    expect(create.className).toMatch(/(?:min-h|h)-(?:11|12)/)
  })
})

describe("Wave 1 Calendar concurrency and recovery contracts", () => {
  it("blocks a double-submit while bulk creation is pending", async () => {
    let resolveImage!: (response: Response) => void
    const pendingImage = new Promise<Response>(resolve => {
      resolveImage = resolve
    })
    const imageRequests: RequestInfo[] = []
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      imageRequests.push(input)
      return pendingImage
    })
    const onComplete = vi.fn().mockResolvedValue(undefined)

    render(
      <CalendarBulkCreate
        feedId={17}
        posts={[{ id: 101, position: 2, image_url: null, caption: "Ready caption" }]}
        onComplete={onComplete}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /create in bulk/i }))
    const create = screen.getByRole("button", { name: /create 1 image/i })
    fireEvent.click(create)
    fireEvent.click(create)

    expect(imageRequests).toHaveLength(1)
    expect(create).toBeDisabled()
    expect(screen.getByRole("status", { name: "Bulk creation progress" })).toHaveTextContent(
      "0 of 1 images"
    )

    resolveImage(jsonResponse({ success: true, completed: true }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
  })

  it("shows an API failure, re-enables the action, and permits an explicit retry", async () => {
    let attempts = 0
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      attempts += 1
      return attempts === 1
        ? jsonResponse({ error: "Credits unavailable" }, 402)
        : jsonResponse({ success: true, completed: true })
    })
    const onComplete = vi.fn().mockResolvedValue(undefined)

    render(
      <CalendarBulkCreate
        feedId={17}
        posts={[{ id: 101, position: 2, image_url: null, caption: "Ready caption" }]}
        onComplete={onComplete}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /create in bulk/i }))
    const create = screen.getByRole("button", { name: /create 1 image/i })
    fireEvent.click(create)

    expect(await screen.findByRole("alert")).toHaveTextContent("Credits unavailable")
    expect(create).toBeEnabled()

    fireEvent.click(create)
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2))
    expect(attempts).toBe(2)
  })
})

describe("Wave 1 legacy-model opt-in boundary", () => {
  function mockAccountLoad() {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      if (String(input).endsWith("/reference-library")) return jsonResponse({ images: [] })
      return jsonResponse({
        plan: "SSELFIE SUITE",
        status: "active",
        renewsAt: null,
        accessEndsAt: null,
        billingKind: "recurring",
        credits: 60,
        email: "qa@example.com",
      })
    })
  }

  it("never offers the legacy trained model without server-confirmed eligibility", async () => {
    mockAccountLoad()

    render(<AccountView onUseTrainedModel={vi.fn()} hasTrainedModel={false} />)

    await screen.findByText("qa@example.com")
    expect(screen.queryByRole("button", { name: "Use my trained model" })).not.toBeInTheDocument()
  })

  it("requires an explicit Account action for an eligible legacy member", async () => {
    mockAccountLoad()
    const onUseTrainedModel = vi.fn()

    render(<AccountView onUseTrainedModel={onUseTrainedModel} hasTrainedModel />)
    const optIn = await screen.findByRole("button", { name: "Use my trained model" })

    expect(onUseTrainedModel).not.toHaveBeenCalled()
    fireEvent.click(optIn)
    expect(onUseTrainedModel).toHaveBeenCalledTimes(1)
  })
})
