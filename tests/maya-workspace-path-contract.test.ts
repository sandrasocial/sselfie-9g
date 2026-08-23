import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { sanitizeServerMayaDraftSnapshot } from "@/lib/app-v3/maya/draft-snapshot"
import {
  MAYA_WORKSPACE_PATHS,
  allowedActionsForMayaPath,
  allowedFormatsForMayaPath,
  isFormatAllowedForMayaPath,
  isToolAllowedForMayaPath,
  mayaWorkspacePathForFormat,
  outputFormatForMayaWorkspaceAction,
} from "@/lib/app-v3/maya/workspace-path"

function draft(overrides: Record<string, unknown> = {}) {
  const { session: sessionOverrides, ...draftOverrides } = overrides
  return {
    isOpen: true,
    savedAt: Date.now(),
    chatId: "chat_workspace_contract",
    session: {
      workspacePath: "ai-photos",
      aesthetic: {
        id: "maya-general",
        name: "SSELFIE",
        blurb: "Test",
        coverImage: "",
        thumbnails: [],
        shotCount: 0,
        intent: "Test",
      },
      outputFormat: "photo",
      referenceSelfieUrl: null,
      videoSourceUrl: null,
      graphicText: null,
      startedAt: 123,
      ...(sessionOverrides as Record<string, unknown> | undefined),
    },
    messages: [],
    genState: {},
    generatedOnce: false,
    setupOpen: false,
    ...draftOverrides,
  }
}

describe("Maya workspace path contract", () => {
  it("keeps exactly the three approved persistent paths", () => {
    expect(MAYA_WORKSPACE_PATHS).toEqual(["ai-photos", "edit-photo", "build-post"])
  })

  it("separates AI photos, editing, and finished-post outputs", () => {
    expect(allowedFormatsForMayaPath("ai-photos")).toEqual(["photo", "photoshoot"])
    expect(allowedFormatsForMayaPath("edit-photo")).toEqual([])
    expect(allowedFormatsForMayaPath("build-post")).toEqual(["carousel", "story-sequence"])
    expect(allowedActionsForMayaPath("build-post")).toContain("write-caption")
    expect(outputFormatForMayaWorkspaceAction("write-caption")).toBeNull()
    expect(outputFormatForMayaWorkspaceAction("build-carousel")).toBe("carousel")
    expect(isFormatAllowedForMayaPath("ai-photos", "carousel")).toBe(false)
    expect(isFormatAllowedForMayaPath("build-post", "photo")).toBe(false)
    expect(mayaWorkspacePathForFormat("photoshoot")).toBe("ai-photos")
    expect(mayaWorkspacePathForFormat("story-sequence")).toBe("build-post")
  })

  it("does not expose generation or format switching tools inside Edit a Photo", () => {
    expect(isToolAllowedForMayaPath("edit-photo", "emit_concepts")).toBe(false)
    expect(isToolAllowedForMayaPath("edit-photo", "set_format")).toBe(false)
    expect(isToolAllowedForMayaPath("edit-photo", "ask_clarify")).toBe(true)
  })

  it("persists the path and rejects a draft whose format belongs to another path", () => {
    const valid = sanitizeServerMayaDraftSnapshot(draft())
    expect(valid?.session.workspacePath).toBe("ai-photos")

    const crossed = sanitizeServerMayaDraftSnapshot(
      draft({ session: { workspacePath: "ai-photos", outputFormat: "carousel" } })
    )
    expect(crossed).toBeNull()
  })

  it("drops a stale last-generation snapshot when it belongs to another path", () => {
    const snapshot = sanitizeServerMayaDraftSnapshot(
      draft({
        session: { workspacePath: "build-post", outputFormat: "carousel" },
        lastGeneration: {
          format: "photo",
          imageCount: 1,
          styleName: "Old photo direction",
          conceptTitle: "Old result",
          usedInspiration: false,
          usedTrainedModel: false,
        },
      })
    )
    expect(snapshot?.lastGeneration).toBeNull()
  })

  it("enforces the same path contract in the Maya chat route", () => {
    const route = readFileSync("app/api/app-v3/maya/chat/route.ts", "utf8")
    expect(route).toContain("Invalid Maya workspace path")
    expect(route).toContain("isFormatAllowedForMayaPath(workspacePath, candidate)")
    expect(route).toContain("isToolAllowedForMayaPath(workspacePath, toolName)")
    expect(route).toContain('workspaceAction && toolName === "set_format"')
    expect(route).toContain("shouldAcceptLastGenerationForMayaPath")
    expect(route).toContain("Never cross into another path inside this conversation")
  })
})
