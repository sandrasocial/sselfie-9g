"use client"

// SSELFIE Studio 3.0 - focused member shell.
// The standard app has one creation front door and three understandable places: Maya, Work,
// and You. Calendar, Learn, and the existing Maya engine remain intact behind contextual
// actions and direct links instead of competing in primary navigation.
// Calendar (2026-07-06, Feed Planner Phase 2): the live Feed Planner product now lives here
// too, in the same visual language as the rest of the shell, gated the same way Create is
// (!limited - Suite members already have full Feed Planner entitlement via the existing
// isMembership/hasFullAccess check in lib/feed-planner/access-control.ts). The standalone
// /feed-planner route stays fully intact for any Blueprint-only buyer who isn't a Suite
// member - this addition changes nothing about how that route works.
// Isolated tree: imports only from components/app-v3/ + lib/. No components/sselfie/.

import { useEffect, useRef, useState } from "react"
import { ConciergeProvider, useConcierge } from "./concierge-context"
import { VisualFrontDoor } from "./visual-front-door"
import { AESTHETICS, MAYA_DECIDES_AESTHETIC } from "./aesthetics"
import { MayaConcierge } from "./maya-concierge"
import { GalleryView, type GalleryFilter } from "./gallery-view"
import { ContentView } from "./content-view"
import { FeedPlannerView } from "./feed-planner-view"
import { LibraryView } from "./library-view"
import { AccountView } from "./account-view"
import type { Aesthetic, AppV3AnalyticsCohort, OutputFormat } from "./types"
import type { AppV3GalleryAsset } from "@/lib/app-v3/gallery-assets"
import { resolveAppV3AllowedSection, type AppV3Section } from "@/lib/app-v3/navigation"
import { isPrimaryMemberSection } from "@/lib/app-v3/member-navigation"
import {
  buildStoredSectionHref,
  readStoredAppSection,
  saveMayaLastActiveTaskId,
  saveStoredAppSection,
} from "./continuity"
import { intentForFormat } from "@/lib/app-v3/maya/intent-router"
import type { MayaSurface } from "@/lib/app-v3/maya/context-envelope"
import { PostSuccessReviewPrompt } from "@/components/testimonials/post-success-review-prompt"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import type { SkoolMayaHandoff } from "@/lib/app-v3/maya/skool-handoff"
import { SuiteEditorialNavigation } from "./suite-editorial-navigation"
import {
  CalendarDays,
  FolderOpen,
  Images,
  Sparkles,
  UserRound,
  LibraryBig,
  MessageCircle,
  type LucideIcon,
} from "lucide-react"

export interface AppV3ShellProps {
  firstName?: string | null
  /** BRIDGE-01 Phase D: "full" member, "trial" (badge + days left), "limited" (no generation). */
  accessLevel?: "full" | "trial" | "limited"
  analyticsCohort?: AppV3AnalyticsCohort
  trialDaysLeft?: number | null
  trialHasGeneratedImages?: boolean
  trialHasSavedSelfie?: boolean
  primarySelfieUrl?: string | null
  trialHasSeenFirstRunStep?: boolean
  initialSection?: AppV3Section
  /** A sanitized Vault collection id supplied by an authenticated /app deep link. */
  initialAestheticId?: string | null
  /** True for recurring members, active passes, or active trials that own the Vault. */
  hasVaultAccess?: boolean
  /** True when Vault Maya is included through an active paid SUITE membership. */
  vaultMayaIncluded?: boolean
  /** Server-owned feature flag. Defaults false and never reads public client env. */
  preSelfieChatEnabled?: boolean
  /** True when the member has a completed, non-test trained model (legacy /studio entry point). */
  hasTrainedModel?: boolean
  /** VIDEO reliability kill switch: false hides the Video tile + gallery motion entry. */
  videoEnabled?: boolean
  /** Server-owned Phase 0 rollout decision. Inert until the Phase 1 context path exists. */
  mayaOperatingLayerEnabled?: boolean
  /** Server-owned member Maya home decision. */
  mayaHomeEnabled?: boolean
  /** Private pilot: focused Maya + Account only; Pro Calendar, Gallery, and Learn stay excluded. */
  mayaEssential?: boolean
  /** Canonical server-owned union of full SUITE, trial, bundle-pass, and Blueprint Calendar access. */
  calendarIncluded?: boolean
  /** Server-verified lesson handoff. It carries a fixed key and copy, never URL-authored prompts. */
  initialSkoolHandoff?: SkoolMayaHandoff | null
}

// The stored section ids stay unchanged so existing deep links and remembered member state
// remain valid. The standard member navigation presents those stable surfaces as Maya, Work,
// and You; Calendar and Learn remain available through contextual actions and direct links.
const NAV: { id: AppV3Section; label: string; icon: LucideIcon }[] = [
  { id: "create", label: "Create", icon: Sparkles },
  { id: "photos", label: "Gallery", icon: Images },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "library", label: "Learn", icon: LibraryBig },
  { id: "account", label: "Account", icon: UserRound },
]

function MayaHomeWorkspace({ suppressNeutralOpen = false }: { suppressNeutralOpen?: boolean }) {
  const { isOpen, session, open, openHome } = useConcierge()
  const initializedRef = useRef(false)
  const sessionSurface = session?.mayaContext?.surface
  const sessionTaskId = session?.mayaContext?.taskId
  const sessionOutputFormat = session?.outputFormat
  const sessionCreationIdea = session?.creationIdea

  useEffect(() => {
    if (suppressNeutralOpen) return
    if (initializedRef.current) return
    const alreadyNeutral =
      sessionSurface === "create" && !sessionOutputFormat && !sessionCreationIdea

    initializedRef.current = true
    if (isOpen && alreadyNeutral) return
    if (alreadyNeutral) {
      open()
      return
    }

    // A specific previous Create task stays in History. Home always opens as a neutral
    // relationship with Maya, while preserving the member's saved selfie for a later visual ask.
    if (sessionTaskId && sessionSurface !== "create") {
      saveMayaLastActiveTaskId(sessionTaskId)
    }
    openHome()
  }, [
    isOpen,
    open,
    openHome,
    sessionCreationIdea,
    sessionOutputFormat,
    sessionSurface,
    sessionTaskId,
    suppressNeutralOpen,
  ])

  return null
}

// A general session so Maya can start from a content idea (not a specific look) and still guide.
const MAYA_GENERAL: Aesthetic = {
  id: "maya-general",
  name: "SSELFIE",
  blurb: "Let's make something that's truly you.",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent:
    "A general SSELFIE editorial brand session. Help her decide the look from her brand, then create.",
}

const FORMAT_LABEL: Record<OutputFormat, string> = {
  photo: "photo",
  photoshoot: "photoshoot",
  "reel-cover": "Reel cover",
  carousel: "carousel",
  "story-slide": "Story slide",
  "story-sequence": "Story sequence",
  video: "video",
}

function mayaSurfaceForSection(section: AppV3Section): MayaSurface {
  if (section === "photos") return "gallery"
  if (section === "library") return "learn"
  if (section === "content") return "create"
  return section
}

const VAULT_MAYA_NOTICE_KEY = "sselfie:vault-maya-included:v1"

function VaultMayaIncludedNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(VAULT_MAYA_NOTICE_KEY) !== "dismissed")
    } catch {
      setVisible(true)
    }
  }, [])

  const dismiss = (action: "open" | "later") => {
    try {
      window.localStorage.setItem(VAULT_MAYA_NOTICE_KEY, "dismissed")
    } catch {
      // The invitation can still be dismissed for this page view when storage is unavailable.
    }
    setVisible(false)
    void trackAnalyticsEvent({
      event: "vault_maya_suite_invitation_clicked",
      properties: { action, surface: "app_v3" },
    }).catch(() => {})
  }

  if (!visible) return null

  return (
    <section
      className="mx-auto w-full max-w-[1320px] px-4 pt-4 sm:px-8 sm:pt-5"
      aria-label="New in your SUITE"
    >
      <div className="grid overflow-hidden rounded-[4px] border border-[color:var(--suite-night)] bg-white sm:grid-cols-[160px_minmax(0,1fr)]">
        <div className="relative hidden min-h-[164px] overflow-hidden bg-[color:var(--suite-smoke)] sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/brand/bold-editorial-suite/suite-editorial-studio-power-v1.png"
            alt="Sandra in black tailoring and architectural light"
            className="absolute inset-0 h-full w-full object-cover object-[50%_28%]"
          />
        </div>
        <div className="flex flex-col justify-center p-5 sm:p-6">
          <p className="text-[9px] uppercase tracking-[0.23em] text-[color:var(--suite-accent)]">
            New · Included with your SUITE
          </p>
          <h2 className="mt-2 font-serif text-[27px] font-light leading-tight text-[#0D0E10]">
            Vault Maya is ready for you
          </h2>
          <p className="mt-2 max-w-xl text-[13px] leading-5 text-[#4F5052]">
            Choose a Vault look, add one selfie and let Maya create the photo for you.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              href="/vault-maya/studio"
              onClick={() => dismiss("open")}
              className="inline-flex min-h-11 items-center justify-center rounded-[3px] bg-[color:var(--suite-accent)] px-5 text-[10px] uppercase tracking-[0.17em] text-white transition-colors hover:bg-[color:var(--suite-night)]"
            >
              Try Vault Maya
            </a>
            <button
              type="button"
              onClick={() => dismiss("later")}
              className="min-h-11 text-[11px] text-[#4F5052] underline underline-offset-4"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function ShellInner({
  firstName,
  accessLevel = "full",
  analyticsCohort,
  trialDaysLeft,
  trialHasGeneratedImages = false,
  trialHasSavedSelfie = false,
  primarySelfieUrl = null,
  trialHasSeenFirstRunStep = false,
  initialSection = "create",
  initialAestheticId = null,
  hasVaultAccess = false,
  vaultMayaIncluded = false,
  preSelfieChatEnabled = false,
  hasTrainedModel = false,
  videoEnabled = true,
  mayaOperatingLayerEnabled = false,
  mayaHomeEnabled = false,
  mayaEssential = false,
  calendarIncluded = true,
  initialSkoolHandoff = null,
}: AppV3ShellProps) {
  const allowedInitialSection = resolveAppV3AllowedSection(initialSection, {
    mayaEssential,
    calendarIncluded,
  })
  const [section, setSection] = useState<AppV3Section>(allowedInitialSection)
  const activeSection = resolveAppV3AllowedSection(section, { mayaEssential, calendarIncluded })
  // The server already resolved both the requested section and the Maya Home cohort.
  // Render that known Home immediately so returning members never flash the retired
  // Visual Front Door while client-side storage reconciliation runs.
  const [sectionReady, setSectionReady] = useState(true)
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>("all")
  const {
    isOpen: mayaOpen,
    openWithAesthetic,
    openForLesson,
    openHistory,
    setActiveSurface,
    close,
  } = useConcierge()
  const openedInitialAestheticRef = useRef<string | null>(null)
  const openedSkoolHandoffRef = useRef<string | null>(null)
  const limited = accessLevel === "limited"
  const cohort: AppV3AnalyticsCohort =
    analyticsCohort ??
    (accessLevel === "trial" ? "trial" : accessLevel === "limited" ? "limited" : "member")

  useEffect(() => {
    if (limited || !initialSkoolHandoff) return
    if (openedSkoolHandoffRef.current === initialSkoolHandoff.key) return
    openedSkoolHandoffRef.current = initialSkoolHandoff.key

    setSection("create")
    saveStoredAppSection("create")
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        buildStoredSectionHref("create", window.location.pathname, window.location.search)
      )
    }
    openWithAesthetic(MAYA_GENERAL, {
      creationIdea: initialSkoolHandoff.creationIdea,
      initialSetupAction: "plain_chat",
    })
  }, [initialSkoolHandoff, limited, openWithAesthetic])

  useEffect(() => {
    if (allowedInitialSection !== "create") {
      setSectionReady(true)
      return
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.has("view")) {
        setSectionReady(true)
        return
      }
    }
    // Maya Home is the default relationship for members, including returning
    // members whose previous visit ended in Calendar or Gallery. Explicit ?view= deep links
    // above still open the requested destination.
    if (mayaHomeEnabled) {
      setSection("create")
      saveStoredAppSection("create")
      setSectionReady(true)
      return
    }
    const stored = resolveAppV3AllowedSection(readStoredAppSection(allowedInitialSection), {
      mayaEssential,
      calendarIncluded,
    })
    if (stored !== allowedInitialSection) setSection(stored)
    setSectionReady(true)
  }, [allowedInitialSection, calendarIncluded, mayaEssential, mayaHomeEnabled])

  function goToSection(next: AppV3Section) {
    const allowedNext = resolveAppV3AllowedSection(next, { mayaEssential, calendarIncluded })
    close()
    setSection(allowedNext)
    saveStoredAppSection(allowedNext)
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        buildStoredSectionHref(allowedNext, window.location.pathname, window.location.search)
      )
    }
  }

  // History restores a Calendar task as the active Maya workspace in one action. Other
  // navigation still uses goToSection and closes Maya; result handoffs close explicitly.
  function showCalendarAlongsideMaya() {
    // This is a continuation of the post Maya just finished, not a new Calendar task. Move the
    // existing task with the visible surface so its receipt/history save cannot be retired by the
    // normal section-change synchronization (most visible on the faster mobile handoff).
    setActiveSurface("calendar", { preserveCurrentTask: true })
    setSection("calendar")
    saveStoredAppSection("calendar")
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        buildStoredSectionHref("calendar", window.location.pathname, window.location.search)
      )
    }
  }

  function openGallery(filter: GalleryFilter = "all") {
    setGalleryFilter(filter)
    goToSection("photos")
  }

  // Gallery "Add to a post": carry the chosen image into the Calendar's apply mode. The old
  // handler navigated and dropped the asset (2026-07-29 audit) — the member landed on the
  // planner with her selection forgotten.
  const [pendingCalendarImageUrl, setPendingCalendarImageUrl] = useState<string | null>(null)
  function useAssetInCalendar(asset: AppV3GalleryAsset) {
    setPendingCalendarImageUrl(asset.url)
    goToSection("calendar")
  }

  useEffect(() => {
    if (section !== activeSection) setSection(activeSection)
    saveStoredAppSection(activeSection)
    setActiveSurface(mayaSurfaceForSection(activeSection))
  }, [activeSection, section, setActiveSurface])

  useEffect(() => {
    if (limited || initialSection !== "create" || !initialAestheticId) return
    if (openedInitialAestheticRef.current === initialAestheticId) return
    openedInitialAestheticRef.current = initialAestheticId

    let alive = true
    const openMatch = (aesthetics: Aesthetic[]) => {
      if (!alive) return
      const matched = aesthetics.find(aesthetic => aesthetic.id === initialAestheticId)
      if (!matched) return
      openWithAesthetic(matched, {
        format: "photo",
        creationIntent: intentForFormat("photo", "manual"),
      })
    }

    // Static Vault collections are already bundled, so open those immediately. Published
    // collections still resolve through the live endpoint below.
    if (AESTHETICS.some(aesthetic => aesthetic.id === initialAestheticId)) {
      openMatch(AESTHETICS)
      return () => {
        alive = false
      }
    }

    fetch("/api/app-v3/aesthetics")
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        const liveAesthetics = Array.isArray(data?.aesthetics) ? data.aesthetics : []
        openMatch([...liveAesthetics, ...AESTHETICS])
      })
      .catch(() => openMatch(AESTHETICS))

    return () => {
      alive = false
    }
  }, [initialAestheticId, initialSection, limited, openWithAesthetic])

  // Maya woven in: open a general session preset to a format, so she begins on it.
  function createFormat(format: OutputFormat) {
    openWithAesthetic(MAYA_GENERAL, {
      format,
      creationIntent: intentForFormat(format, "manual"),
    })
  }

  function createFirstPhotoFromGallery() {
    openWithAesthetic(MAYA_DECIDES_AESTHETIC, {
      format: "photo",
      creationIdea: "Create one strong brand photo I can use today.",
      creationIntent: intentForFormat("photo", "starter_chip"),
      referenceSelfieUrl: primarySelfieUrl,
    })
  }

  // From a Content recommendation: open Maya seeded with that exact idea.
  function createIdea(format: OutputFormat, title: string) {
    openWithAesthetic(MAYA_DECIDES_AESTHETIC, {
      format,
      seed: `Let's create a ${FORMAT_LABEL[format]} about: ${title}.`,
      creationIdea: title,
      creationIntent: intentForFormat(format, "content_card"),
    })
  }

  function createMotionFromImage(imageUrl: string) {
    openWithAesthetic(MAYA_GENERAL, {
      format: "video",
      videoSourceUrl: imageUrl,
      seed: "Let's add subtle editorial motion to this exact image. Keep it natural, polished, and true to the original.",
      creationIntent: intentForFormat("video", "gallery_action"),
    })
  }

  function createVariationFromGallery(imageUrl: string) {
    openWithAesthetic(MAYA_GENERAL, {
      format: "photo",
      seed: "Continue this visual direction with a fresh photo that belongs to the same shoot.",
      creationIdea: "Continue this shoot.",
      creationIntent: intentForFormat("photo", "gallery_action"),
      inspirationImageUrl: imageUrl,
    })
  }

  function createWithTrainedModel() {
    openWithAesthetic(MAYA_GENERAL, {
      format: "photo",
      seed: "Let's create a photo using my trained model.",
      creationIntent: intentForFormat("photo", "manual"),
      generationSource: "trained-model",
    })
  }

  const mayaUsesSideWorkspace =
    activeSection === "calendar" || (activeSection === "create" && !mayaHomeEnabled)
  const visibleNav = mayaEssential
    ? NAV.filter(
        item =>
          item.id === "create" ||
          item.id === "account" ||
          (calendarIncluded && item.id === "calendar")
      )
    : NAV.filter(item => isPrimaryMemberSection(item.id))
  const nav = mayaHomeEnabled
    ? visibleNav.map(item =>
        item.id === "create"
          ? { ...item, label: "Maya", icon: MessageCircle }
          : item.id === "photos"
            ? { ...item, label: "Work", icon: FolderOpen }
            : item.id === "account"
              ? { ...item, label: "You", icon: UserRound }
              : item
      )
    : visibleNav.map(item =>
        item.id === "create"
          ? { ...item, label: "Today", icon: Sparkles }
          : item.id === "photos"
            ? { ...item, label: "Work", icon: FolderOpen }
            : item.id === "account"
              ? { ...item, label: "You", icon: UserRound }
              : item
      )

  return (
    <main
      data-maya-operating-layer={mayaOperatingLayerEnabled ? "enabled" : "legacy"}
      data-maya-home={mayaHomeEnabled ? "enabled" : "legacy"}
      className={`suite-canvas min-h-[100dvh] w-full max-w-[100dvw] overscroll-x-none bg-[#F8FAFA] pb-[calc(4.75rem+env(safe-area-inset-bottom))] text-[#0D0E10] transition-[padding] duration-300 [overflow-x:clip] lg:pb-0 lg:pl-[224px] ${
        mayaOpen && mayaUsesSideWorkspace ? "lg:pr-[27rem]" : ""
      }`}
    >
      {/* Trial: quiet days-left bar. Limited: photo-making paused, everything she owns stays open. */}
      {accessLevel === "trial" && typeof trialDaysLeft === "number" && (
        <div className="border-b border-[#C5C6C8]/50 bg-white px-5 py-2.5 text-center">
          <span className="text-[11px] uppercase leading-relaxed tracking-[0.12em] text-[#4F5052] sm:tracking-[0.16em]">
            Trial · {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left ·{" "}
            <a
              href="/checkout/membership?interval=month&source=trial_banner"
              className="text-[#0D0E10] underline underline-offset-2"
            >
              Keep your Studio
            </a>
          </span>
        </div>
      )}
      {limited && (
        <div className="border-b border-[#C5C6C8]/50 bg-white px-5 py-2.5 text-center">
          <span className="text-[11px] uppercase leading-relaxed tracking-[0.12em] text-[#4F5052] sm:tracking-[0.16em]">
            Photo-making is paused. Your photos are still yours. ·{" "}
            <a
              href="/join/studio?source=app_limited"
              className="text-[#0D0E10] underline underline-offset-2"
            >
              Join the SUITE
            </a>
          </span>
        </div>
      )}

      {vaultMayaIncluded && !mayaHomeEnabled ? <VaultMayaIncludedNotice /> : null}

      {activeSection === "create" &&
        (limited ? (
          <div className="mx-auto flex min-h-[60dvh] w-full max-w-3xl items-start px-5 pt-10 sm:items-center sm:py-16">
            <div className="w-full rounded-[8px] border border-[#0D0E10] bg-white p-5 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">
                SSELFIE SUITE
              </p>
              <h2 className="mt-2 font-serif text-[24px] font-light leading-tight text-[#0D0E10]">
                Maya&apos;s ready when you are.
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#4F5052]">
                Members get Maya, 200 photos a month, and the SSELFIE library included. Cancel
                anytime.
              </p>
              <a
                href="/checkout/membership?interval=month&source=app_limited_create"
                className="mt-4 inline-block rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728]"
              >
                Join SSELFIE SUITE
              </a>
            </div>
          </div>
        ) : mayaHomeEnabled && sectionReady ? (
          <MayaHomeWorkspace suppressNeutralOpen={Boolean(initialSkoolHandoff)} />
        ) : (
          <VisualFrontDoor
            firstName={firstName}
            showTrialFirstRunStep={
              accessLevel === "trial" &&
              !trialHasGeneratedImages &&
              !trialHasSavedSelfie &&
              !trialHasSeenFirstRunStep
            }
            cohort={cohort}
            hasSelfie={trialHasSavedSelfie}
            initialPrimarySelfieUrl={primarySelfieUrl}
            onOpenFavorites={() => openGallery("favorites")}
            hasVaultAccess={hasVaultAccess}
            preSelfieChatEnabled={preSelfieChatEnabled}
            videoEnabled={videoEnabled}
            operatingLayerEnabled={mayaOperatingLayerEnabled}
          />
        ))}
      {activeSection === "photos" && !mayaEssential && (
        <GalleryView
          initialFilter={galleryFilter}
          onOpenProjects={limited ? undefined : openHistory}
          onMakeMotion={videoEnabled ? createMotionFromImage : undefined}
          onStartCreate={limited ? undefined : createFirstPhotoFromGallery}
          operatingLayerEnabled={mayaOperatingLayerEnabled}
          onUseInCalendar={mayaOperatingLayerEnabled ? undefined : useAssetInCalendar}
          onCreateVariation={asset => createVariationFromGallery(asset.url)}
        />
      )}
      {activeSection === "content" && (
        <ContentView
          firstName={firstName}
          onCreateIdea={createIdea}
          onCreate={createFormat}
          onBrowse={() => openGallery("all")}
        />
      )}
      {activeSection === "calendar" &&
        (limited && !calendarIncluded ? (
          <div className="mx-auto max-w-3xl px-5 py-10">
            <div className="rounded-[8px] border border-[#0D0E10] bg-white p-5 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">
                SSELFIE SUITE
              </p>
              <h2 className="mt-2 font-serif text-[24px] font-light leading-tight text-[#0D0E10]">
                Your Calendar is waiting.
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#4F5052]">
                Members plan a full month of posts, captions, and strategy from one selfie. Cancel
                anytime.
              </p>
              <a
                href="/checkout/membership?interval=month&source=app_limited_calendar"
                className="mt-4 inline-block rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728]"
              >
                Join SSELFIE SUITE
              </a>
            </div>
          </div>
        ) : calendarIncluded ? (
          <FeedPlannerView
            operatingLayerEnabled={mayaOperatingLayerEnabled}
            pendingApplyImageUrl={pendingCalendarImageUrl}
            onConsumePendingApplyImage={() => setPendingCalendarImageUrl(null)}
          />
        ) : null)}
      {activeSection === "library" && !mayaEssential && (
        <LibraryView
          operatingLayerEnabled={mayaOperatingLayerEnabled}
          onOpenMaya={target =>
            typeof target === "string" ? createIdea("photo", target) : openForLesson(target)
          }
          onOpenCalendar={() => goToSection("calendar")}
        />
      )}
      {activeSection === "account" && (
        <AccountView
          firstName={firstName}
          onOpenLibrary={mayaEssential ? undefined : () => goToSection("library")}
          onUseTrainedModel={createWithTrainedModel}
          trialDaysLeft={accessLevel === "trial" ? trialDaysLeft : null}
          hasTrainedModel={hasTrainedModel}
          accessLevel={accessLevel}
        />
      )}

      {!limited && (!mayaHomeEnabled || activeSection !== "create" || mayaOpen) && (
        <MayaConcierge
          operatingLayerEnabled={mayaOperatingLayerEnabled}
          homeMode={mayaHomeEnabled && activeSection === "create"}
          firstName={firstName}
          hasTrainedModel={hasTrainedModel}
          analyticsCohort={cohort}
          onOpenCalendar={
            calendarIncluded
              ? mayaHomeEnabled
                ? showCalendarAlongsideMaya
                : () => goToSection("calendar")
              : undefined
          }
          calendarSurfaceActive={calendarIncluded && activeSection === "calendar"}
          calendarIncluded={calendarIncluded}
          skoolHandoff={initialSkoolHandoff}
        />
      )}
      <PostSuccessReviewPrompt />

      <SuiteEditorialNavigation
        items={nav}
        activeSection={activeSection}
        onNavigate={next => (next === "photos" ? openGallery("all") : goToSection(next))}
      />
    </main>
  )
}

export function AppV3Shell({
  firstName,
  accessLevel,
  analyticsCohort,
  trialDaysLeft,
  trialHasGeneratedImages,
  trialHasSavedSelfie,
  primarySelfieUrl,
  trialHasSeenFirstRunStep,
  initialSection,
  initialAestheticId,
  hasVaultAccess,
  vaultMayaIncluded,
  preSelfieChatEnabled,
  hasTrainedModel,
  videoEnabled,
  mayaOperatingLayerEnabled,
  mayaHomeEnabled,
  mayaEssential,
  calendarIncluded,
  initialSkoolHandoff,
}: AppV3ShellProps) {
  const allowedInitialSection = resolveAppV3AllowedSection(initialSection ?? "create", {
    mayaEssential: mayaEssential ?? false,
    calendarIncluded: calendarIncluded ?? true,
  })
  return (
    <ConciergeProvider
      suppressRestore={Boolean(initialAestheticId || initialSkoolHandoff)}
      operatingLayerEnabled={mayaOperatingLayerEnabled}
      initialSurface={mayaSurfaceForSection(allowedInitialSection)}
    >
      <ShellInner
        firstName={firstName}
        accessLevel={accessLevel}
        analyticsCohort={analyticsCohort}
        trialDaysLeft={trialDaysLeft}
        trialHasGeneratedImages={trialHasGeneratedImages}
        trialHasSavedSelfie={trialHasSavedSelfie}
        primarySelfieUrl={primarySelfieUrl}
        trialHasSeenFirstRunStep={trialHasSeenFirstRunStep}
        initialSection={allowedInitialSection}
        initialAestheticId={initialAestheticId}
        hasVaultAccess={hasVaultAccess}
        vaultMayaIncluded={vaultMayaIncluded}
        preSelfieChatEnabled={preSelfieChatEnabled}
        hasTrainedModel={hasTrainedModel}
        videoEnabled={videoEnabled}
        mayaOperatingLayerEnabled={mayaOperatingLayerEnabled}
        mayaHomeEnabled={mayaHomeEnabled}
        mayaEssential={mayaEssential}
        calendarIncluded={calendarIncluded}
        initialSkoolHandoff={initialSkoolHandoff}
      />
    </ConciergeProvider>
  )
}

export default AppV3Shell
