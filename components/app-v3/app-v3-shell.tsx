"use client"

// SSELFIE Studio 3.0 — app shell + product navigation (MAYA-REBUILD-05 Phase H.2).
// Maya is the product, not a tab. She is woven through every surface. The nav is the four
// places content lives: Create · Library · Content · Account. No standalone "Maya" tab, and
// no link to the legacy Instagram feed-planner (that planner mentality is the old SSELFIE;
// the live Feed Planner stays untouched for members on /studio).
// Isolated tree: imports only from components/app-v3/ + lib/. No components/sselfie/.

import { useState } from "react"
import { ConciergeProvider, useConcierge } from "./concierge-context"
import { VisualFrontDoor } from "./visual-front-door"
import { MayaConcierge } from "./maya-concierge"
import { GalleryView } from "./gallery-view"
import { ContentView } from "./content-view"
import type { Aesthetic, OutputFormat } from "./types"

export interface AppV3ShellProps {
  firstName?: string | null
}

type Section = "create" | "library" | "content" | "account"

const NAV: { id: Section; label: string }[] = [
  { id: "create", label: "Create" },
  { id: "library", label: "Library" },
  { id: "content", label: "Content" },
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

function AccountView({ firstName, onManageBrand }: { firstName?: string | null; onManageBrand: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Account</p>
      <h1 className="mt-2 font-serif text-[30px] font-light leading-tight text-[#0D0E10]">
        {firstName ? `Hi ${firstName}` : "Your account"}
      </h1>
      <p className="mt-2 text-[15px] text-[#4F5052]">Manage your brand, billing, and training.</p>

      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={onManageBrand}
          className="block w-full rounded-[6px] border border-[#C5C6C8]/60 bg-white px-4 py-4 text-left text-[15px] text-[#0D0E10] transition-colors hover:border-[#0D0E10]/40"
        >
          Brand &amp; memory
          <span className="mt-0.5 block text-[12px] text-[#818283]">Tell Maya what she should remember about you.</span>
        </button>
        <a
          href="/studio?legacy=1"
          className="block w-full rounded-[6px] border border-[#C5C6C8]/60 bg-white px-4 py-4 text-[15px] text-[#0D0E10] transition-colors hover:border-[#0D0E10]/40"
        >
          Billing, training &amp; settings
          <span className="mt-0.5 block text-[12px] text-[#818283]">Open the classic Studio for account settings.</span>
        </a>
      </div>
    </div>
  )
}

function ShellInner({ firstName }: AppV3ShellProps) {
  const [section, setSection] = useState<Section>("create")
  const { openWithAesthetic } = useConcierge()

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
      {section === "create" && <VisualFrontDoor />}
      {section === "library" && <GalleryView />}
      {section === "content" && (
        <ContentView
          firstName={firstName}
          onCreateIdea={createIdea}
          onCreate={createFormat}
          onBrowse={() => setSection("library")}
        />
      )}
      {section === "account" && (
        <AccountView firstName={firstName} onManageBrand={() => openWithAesthetic(MAYA_GENERAL)} />
      )}

      <MayaConcierge />

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

export function AppV3Shell({ firstName }: AppV3ShellProps) {
  return (
    <ConciergeProvider>
      <ShellInner firstName={firstName} />
    </ConciergeProvider>
  )
}

export default AppV3Shell
