"use client"

// SSELFIE Studio 3.0 — app shell + product navigation (MAYA-REBUILD-05 Phase H).
// Turns /app from a single page into a product: Create · Gallery · Feed · Maya · Account.
// Isolated tree: imports only from components/app-v3/ + lib/. No components/sselfie/.

import { useState } from "react"
import { ConciergeProvider, useConcierge } from "./concierge-context"
import { VisualFrontDoor } from "./visual-front-door"
import { MayaConcierge } from "./maya-concierge"
import { GalleryView } from "./gallery-view"
import type { Aesthetic } from "./types"

export interface AppV3ShellProps {
  firstName?: string | null
}

type Section = "create" | "gallery" | "account"

const NAV: { id: Section | "feed" | "maya"; label: string }[] = [
  { id: "create", label: "Create" },
  { id: "gallery", label: "Gallery" },
  { id: "feed", label: "Feed" },
  { id: "maya", label: "Maya" },
  { id: "account", label: "Account" },
]

// "Talk to Maya" entry when no specific look is chosen yet. Maya uses brand memory to guide.
const MAYA_GENERAL: Aesthetic = {
  id: "maya-general",
  name: "SSELFIE",
  blurb: "Let's figure out your next shot together.",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent: "A general SSELFIE editorial brand session. Help her decide what to create, then pull directions.",
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

  function go(id: Section | "feed" | "maya") {
    if (id === "feed") {
      window.location.href = "/feed-planner"
      return
    }
    if (id === "maya") {
      openWithAesthetic(MAYA_GENERAL)
      return
    }
    setSection(id)
  }

  return (
    <main className="min-h-screen bg-[#F8FAFA] pb-20 text-[#0D0E10]">
      {section === "create" && <VisualFrontDoor />}
      {section === "gallery" && <GalleryView />}
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
                onClick={() => go(n.id)}
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
