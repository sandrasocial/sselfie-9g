"use client"

// SSELFIE Studio 3.0 - app shell + product navigation (MAYA-REBUILD-05 Phase H.2).
// Maya is the product, not a tab. She is woven through every surface. The nav is the six
// places content lives: Create · Photos · Content · Calendar · Library · Account (BRIDGE-01
// Phase C: the photo gallery became "Photos" and "Library" is now everything she owns -
// courses, products, drops). No standalone "Maya" tab.
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
import { MayaFloatingLauncher } from "./maya-floating-launcher"
import { GalleryView, type GalleryFilter } from "./gallery-view"
import { ContentView } from "./content-view"
import { FeedPlannerView } from "./feed-planner-view"
import { LibraryView } from "./library-view"
import { AccountView } from "./account-view"
import type { Aesthetic, AppV3AnalyticsCohort, OutputFormat } from "./types"
import type { AppV3Section } from "@/lib/app-v3/navigation"
import { buildStoredSectionHref, readStoredAppSection, saveStoredAppSection } from "./continuity"
import { intentForFormat } from "@/lib/app-v3/maya/intent-router"
import { PostSuccessReviewPrompt } from "@/components/testimonials/post-success-review-prompt"
import {
  CalendarDays,
  Images,
  PlusCircle,
  UserRound,
  LibraryBig,
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
  /** Server-owned feature flag. Defaults false and never reads public client env. */
  preSelfieChatEnabled?: boolean
  /** True when the member has a completed, non-test trained model (legacy /studio entry point). */
  hasTrainedModel?: boolean
  /** VIDEO reliability kill switch: false hides the Video tile + gallery motion entry. */
  videoEnabled?: boolean
}

// Nav rename (Sandra, 2026-07-07): Photos -> Gallery, Library -> Learn, and the Content tab
// is removed from the nav - it duplicated Maya's chat (her recommendations + the format
// chips both live there). Internal section ids are unchanged; the "content" section renderer
// stays so any stale saved state degrades gracefully. The freed slot is reserved for a
// member-facing weekly content-trends surface (direction pending Sandra's pick).
const NAV: { id: AppV3Section; label: string; icon: LucideIcon }[] = [
  { id: "create", label: "Create", icon: PlusCircle },
  { id: "photos", label: "Gallery", icon: Images },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "library", label: "Learn", icon: LibraryBig },
  { id: "account", label: "Account", icon: UserRound },
]

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
  preSelfieChatEnabled = false,
  hasTrainedModel = false,
  videoEnabled = true,
}: AppV3ShellProps) {
  const [section, setSection] = useState<AppV3Section>(initialSection)
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>("all")
  const { isOpen: mayaOpen, openWithAesthetic } = useConcierge()
  const openedInitialAestheticRef = useRef<string | null>(null)
  const limited = accessLevel === "limited"
  const cohort: AppV3AnalyticsCohort =
    analyticsCohort ??
    (accessLevel === "trial" ? "trial" : accessLevel === "limited" ? "limited" : "member")

  useEffect(() => {
    if (initialSection !== "create") return
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.has("view")) return
    }
    const stored = readStoredAppSection(initialSection)
    if (stored !== initialSection) setSection(stored)
  }, [initialSection])

  function goToSection(next: AppV3Section) {
    setSection(next)
    saveStoredAppSection(next)
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", buildStoredSectionHref(next))
    }
  }

  function openGallery(filter: GalleryFilter = "all") {
    setGalleryFilter(filter)
    goToSection("photos")
  }

  useEffect(() => {
    saveStoredAppSection(section)
  }, [section])

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

  function createWithTrainedModel() {
    openWithAesthetic(MAYA_GENERAL, {
      format: "photo",
      seed: "Let's create a photo using my trained model.",
      creationIntent: intentForFormat("photo", "manual"),
      generationSource: "trained-model",
    })
  }

  const mayaUsesSideWorkspace = section === "create" || section === "calendar"

  return (
    <main
      className={`min-h-[100dvh] w-full max-w-[100dvw] overscroll-x-none bg-[#F8FAFA] pb-[calc(4.75rem+env(safe-area-inset-bottom))] text-[#0D0E10] transition-[padding] duration-300 [overflow-x:clip] ${
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

      {section === "create" &&
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
          />
        ))}
      {section === "photos" && (
        <GalleryView
          initialFilter={galleryFilter}
          onMakeMotion={videoEnabled ? createMotionFromImage : undefined}
          onStartCreate={limited ? undefined : () => createFormat("photo")}
        />
      )}
      {section === "content" && (
        <ContentView
          firstName={firstName}
          onCreateIdea={createIdea}
          onCreate={createFormat}
          onBrowse={() => openGallery("all")}
        />
      )}
      {section === "calendar" &&
        (limited ? (
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
        ) : (
          <FeedPlannerView />
        ))}
      {section === "library" && (
        <LibraryView
          onOpenMaya={idea => createIdea("photo", idea)}
          onOpenCalendar={() => goToSection("calendar")}
        />
      )}
      {section === "account" && (
        <AccountView
          firstName={firstName}
          onOpenLibrary={() => goToSection("library")}
          onUseTrainedModel={createWithTrainedModel}
          trialDaysLeft={accessLevel === "trial" ? trialDaysLeft : null}
          hasTrainedModel={hasTrainedModel}
          accessLevel={accessLevel}
        />
      )}

      {!limited && (
        <MayaConcierge
          hasTrainedModel={hasTrainedModel}
          analyticsCohort={cohort}
          onOpenCalendar={() => goToSection("calendar")}
          calendarSurfaceActive={section === "calendar"}
        />
      )}
      {!limited && <MayaFloatingLauncher />}
      <PostSuccessReviewPrompt />

      {/* Bottom product navigation (text-only, on-brand, thumb-friendly for a phone-first audience) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 w-full max-w-[100dvw] overscroll-x-none border-t border-[#C5C6C8]/50 bg-[#F8FAFA]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur [overflow-x:clip]">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2">
          {NAV.map(n => {
            const active = n.id === section
            const Icon = n.icon
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => (n.id === "photos" ? openGallery("all") : goToSection(n.id))}
                aria-current={active ? "page" : undefined}
                aria-label={n.label}
                className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-[#0D0E10]" : "text-[#4F5052] hover:text-[#282728]"
                }`}
              >
                <Icon size={21} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
                <span>{n.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
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
  preSelfieChatEnabled,
  hasTrainedModel,
  videoEnabled,
}: AppV3ShellProps) {
  return (
    <ConciergeProvider suppressRestore={Boolean(initialAestheticId)}>
      <ShellInner
        firstName={firstName}
        accessLevel={accessLevel}
        analyticsCohort={analyticsCohort}
        trialDaysLeft={trialDaysLeft}
        trialHasGeneratedImages={trialHasGeneratedImages}
        trialHasSavedSelfie={trialHasSavedSelfie}
        primarySelfieUrl={primarySelfieUrl}
        trialHasSeenFirstRunStep={trialHasSeenFirstRunStep}
        initialSection={initialSection}
        initialAestheticId={initialAestheticId}
        hasVaultAccess={hasVaultAccess}
        preSelfieChatEnabled={preSelfieChatEnabled}
        hasTrainedModel={hasTrainedModel}
        videoEnabled={videoEnabled}
      />
    </ConciergeProvider>
  )
}

export default AppV3Shell
