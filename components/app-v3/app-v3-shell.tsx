"use client"

// SSELFIE Studio 3.0 — app shell + product navigation (MAYA-REBUILD-05 Phase H.2).
// Maya is the product, not a tab. She is woven through every surface. The nav is the five
// places content lives: Create · Photos · Content · Library · Account (BRIDGE-01 Phase C:
// the photo gallery became "Photos" and "Library" is now everything she owns — courses,
// products, drops). No standalone "Maya" tab, and no link to the legacy Instagram
// feed-planner (that planner mentality is the old SSELFIE; the live Feed Planner stays
// untouched for members on /studio).
// Isolated tree: imports only from components/app-v3/ + lib/. No components/sselfie/.

import { useState } from "react"
import { ConciergeProvider, useConcierge } from "./concierge-context"
import { VisualFrontDoor } from "./visual-front-door"
import { MayaConcierge } from "./maya-concierge"
import { GalleryView } from "./gallery-view"
import { ContentView } from "./content-view"
import { LibraryView } from "./library-view"
import { AccountView } from "./account-view"
import type { Aesthetic, OutputFormat } from "./types"

export interface AppV3ShellProps {
  firstName?: string | null
  /** BRIDGE-01 Phase D: "full" member, "trial" (badge + days left), "limited" (no generation). */
  accessLevel?: "full" | "trial" | "limited"
  trialDaysLeft?: number | null
}

type Section = "create" | "photos" | "content" | "library" | "account"

const NAV: { id: Section; label: string }[] = [
  { id: "create", label: "Create" },
  { id: "photos", label: "Photos" },
  { id: "content", label: "Content" },
  { id: "library", label: "Library" },
  { id: "account", label: "Account" },
]

// A general session so Maya can start from a content idea (not a specific look) and still guide.
const MAYA_GENERAL: Aesthetic = {
  id: "maya-general",
  name: "SSELFIE",
  blurb: "Let's make something that's truly you.",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent: "A general SSELFIE editorial brand session. Help her decide the look from her brand, then create.",
}

const FORMAT_LABEL: Record<OutputFormat, string> = {
  photo: "photo",
  "reel-cover": "Reel cover",
  carousel: "carousel",
  "story-slide": "Story slide",
}

function ShellInner({ firstName, accessLevel = "full", trialDaysLeft }: AppV3ShellProps) {
  const [section, setSection] = useState<Section>("create")
  const { openWithAesthetic } = useConcierge()
  const limited = accessLevel === "limited"

  // Maya woven in: open a general session preset to a format, so she begins on it.
  function createFormat(format: OutputFormat) {
    openWithAesthetic(MAYA_GENERAL, { format })
  }

  // From a Content recommendation: open Maya seeded with that exact idea.
  function createIdea(format: OutputFormat, title: string) {
    openWithAesthetic(MAYA_GENERAL, {
      format,
      seed: `Let's create a ${FORMAT_LABEL[format]} about: ${title}.`,
    })
  }

  return (
    <main className="min-h-screen bg-[#F8FAFA] pb-20 text-[#0D0E10]">
      {/* Trial: quiet days-left bar. Limited: photo-making paused, everything she owns stays open. */}
      {accessLevel === "trial" && typeof trialDaysLeft === "number" && (
        <div className="border-b border-[#C5C6C8]/50 bg-white px-5 py-2.5 text-center">
          <span className="text-[11px] uppercase tracking-[0.16em] text-[#4F5052]">
            Trial · {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left ·{" "}
            <a href="/checkout/membership?interval=month&source=trial_banner" className="text-[#0D0E10] underline underline-offset-2">
              Keep your Studio
            </a>
          </span>
        </div>
      )}
      {limited && (
        <div className="border-b border-[#C5C6C8]/50 bg-white px-5 py-2.5 text-center">
          <span className="text-[11px] uppercase tracking-[0.16em] text-[#4F5052]">
            Photo-making is paused. Your photos are still yours. ·{" "}
            <a href="/join/studio?source=app_limited" className="text-[#0D0E10] underline underline-offset-2">
              Join the SUITE
            </a>
          </span>
        </div>
      )}

      {section === "create" &&
        (limited ? (
          <div className="relative">
            <div className="pointer-events-none select-none opacity-60" aria-hidden>
              <VisualFrontDoor />
            </div>
            <div className="absolute inset-x-0 top-0 z-10 mx-auto max-w-3xl px-5 pt-10">
              <div className="rounded-[8px] border border-[#0D0E10] bg-white p-5 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">SSELFIE SUITE</p>
                <h2 className="mt-2 font-serif text-[24px] font-light leading-tight text-[#0D0E10]">
                  Maya's ready when you are.
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#4F5052]">
                  Members get Maya, 200 photos a month, and every product included. Cancel anytime.
                </p>
                <a
                  href="/checkout/membership?interval=month&source=app_limited_create"
                  className="mt-4 inline-block rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728]"
                >
                  Join SSELFIE SUITE
                </a>
              </div>
            </div>
          </div>
        ) : (
          <VisualFrontDoor />
        ))}
      {section === "photos" && <GalleryView />}
      {section === "content" && (
        <ContentView
          firstName={firstName}
          onCreateIdea={createIdea}
          onCreate={createFormat}
          onBrowse={() => setSection("photos")}
        />
      )}
      {section === "library" && <LibraryView />}
      {section === "account" && <AccountView firstName={firstName} onOpenLibrary={() => setSection("library")} trialDaysLeft={accessLevel === "trial" ? trialDaysLeft : null} />}

      {!limited && <MayaConcierge />}

      {/* Bottom product navigation (text-only, on-brand, thumb-friendly for a phone-first audience) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#C5C6C8]/50 bg-[#F8FAFA]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2">
          {NAV.map((n) => {
            const active = n.id === section
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSection(n.id)}
                className={`flex-1 py-3.5 text-[11px] uppercase tracking-[0.16em] transition-colors ${
                  active ? "text-[#0D0E10]" : "text-[#818283] hover:text-[#4F5052]"
                }`}
              >
                <span className={active ? "border-b border-[#0D0E10] pb-1" : ""}>{n.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}

export function AppV3Shell({ firstName, accessLevel, trialDaysLeft }: AppV3ShellProps) {
  return (
    <ConciergeProvider>
      <ShellInner firstName={firstName} accessLevel={accessLevel} trialDaysLeft={trialDaysLeft} />
    </ConciergeProvider>
  )
}

export default AppV3Shell
