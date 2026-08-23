import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Maya-first Suite creation UX", () => {
  it("makes Create an image-first world that hands structured choices to Maya", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")

    expect(frontDoor).toContain("Create · Your visual studio")
    expect(frontDoor).toContain("Maya&apos;s strongest place to start.")
    expect(frontDoor).toContain("Recreate this look")
    expect(frontDoor).toContain("Saved looks")
    expect(frontDoor).toContain("Recent shoots")
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

    expect(types).toContain(
      'initialSetupAction?: "selfie_manager" | "inspiration_manager" | "plain_chat" | null'
    )
    expect(concierge).toContain('session.initialSetupAction === "selfie_manager"')
    expect(concierge).toContain("setSelfieManagerOpen(true)")

    // The card itself promises a first photo, so format + delegation are already decided.
    // The idea travels as structured context and is never replayed as HER visible message.
    expect(frontDoor).not.toContain("I want to start with one clear selfie.")
    expect(frontDoor).toContain('intentForFormat("photo", "starter_chip")')
    expect(frontDoor).toContain("openWithAesthetic(MAYA_DECIDES_AESTHETIC")
    expect(frontDoor).toContain('format: "photo"')
    expect(frontDoor).toContain('creationIdea: "Create one strong brand photo I can use today."')

    // One-shot only: neither restore path may persist the launch instruction, or the
    // selfie manager would re-open on every reload of a saved draft.
    const continuity = read("components/app-v3/continuity.ts")
    const serverDraft = read("lib/app-v3/maya/draft-snapshot.ts")
    for (const source of [continuity, serverDraft]) {
      expect(source).toContain("initialSetupAction: null")
      expect(source).not.toContain(
        'initialSetupAction: session.initialSetupAction === "selfie_manager"'
      )
    }
  })

  it("routes clear typed requests before Maya replies", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain('commitDetectedIntent(text, "typed", {')
    expect(concierge).toContain("preserveCommittedFormat")
    expect(concierge).toContain("extrasRef.current = { ...extrasRef.current, format: intent.format")
    expect(concierge).toContain("creationIntent: activeCreationIntent")
    expect(concierge).toContain("InlineProjectStart")
    expect(concierge).toContain("InlineSelfieUpload")
    expect(concierge).toContain("InlineVibePicker")
    expect(concierge).toContain("InlineShotPicker")
    expect(concierge).toContain("InlineResultActions")
    expect(concierge).toContain("onPick={answer => sendInlineAnswer(answer, clarifyPart.kind)}")
  })

  it("waits for a style before pulling initial non-video directions", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const renderHasStarted = concierge.indexOf("const hasStarted = messages.length > 0")
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
    expect(concierge).toContain("const shouldShowProjectStart = !outputFormat")
    expect(concierge).toContain("shouldShowProjectStart &&")
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
    expect(concierge).toContain("updateCurrentSession(MAYA_DECIDES_AESTHETIC")
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

  it("keeps neutral Maya Home questions out of the creative concept pipeline", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")
    const general = read("lib/maya/general-assistant-persona.ts")

    expect(route).toContain("normalizeCreationIntent")
    expect(route).toContain("const generalConversation = !committedFormat")
    expect(route).toContain("getMayaGeneralAssistantPrompt")
    expect(route).toContain('generalConversation\n      ? "chat_pro"')
    expect(general).toContain("Start with the actual thought, even when it is messy")
    expect(general).toContain("recommend one format in plain language")
    expect(general).toContain("Do not call set_format until")
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

  it("uses a responsive Maya workspace beside desktop Create and as a full-height mobile sheet", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(shell).not.toContain("close: closeMaya, isOpen: mayaOpen")
    expect(shell).not.toContain("if (mayaOpen) closeMaya()")
    expect(shell).not.toContain('"--sselfie-bottom-nav-height"')
    expect(shell).toContain("pb-[calc(4.75rem+env(safe-area-inset-bottom))]")

    expect(shell).toContain(
      'activeSection === "calendar" || (activeSection === "create" && !mayaHomeEnabled)'
    )
    expect(shell).toContain('mayaOpen && mayaUsesSideWorkspace ? "lg:pr-[27rem]"')
    expect(concierge).toContain("h-[94dvh]")
    expect(concierge).not.toContain("h-[62dvh]")
    expect(concierge).not.toContain("mobileSheetSize")
    expect(concierge).toContain("lg:w-[27rem]")
    expect(concierge).toContain("lg:hidden")
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

  it("keeps recommended graphic next steps behind the explicit text and style choice", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("setTextOverlayMode(null)")
    expect(concierge).toContain("setTextStyleChoice(null)")
    expect(concierge).not.toContain("recommendedGraphicTextStyle(nextFormat")
  })

  it("scrolls the newly revealed next step into view after a result action", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("preMessageThreadOpen")
    // MAYA-MULTISLIDE-KEYBOARD-01 (2026-07-21): scrolls the thread's own container
    // directly (threadRef.scrollTo), not Element.scrollIntoView on a sentinel - the
    // latter could walk past the nearest scrollable ancestor on WebKit and corrupt the
    // keyboard-viewport tracking below.
    expect(concierge).toContain("scrollThreadToBottom()")
  })

  it("resumes the current Maya session directly from the floating launcher", () => {
    const context = read("components/app-v3/concierge-context.tsx")
    const launcher = read("components/app-v3/maya-floating-launcher.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(context).toContain("const hasSavedSession = Boolean(session)")
    expect(context).toContain("const openFresh = useCallback")
    expect(context).toContain("setIsOpen(false)")
    expect(concierge).toContain("if (!draft) {")
    expect(concierge).toContain("setMessages([])")
    // The fresh id also syncs sessionChatIdRef so the save effect can't persist a stale
    // thread under the new session (start-new resurrection bug, 2026-07-06).
    expect(concierge).toContain("setChatId(freshChatId)")
    expect(launcher).toContain("operatingLayerEnabled || hasSavedSession")
    expect(launcher).toContain("openFresh()")
    expect(launcher).not.toContain("Resume current")
    expect(launcher).not.toContain("Start new")
    expect(launcher).not.toContain("View past chats")
    expect(launcher).not.toContain("maya-launcher-choices")
  })

  it("routes Gallery empty-state creation into Maya's recommended first-photo path", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(shell).toContain("function createFirstPhotoFromGallery()")
    expect(shell).toContain("openWithAesthetic(MAYA_DECIDES_AESTHETIC")
    expect(shell).toContain('creationIdea: "Create one strong brand photo I can use today."')
    expect(shell).toContain('creationIntent: intentForFormat("photo", "starter_chip")')
    expect(shell).toContain("onStartCreate={limited ? undefined : createFirstPhotoFromGallery}")
    expect(shell).not.toContain('onStartCreate={limited ? undefined : () => createFormat("photo")}')
  })

  it("keeps selfie generation as the default even when a trained model exists", () => {
    const types = read("components/app-v3/types.ts")
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(types).toContain('export type GenerationSource = "selfie" | "trained-model"')
    expect(shell).toContain('generationSource: "trained-model"')
    expect(concierge).toContain("useState<GenerationSource>(")
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
    expect(concierge).toContain('commitDetectedIntent(text, "typed", {')
  })

  it("guards generation actions against duplicate in-flight requests", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("inFlightGenerationKeysRef")
    // 2026-07-29: a live generation still swallows duplicate taps, but a key left behind by
    // an interrupted stream must not make later taps silent no-ops (UX audit issue A).
    expect(concierge).toContain("if (inFlightGenerationKeysRef.current.has(key)) {")
    expect(concierge).toContain('if (genState[key]?.status === "generating") return')
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

  it("keeps post refinement in the conversation after the current post is finished", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const inline = read("components/app-v3/maya-inline-components.tsx")
    const conceptCard = read("components/app-v3/concept-card.tsx")

    expect(inline).toContain("Make it more like me")
    expect(inline).toContain("Tell Maya what feels off")
    expect(inline).not.toContain("Photos")
    expect(inline).not.toContain("Slides")
    expect(inline).not.toContain("Motion")
    expect(inline).not.toContain("Maya recommends next")
    expect(inline).not.toContain("RECOMMENDED_NEXT")
    expect(inline).not.toContain("More things Maya can make")
    expect(conceptCard).toContain('finishStatus === "finished"')
    expect(concierge).toContain("startFinishedPostRefinement")
    expect(concierge).toContain("Make this more like me by")
    expect(concierge).toContain("suite_post_refinement_started")
  })
})
