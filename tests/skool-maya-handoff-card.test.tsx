// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SkoolMayaHandoffCard } from "@/components/app-v3/skool-maya-handoff-card"
import { getSkoolMayaHandoff } from "@/lib/app-v3/maya/skool-handoff"

describe("Skool Maya handoff card", () => {
  it("shows one clear next action and a route back to the exact lesson", () => {
    const onStart = vi.fn()
    const handoff = getSkoolMayaHandoff("selfie-practice")
    expect(handoff).not.toBeNull()

    render(<SkoolMayaHandoffCard handoff={handoff!} onStart={onStart} />)

    expect(screen.getByText("From SSELFIE Skool")).toBeTruthy()
    expect(screen.getByText("Practise this selfie lesson with Maya")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Start this with Maya" }))
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("link", { name: "Return to the Skool lesson" })).toHaveAttribute(
      "href",
      handoff!.returnUrl
    )
  })

  it("cannot start twice while Maya is busy", () => {
    const onStart = vi.fn()
    const handoff = getSkoolMayaHandoff("editing-practice")!
    render(<SkoolMayaHandoffCard handoff={handoff} disabled onStart={onStart} />)

    fireEvent.click(screen.getByRole("button", { name: "Start this with Maya" }))
    expect(onStart).not.toHaveBeenCalled()
  })
})
