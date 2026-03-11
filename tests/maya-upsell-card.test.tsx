import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import MayaUpsellCard from "@/components/sselfie/maya/maya-upsell-card"

describe("MayaUpsellCard", () => {
  it("lets the user upgrade or dismiss the card", () => {
    const onUpgrade = vi.fn()
    const onDismiss = vi.fn()

    render(
      <MayaUpsellCard
        eyebrow="Want a 7-day posting plan?"
        description="Show Up builds your consistency schedule around your content."
        onUpgrade={onUpgrade}
        onDismiss={onDismiss}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /upgrade to studio/i }))
    fireEvent.click(screen.getByRole("button", { name: /not now/i }))

    expect(onUpgrade).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
