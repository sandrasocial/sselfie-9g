// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CalendarPlanSettingsCard } from "@/components/feed-planner/calendar-plan-settings-card"
import FeedGrid from "@/components/feed-planner/feed-grid"
import { CalendarNeedsMe } from "@/components/feed-planner/calendar-needs-me"

const noopDrag = vi.fn()

function renderGrid(post: Record<string, unknown>, onSelect = vi.fn(), onAddImage = vi.fn()) {
  render(
    <FeedGrid
      posts={[post]}
      postStatuses={[]}
      draggedIndex={null}
      isSavingOrder={false}
      feedId={7}
      access={{ isMembership: true, canGenerateImages: true } as any}
      activePostId={Number(post.id)}
      onPostClick={onSelect}
      onAddImage={onAddImage}
      onDragStart={noopDrag}
      onDragOver={noopDrag}
      onDragEnd={noopDrag}
      onMovePost={noopDrag}
    />
  )
}

describe("Calendar creative-director workflow", () => {
  it("selects an empty planned post without opening Add Image", () => {
    const onSelect = vi.fn()
    const onAddImage = vi.fn()
    const post = {
      id: 41,
      position: 4,
      image_url: null,
      caption: "A caption is ready",
      content_pillar: "Authority: what changed when I simplified",
      scheduled_at: "2026-07-23T09:00:00.000Z",
      generation_status: "pending",
    }

    renderGrid(post, onSelect, onAddImage)
    fireEvent.click(screen.getByRole("button", { name: /select post 4/i }))

    expect(onSelect).toHaveBeenCalledWith(post)
    expect(onAddImage).not.toHaveBeenCalled()
    expect(screen.getByText("Authority")).toBeInTheDocument()
    expect(screen.getByText(/what changed when i simplified/i)).toBeInTheDocument()
  })

  it("shows real failed generation state and an explicit retry action", () => {
    renderGrid({
      id: 42,
      position: 5,
      image_url: null,
      caption: "Ready caption",
      content_pillar: "Trust: behind the scenes",
      generation_status: "failed",
    })

    expect(screen.getByText("Image failed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry image for post 5" })).toBeInTheDocument()
  })

  it("shows saved context without asking a returning user to confirm it again", () => {
    const onConfirm = vi.fn()
    render(
      <CalendarPlanSettingsCard
        settings={{
          businessType: "Personal brand photography",
          idealAudience: "Women building a visible business",
          currentSituation: "SSELFIE Suite membership",
          feedStyle: "Light & Minimalistic",
        }}
        onSave={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByText("Personal brand photography")).toBeInTheDocument()
    expect(screen.getByText("Women building a visible business")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adjust" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Use this context" })).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("announces queued, generating, ready, and failed image states per post", () => {
    const posts = [
      {
        id: 51,
        position: 1,
        image_url: null,
        caption: "Queued caption",
        generation_status: "queued",
      },
      {
        id: 52,
        position: 2,
        image_url: null,
        caption: "Generating caption",
        generation_status: "generating",
      },
      {
        id: 53,
        position: 3,
        image_url: "https://example.com/ready.jpg",
        caption: "Ready caption",
        generation_status: "completed",
      },
      {
        id: 54,
        position: 4,
        image_url: null,
        caption: "Failed caption",
        generation_status: "failed",
      },
    ]

    render(
      <FeedGrid
        posts={posts}
        postStatuses={[]}
        draggedIndex={null}
        isSavingOrder={false}
        feedId={7}
        access={{ isMembership: true, canGenerateImages: true } as any}
        activePostId={null}
        onPostClick={vi.fn()}
        onAddImage={vi.fn()}
        onDragStart={noopDrag}
        onDragOver={noopDrag}
        onDragEnd={noopDrag}
        onMovePost={noopDrag}
      />
    )

    expect(screen.getByRole("status", { name: "Post 1 status: Queued" })).toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Post 2 status: Creating image" })).toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Post 3 status: Ready" })).toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Post 4 status: Image failed" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry image for post 4" }).className).toContain(
      "min-h-11"
    )
  })

  it("keeps incomplete settings inline and saves them to the shared profile", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <CalendarPlanSettingsCard
        settings={{ businessType: "Coach", idealAudience: "", currentSituation: "", feedStyle: "" }}
        onSave={onSave}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText(/real business instead of guessing/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Who this plan is for"), {
      target: { value: "Women rebuilding their confidence" },
    })
    fireEvent.change(screen.getByLabelText("Current offer or focus"), {
      target: { value: "A six week confidence programme" },
    })
    expect(screen.queryByRole("group", { name: "Visual direction" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Save content context" }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          idealAudience: "Women rebuilding their confidence",
          currentSituation: "A six week confidence programme",
        })
      )
    )
  })

  it("does not erase typed context when the profile rerenders with the same values", () => {
    const baseSettings = {
      businessType: "",
      idealAudience: "",
      currentSituation: "",
      feedStyle: "",
    }
    const { rerender } = render(
      <CalendarPlanSettingsCard
        settings={baseSettings}
        onSave={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText("What you do"), {
      target: { value: "Personal brand photographer" },
    })
    rerender(
      <CalendarPlanSettingsCard
        settings={{ ...baseSettings }}
        onSave={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByLabelText("What you do")).toHaveValue("Personal brand photographer")
  })

  it("summarizes only real work and recommends one next post", () => {
    render(
      <CalendarNeedsMe
        posts={[
          { id: 1, position: 1, image_url: "ready.jpg", caption: "Ready" },
          {
            id: 2,
            position: 2,
            image_url: null,
            caption: "Caption ready",
            content_pillar: "Authority",
          },
          {
            id: 3,
            position: 3,
            image_url: null,
            caption: null,
            prediction_id: "job-3",
            generation_status: "generating",
          },
        ]}
        onSelectPost={vi.fn()}
      />
    )

    expect(screen.getByText((_, node) => node?.textContent === "1 post ready")).toBeInTheDocument()
    expect(
      screen.getByText((_, node) => node?.textContent === "1 needs a photo")
    ).toBeInTheDocument()
    expect(
      screen.getByText((_, node) => node?.textContent === "1 needs a caption")
    ).toBeInTheDocument()
    expect(
      screen.getByText((_, node) => node?.textContent === "Maya is creating 1 image")
    ).toBeInTheDocument()
    expect(screen.getByText(/finish post 2 next/i)).toBeInTheDocument()
  })

  it("does not pretend an untouched grid has a next post to finish", () => {
    const chooseDirection = vi.fn()
    render(
      <CalendarNeedsMe
        posts={Array.from({ length: 9 }, (_, index) => ({
          id: index + 1,
          position: index + 1,
          image_url: null,
          caption: null,
          generation_status: "pending",
        }))}
        onSelectPost={vi.fn()}
        onChooseVisualDirection={chooseDirection}
      />
    )

    expect(screen.queryByText(/finish post/i)).not.toBeInTheDocument()
    expect(screen.getByText(/choose how the grid should feel first/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /choose visual direction/i }))
    expect(chooseDirection).toHaveBeenCalledTimes(1)
  })

  it("asks for truthful content context after the visual direction is saved", () => {
    const openContentContext = vi.fn()
    render(
      <CalendarNeedsMe
        posts={Array.from({ length: 9 }, (_, index) => ({
          id: index + 1,
          position: index + 1,
          image_url: null,
          caption: null,
          generation_status: "pending",
        }))}
        hasVisualDirection
        hasContentContext={false}
        onSelectPost={vi.fn()}
        onOpenContentContext={openContentContext}
      />
    )

    expect(
      screen.queryByRole("button", { name: /choose visual direction/i })
    ).not.toBeInTheDocument()
    expect(screen.getByText(/visual direction ready/i)).toBeInTheDocument()
    expect(screen.getByText(/won’t make up your story/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /add content context/i }))
    expect(openContentContext).toHaveBeenCalledTimes(1)
  })

  it("opens post 1 once direction and truthful context are ready", () => {
    const selectPost = vi.fn()
    const posts = Array.from({ length: 9 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      image_url: null,
      caption: null,
      generation_status: "pending",
    }))
    render(
      <CalendarNeedsMe
        posts={posts}
        hasVisualDirection
        hasContentContext
        onSelectPost={selectPost}
      />
    )

    expect(screen.getByText(/ready to create/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /open post 1/i }))
    expect(selectPost).toHaveBeenCalledWith(posts[0])
  })
})
