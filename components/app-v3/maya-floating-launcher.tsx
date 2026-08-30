"use client"

// SSELFIE Studio 3.0 - floating Maya launcher (CLAUDE-MAYA-UI-UX-01 Workstream A).
// Maya is the relationship, so when the drawer is closed she stays reachable as her own face,
// framed in obsidian with a small chat badge. Saved sessions resume directly; New chat and
// History stay inside Maya's menu. No second chat system.

import Image from "next/image"
import { MessageCircle } from "lucide-react"
import { MAYA_AVATAR_SRC } from "@/lib/brand/maya"
import { useConcierge } from "./concierge-context"

// Same portrait the chat thread uses for Maya, so the launcher unmistakably reads as "her".
const MAYA_AVATAR = MAYA_AVATAR_SRC

export function MayaFloatingLauncher({
  operatingLayerEnabled = false,
}: {
  operatingLayerEnabled?: boolean
}) {
  const { isOpen, open, openFresh, hasSavedSession } = useConcierge()

  if (isOpen) return null

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 sm:right-6">
      <button
        type="button"
        onClick={() => {
          if (operatingLayerEnabled || hasSavedSession) {
            open()
            return
          }
          openFresh()
        }}
        aria-label="Open Maya"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0D0E10] p-[3px] shadow-[0_10px_30px_rgba(13,14,16,0.28)] transition-transform duration-200 hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-[#0D0E10] focus:ring-offset-2 focus:ring-offset-[#F8FAFA] animate-in fade-in zoom-in-90 duration-300 motion-reduce:animate-none"
      >
        <span className="relative block h-full w-full overflow-hidden rounded-full">
          <Image src={MAYA_AVATAR} alt="" fill sizes="56px" className="object-cover" />
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#F8FAFA] bg-[#0D0E10] text-white">
          <MessageCircle aria-hidden size={11} strokeWidth={2} />
        </span>
      </button>
    </div>
  )
}
