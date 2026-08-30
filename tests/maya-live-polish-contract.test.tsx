// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

import { ConceptCard } from "@/components/app-v3/concept-card"

const concept = {
  id: "mobile-story-result",
  title: "A finished story",
  description: "A member-owned result.",
  brief: {
    outfit: "black knit",
    setting: "window light",
    mood: "calm",
    pose: "looking into camera",
  },
}

describe("Maya live member polish", () => {
  it("caps a portrait result on mobile while keeping the full-size viewer", () => {
    render(
      <ConceptCard
        concept={concept}
        format="story-sequence"
        gen={{ status: "done", imageUrls: ["https://example.com/story.png"] }}
        onGenerate={vi.fn()}
        onOpen={vi.fn()}
      />
    )

    const preview = screen.getByRole("button", { name: "View full size" }).parentElement
    expect(preview).toHaveClass("suite-concept-result-preview")
    expect(preview).toHaveClass("max-h-[min(62dvh,34rem)]")
    expect(screen.getByAltText("A finished story")).toHaveClass("object-contain")
  })

  it("keeps the finish action beside a completed carousel result", async () => {
    const onFinishPost = vi.fn(async () => ({ caption: "Ready to post." }))
    render(
      <ConceptCard
        concept={concept}
        format="carousel"
        gen={{ status: "done", imageUrls: ["https://example.com/carousel.png"] }}
        onGenerate={vi.fn()}
        onFinishPost={onFinishPost}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Finish as a post" }))
    await waitFor(() => expect(onFinishPost).toHaveBeenCalledOnce())
    expect(await screen.findByText("Ready to post.")).toBeInTheDocument()
  })

  it("clears child overlays when New Chat or a Calendar handoff changes the task", () => {
    const concierge = readFileSync("components/app-v3/maya-concierge.tsx", "utf8")
    const boundaryStart = concierge.indexOf("const transientTaskKey =")
    const boundaryEnd = concierge.indexOf("// The chatId that belongs", boundaryStart)
    const boundary = concierge.slice(boundaryStart, boundaryEnd)

    expect(boundary).toContain("session?.mayaContext?.taskId")
    expect(boundary).toContain("session?.startedAt")
    expect(boundary).toContain("setEditTarget(null)")
    expect(boundary).toContain("setLightbox(null)")
    expect(boundary).toContain("setSelfieManagerOpen(false)")
  })

  it("uses the member's chosen visual-world thumbnails instead of founder fallback photos", () => {
    const concierge = readFileSync("components/app-v3/maya-concierge.tsx", "utf8")
    const conceptCard = readFileSync("components/app-v3/concept-card.tsx", "utf8")

    expect(concierge).toContain("const EDITORIAL_DIRECTION_IMAGES: readonly string[] = []")
    expect(concierge).not.toContain("suite-editorial-studio-power-v1.png")
    expect(concierge).not.toContain("suite-editorial-white-shirt-v1.png")
    expect(concierge).not.toContain("suite-editorial-street-mono-v1.jpeg")
    expect(conceptCard).toContain('displayEyebrow = "Maya\'s pick"')
    expect(conceptCard).toContain('displayEyebrow = "Also worth trying"')
  })

  it("keeps Edit a Photo above the mobile nav with its composer pinned inside the dialog", () => {
    const editMode = readFileSync("components/app-v3/edit-mode.tsx", "utf8")
    const navigation = readFileSync("components/app-v3/suite-editorial-navigation.tsx", "utf8")

    expect(editMode).toContain("fixed inset-0 z-[80]")
    expect(editMode).toContain('"--suite-night": "var(--ss-brand-obsidian)"')
    expect(editMode).toContain('"--suite-accent": "var(--ss-brand-obsidian)"')
    expect(editMode).toContain("shrink-0 border-t")
    expect(editMode).toContain("pb-[max(env(safe-area-inset-bottom),0.75rem)]")
    expect(navigation).toContain("suite-bottom-nav fixed inset-x-0 bottom-0 z-40")
  })
})
