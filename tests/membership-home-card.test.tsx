import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import MembershipHomeCard from "@/components/sselfie/maya/membership-home-card"

describe("MembershipHomeCard", () => {
  it("renders core rows and action callbacks", () => {
    const onContinue = vi.fn()
    const onGeneratePhoto = vi.fn()
    const onPlanFeed = vi.fn()
    const onBrowseStyles = vi.fn()
    const onCreateLandingPage = vi.fn()
    const onCreateCalendar = vi.fn()
    const onUploadAssets = vi.fn()

    render(
      <MembershipHomeCard
        creditsReady={247}
        lastSessionTitle="Storm campaign draft"
        monthlyDropName={null}
        onContinue={onContinue}
        onGeneratePhoto={onGeneratePhoto}
        onPlanFeed={onPlanFeed}
        onBrowseStyles={onBrowseStyles}
        onCreateLandingPage={onCreateLandingPage}
        onCreateCalendar={onCreateCalendar}
        onUploadAssets={onUploadAssets}
      />,
    )

    expect(screen.getByText("Your Credits")).toBeInTheDocument()
    expect(screen.getByText("247 ready")).toBeInTheDocument()
    expect(screen.getByText("Storm campaign draft")).toBeInTheDocument()
    expect(screen.queryByText("This Month")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /pick up where you left off/i }))
    fireEvent.click(screen.getByRole("button", { name: /generate a photo/i }))
    fireEvent.click(screen.getByRole("button", { name: /plan my feed/i }))
    fireEvent.click(screen.getByRole("button", { name: /browse styles/i }))
    fireEvent.click(screen.getByRole("button", { name: /build landing page/i }))
    fireEvent.click(screen.getByRole("button", { name: /create calendar/i }))
    fireEvent.click(screen.getByRole("button", { name: /upload assets/i }))

    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(onGeneratePhoto).toHaveBeenCalledTimes(1)
    expect(onPlanFeed).toHaveBeenCalledTimes(1)
    expect(onBrowseStyles).toHaveBeenCalledTimes(1)
    expect(onCreateLandingPage).toHaveBeenCalledTimes(1)
    expect(onCreateCalendar).toHaveBeenCalledTimes(1)
    expect(onUploadAssets).toHaveBeenCalledTimes(1)
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
        onPlanFeed={vi.fn()}
        onBrowseStyles={vi.fn()}
        onExploreMonthlyDrop={onExploreMonthlyDrop}
      />,
    )

    expect(screen.getByText("This Month")).toBeInTheDocument()
    expect(screen.getByText("Coastal Summer style pack")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^explore →$/i }))
    expect(onExploreMonthlyDrop).toHaveBeenCalledTimes(1)
  })
})
