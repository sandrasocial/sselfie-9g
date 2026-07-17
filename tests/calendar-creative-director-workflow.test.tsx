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

  it("lets a returning user confirm the saved plan without typing", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Use this plan" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
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
    fireEvent.click(screen.getByRole("button", { name: "Light & Minimalistic" }))
    fireEvent.click(screen.getByRole("button", { name: "Save plan settings" }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          idealAudience: "Women rebuilding their confidence",
          currentSituation: "A six week confidence programme",
          feedStyle: "Light & Minimalistic",
        })
      )
    )
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
})
