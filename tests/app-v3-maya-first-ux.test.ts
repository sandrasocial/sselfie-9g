import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Maya-first Suite creation UX", () => {
  it("makes the Create page start with Maya instead of a format grid", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")

    expect(frontDoor).toContain("What do you want to make today?")
    expect(frontDoor).toContain("STARTER_CHIPS")
    expect(frontDoor).toContain("Make my first photo")
    expect(frontDoor).toContain("Turn an idea into a carousel")
    expect(frontDoor).toContain("detectCreationIntent")
    expect(frontDoor).toContain("creationIntent: intent")
    expect(frontDoor).not.toContain("manualOpen")
    expect(frontDoor).not.toContain("Manual format choices")
    expect(frontDoor).not.toContain("Start from a Vault look")
    expect(frontDoor).not.toContain("ShotPickerDialog")
    expect(frontDoor).not.toContain("SelfieReferenceManagerModal")
  })

  it("keeps Create as a calm start surface and makes Maya the setup owner", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const types = read("components/app-v3/types.ts")

    expect(frontDoor).toContain("openSelfieManagerInMaya")
    expect(frontDoor).toContain('initialSetupAction: "selfie_manager"')
    expect(frontDoor).not.toContain("function AestheticTile")
    expect(frontDoor).not.toContain("function ShotPickerDialog")
    expect(frontDoor).not.toContain("onOpen={openAesthetic}")
    expect(frontDoor).not.toContain("onUseTrainedModel")

    expect(types).toContain('initialSetupAction?: "selfie_manager" | null')
    expect(concierge).toContain('session.initialSetupAction === "selfie_manager"')
    expect(concierge).toContain("setSelfieManagerOpen(true)")
  })

  it("routes clear typed requests before Maya replies", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain('commitDetectedIntent(text, "typed", { suppressAutoPull: true })')
    expect(concierge).toContain("extrasRef.current = { ...extrasRef.current, format: intent.format")
    expect(concierge).toContain("creationIntent: activeCreationIntent")
    expect(concierge).toContain("InlineFormatChoice")
    expect(concierge).toContain("InlineSelfieUpload")
    expect(concierge).toContain("InlineVibePicker")
    expect(concierge).toContain("InlineShotPicker")
    expect(concierge).toContain("InlineResultActions")
    expect(concierge).toContain("onPick={sendInlineAnswer}")
  })

  it("waits for a style before pulling initial non-video directions", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const renderHasStarted = concierge.indexOf(
      "const hasStarted = messages.length > 0\n  const activeCreationIntent"
    )
    const renderNeedsVisualWorld = concierge.indexOf(
      'const needsInitialVisualWorld =\n    Boolean(outputFormat) && outputFormat !== "video"'
    )

    expect(concierge).toContain("const needsInitialVisualWorld")
    expect(renderHasStarted).toBeGreaterThan(-1)
    expect(renderNeedsVisualWorld).toBeGreaterThan(-1)
    expect(renderHasStarted).toBeLessThan(renderNeedsVisualWorld)
    expect(concierge).toContain('fmt !== "video"')
    expect(concierge).toContain("!hasSpecificSessionWorld")
    expect(concierge).toContain("if (needsInitialVisualWorld) return")
    expect(concierge).toContain(
      "const shouldShowFormatChoice = !outputFormat || (hasStarted && setupOpen)"
    )
    expect(concierge).toContain("shouldShowFormatChoice &&")
    expect(concierge).toContain("shouldShowVibeChoice &&")
    expect(concierge).toContain("Choose a style first")
  })

  it("lets members expand the style picker beyond the first six looks", () => {
    const inline = read("components/app-v3/maya-inline-components.tsx")

    expect(inline).toContain("Choose your style")
    expect(inline).toContain("showAllStyles")
    expect(inline).toContain("showAllStyles ? aesthetics : aesthetics.slice(0, 6)")
    expect(inline).toContain("Show all ${aesthetics.length} styles")
    expect(inline).toContain("add an inspiration image")
  })

  it("treats inspiration upload as a real style choice instead of an optional dead end", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const inline = read("components/app-v3/maya-inline-components.tsx")

    expect(concierge).toContain("function handleInspirationReady")
    expect(concierge).toContain("pendingInspirationIntentRef")
    expect(concierge).toContain("inspiration_style_committed")
    expect(inline).toContain("Use my inspiration")
    expect(concierge).toContain("attachInputRef.current?.click()")
    expect(concierge).toContain("openWithAesthetic(MAYA_DECIDES_AESTHETIC")
    expect(concierge).toContain("Use my inspiration image as the style direction")
    expect(concierge).toContain('handleInspirationReady(url, "manager")')
    expect(concierge).not.toContain(
      'trackInlineChoice("use_inspiration", intent)\n    setSelfieManagerOpen(true)'
    )
  })

  it("keeps inspiration upload affordances on the same accepted-file contract", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const manager = read("components/app-v3/selfie-reference-manager-modal.tsx")

    expect(concierge).toContain('const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp"')
    expect(manager).toContain('const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp"')
    expect(concierge).toContain("accept={IMAGE_UPLOAD_ACCEPT}")
    expect(manager).toContain("accept={IMAGE_UPLOAD_ACCEPT}")
    expect(concierge).not.toContain('accept="image/*"')
  })

  it("keeps the server from defaulting unclear requests into photo concepts", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")

    expect(route).toContain("normalizeCreationIntent")
    expect(route).toContain("needsFormatClarification")
    expect(route).toContain("No output format has been committed yet")
    expect(route).toContain("Do not assume this is a photo request")
    expect(route).toContain("Do not call emit_concepts until she chooses")
  })

  it("stores creation intent in local and server draft snapshots", () => {
    const localContinuity = read("components/app-v3/continuity.ts")
    const serverSnapshot = read("lib/app-v3/maya/draft-snapshot.ts")

    expect(localContinuity).toContain("function sanitizeCreationIntent")
    expect(localContinuity).toContain("creationIntent: sanitizeCreationIntent")
    expect(serverSnapshot).toContain("function sanitizeCreationIntent")
    expect(serverSnapshot).toContain("creationIntent: sanitizeCreationIntent")
  })

  it("routes existing Content and Gallery entry points into Maya with source context", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(shell).toContain('intentForFormat(format, "content_card")')
    expect(shell).toContain('intentForFormat("video", "gallery_action")')
    expect(shell).toContain('creationIntent: intentForFormat(format, "manual")')
  })

  it("uses the full-screen Maya drawer so the bottom nav does not compete with chat", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(shell).not.toContain("close: closeMaya, isOpen: mayaOpen")
    expect(shell).not.toContain("if (mayaOpen) closeMaya()")
    expect(shell).not.toContain('"--sselfie-bottom-nav-height"')
    expect(shell).toContain("pb-[calc(4.75rem+env(safe-area-inset-bottom))]")

    expect(concierge).toContain("fixed inset-0 z-50 flex w-full")
    expect(concierge).toContain('className="relative flex h-[100dvh]')
    expect(concierge).not.toContain("fixed inset-x-0 top-0 z-50")
  })

  it("requires an explicit text/no-text choice before graphic generation", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const route = read("app/api/app-v3/maya/generate/route.ts")
    const card = read("components/app-v3/concept-card.tsx")
    const lightbox = read("components/app-v3/image-lightbox.tsx")

    expect(concierge).toContain("function GraphicTextChoiceCard")
    expect(concierge).toContain("setTextOverlayMode(mode)")
    expect(concierge).toContain('textOverlayMode === "with-text"')
    expect(concierge).toContain('onChoose("without-text")')
    expect(route).toContain("normalizeRequestedOverlayStyle(body.overlayStyle)")
    expect(route).toContain("normalizeGraphicTextMode(body.textOverlayMode)")
    expect(route).toContain("shouldBakeGraphicText(format, requestedTextOverlayMode)")
    expect(route).toContain("textSuggestionEnabled: Boolean(requestedTextOverlayMode)")
    expect(card).toContain("const firstOverlay = gen.textOverlaySpecs?.[0] ?? null")
    expect(card).not.toContain("TextOverlayLayer")
    expect(lightbox).toContain("const overlay = textOverlaySpecs?.[index] ?? null")
    expect(lightbox).not.toContain("TextOverlayLayer")
  })

  it("makes continuing old Maya sessions an explicit choice", () => {
    const context = read("components/app-v3/concierge-context.tsx")
    const launcher = read("components/app-v3/maya-floating-launcher.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(context).toContain("const hasSavedSession = Boolean(session)")
    expect(context).toContain("const openFresh = useCallback")
    expect(context).toContain("setIsOpen(false)")
    expect(concierge).toContain("if (!draft) {")
    expect(concierge).toContain("setMessages([])")
    expect(concierge).toContain("setChatId(newChatId())")
    expect(launcher).toContain("Start new")
    expect(launcher).toContain("Continue history")
    expect(launcher).toContain("openFresh()")
  })

  it("keeps selfie generation as the default even when a trained model exists", () => {
    const types = read("components/app-v3/types.ts")
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(types).toContain('export type GenerationSource = "selfie" | "trained-model"')
    expect(shell).toContain('generationSource: "trained-model"')
    expect(concierge).toContain("useState<GenerationSource>(() =>")
    expect(concierge).toContain('"selfie"')
    expect(concierge).toContain('session.generationSource === "trained-model" && hasTrainedModel')
  })

  it("does not double-send typed format requests through the auto-pull effect", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const commitStart = concierge.indexOf("function commitDetectedIntent")
    const commitEnd = concierge.indexOf("function sendInlineAnswer")
    const commitBody = concierge.slice(commitStart, commitEnd)

    expect(commitStart).toBeGreaterThan(-1)
    expect(commitEnd).toBeGreaterThan(commitStart)
    expect(commitBody).toContain("suppressAutoPull")
    expect(commitBody).toContain("lastPulledFormatRef.current = intent.format")
    expect(concierge).toContain('commitDetectedIntent(text, "typed", { suppressAutoPull: true })')
  })

  it("guards generation actions against duplicate in-flight requests", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("inFlightGenerationKeysRef")
    expect(concierge).toContain("if (inFlightGenerationKeysRef.current.has(key)) return")
    expect(concierge).toContain("inFlightGenerationKeysRef.current.add(key)")
    expect(concierge).toContain("inFlightGenerationKeysRef.current.delete(key)")
  })

  it("opens the selfie manager inside Maya instead of from the Create tab", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const manager = read("components/app-v3/selfie-reference-manager-modal.tsx")

    expect(frontDoor).not.toContain("SelfieReferenceManagerModal")
    expect(frontDoor).not.toContain("setSelfieManagerOpen(true)")
    expect(frontDoor).not.toContain("onContinue={continueFromSelfieManager}")
    expect(frontDoor).toContain("openSelfieManagerInMaya")
    expect(concierge).toContain("<SelfieReferenceManagerModal")

    expect(manager).toContain("Start with one clear selfie.")
    expect(manager).toContain("Continue with Maya")
    expect(manager).toContain("Three-quarter face")
    expect(manager).toContain("Inspiration")
    expect(manager).toContain("Maya will not use this as your face")
    expect(manager).toContain("/api/app-v3/reference-library")
    expect(manager).toContain("/api/app-v3/upload-selfie")
  })

  it("carries a finished result into the next format as the style reference", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const inline = read("components/app-v3/maya-inline-components.tsx")

    expect(inline).toContain("Keep this style going")
    expect(inline).toContain("SIMPLE_FORMAT_OPTIONS.map")
    expect(inline).toContain("overflow-x-auto")
    expect(concierge).toContain("styleReferenceUrl?: string | null")
    expect(concierge).toContain("setInspirationUrl(styleReferenceUrl)")
    expect(concierge).toContain("setVideoSourceUrl(styleReferenceUrl)")
    expect(concierge).toContain("const latestStyleReferenceUrl")
    expect(concierge).toContain("handleNextFormat(nextFormat, kind, latestStyleReferenceUrl)")
  })
})
