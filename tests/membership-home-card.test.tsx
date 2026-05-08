import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import MembershipHomeCard from "@/components/sselfie/maya/membership-home-card"

describe("MembershipHomeCard", () => {
  it("renders core rows and action callbacks", () => {
    const onContinue = vi.fn()
    const onGeneratePhoto = vi.fn()
    const onBrowseStyles = vi.fn()
    const onUploadAssets = vi.fn()
    render(
      <MembershipHomeCard
        creditsReady={247}
        lastSessionTitle="Storm campaign draft"
        monthlyDropName={null}
        onContinue={onContinue}
        onGeneratePhoto={onGeneratePhoto}
        onBrowseStyles={onBrowseStyles}
        onUploadAssets={onUploadAssets}
      />,
    )

    expect(screen.getByText("Pick up where you left off")).toBeInTheDocument()
    expect(screen.getByText("247 credits")).toBeInTheDocument()
    expect(screen.getByText("Storm campaign draft")).toBeInTheDocument()
    expect(screen.queryByText("This month")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /create a post/i }))
    fireEvent.click(screen.getByRole("button", { name: /^open chat$/i }))
    fireEvent.click(screen.getByRole("button", { name: /more options/i }))
    fireEvent.click(screen.getByRole("button", { name: /browse styles/i }))
    fireEvent.click(screen.getByRole("button", { name: /upload brand assets/i }))

    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(onGeneratePhoto).toHaveBeenCalledTimes(1)
    expect(onBrowseStyles).toHaveBeenCalledTimes(1)
    expect(onUploadAssets).toHaveBeenCalledTimes(1)

    // calendar and plan-my-week actions are hidden (stabilization)
    expect(screen.queryByRole("button", { name: /plan my week/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /create calendar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /build a page/i })).not.toBeInTheDocument()
  })

  it("renders monthly drop row when provided", () => {
    const onExploreMonthlyDrop = vi.fn()

    render(
      <MembershipHomeCard
        creditsReady={300}
        lastSessionTitle={null}
        monthlyDropName="Coastal Summer style pack"
        onContinue={vi.fn()}
        onGeneratePhoto={vi.fn()}
        onBrowseStyles={vi.fn()}
        onExploreMonthlyDrop={onExploreMonthlyDrop}
      />,
    )

    expect(screen.getByText("This month")).toBeInTheDocument()
    expect(screen.getByText("Coastal Summer style pack")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^open in academy$/i }))
    expect(onExploreMonthlyDrop).toHaveBeenCalledTimes(1)
  })
})
