import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { GalleryEmptyState } from "@/components/sselfie/gallery/components/gallery-empty-state"

describe("GalleryEmptyState", () => {
  it("keeps the free-user first-photo promise", () => {
    const onStartNow = vi.fn()

    render(<GalleryEmptyState onStartNow={onStartNow} />)

    expect(screen.getByText("Ready to see what you actually look like?")).toBeInTheDocument()
    expect(screen.getByText("First 3 photos on us. No credit card required.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /create with maya/i }))
    expect(onStartNow).toHaveBeenCalledTimes(1)
  })

  it("removes free-trial messaging for paid users", () => {
    render(<GalleryEmptyState onStartNow={vi.fn()} hasPaidAccess />)

    expect(screen.getByText("Your gallery starts with one photo.")).toBeInTheDocument()
    expect(screen.getByText("Create with Maya to add your first photo.")).toBeInTheDocument()
    expect(screen.queryByText("First 3 photos on us. No credit card required.")).not.toBeInTheDocument()
  })
})
