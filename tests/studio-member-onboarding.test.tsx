import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import StudioMemberOnboarding from "@/components/sselfie/maya/studio-member-onboarding"

describe("StudioMemberOnboarding", () => {
  it("does not render when closed", () => {
    render(
      <StudioMemberOnboarding
        open={false}
        creditBalance={200}
        onClose={vi.fn()}
        onShowSelfieMode={vi.fn()}
        onUploadSelfie={vi.fn()}
        onStartTraining={vi.fn()}
      />,
    )

    expect(screen.queryByText("Your Studio Is Ready")).not.toBeInTheDocument()
  })

  it("advances through steps and triggers actions", () => {
    const onClose = vi.fn()
    const onShowSelfieMode = vi.fn()
    const onUploadSelfie = vi.fn()
    const onStartTraining = vi.fn()

    render(
      <StudioMemberOnboarding
        open
        creditBalance={123}
        onClose={onClose}
        onShowSelfieMode={onShowSelfieMode}
        onUploadSelfie={onUploadSelfie}
        onStartTraining={onStartTraining}
      />,
    )

    expect(screen.getByText("Your Studio Is Ready")).toBeInTheDocument()
    expect(screen.getByText("123")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /show me selfie mode/i }))
    expect(onShowSelfieMode).toHaveBeenCalledTimes(1)
    expect(screen.getByText("This Is SELFIE Mode")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /upload a selfie/i }))
    expect(onUploadSelfie).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Want Even Better Results?")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /start training/i }))
    expect(onStartTraining).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
