// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Maya Create visual studio contract", () => {
  it("renders an image-first world with six working navigation paths", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")

    for (const label of ["My selfies", "For you", "Saved looks", "Inspiration", "Recent shoots"]) {
      expect(frontDoor).toContain(label)
    }
    expect(frontDoor).toContain("openHistory")
    expect(frontDoor).toContain("openFresh")
    expect(frontDoor).toContain("openWorld")
    expect(frontDoor).toContain("alternateWorlds")
    expect(frontDoor).toContain("recommendations[0]")
    expect(frontDoor).toContain("Recreate this look")
    expect(frontDoor).toContain("inspirationImageUrl: asset.url")
  })

  it("uses one authoritative, reactive identity library across Create and Maya", () => {
    const hook = read("components/app-v3/use-identity-references.ts")
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const manager = read("components/app-v3/selfie-reference-manager-modal.tsx")

    expect(hook).toContain("/api/app-v3/reference-library")
    expect(hook).toContain('"sselfie:identity-updated"')
    expect(frontDoor).toContain("useIdentityReferences(")
    expect(frontDoor).toContain("initialHasSelfie,")
    expect(frontDoor).toContain("initialPrimarySelfieUrl")
    expect(frontDoor).toContain("referenceSelfieUrl: primarySelfieUrl")
    expect(manager).toContain("announceIdentityUpdated()")
  })

  it("keeps desktop Maya beside the canvas and mobile Maya in a full-height sheet", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const maya = read("components/app-v3/maya-concierge.tsx")

    expect(shell).toContain(
      'activeSection === "calendar" || (activeSection === "create" && !mayaHomeEnabled)'
    )
    expect(maya).toContain(
      "aria-modal={homeMode ? undefined : !childOverlayOpen && !isDesktopWorkspace}"
    )
    expect(maya).toContain("aria-hidden={childOverlayOpen ? true : undefined}")
    expect(maya).toContain("h-[94dvh]")
    expect(maya).not.toContain("h-[62dvh]")
    expect(maya).not.toContain("mobileSheetSize")
    expect(maya).toContain("lg:w-[27rem]")
  })

  it("persists creative task output and safely reconnects interrupted paid requests", () => {
    const maya = read("components/app-v3/maya-concierge.tsx")
    const store = read("lib/app-v3/maya/chat-store.ts")
    const localDraft = read("components/app-v3/continuity.ts")
    const serverDraft = read("lib/app-v3/maya/draft-snapshot.ts")
    const migration = read("migrations/20260717_app_v3_creative_tasks.sql")

    expect(store).toContain("workspace   jsonb")
    expect(store).toContain("task_status")
    expect(store).toContain("thumbnail_url")
    expect(store).toContain("output_count")
    expect(maya).toContain("summarizeCreativeTask")
    expect(maya).toContain("durableCreativeTaskState")
    expect(maya).toContain("delete durable.previewUrl")
    expect(maya).toContain("workspace,")
    expect(maya).toContain("pendingRequest")
    expect(maya).toContain("generationRef?.includes(pending.clientRequestId)")
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS workspace jsonb")
    expect(migration).toContain("CHECK (task_status IN ('planning', 'creating', 'ready'))")
    for (const draft of [localDraft, serverDraft]) {
      expect(draft).toContain('state.status === "generating"')
      expect(draft).toContain("state.pendingRequest")
      expect(draft).toContain("expectedCount")
    }
  })

  it("keeps originals beside versions and makes keeping and continuing explicit", () => {
    const gallery = read("components/app-v3/gallery-view.tsx")
    const card = read("components/app-v3/concept-card.tsx")
    const editMode = read("components/app-v3/edit-mode.tsx")
    const favoriteButton = read("components/app-v3/favorite-button.tsx")

    expect(gallery).toContain("groupGalleryVersions")
    expect(gallery).toContain('"Original"')
    expect(gallery).toContain("Compare")
    expect(gallery).toContain("Compare versions.")
    expect(editMode).toContain("Undo last")
    expect(editMode).toContain("Versions ·")
    expect(editMode).toContain("Saved to Gallery as a new version.")
    expect(editMode).toContain("Use 1 credit")
    expect(card).toContain("FavoriteButton")
    expect(card).toContain("firstDownloadAssetId")
    expect(card).not.toContain("Create another · ${estimatedCredits}")
    expect(favoriteButton).toContain("/api/app-v3/gallery/favorite")
    expect(favoriteButton).toContain("aria-pressed={isFavorite}")
  })

  it("adds Calendar text through the existing bake endpoint and only swaps after approval", () => {
    const studio = read("components/feed-planner/calendar-text-studio.tsx")
    const bakeRoute = read("app/api/app-v3/maya/bake-text/route.ts")
    const replaceRoute = read("app/api/feed/[feedId]/replace-post-image/route.ts")
    const agentRoute = read("app/api/app-v3/maya/calendar-agent/route.ts")

    expect(studio).toContain("/api/app-v3/maya/bake-text")
    expect(studio).toContain("Use in grid")
    expect(studio).toContain("`/api/feed/${feedId}/replace-post-image`")
    expect(studio).toContain("Your clean photo stays safe")
    expect(bakeRoute).toContain("calendarPostAuthorized")
    expect(bakeRoute).toContain("buildBakePrompt(spec")
    expect(replaceRoute).toContain("ai_image_id =")
    expect(agentRoute).not.toContain("add_text")
    expect(agentRoute).not.toContain("bake_text")
  })
})
