// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { ConceptCard } from "@/components/app-v3/concept-card"
import { ClarifyCard } from "@/components/app-v3/clarify-card"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { PRIMARY_MEMBER_SECTIONS } from "@/lib/app-v3/member-navigation"
import { resolveAppV3InitialSection } from "@/lib/app-v3/navigation"

vi.mock("@/lib/analytics/client", () => ({ trackAnalyticsEvent: vi.fn() }))

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
  it("shows the five plain-language member destinations without changing their route ids", () => {
    expect(PRIMARY_MEMBER_SECTIONS).toEqual(["create", "photos", "calendar", "library", "account"])
    expect(resolveAppV3InitialSection("calendar")).toBe("calendar")
    expect(resolveAppV3InitialSection("library")).toBe("library")
  })

  it("names the member places by their real destinations without moving stored data", () => {
    const shell = readFileSync(resolve(process.cwd(), "components/app-v3/app-v3-shell.tsx"), "utf8")
    const gallery = readFileSync(
      resolve(process.cwd(), "components/app-v3/gallery-view.tsx"),
      "utf8"
    )

    expect(shell).toContain('label: "Create"')
    expect(shell).toContain('label: "Gallery"')
    expect(shell).toContain('label: "Calendar"')
    expect(shell).toContain('label: "Learn"')
    expect(shell).toContain('label: "Account"')
    expect(gallery).toContain("Post projects")
    expect(gallery).toContain("Continue where you left off.")
    expect(shell).toContain("onOpenProjects={limited ? undefined : openHistory}")
    expect(shell).not.toContain(
      "<MayaFloatingLauncher operatingLayerEnabled={mayaOperatingLayerEnabled} />"
    )
  })

  it("separates Maya into the three creative paths members recognise", () => {
    const concierge = readFileSync(
      resolve(process.cwd(), "components/app-v3/maya-concierge.tsx"),
      "utf8"
    )
    const gallery = readFileSync(
      resolve(process.cwd(), "components/app-v3/gallery-view.tsx"),
      "utf8"
    )

    expect(concierge).toContain("AI Photos")
    expect(concierge).toContain("Edit a Photo")
    expect(concierge).toContain("Build a Post")
    expect(concierge).toContain("Plan a photoshoot")
    expect(concierge).toContain("Caption")
    expect(concierge).toContain("Stories")
    expect(gallery).toContain("Choose a photo to edit")
    expect(gallery).toContain("Your original stays untouched")
  })

  it("routes learning through one visible destination with safe external handoffs", () => {
    const shell = readFileSync(resolve(process.cwd(), "components/app-v3/app-v3-shell.tsx"), "utf8")
    const library = readFileSync(
      resolve(process.cwd(), "components/app-v3/library-view.tsx"),
      "utf8"
    )
    const destinations = readFileSync(
      resolve(process.cwd(), "lib/app-v3/learning-destinations.ts"),
      "utf8"
    )

    expect(shell).toContain("learningDestinations={LEARNING_DESTINATIONS}")
    expect(library).toContain("Learning spaces")
    expect(destinations).toContain("https://www.skool.com/sselfie-photo-club-2569")
    expect(destinations).toContain("NEXT_PUBLIC_SSELFIE_STUDIO_COM_URL")
    expect(destinations).toContain('status: studioComUrl ? "available" : "coming-soon"')
  })

  it("makes the finished post the explicit Create promise", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/app-v3/visual-front-door.tsx"),
      "utf8"
    )

    expect(source).toContain("Create something worth posting.")
    expect(source).toContain("Start with the photo.")
    expect(source).toContain("focusedQuickActions.map")
    expect(source).toContain("{!operatingLayerEnabled ? (")
    expect(source).not.toContain("!operatingLayerEnabled || moreOpen")
    expect(source).not.toContain("what are we making?")
    expect(source).not.toContain('"My selfies", "Inspiration", "New"')
  })

  it("starts one post without asking the member to choose between six formats", () => {
    const concierge = readFileSync(
      resolve(process.cwd(), "components/app-v3/maya-concierge.tsx"),
      "utf8"
    )
    const inline = readFileSync(
      resolve(process.cwd(), "components/app-v3/maya-inline-components.tsx"),
      "utf8"
    )

    expect(concierge).toContain("<InlineProjectStart")
    expect(concierge).not.toContain("<InlineFormatChoice")
    expect(inline).toContain("Create my next post")
    expect(inline).toContain("Maya recommends one format")
    expect(inline).toContain("You confirm it")
    expect(inline).not.toContain("Choose one path")
  })

  it("makes Maya's format recommendation visibly optional before creation", () => {
    const onPick = vi.fn()

    render(
      <ClarifyCard
        clarify={{
          kind: "format",
          question: "I recommend a carousel because this idea needs a short teaching sequence.",
          options: ["Create the carousel", "Choose something else"],
          allowFreeText: true,
        }}
        onPick={onPick}
        onFreeText={vi.fn()}
      />
    )

    expect(screen.getByText("Maya recommends")).toBeInTheDocument()
    expect(screen.getByText("You choose before Maya creates anything.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create the carousel" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Choose something else" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Choose something else" }))
    expect(onPick).toHaveBeenCalledWith("Choose something else")
  })

  it("makes finishing the post the dominant result action and returns the caption", async () => {
    const onFinishPost = vi.fn(async () => ({
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
        onFinishPost={onFinishPost}
        resultActions={<button type="button">Make it more like me</button>}
      />
    )

    expect(screen.getByRole("button", { name: "Finish this post" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Make it more like me" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add to my plan" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Finish this post" }))

    await waitFor(() => expect(onFinishPost).toHaveBeenCalledTimes(1))
    expect(await screen.findByText("A ready-to-use caption.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Make it more like me" })).toBeInTheDocument()
    expect(screen.getByText("Would you post this?")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Almost" }))
    expect(trackAnalyticsEvent).toHaveBeenCalledWith({
      event: "suite_post_readiness_rated",
      properties: { format: "photo", answer: "almost" },
    })
    expect(screen.getByText("Thank you — this helps Maya improve.")).toBeInTheDocument()
  })

  it("requires one explicit save before calling the post durable and restores the receipt", async () => {
    const onFinishPost = vi.fn(async () => ({ caption: "The exact finished caption." }))
    const onSaveReadyPost = vi.fn(async () => ({
      scheduledAt: "2026-08-24",
      position: 4,
      caption: "The exact finished caption.",
    }))
    const onOpenReadyPost = vi.fn()

    render(
      <ConceptCard
        concept={concept}
        format="photo"
        gen={{
          status: "done",
          imageUrls: ["https://example.com/photo.png"],
        }}
        onGenerate={vi.fn()}
        onFinishPost={onFinishPost}
        onSaveReadyPost={onSaveReadyPost}
        onOpenReadyPost={onOpenReadyPost}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Finish this post" }))
    expect(await screen.findByText("The exact finished caption.")).toBeInTheDocument()
    expect(screen.queryByText(/Ready in Calendar/i)).not.toBeInTheDocument()
    expect(screen.queryByText("Would you post this?")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Save as ready post" }))

    await waitFor(() => expect(onSaveReadyPost).toHaveBeenCalledWith("The exact finished caption."))
    expect(await screen.findByText(/Ready in Calendar · Post 4/i)).toBeInTheDocument()
    expect(screen.getByText("Would you post this?")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Open Calendar" }))
    expect(onOpenReadyPost).toHaveBeenCalledTimes(1)
  })

  it("keeps caption generation separate from the explicit durable Calendar save", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/app-v3/maya-concierge.tsx"),
      "utf8"
    )
    const placementRoute = readFileSync(
      resolve(process.cwd(), "app/api/app-v3/maya/feed-plan/place-photo/route.ts"),
      "utf8"
    )

    expect(source).toContain('fetch("/api/app-v3/maya/finish-post"')
    expect(source).toContain('fetch("/api/app-v3/maya/feed-plan/place-photo"')
    expect(source).toContain('event: "suite_post_caption_ready"')
    expect(source).not.toContain('event: "suite_post_finished"')
    expect(placementRoute).toContain("saveMayaReadyPost")
    expect(source).not.toContain(
      "<InlineResultActions\n                              onOpenCalendar"
    )
  })
})
