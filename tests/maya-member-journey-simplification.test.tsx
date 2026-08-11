// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { ConceptCard } from "@/components/app-v3/concept-card"
import { PRIMARY_MEMBER_SECTIONS } from "@/lib/app-v3/member-navigation"
import { resolveAppV3InitialSection } from "@/lib/app-v3/navigation"

const concept = {
  id: "finished-post-1",
  title: "Editorial portrait",
  description: "A clear brand photo for the next post.",
  brief: {
    outfit: "black knit",
    setting: "window light",
    mood: "calm",
    pose: "looking into camera",
  },
}

describe("Maya simplified member journey", () => {
  it("shows only the three places a member needs while preserving direct Calendar access", () => {
    expect(PRIMARY_MEMBER_SECTIONS).toEqual(["create", "photos", "account"])
    expect(resolveAppV3InitialSection("calendar")).toBe("calendar")
    expect(resolveAppV3InitialSection("library")).toBe("library")
  })

  it("makes the finished post the explicit Create promise", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/app-v3/visual-front-door.tsx"),
      "utf8"
    )

    expect(source).toContain("Your next finished post starts here.")
    expect(source).toContain("One selfie. One idea. One finished post")
    expect(source).toContain("focusedQuickActions.map")
    expect(source).toContain("{!operatingLayerEnabled ? (")
    expect(source).not.toContain("!operatingLayerEnabled || moreOpen")
    expect(source).not.toContain("what are we making?")
  })

  it("makes finishing the post the dominant result action and returns the caption", async () => {
    const onAddToCalendar = vi.fn(async () => ({
      scheduledAt: "2026-08-12T08:00:00.000Z",
      position: 1,
      caption: "A ready-to-use caption.",
    }))

    render(
      <ConceptCard
        concept={concept}
        format="photo"
        gen={{
          status: "done",
          imageUrls: ["https://example.com/photo.png"],
        }}
        onGenerate={vi.fn()}
        onAddToCalendar={onAddToCalendar}
      />
    )

    expect(screen.getByRole("button", { name: "Finish this post" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add to my plan" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Finish this post" }))

    await waitFor(() => expect(onAddToCalendar).toHaveBeenCalledTimes(1))
    expect(await screen.findByText("A ready-to-use caption.")).toBeInTheDocument()
  })
})
